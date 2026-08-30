export function builderPath(pageId: string): string {
  return `/prestate?id=${encodeURIComponent(pageId)}`;
}

/** Same builder, opened against an org's own LandingPage instead of a Template.
 *  A top-level sibling route (like /prestate), not nested under /org/ —
 *  app/org/layout.tsx wraps every child in OrgAdminShell, which the
 *  full-screen builder must never render inside. */
export function orgBuilderPath(pageId: string): string {
  return `/org-builder?id=${encodeURIComponent(pageId)}`;
}

export function localPreviewPath(page: { slug: string }): string {
  return `/p/${encodeURIComponent(page.slug)}`;
}

export function localDomainPreviewPath(domain: string): string {
  const host = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
  return host ? `/__host/${host}` : "";
}
