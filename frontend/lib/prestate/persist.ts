import type { LandingPageData, SectionInstance, SiteConfig } from "./types";
import { PAGES } from "./data";
import { buildTemplateSections, buildThankYouSections, inferDesignId } from "./page-templates";
import { ensureConfig } from "./site-config";
import { apiFetch } from "../api";

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
// API — templates (backend)
// ---------------------------------------------------------------------------

const TEMPLATES_PATH = "/admin/templates";

// Raw shape returned by the backend — same field names/casing as
// LandingPageData except sections/config are only present when content was
// requested (list rows omit them by default).
interface ApiTemplate {
  id: string;
  name: string;
  slug: string;
  status: LandingPageData["status"];
  template: string;
  domain: string;
  thumbnail: string | null;
  kind: "preset" | "custom";
  designId: string;
  pageType: "landing" | "thank-you";
  parentPageId: string | null;
  category: string | null;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
  sections?: SectionInstance[];
  config?: SiteConfig;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Maps the backend's response shape onto LandingPageData. `views`/`conversions`
// are decorative-only in the frontend (never computed anywhere) and are not
// persisted server-side, so they always fall back to the existing "—" placeholder.
function fromApiTemplate(raw: ApiTemplate): LandingPageData {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    status: raw.status,
    template: raw.template,
    domain: raw.domain,
    views: "—",
    conversions: "—",
    updated: formatRelativeTime(raw.updatedAt),
    updatedAt: raw.updatedAt,
    thumbnail: raw.thumbnail ?? "",
    sections: raw.sections ?? [],
    config: raw.config,
    kind: raw.kind,
    designId: raw.designId,
    pageType: raw.pageType,
    parentPageId: raw.parentPageId ?? undefined,
    isPaid: raw.isPaid,
    category: raw.category,
  };
}

function toContentBody(page: Pick<LandingPageData, "sections" | "config">) {
  return { sections: page.sections, config: page.config ?? {} };
}

/** List persisted templates. Includes content by default so
 *  buildTemplateRows()'s existing brand/font reads on custom rows keep
 *  working unchanged — pass includeContent: false for lightweight reads
 *  (e.g. a domain-collision index) that don't need the section tree.
 *  The API defaults to landing pages only (thank-you companions are reached
 *  through their parent, not browsable in their own right) — pass
 *  pageType: "thank-you" for the few callers that genuinely need those. */
export async function loadTemplates(
  options: { includeContent?: boolean; pageType?: "landing" | "thank-you" } = {},
): Promise<LandingPageData[]> {
  const includeContent = options.includeContent ?? true;
  const params = new URLSearchParams({ includeContent: String(includeContent) });
  if (options.pageType) params.set("pageType", options.pageType);
  const rows = await apiFetch<ApiTemplate[]>(`${TEMPLATES_PATH}?${params.toString()}`);
  return rows.map(fromApiTemplate);
}

export async function loadTemplate(id: string): Promise<LandingPageData | null> {
  try {
    const raw = await apiFetch<ApiTemplate>(`${TEMPLATES_PATH}/${encodeURIComponent(id)}`);
    return fromApiTemplate(raw);
  } catch {
    return null;
  }
}

export interface CreateTemplateInput {
  name: string;
  slug?: string;
  designId: string;
  template: string;
  status?: LandingPageData["status"];
  kind?: "preset" | "custom";
  pageType?: "landing" | "thank-you";
  parentPageId?: string;
  thumbnail?: string;
  isPaid?: boolean;
  category?: string;
  sections: SectionInstance[];
  config: SiteConfig;
}

export async function createTemplate(input: CreateTemplateInput): Promise<LandingPageData> {
  const raw = await apiFetch<ApiTemplate>(TEMPLATES_PATH, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      slug: input.slug,
      designId: input.designId,
      template: input.template,
      status: input.status,
      kind: input.kind,
      pageType: input.pageType,
      parentPageId: input.parentPageId,
      thumbnail: input.thumbnail,
      isPaid: input.isPaid,
      category: input.category,
      content: { sections: input.sections, config: input.config },
    }),
  });
  return fromApiTemplate(raw);
}

async function patchTemplate(id: string, record: LandingPageData): Promise<LandingPageData> {
  const raw = await apiFetch<ApiTemplate>(`${TEMPLATES_PATH}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: record.name,
      slug: record.slug,
      status: record.status,
      domain: record.domain,
      thumbnail: record.thumbnail,
      isPaid: record.isPaid,
      category: record.category,
      content: toContentBody(record),
    }),
  });
  return fromApiTemplate(raw);
}

const SAVE_DEBOUNCE_MS = 500;
interface PendingSave {
  timer: ReturnType<typeof setTimeout>;
  latest: LandingPageData;
  resolvers: ((value: LandingPageData) => void)[];
  rejecters: ((reason: unknown) => void)[];
}
const pendingSaves = new Map<string, PendingSave>();

/** Debounced single-record save — replaces the old bulk "save the whole
 *  array" pattern. Multiple calls for the same template id within the
 *  debounce window collapse into one PATCH using the latest record. */
export function saveTemplate(record: LandingPageData): Promise<LandingPageData> {
  return new Promise((resolve, reject) => {
    const existing = pendingSaves.get(record.id);
    const entry: PendingSave = existing ?? {
      timer: null as unknown as ReturnType<typeof setTimeout>,
      latest: record,
      resolvers: [],
      rejecters: [],
    };
    entry.latest = record;
    entry.resolvers.push(resolve);
    entry.rejecters.push(reject);
    if (existing) clearTimeout(existing.timer);

    entry.timer = setTimeout(() => {
      pendingSaves.delete(record.id);
      patchTemplate(record.id, entry.latest)
        .then((updated) => entry.resolvers.forEach((r) => r(updated)))
        .catch((err) => entry.rejecters.forEach((r) => r(err)));
    }, SAVE_DEBOUNCE_MS);

    pendingSaves.set(record.id, entry);
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiFetch(`${TEMPLATES_PATH}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function duplicateTemplate(id: string): Promise<LandingPageData> {
  const raw = await apiFetch<ApiTemplate>(`${TEMPLATES_PATH}/${encodeURIComponent(id)}/duplicate`, {
    method: "POST",
  });
  return fromApiTemplate(raw);
}

export async function resetTemplate(
  id: string,
  content: { sections: SectionInstance[]; config: SiteConfig },
): Promise<LandingPageData> {
  const raw = await apiFetch<ApiTemplate>(`${TEMPLATES_PATH}/${encodeURIComponent(id)}/reset`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return fromApiTemplate(raw);
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
