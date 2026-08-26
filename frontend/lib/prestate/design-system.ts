import type { SiteConfig } from "./types";
import type { Resource } from "./persist";
import { apiFetch } from "../api";

// ---------------------------------------------------------------------------
// Design system — per-template typography + optional shared global set +
// custom uploaded fonts. Typography is template-independent by default; the
// optional "global" scope lets several templates intentionally share one set.
// ---------------------------------------------------------------------------

export type TypeKey = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";

/** One responsive breakpoint of a typography token. */
export interface TypeToken {
  fontFamily?: string;
  /** CSS length — numbers are treated as px, strings pass through ("3rem"). */
  fontSize?: number | string;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: string;
  textColor?: string;
}

/** Paragraph token adds vertical rhythm between blocks. */
export interface ParagraphTypeToken extends TypeToken {
  paragraphSpacing?: number | string;
}

export interface ResponsiveType {
  desktop: TypeToken;
  tablet?: Partial<TypeToken>;
  mobile?: Partial<TypeToken>;
}

export type TemplateTypography = Record<TypeKey, ResponsiveType>;

export interface FontDef {
  id: string;
  /** Display name shown in dropdowns (also used as css font-family). */
  family: string;
  src: string;
  format: "woff2" | "woff" | "truetype" | "opentype";
  weight?: number;
  enabled?: boolean;
}

