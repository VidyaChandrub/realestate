import type { LandingPageData } from "./types";
import { loadTemplates } from "./persist";

export {
  loadTemplates,
  loadTemplate,
  createTemplate,
  saveTemplate,
  deleteTemplate,
  duplicateTemplate,
  resetTemplate,
} from "./persist";
export type { CreateTemplateInput } from "./persist";

export async function findPageBySlug(slug: string, pages?: LandingPageData[]): Promise<LandingPageData | undefined> {
  const list = pages ?? (typeof window === "undefined" ? [] : await loadTemplates());
  const key = decodeURIComponent(slug).toLowerCase();
  return list.find((p) => p.slug.toLowerCase() === key);
}

export async function findPageByDomain(domain: string, pages?: LandingPageData[]): Promise<LandingPageData | undefined> {
  const list = pages ?? (typeof window === "undefined" ? [] : await loadTemplates());
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
