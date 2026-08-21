export function builderPath(pageId: string): string {
  return `/prestate?id=${encodeURIComponent(pageId)}`;
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
  return host ? `/p/host/${host}` : "";
}