export interface DesignSystemState {
  /** Where this template reads/writes its typography. */
  scope: "template" | "global";
  /** Active when scope === "global". */
  globalSetId?: string;
  typography: TemplateTypography;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const HEADING_DEFAULTS = {
  fontFamily: "",
  fontWeight: 800,
  lineHeight: 1.15,
  letterSpacing: -0.5,
  textTransform: "none",
};

export function defaultTypography(): TemplateTypography {
  return {
    h1: {
      desktop: { ...HEADING_DEFAULTS, fontSize: 52 },
      tablet: { fontSize: 40 },
      mobile: { fontSize: 32 },
    },
    h2: {
      desktop: { ...HEADING_DEFAULTS, fontWeight: 700, fontSize: 34 },
      tablet: { fontSize: 28 },
      mobile: { fontSize: 24 },
    },
    h3: {
      desktop: { ...HEADING_DEFAULTS, fontWeight: 700, fontSize: 26 },
      tablet: { fontSize: 22 },
      mobile: { fontSize: 20 },
    },
    h4: {
      desktop: { ...HEADING_DEFAULTS, fontWeight: 700, fontSize: 21, letterSpacing: -0.2 },
      tablet: { fontSize: 19 },
    },
    h5: {
      desktop: { ...HEADING_DEFAULTS, fontWeight: 700, fontSize: 17, letterSpacing: 0 },
    },
    h6: {
      desktop: { ...HEADING_DEFAULTS, fontWeight: 700, fontSize: 14, letterSpacing: 0.6, textTransform: "uppercase" },
    },
    p: {
      desktop: { fontFamily: "", fontSize: 15, fontWeight: 400, lineHeight: 1.75, letterSpacing: 0, textColor: "", paragraphSpacing: "" } as TypeToken & { paragraphSpacing?: string },
      mobile: { fontSize: 14 },
    },
  };
}

const TYPE_KEYS: TypeKey[] = ["h1", "h2", "h3", "h4", "h5", "h6", "p"];

function hydrateResponsive(raw: unknown): ResponsiveType {
  const r = (raw ?? {}) as Partial<ResponsiveType>;
  return {
    desktop: { ...(r.desktop ?? {}) },
    tablet: r.tablet ? { ...r.tablet } : undefined,
    mobile: r.mobile ? { ...r.mobile } : undefined,
  };
}

export function hydrateTypography(raw: unknown): TemplateTypography {
  const base = defaultTypography();
  if (!raw || typeof raw !== "object") return base;
  const out = {} as TemplateTypography;
  for (const key of TYPE_KEYS) {
    out[key] = hydrateResponsive((raw as TemplateTypography)[key]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Global design-system sets — server-persisted (GET/POST/PATCH/DELETE
// against /org/typography-sets or /admin/typography-sets, chosen by
// `resource` the same way persist.ts picks between org/admin paths).
//
// Two-level scoping, enforced server-side, not just here:
//  - "platform" sets (orgId: null) — Super Admin owned, usable by every org.
//  - "org" sets — owned by one org, visible only to that org.
// An org session's list already comes back as platform + that org's own
// sets combined; an admin session's list is platform sets only.
// ---------------------------------------------------------------------------

export type TypographySetScope = "platform" | "org";

export interface GlobalStyleSet {
  id: string;
  name: string;
  typography: TemplateTypography;
  /** Display-formatted last-updated date. */
  updated?: string;
  /** Which level this set belongs to — platform sets render read-only for
   *  an org session (not editable/deletable, enforced server-side too). */
  scope: TypographySetScope;
}

const FONT_KEY = "prestate.fonts.v1";

interface ApiTypographySet {
  id: string;
  orgId: string | null;
  name: string;
  tokens: unknown;
  createdAt: string;
  updatedAt: string;
  /** Present on the org endpoint's list response; absent on the admin
   *  endpoint's, where every row is implicitly a platform set. */
  scope?: TypographySetScope;
}

function fromApiTypographySet(raw: ApiTypographySet): GlobalStyleSet {
  return {
    id: raw.id,
    name: raw.name,
    typography: hydrateTypography(raw.tokens),
    updated: new Date(raw.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    scope: raw.scope ?? (raw.orgId === null ? "platform" : "org"),
  };
}

function typographySetsPath(resource: Resource): string {
  return resource === "landing-page" ? "/org/typography-sets" : "/admin/typography-sets";
}

export async function loadGlobalSets(resource: Resource = "template"): Promise<GlobalStyleSet[]> {
  const rows = await apiFetch<ApiTypographySet[]>(typographySetsPath(resource));
  return rows.map(fromApiTypographySet);
}

/** Platform sets only, via the unauthenticated GET /typography-sets — for
 *  the public local-preview surface (live-site.tsx), which has no session
 *  and can't hit the Super-Admin-guarded /admin/typography-sets. */
export async function loadPublicGlobalSets(): Promise<GlobalStyleSet[]> {
  const rows = await apiFetch<ApiTypographySet[]>("/typography-sets");
  return rows.map(fromApiTypographySet);
}

/** Creates a set owned by the caller's org (org session) or a platform set
 *  (Super Admin session) — which one is entirely determined by `resource`. */
export async function createGlobalSet(
  resource: Resource,
  input: { name: string; typography: TemplateTypography },
): Promise<GlobalStyleSet> {
  const raw = await apiFetch<ApiTypographySet>(typographySetsPath(resource), {
    method: "POST",
    body: JSON.stringify({ name: input.name, tokens: input.typography }),
  });
  return fromApiTypographySet(raw);
}

const SET_SAVE_DEBOUNCE_MS = 500;
interface PendingSetSave {
  timer: ReturnType<typeof setTimeout>;
  latest: { name?: string; typography?: TemplateTypography };
  resolvers: ((value: GlobalStyleSet) => void)[];
  rejecters: ((reason: unknown) => void)[];
}
const pendingSetSaves = new Map<string, PendingSetSave>();

/** Rename and/or update tokens — debounced per (resource, id), same pattern
 *  persist.ts's saveTemplate uses. Necessary here in a way it wasn't for
 *  the old localStorage version: a slider drag fires onChange continuously,
 *  and each one used to be a free local write — now it's a network PATCH,
 *  so rapid calls collapse into one request using the latest values.
 *  The API rejects this for a platform set from an org session (403) —
 *  this function doesn't pre-check scope, callers should simply not offer
 *  the action for a read-only set. */
export function updateGlobalSet(
  resource: Resource,
  id: string,
  patch: { name?: string; typography?: TemplateTypography },
): Promise<GlobalStyleSet> {
  return new Promise((resolve, reject) => {
    const key = `${resource}:${id}`;
    const existing = pendingSetSaves.get(key);
    const entry: PendingSetSave = existing ?? {
      timer: null as unknown as ReturnType<typeof setTimeout>,
      latest: {},
      resolvers: [],
      rejecters: [],
    };
    entry.latest = { ...entry.latest, ...patch };
    entry.resolvers.push(resolve);
    entry.rejecters.push(reject);
    if (existing) clearTimeout(existing.timer);

    entry.timer = setTimeout(() => {
      pendingSetSaves.delete(key);
      apiFetch<ApiTypographySet>(`${typographySetsPath(resource)}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ name: entry.latest.name, tokens: entry.latest.typography }),
      })
        .then((raw) => {
          const mapped = fromApiTypographySet(raw);
          entry.resolvers.forEach((r) => r(mapped));
        })
        .catch((err) => entry.rejecters.forEach((r) => r(err)));
    }, SET_SAVE_DEBOUNCE_MS);

    pendingSetSaves.set(key, entry);
  });
}

export async function deleteGlobalSet(resource: Resource, id: string): Promise<void> {
  await apiFetch(`${typographySetsPath(resource)}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function ensureDesignSystem(config: SiteConfig): DesignSystemState {
  const raw = (config as SiteConfig & { designSystem?: DesignSystemState }).designSystem;
  return {
    scope: raw?.scope === "global" ? "global" : "template",
    globalSetId: typeof raw?.globalSetId === "string" ? raw.globalSetId : undefined,
    typography: hydrateTypography(raw?.typography),
  };
}

/** Effective tokens for a template — honours the template/global scope.
 *  `sets` must be pre-fetched by the caller (loadGlobalSets is async now
 *  that it's a network call; this stays synchronous for the render-path
 *  callers — builder/workspace.tsx's canvas CSS and live-site.tsx — that
 *  can't await mid-render). Pass [] while a fetch is still in flight; the
 *  page just renders with template-scoped typography until it resolves. */
export function effectiveTypography(
  config: SiteConfig,
  sets: GlobalStyleSet[] = [],
): { state: DesignSystemState; typography: TemplateTypography; isGlobal: boolean; set?: GlobalStyleSet } {
  const state = ensureDesignSystem(config);
  if (state.scope === "global" && state.globalSetId) {
    const set = sets.find((x) => x.id === state.globalSetId);
    if (set) return { state, typography: set.typography, isGlobal: true, set };
  }
  return { state, typography: state.typography, isGlobal: false };
}

// ---------------------------------------------------------------------------
// Custom fonts
// ---------------------------------------------------------------------------

export function loadFonts(): FontDef[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FONT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FontDef[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFonts(fonts: FontDef[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FONT_KEY, JSON.stringify(fonts));
  } catch {
    /* quota */
  }
}

/** @font-face rules for every uploaded font — deduped by id, disabled skipped. */
export function fontsCss(fonts: FontDef[]): string {
  const seen = new Set<string>();
  const rules: string[] = [];
  for (const f of fonts) {
    if (!f.src || f.enabled === false || seen.has(f.id)) continue;
    seen.add(f.id);
    rules.push(`@font-face{font-family:"${f.family.replace(/"/g, "'")}";src:url(${JSON.stringify(f.src)}) format("${f.format}");font-weight:${f.weight ?? "normal"};font-display:swap;}`);
  }
  return rules.join("\n");
}

/** All selectable families for dropdowns — uploaded first, then curated webfonts. */
export const WEB_FONT_OPTIONS = ["Inter", "Playfair Display", "Poppins", "Montserrat", "DM Sans", "Lora", "Source Serif 4"];

export function fontOptions(fonts: FontDef[]): { value: string; label: string }[] {
  const uploaded = fonts.filter((f) => f.enabled !== false).map((f) => ({ value: f.family, label: `${f.family} (custom)` }));
  const web = WEB_FONT_OPTIONS.map((f) => ({ value: f, label: f }));
  return [...uploaded, ...web];
}

// ---------------------------------------------------------------------------
// CSS generation
// ---------------------------------------------------------------------------

const decl = (t: TypeToken): string => {
  const parts: string[] = [];
  if (t.fontFamily) parts.push(`font-family:${t.fontFamily.includes('"') || t.fontFamily.includes("'") ? t.fontFamily : `"${t.fontFamily}"`}`);
  if (typeof t.fontSize === "number") parts.push(`font-size:${t.fontSize}px`);
  else if (typeof t.fontSize === "string" && t.fontSize.trim()) parts.push(`font-size:${t.fontSize.trim()}`);
  if (t.fontWeight != null) parts.push(`font-weight:${t.fontWeight}`);
  if (t.lineHeight != null) parts.push(`line-height:${t.lineHeight}`);
  if (t.letterSpacing != null) parts.push(`letter-spacing:${t.letterSpacing}px`);
  if (t.textTransform && t.textTransform !== "none") parts.push(`text-transform:${t.textTransform}`);
  if (t.textColor) parts.push(`color:${t.textColor}`);
  const para = t as ParagraphTypeToken;
  if (para.paragraphSpacing != null && para.paragraphSpacing !== "") {
    const v = typeof para.paragraphSpacing === "number" ? `${para.paragraphSpacing}px` : para.paragraphSpacing;
    parts.push(`margin-bottom:${v}`);
  }
  return parts.join(";");
};

function ruleFor(selector: string, resp: ResponsiveType, isParagraph: boolean): string {
  void isParagraph;
  const d = decl(resp.desktop);
  let css = d ? `${selector}{${d}}\n` : "";
  const t = resp.tablet ? decl({ ...resp.desktop, ...resp.tablet }) : "";
  if (t) css += `@media(max-width:1100px){${selector}{${t}}}\n`;
  const m = resp.mobile ? decl({ ...resp.desktop, ...resp.mobile }) : "";
  if (m) css += `@media(max-width:700px){${selector}{${m}}}\n`;
  return css;
}

/**
 * Full stylesheet for a page: @font-face rules + scoped H1–P rules.
 * Scoped so builder canvas and published pages share identical rendering.
 */
export function buildDesignCss(opts: { scopeClass: string; typography: TemplateTypography; fonts: FontDef[] }): string {
  const { scopeClass, typography, fonts } = opts;
  let css = fontsCss(fonts);
  const s = `.${scopeClass}`;
  css += ruleFor(`${s} h1`, typography.h1, false);
  css += ruleFor(`${s} h2`, typography.h2, false);
  css += ruleFor(`${s} h3`, typography.h3, false);
  css += ruleFor(`${s} h4`, typography.h4, false);
  css += ruleFor(`${s} h5`, typography.h5, false);
  css += ruleFor(`${s} h6`, typography.h6, false);
  css += ruleFor(`${s} p`, typography.p, true);
  return css;
}
