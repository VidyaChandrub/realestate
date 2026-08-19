import type { PrismaService } from '../../database/prisma.service';

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'org';
}

// Shared by /auth/signup and the Super Admin onboarding wizard — both need
// identical collision handling (numeric suffix) so slugs stay predictable
// regardless of which flow created the organisation.
export async function generateUniqueOrgSlug(
  prisma: Pick<PrismaService, 'organisation'>,
  companyName: string,
): Promise<string> {
  const base = slugify(companyName);
  let candidate = base;
  let suffix = 1;

  while (
    await prisma.organisation.findUnique({ where: { slug: candidate } })
  ) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}
