import type { LandingPageData } from "./types";
import { loadPages } from "./persist";

export { loadPages, savePages, seedPages, PAGES_STORAGE_KEY } from "./persist";

export function findPageBySlug(slug: string, pages?: LandingPageData[]): LandingPageData | undefined {
  const list = pages ?? (typeof window === "undefined" ? [] : loadPages());
  const key = decodeURIComponent(slug).toLowerCase();
  return list.find((p) => p.slug.toLowerCase() === key);
}

export function findPageByDomain(domain: string, pages?: LandingPageData[]): LandingPageData | undefined {
  const list = pages ?? (typeof window === "undefined" ? [] : loadPages());
  const host = normalizeDomain(domain);
  if (!host) return undefined;
  return list.find((p) => normalizeDomain(p.domain) === host);
}

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

export function isLikelyHostname(input: string): boolean {
  const host = normalizeDomain(input);
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(host);
}
