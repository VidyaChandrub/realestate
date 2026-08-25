import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { generateUniqueLandingPageSlug } from '../../common/utils/slug.util';
import { deepEqual } from '../../common/utils/deep-equal.util';
import { CreateLandingPageDto } from './dto/create-landing-page.dto';
import { UpdateLandingPageDto } from './dto/update-landing-page.dto';
import { ListLandingPagesQueryDto } from './dto/list-landing-pages-query.dto';

@Injectable()
export class OrgLandingPagesService {
  constructor(private readonly prisma: PrismaService) {}

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
          submittedAt: true,
          reviewedAt: true,
          rejectionReason: true,
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

    // A page under review must not change beneath the reviewer.
    if (page.status === 'pending_approval') {
      throw new BadRequestException(
        'This page is pending approval and cannot be edited until it is reviewed',
      );
    }

    const data: Prisma.LandingPageUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.thumbnail !== undefined) data.thumbnail = dto.thumbnail;

    if (dto.content !== undefined) {
      const nextContent = { sections: dto.content.sections, config: dto.content.config };
      data.content = nextContent as Prisma.InputJsonValue;

      // Editing an approved/published page reverts it to draft — but only
      // when the content actually changed. The builder's debounced autosave
      // fires on every real edit, but also re-hydrates stored sections
      // through migrateSections() on load (see BuilderWorkspace.seedSections)
      // to remap retired widget ids for old pages — merely opening a page
      // must not revert it, so we compare against what's actually stored
      // (deep equality, not reference/timestamp) rather than trusting that
      // a content-carrying PATCH implies a real change.
      // NOTE: if a page does use a retired widget type, migrateSections()
      // legitimately produces different content than what's stored, and
      // this *will* revert it on the very first save after opening — that's
      // a known, accepted consequence (the content genuinely changed, just
      // not by the user's hand), not a bug to chase here.
      // NOTE: this whole revert-on-change rule is only correct because
      // approved/published pages aren't publicly served yet. Once public
      // serving of published pages exists, this needs a working-content vs.
      // published-snapshot split — otherwise editing a live page would take
      // it offline the instant a save fires. Don't build that split now;
      // just don't regress this comment away when that day comes.
      const contentChanged = !deepEqual(page.content, nextContent);
      if (contentChanged && (page.status === 'approved' || page.status === 'published')) {
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

  async submit(orgId: string, id: string) {
    const page = await this.getOwned(orgId, id);
    if (page.status !== 'draft' && page.status !== 'rejected') {
      throw new BadRequestException('Only draft or rejected pages can be submitted for approval');
    }
    return this.prisma.landingPage.update({
      where: { id },
      data: { status: 'pending_approval', submittedAt: new Date(), rejectionReason: null },
    });
  }

  async remove(orgId: string, id: string) {
    const page = await this.getOwned(orgId, id);
    if (page.status === 'pending_approval') {
      throw new BadRequestException(
        'This page is pending approval — wait for the review outcome before deleting it',
      );
    }
    await this.prisma.landingPage.delete({ where: { id } });
    return { success: true };
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
