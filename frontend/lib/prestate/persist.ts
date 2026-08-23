import type { LandingPageData } from "./types";
import { PAGES } from "./data";
import { buildTemplateSections, buildThankYouSections, inferDesignId } from "./page-templates";
import { ensureConfig } from "./site-config";

export const PAGES_STORAGE_KEY = "prestate.pages.v4";

function sectionsFor(designId: string, pageType?: string) {
  return pageType === "thank-you" ? buildThankYouSections() : buildTemplateSections(designId);
}

export function seedPages(): LandingPageData[] {
  return PAGES.map((p) => {
    const page: LandingPageData = {
      ...p,
      kind: p.kind ?? "preset",
      designId: p.designId ?? inferDesignId(p.template),
      pageType: p.pageType ?? "landing",
      sections: sectionsFor(p.designId ?? p.template, p.pageType),
    };
    return { ...page, config: ensureConfig(page) };
  });
}

const PRESET_IDS = PAGES.map((p) => p.id);

export function loadPages(): LandingPageData[] {
  if (typeof window === "undefined") return seedPages();
  try {
    const raw = window.localStorage.getItem(PAGES_STORAGE_KEY);
    if (!raw) return seedPages();
    const parsed = JSON.parse(raw) as LandingPageData[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seedPages();
    return parsed.map((p) => {
      const designId = p.designId ?? inferDesignId(p.template);
      const kind = p.kind ?? (PRESET_IDS.includes(p.id) ? "preset" : "custom");
      const pageType = p.pageType ?? "landing";
      const page: LandingPageData = {
        ...p,
        designId,
        kind,
        pageType,
        sections: Array.isArray(p.sections) ? p.sections : sectionsFor(designId, pageType),
      };
      return { ...page, config: ensureConfig(page) };
    });
  } catch {
    return seedPages();
  }
}

export function savePages(pages: LandingPageData[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(pages));
  } catch {
    /* quota */
  }
}
