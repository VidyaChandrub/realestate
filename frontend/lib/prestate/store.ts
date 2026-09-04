import type { LandingPageData } from "./types";
import { loadPages, loadTemplates } from "./persist";

export {
  loadTemplates,
  loadTemplate,
  createTemplate,
  saveTemplate,
  deleteTemplate,
  duplicateTemplate,
  resetTemplate,
  publishLandingPage,
  unpublishLandingPage,
} from "./persist";
export type { CreateTemplateInput, Resource } from "./persist";

import { apiFetch } from "../api";
import { inferDesignId } from "./page-templates";
import { ensureConfig } from "./site-config";

export async function findPageBySlug(slug: string, pages?: LandingPageData[]): Promise<LandingPageData | undefined> {
  const rawKey = decodeURIComponent(slug).trim().toLowerCase();
  const key = rawKey.replace(/\s+/g, "-");
  const list = pages ?? (typeof window === "undefined" ? [] : loadPages());
  const local = list.find((p) => p.slug.toLowerCase() === key || p.slug.toLowerCase() === rawKey);
  if (local) return local;


  try {
    const raw = await apiFetch<any>(`/public/site/page/${encodeURIComponent(key)}`);
    if (!raw || !raw.id) return undefined;
    const templateName = raw.sourceTemplate?.name ?? raw.name ?? "EstatePro Standard";
    const mapped: LandingPageData = {
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      status: raw.status as LandingPageData["status"],
      template: templateName,
      domain: raw.organisation?.customDomain ?? "",
      views: "—",
      conversions: "—",
      updated: raw.updatedAt ? new Date(raw.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Recently",
      updatedAt: raw.updatedAt,
      thumbnail: raw.thumbnail ?? "",
      sections: raw.content?.sections ?? [],
      config: raw.content?.config ? ensureConfig({ config: raw.content.config } as any) : undefined,
      kind: "custom",
      designId: inferDesignId(templateName),
      pageType: raw.pageType === "thank_you" ? "thank-you" : "landing",
      parentPageId: raw.parentId ?? undefined,
      isPaid: false,
      category: null,
    };
    return mapped;
  } catch {
    return undefined;
  }
}

export async function findPageByDomain(domain: string, pages?: LandingPageData[]): Promise<LandingPageData | undefined> {
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
