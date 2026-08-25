import { BadRequestException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

// Every place that assigns templates to an org (signup, super admin
// activate/approve, org template management) must reject unknown, draft,
// or thank-you-page ids rather than silently dropping them — a template
// assignment is a one-shot action, so a partial/silent skip would be
// confusing. Existence + eligibility are checked together in one query so
// an ineligible id can't slip through as merely "not found".
export async function assertEligibleTemplateIds(
  prisma: Pick<PrismaClient, 'template'>,
  templateIds: string[],
): Promise<void> {
  if (templateIds.length === 0) return;
  const eligible = await prisma.template.findMany({
    where: { id: { in: templateIds }, status: 'published', pageType: 'landing' },
    select: { id: true },
  });
  if (eligible.length !== templateIds.length) {
    throw new BadRequestException(
      'One or more templates are not available for selection (unpublished, wrong page type, or unknown id)',
    );
  }
}
