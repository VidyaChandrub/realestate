import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { generateUniqueLandingPageSlug } from '../../common/utils/slug.util';
import { deepEqual } from '../../common/utils/deep-equal.util';
import { CreateLandingPageDto } from './dto/create-landing-page.dto';
import { UpdateLandingPageDto } from './dto/update-landing-page.dto';
import { ListLandingPagesQueryDto } from './dto/list-landing-pages-query.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';

@Injectable()
export class OrgLandingPagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // Presigned PUT URL for a builder image. Ownership is checked (getOwned)
  // so an org can only ever get a URL keyed into its own landing page's
  // prefix; the key's org/{orgId}/... segment comes from the JWT.
  async createUploadUrl(orgId: string, id: string, dto: CreateUploadUrlDto) {
    await this.getOwned(orgId, id);
    return this.storage.createUploadUrl({
      orgId,
      field: 'builderImage',
      landingPageId: id,
      filename: dto.filename,
      contentType: dto.contentType,
      size: dto.size,
    });
  }

  async create(orgId: string, dto: CreateLandingPageDto) {
    // No cap on how many landing pages an org may hold, template-derived or
    // from-scratch — only the *template* quota (OrganisationTemplate count)
    // is plan-limited. This is a deliberate, known-open decision, not an
    // oversight: a future Plan.limits.landingPages field may introduce one,
    // but that's a separate task pending a product decision.
    if (!dto.templateId) {
      return this.createBlank(orgId, dto);
    }

    // An org may only copy a template it was actually granted — verified
    // server-side via the assignment row, never trusted from the client.
    const assignment = await this.prisma.organisationTemplate.findUnique({
      where: { orgId_templateId: { orgId, templateId: dto.templateId } },
    });
    if (!assignment) {
      throw new ForbiddenException('Template is not assigned to your organisation');
    }

    const template = await this.prisma.template.findFirst({
      where: { id: dto.templateId, status: 'published', pageType: 'landing' },
      include: {
        childPages: { where: { status: 'published', pageType: 'thank_you' }, take: 1 },
      },
    });
    if (!template) {
      throw new NotFoundException('Template not found or not eligible for use');
    }

    const slug = await generateUniqueLandingPageSlug(this.prisma, orgId, dto.name);
    const companion = template.childPages[0] ?? null;
    const companionSlug = companion
      ? await generateUniqueLandingPageSlug(this.prisma, orgId, `${dto.name} thank you`)
      : null;

    const created = await this.prisma.$transaction(async (tx) => {
      const page = await tx.landingPage.create({
        data: {
          orgId,
          sourceTemplateId: template.id,
          name: dto.name,
          slug,
          status: 'draft',
          content: template.content as Prisma.InputJsonValue,
          thumbnail: template.thumbnail,
          pageType: 'landing',
        },
      });

      // Copy the thank-you companion too, linked to the *new* parent — not
      // the source template's thank-you id. Ten orgs using the same
      // template must never end up cross-linked to each other's pages.
      if (companion && companionSlug) {
        await tx.landingPage.create({
          data: {
            orgId,
            sourceTemplateId: companion.id,
            name: `${dto.name} — Thank You`,
            slug: companionSlug,
            status: 'draft',
            content: companion.content as Prisma.InputJsonValue,
            thumbnail: companion.thumbnail,
            pageType: 'thank_you',
            parentId: page.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          orgId,
          action: 'landing_page_created',
          entity: 'LandingPage',
          entityId: page.id,
          metadata: { sourceTemplateId: template.id, name: dto.name },
        },
      });

      return page;
    });

    return this.getOwned(orgId, created.id);
  }

  // Blank creation: no template to verify, copy, or derive a companion
  // from — `dto.content` is caller-supplied (built client-side by the same
  // factories the Super Admin blank-template flow uses; the DTO already
  // guarantees it's present and well-formed when templateId is absent).
  private async createBlank(orgId: string, dto: CreateLandingPageDto) {
    const slug = await generateUniqueLandingPageSlug(this.prisma, orgId, dto.name);

    const created = await this.prisma.$transaction(async (tx) => {
      const page = await tx.landingPage.create({
        data: {
          orgId,
          sourceTemplateId: null,
          name: dto.name,
          slug,
          status: 'draft',
          content: { sections: dto.content!.sections, config: dto.content!.config } as Prisma.InputJsonValue,
          pageType: 'landing',
        },
      });

      await tx.auditLog.create({
        data: {
          orgId,
          action: 'landing_page_created',
          entity: 'LandingPage',
          entityId: page.id,
          metadata: { sourceTemplateId: null, name: dto.name },
        },
      });

      return page;
    });

    return this.getOwned(orgId, created.id);
  }

  async list(orgId: string, query: ListLandingPagesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.LandingPageWhereInput = { orgId };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.landingPage.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          thumbnail: true,
          pageType: true,
          parentId: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          sourceTemplate: { select: { id: true, name: true } },
        },
      }),
      this.prisma.landingPage.count({ where }),
    ]);

    return { data: rows, total, page, limit };
  }

  async getById(orgId: string, id: string) {
    return this.getOwned(orgId, id);
  }

  async update(orgId: string, id: string, dto: UpdateLandingPageDto) {
    const page = await this.getOwned(orgId, id);

    const data: Prisma.LandingPageUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.thumbnail !== undefined) data.thumbnail = dto.thumbnail;

    if (dto.content !== undefined) {
      const nextContent = { sections: dto.content.sections, config: dto.content.config };
      data.content = nextContent as Prisma.InputJsonValue;

      // Editing a published page reverts it to draft — only when the
      // content actually changed (deep equality against what's stored, not
      // just "a content-carrying PATCH arrived") so merely opening a page
      // doesn't flip it, and republishing is an explicit, visible action
      // rather than a silent no-op. See OrgLandingPagesController comment
      // history for why this was tried without the revert and reverted:
      // the Publish/Unpublish button looked stuck on "Unpublish" after an
      // edit, giving no signal the live page hadn't picked up the change.
      const contentChanged = !deepEqual(page.content, nextContent);
      if (contentChanged && page.status === 'published') {
        data.status = 'draft';
      }
    }

    try {
      return await this.prisma.landingPage.update({ where: { id }, data });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException('You already have a page with that slug');
      }
      throw err;
    }
  }

  async publish(orgId: string, id: string) {
    const page = await this.getOwned(orgId, id);
    const updated = await this.prisma.landingPage.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        orgId,
        action: 'landing_page_published',
        entity: 'LandingPage',
        entityId: page.id,
        metadata: {},
      },
    });
    return updated;
  }

  async unpublish(orgId: string, id: string) {
    const page = await this.getOwned(orgId, id);
    if (page.status !== 'published') {
      throw new BadRequestException('Only published pages can be unpublished');
    }
    const updated = await this.prisma.landingPage.update({
      where: { id },
      data: { status: 'unpublished' },
    });
    await this.prisma.auditLog.create({
      data: {
        orgId,
        action: 'landing_page_unpublished',
        entity: 'LandingPage',
        entityId: page.id,
        metadata: {},
      },
    });
    return updated;
  }

  async remove(orgId: string, id: string) {
    await this.getOwned(orgId, id);
    await this.prisma.landingPage.delete({ where: { id } });
    return { success: true };
  }

  async duplicate(orgId: string, id: string) {
    const page = await this.getOwned(orgId, id);
    const slug = await generateUniqueLandingPageSlug(this.prisma, orgId, `${page.name} copy`);
    const copy = await this.prisma.landingPage.create({
      data: {
        orgId,
        sourceTemplateId: page.sourceTemplateId,
        name: `${page.name} (copy)`,
        slug,
        status: 'draft',
        content: page.content as Prisma.InputJsonValue,
        thumbnail: page.thumbnail,
        pageType: page.pageType,
        parentId: page.parentId,
      },
    });
    await this.prisma.auditLog.create({ data: { orgId, action: 'landing_page_duplicated', entity: 'LandingPage', entityId: copy.id, metadata: { sourceId: id } as any } });
    return copy;
  }

  async reorder(orgId: string, orderedIds: string[]) {
    // Validate ownership
    for (const id of orderedIds) await this.getOwned(orgId, id);
    // No explicit order column; touch updatedAt in order to reflect reorder - real ordering via updatedAt for now
    // For true reorder, we store order in content or rely on client; here we just validate
    return { success: true, ordered: orderedIds };
  }

  async sitemap(orgId: string) {
    const pages = await this.prisma.landingPage.findMany({ where: { orgId, status: 'published' }, select: { slug: true, updatedAt: true } });
    // Build sitemap using the org's connected custom domain for the canonical base
    const domainReq = await this.prisma.organisation.findFirst({ where: { id: orgId, customDomainStatus: 'connected' }, select: { customDomain: true } });
    const base = domainReq?.customDomain ? `https://${domainReq.customDomain}` : `https://app.bigestate.io/org/${orgId}`;
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const p of pages) xml += `  <url><loc>${base}/${p.slug}</loc><lastmod>${p.updatedAt.toISOString().split('T')[0]}</lastmod></url>\n`;
    xml += `</urlset>`;
    return xml;
  }

  async robots(orgId: string) {
    const sitemapUrl = `https://app.bigestate.io/org/${orgId}/sitemap.xml`;
    const domainReq = await this.prisma.organisation.findFirst({ where: { id: orgId, customDomainStatus: 'connected' }, select: { customDomain: true } });
    const sitemap = domainReq?.customDomain ? `https://${domainReq.customDomain}/sitemap.xml` : sitemapUrl;
    // respect SEO index settings per page? For robots we allow all published
    return `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${sitemap}`;
  }

  // Never leaks cross-tenant existence: a foreign org's page 404s exactly
  // the same as an id that doesn't exist at all.
  private async getOwned(orgId: string, id: string) {
    const page = await this.prisma.landingPage.findFirst({
      where: { id, orgId },
      include: { sourceTemplate: { select: { id: true, name: true } } },
    });
    if (!page) {
      throw new NotFoundException('Landing page not found');
    }
    return page;
  }
}
