import type { Template } from '@prisma/client';

// Unlike the rest of the backend's snake_case response convention, this
// mapper deliberately matches the frontend's existing LandingPageData shape
// (camelCase, `template` for the base design name, hyphenated "thank-you"
// for pageType, `parentPageId` for the parent FK) — the whole point of this
// module is a drop-in swap of prestate's persistence layer, not a new shape
// for it to adapt to.
interface MapOptions {
  includeContent?: boolean;
}

export function toLandingPageData(
  template: Template,
  options: MapOptions = {},
) {
  const content = template.content as {
    sections?: unknown[];
    config?: Record<string, unknown>;
  } | null;

  const base = {
    id: template.id,
    name: template.name,
    slug: template.slug,
    status: template.status,
    template: template.baseDesignName,
    domain: template.domain,
    thumbnail: template.thumbnail,
    kind: template.kind,
    designId: template.designId,
    pageType: template.pageType === 'thank_you' ? 'thank-you' : 'landing',
    parentPageId: template.parentId,
    category: template.category,
    isPaid: template.isPaid,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };

  if (!options.includeContent) {
    return base;
  }

  return {
    ...base,
    sections: content?.sections ?? [],
    config: content?.config ?? {},
  };
}
