import type { LandingPageData, SectionInstance } from "./types";
import { PAGES } from "./data";
import { buildTemplateSections, buildThankYouSections, inferDesignId } from "./page-templates";
import { ensureConfig } from "./site-config";

export const PAGES_STORAGE_KEY = "prestate.pages.v4";

// ---------------------------------------------------------------------------
// Widget migrations — merged library ids. Old pages keep rendering: every
// stored section type is remapped once on load, carrying its settings across.
// ---------------------------------------------------------------------------

/** Removed widget id → primary widget id that replaces it. */
export const WIDGET_MIGRATIONS: Record<string, string> = {
  slider: "carousel",
  accordion: "faq",
  "row-2": "row",
  "enquiry-form": "lead-form",
  "multistep-form": "lead-form",
  "whatsapp-form": "lead-form",
  "sticky-footer-bar": "sticky-cta",
  "whatsapp-cta": "call-cta",
  map: "location-advantages",
  nearby: "location-advantages",
  "offer-banner": "cta-banner",
};

/** Extra settings patches applied when a widget is migrated. */
const WIDGET_MIGRATION_SETTINGS: Record<string, Record<string, unknown> | undefined> = {
  "whatsapp-cta": { mode: "whatsapp" },
  "offer-banner": { layout: "strip" },
};

function migrateSectionNode(node: SectionInstance): SectionInstance {
  const target = WIDGET_MIGRATIONS[node.type];
  let next: SectionInstance = node;
  if (target) {
    next = {
      ...node,
      type: target,
      // Adopt the primary widget's identity so labels/icons stay consistent.
      label: node.label || target,
      settings: {
        ...node.settings,
        ...(WIDGET_MIGRATION_SETTINGS[node.type] ?? {}),
      },
    };
    // nearby items used {title,text}; LocationSection reads {title,meta}.
    if (node.type === "nearby" && Array.isArray(next.settings.items)) {
      next.settings.items = (next.settings.items as { title?: string; text?: string; meta?: string }[]).map((it) => ({
        ...it,
        meta: it.meta ?? it.text,
      }));
    }
  }
  if (next.children?.length) next = { ...next, children: next.children.map(migrateSectionNode) };
  return next;
}

/** Normalize a page's section tree through all widget merges (idempotent). */
export function migrateSections(list: SectionInstance[]): SectionInstance[] {
  return list.map(migrateSectionNode);
}

function sectionsFor(designId: string, pageType?: string) {
  return migrateSections(pageType === "thank-you" ? buildThankYouSections() : buildTemplateSections(designId));
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
        sections: migrateSections(Array.isArray(p.sections) ? p.sections : sectionsFor(designId, pageType)),
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

/** Update a single page inside storage without touching the rest (no data loss). */
export function savePage(pages: LandingPageData[], updated: LandingPageData) {
  const idx = pages.findIndex((p) => p.id === updated.id);
  const next = idx >= 0 ? pages.map((p) => (p.id === updated.id ? { ...updated, updated: new Date().toISOString() } : p)) : [...pages, updated];
  savePages(next);
  return next;
}

// ---------------------------------------------------------------------------
// Saved section templates — "Save as template" in the section toolbar stores
// reusable sections here; they appear under "Saved" in the widget library.
// ---------------------------------------------------------------------------

export interface SavedSectionTemplate {
  id: string;
  name: string;
  type: string;
  savedAt: string;
  data: LandingPageData["sections"][number];
}

const SECTION_TEMPLATES_KEY = "prestate.section-templates.v1";

export function loadSectionTemplates(): SavedSectionTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SECTION_TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSectionTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSectionTemplates(templates: SavedSectionTemplate[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SECTION_TEMPLATES_KEY, JSON.stringify(templates.slice(0, 40)));
  } catch {
    /* quota */
  }
}
