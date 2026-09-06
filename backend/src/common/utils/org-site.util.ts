import { randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../database/prisma.service';
import { generateUniqueLandingPageSlug } from './slug.util';
import {
  generateSubdomainSuggestions,
  isValidSubdomain,
  normalizeSubdomain,
  subdomainHost,
} from './domain.util';

type Tx = Prisma.TransactionClient;
type SubdomainLookup = PrismaService | Prisma.TransactionClient;

export async function generateUniqueSubdomain(
  prisma: SubdomainLookup,
  source: string,
  excludeOrgId?: string,
): Promise<string> {
  const cleaned = normalizeSubdomain(source.replace(/[^a-z0-9]+/gi, '')).slice(0, 40);
  const base = isValidSubdomain(cleaned) ? cleaned : `org${randomBytes(3).toString('hex')}`;
  const candidates = [base, ...generateSubdomainSuggestions(base, 8)];

  for (const label of candidates) {
    if (await isSubdomainAvailable(prisma, label, excludeOrgId)) return label;
  }

  for (let i = 1; i < 80; i += 1) {
    const label = `${base}${i}`.slice(0, 63);
    if (isValidSubdomain(label) && (await isSubdomainAvailable(prisma, label, excludeOrgId))) {
      return label;
    }
  }

  return `org${randomBytes(4).toString('hex')}`;
}

async function isSubdomainAvailable(
  prisma: SubdomainLookup,
  label: string,
  excludeOrgId?: string,
): Promise<boolean> {
  if (!isValidSubdomain(label)) return false;
  const org = await prisma.organisation.findFirst({
    where: {
      subdomain: label,
      ...(excludeOrgId ? { id: { not: excludeOrgId } } : {}),
    },
    select: { id: true },
  });
  if (org) return false;
  const pending = await prisma.orgDomainRequest.findFirst({
    where: {
      kind: 'subdomain',
      subdomain: label,
      status: { in: ['pending', 'approved'] },
      ...(excludeOrgId ? { orgId: { not: excludeOrgId } } : {}),
    },
    select: { id: true },
  });
  return !pending;
}

/** Ensures an active unique subdomain and a published landing page from assigned templates. */
export async function provisionOrgPortal(
  tx: Tx,
  org: {
    id: string;
    name: string;
    slug: string;
    subdomain: string | null;
    customDomain?: string | null;
    customDomainLandingPageId?: string | null;
  },
  actorId: string,
  preferredTemplateId?: string | null,
): Promise<{ subdomain: string; host: string; landingPageId: string | null }> {
  let subdomain = org.subdomain && isValidSubdomain(org.subdomain) ? org.subdomain : null;
  if (!subdomain) {
    subdomain = await generateUniqueSubdomain(tx, org.slug || org.name, org.id);
  }

  await tx.organisation.update({
    where: { id: org.id },
    data: { subdomain, subdomainStatus: 'active' },
  });

  // Reuse an existing subdomain request (pending OR already-approved) rather
  // than inserting a fresh row on every call — otherwise repeated approvals
  // or subdomain reassigns accumulate duplicate history rows. Pending rows
  // get upgraded to approved; approved rows keep their original review
  // metadata and only have the subdomain label refreshed.
  const existing = await tx.orgDomainRequest.findFirst({
    where: {
      orgId: org.id,
      kind: 'subdomain',
      status: { in: ['pending', 'approved'] },
    },
    orderBy: { requestedAt: 'desc' },
  });
  if (existing) {
    await tx.orgDomainRequest.update({
      where: { id: existing.id },
      data: {
        subdomain,
        status: 'approved',
        ...(existing.status === 'pending'
          ? { reviewedAt: new Date(), reviewedBy: actorId }
          : {}),
      },
    });
  } else {
    await tx.orgDomainRequest.create({
      data: {
        orgId: org.id,
        kind: 'subdomain',
        subdomain,
        status: 'approved',
        requestedBy: actorId,
        reviewedAt: new Date(),
        reviewedBy: actorId,
      },
    });
  }

  const existingPrimary = await tx.landingPage.findFirst({
    where: { orgId: org.id, status: 'published' },
    select: { id: true },
  });

  let landingPageId = existingPrimary?.id ?? null;
  if (!existingPrimary) {
    let templateId = preferredTemplateId ?? null;
    if (!templateId) {
      const assigned = await tx.organisationTemplate.findFirst({
        where: { orgId: org.id, template: { status: 'published', pageType: 'landing' } },
        orderBy: { assignedAt: 'asc' },
        select: { templateId: true },
      });
      templateId = assigned?.templateId ?? null;
    }
    if (templateId) {
      const tpl = await tx.template.findFirst({
        where: { id: templateId, status: 'published', pageType: 'landing' },
        include: { childPages: { where: { pageType: 'thank_you' }, take: 1 } },
      });
      if (tpl) {
        const baseSlug = await generateUniqueLandingPageSlug(tx, org.id, tpl.name);
        const primary = await tx.landingPage.create({
          data: {
            orgId: org.id,
            sourceTemplateId: tpl.id,
            name: tpl.name,
            slug: baseSlug,
            pageType: 'landing',
            status: 'published',
            publishedAt: new Date(),
            content: (tpl.content as Prisma.JsonObject) ?? {},
          },
        });
        landingPageId = primary.id;
        if (tpl.childPages?.[0]) {
          await tx.landingPage.create({
            data: {
              orgId: org.id,
              sourceTemplateId: tpl.childPages[0].id,
              name: tpl.childPages[0].name,
              slug: `${baseSlug}-thank-you`,
              pageType: 'thank_you',
              status: 'published',
              publishedAt: new Date(),
              parentId: primary.id,
              content: (tpl.childPages[0].content as Prisma.JsonObject) ?? {},
            },
          });
        }
      }
    }
  }
  // If the org has an approved/connected custom domain but no explicit landing
  // page selected yet, default it to the primary published page.
  if (
    org.customDomainLandingPageId == null &&
    org.customDomain &&
    landingPageId
  ) {
    await tx.organisation.update({
      where: { id: org.id },
      data: { customDomainLandingPageId: landingPageId },
    });
  }

  return { subdomain, host: subdomainHost(subdomain), landingPageId };
}
