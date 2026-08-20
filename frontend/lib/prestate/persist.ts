import type { LandingPageData } from "./types";
import { PAGES } from "./data";
import { buildTemplateSections, inferDesignId } from "./page-templates";
import { ensureConfig } from "./site-config";

export const PAGES_STORAGE_KEY = "prestate.pages.v3";

export function seedPages(): LandingPageData[] {
  return PAGES.map((p) => {
    const page: LandingPageData = {
      ...p,
      kind: p.kind ?? "preset",
      designId: p.designId ?? inferDesignId(p.template),
      sections: buildTemplateSections(p.designId ?? p.template),
    };
    return { ...page, config: ensureConfig(page) };
  });
}

export function loadPages(): LandingPageData[] {
  if (typeof window === "undefined") return seedPages();
  try {
    const raw = window.localStorage.getItem(PAGES_STORAGE_KEY);
    if (!raw) return seedPages();
    const parsed = JSON.parse(raw) as LandingPageData[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seedPages();
    return parsed.map((p) => {
      const designId = p.designId ?? inferDesignId(p.template);
      const kind = p.kind ?? (["p1", "p2", "p3", "p4"].includes(p.id) ? "preset" : "custom");
      const page: LandingPageData = {
        ...p,
        designId,
        kind,
        sections: Array.isArray(p.sections) ? p.sections : buildTemplateSections(designId),
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
