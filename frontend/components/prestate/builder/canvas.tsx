"use client";

import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  Globe,
  Gauge,
  GripVertical,
  Link2,
  Lock,
  LockOpen,
  MessageCircle,
  Phone,
  Play,
  Save,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Navigation,
  ArrowRight,
  Quote,
  PhoneCall,
  SquareStack,
  Mail,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  FileText,
  Plus,
} from "lucide-react";
import { Lightbox } from "yet-another-react-lightbox";
import { Captions, Counter, Zoom, Fullscreen, Download as LightboxDownload } from "yet-another-react-lightbox/plugins";
import "yet-another-react-lightbox/styles.css";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import type { Device, FormLeadField, SectionInstance, SiteConfig } from "@/lib/prestate/types";
import { isFieldVisible, withFieldValue } from "@/lib/prestate/form-logic";
import { PROPERTY, SLUG_ICONS, resolveVars } from "@/lib/prestate/data";
import { loadFormLibrary } from "@/lib/prestate/forms-store";
import type { FontDef, TemplateTypography, TypeKey, TypeToken } from "@/lib/prestate/design-system";
import { cssUrl, isMediaSrc } from "@/lib/media";
import { sanitizeHtml } from "@/components/prestate/rich-text-editor";

// Safe text — never render literal "undefined"/"null" and hide empty blocks
function textOf(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") {
    const t = v.trim();
    if (!t || t === "undefined" || t === "null") return "";
    return v;
  }
  const s = String(v);
  if (!s || s === "undefined" || s === "null") return "";
  return s;
}
function hasText(v: unknown): boolean {
  return textOf(v).trim().length > 0;
}
import {
  cloneTree,
  duplicateSection,
  findParentNode,
  findSection,
  isStructural,
  patchSection,
  removeSection,
  reorderSection,
  toggleSectionFlag,
} from "@/lib/prestate/tree";
import { googleFontsHref, siteThemeStyle } from "@/lib/prestate/site-config";
import {
  CHROME_FOOTER_ID,
  CHROME_HEADER_ID,
  FOOTER_DESIGNS,
  HEADER_DESIGNS,
  hydrateFooter,
  hydrateHeader,
} from "@/lib/prestate/chrome-presets";
import { ChromeFooter, ChromeHeader } from "./chrome-renderers";
import {
  WT,
  getWidgetTheme,
  hexToSoft,
  type WtTokens,
  wtBadge,
  wtButton,
  wtButtonLight,
  wtCard,
  wtCardGlass,
  wtCardMuted,
  wtCardPremium,
  wtEyebrow,
  wtIconBadge,
  wtIconBadgeGlass,
  wtPill,
  wtSectionLede,
  wtSectionTitle,
  wtStatValue,
} from "@/lib/prestate/widget-theme";
import { bumpTracking } from "@/lib/prestate/tracking";
import { firePrestateLead } from "@/components/prestate/tracking-scripts";
import { submitLead } from "@/lib/api";

type CanvasTheme = {
  primary: string;
  accent: string;
  font: string;
  headingFont?: string;
  name?: string;
  phone?: string;
  logo?: string;
  layoutTheme?: string;
};

const SiteFormContext = createContext<SiteConfig["form"] | undefined>(undefined);
const SiteChromeContext = createContext<{ header: SiteConfig["header"]; footer: SiteConfig["footer"]; brand: SiteConfig["brand"] } | undefined>(undefined);
const SitePageIdContext = createContext("");
const SiteLiveContext = createContext(false);
/** Active preview device — lets deep renderers adapt without prop drilling. */
const SiteDeviceContext = createContext<Device>("desktop");
/** Effective design-system tokens + uploaded fonts for the current page. */
export interface DesignBundle {
  tokens: TemplateTypography;
  fonts: FontDef[];
}
const SiteDesignContext = createContext<DesignBundle | null>(null);
/** Builder-only: lets widgets commit inline edits (e.g. text edited on canvas). */
const CanvasEditContext = createContext<(id: string, patch: Record<string, unknown>) => void>(() => {});
const SiteLayoutThemeContext = createContext<WtTokens>(getWidgetTheme());

/** Merge a global typography token with a widget's own overrides. */
function resolveType(token: TypeToken | undefined, override: SectionInstance["style"]["typography"], device: Device, fallbackColor?: string): CSSProperties {
  const o = override ?? {};
  const out: CSSProperties = {};
  const family = o.fontFamily || token?.fontFamily;
  if (family) out.fontFamily = family.includes('"') || family.includes("'") ? family : `"${family}"`;
  const size = o.fontSize != null && o.fontSize !== "" ? o.fontSize : token?.fontSize;
  if (typeof size === "number") out.fontSize = device === "mobile" ? Math.round(size * 0.8) : device === "tablet" ? Math.round(size * 0.9) : size;
  else if (typeof size === "string" && size.trim()) out.fontSize = size.trim();
  if (o.fontWeight != null) out.fontWeight = o.fontWeight;
  else if (token?.fontWeight != null) out.fontWeight = token.fontWeight;
  if (o.lineHeight != null) out.lineHeight = o.lineHeight;
  else if (token?.lineHeight != null) out.lineHeight = token.lineHeight;
  if (o.letterSpacing != null) out.letterSpacing = o.letterSpacing;
  else if (token?.letterSpacing != null) out.letterSpacing = token.letterSpacing;
  if (o.textTransform) out.textTransform = o.textTransform;
  else if (token?.textTransform && token.textTransform !== "none") out.textTransform = token.textTransform;
  const color = o.textColor || token?.textColor || fallbackColor;
  if (color) out.color = color;
  return out;
}

/** Pick the responsive breakpoint of a token for the active preview device. */
export function tokenForDevice(key: TypeKey, bundle: DesignBundle | null, device: Device): TypeToken | undefined {
  const resp = bundle?.tokens?.[key];
  if (!resp) return undefined;
  if (device === "mobile") return { ...resp.desktop, ...(resp.mobile ?? {}) };
  if (device === "tablet") return { ...resp.desktop, ...(resp.tablet ?? {}) };
  return resp.desktop;
}
import { SceneImage } from "@/components/prestate/art";

// ---------------------------------------------------------------------------
// section style → css
// ---------------------------------------------------------------------------

/**
 * Length values: numbers are px (scaled down for tablet/mobile previews);
 * strings like "10px", "1rem", "50%" pass through untouched.
 */
function cssLen(v: number | string | undefined, shrink = 1, fallback = 0): string | number {
  if (typeof v === "string") {
    const t = v.trim();
    return t || fallback;
  }
  return Math.round((typeof v === "number" ? v : fallback) * shrink);
}

/**
 * Merge the per-device responsive overrides (style.responsive.tablet/mobile)
 * over the desktop values. Only spacing/layout/typography are overridable so
 * a device tweak can never silently re-theme a section.
 */
function styleForDevice(s: SectionInstance, device: Device = "desktop"): SectionInstance["style"] {
  const st = s.style;
  const ov = device === "desktop" ? undefined : st.responsive?.[device];
  if (!ov) return st;
  return {
    ...st,
    spacing: ov.spacing ? { ...st.spacing, ...ov.spacing } : st.spacing,
    layout: ov.layout ? { ...st.layout, ...ov.layout } : st.layout,
    typography: ov.typography ? { ...st.typography, ...ov.typography } : st.typography,
  };
}

/**
 * Explicit widget typography overrides (Style → Typography) as CSS. Only the
 * values the user actually set are returned, so renderers spread this ON TOP
 * of their designed defaults — manual controls always win. Unset properties
 * keep each widget's designed styling (accent colours included).
 */
function typoCss(s: SectionInstance, device: Device = "desktop"): CSSProperties {
  const t = styleForDevice(s, device).typography ?? {};
  // A size explicitly chosen for THIS device is used as-is — never re-shrunk.
  const devSize = device === "desktop" ? undefined : s.style.responsive?.[device]?.typography?.fontSize;
  if (!t && devSize == null) return {};
  const out: CSSProperties = {};
  if (t.fontFamily) out.fontFamily = t.fontFamily.includes('"') || t.fontFamily.includes("'") ? t.fontFamily : `"${t.fontFamily}"`;
  if (devSize != null && devSize !== "") {
    out.fontSize = typeof devSize === "number" ? devSize : String(devSize).trim() || undefined;
  } else if (t.fontSize != null && t.fontSize !== "") {
    const sizeScale = device === "mobile" ? 0.8 : device === "tablet" ? 0.9 : 1; // matches resolveType
    if (typeof t.fontSize === "number") out.fontSize = Math.round(t.fontSize * sizeScale);
    else if (String(t.fontSize).trim()) out.fontSize = String(t.fontSize).trim();
  }
  if (t.fontWeight != null) out.fontWeight = t.fontWeight;
  if (t.lineHeight != null) out.lineHeight = t.lineHeight;
  if (t.letterSpacing != null) out.letterSpacing = t.letterSpacing;
  if (t.textTransform && t.textTransform !== "none") out.textTransform = t.textTransform;
  if (t.textColor) out.color = t.textColor;
  return out;
}

/** Exact per-device font-size override for the active breakpoint (if any). */
function devFontSize(s: SectionInstance, device: Device): number | string | undefined {
  if (device === "desktop") return undefined;
  return s.style.responsive?.[device]?.typography?.fontSize;
}

function sectionStyle(s: SectionInstance, device: Device = "desktop"): CSSProperties {
  const st = styleForDevice(s, device);
  const pad = st.spacing?.padding ?? { top: 64, right: 24, bottom: 64, left: 24 };
  const mar = st.spacing?.margin ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const shrink = device === "mobile" ? 0.55 : device === "tablet" ? 0.78 : 1;
  const bg = st.colors?.bg ?? (isStructural(s.type) ? "transparent" : "transparent");
  const gradient = st.colors?.gradient;
  const styleImg = typeof st.colors?.image === "string" ? st.colors.image : "";
  const settingImg = typeof s.settings.image === "string" ? s.settings.image : "";
  const img = isMediaSrc(styleImg) ? styleImg : isMediaSrc(settingImg) && s.type !== "image" ? settingImg : undefined;

  // Inheritance baseline from Style → Typography: values set here cascade to
  // every child that doesn't define its own — so manual typography on a
  // Section/Container/Row/Column visibly affects its contents.
  const baseTypo = typoCss(s, device);
  const rawHeight = cssLen(st.layout?.height === "fixed" ? st.layout.fixedHeight : undefined, 1, 400);
  const height =
    st.layout?.height === "vh" ? (device === "mobile" ? "auto" : "100vh") : st.layout?.height === "fixed" ? (typeof rawHeight === "number" ? `${rawHeight}px` : rawHeight) : "auto";

  // Sections are ALWAYS 100% wide — width/container control lives on the
  // inner container (containerCss) so backgrounds bleed edge-to-edge.
  void st.layout?.width;

  const toCss = (v: number | string | undefined): string => {
    const len = cssLen(v, shrink, 0);
    return typeof len === "number" ? `${len}px` : String(len);
  };
  return {
    backgroundColor: gradient || img ? undefined : bg,
    backgroundImage: gradient ?? (img ? cssUrl(img) : undefined),
    backgroundSize: img || gradient ? "cover" : undefined,
    backgroundPosition: img || gradient ? "center" : undefined,
    position: "relative",
    color: st.colors?.text ?? "#111827",
    ...baseTypo,
    padding: `${toCss(pad.top)} ${toCss(pad.right)} ${toCss(pad.bottom)} ${toCss(pad.left)}`,
    margin: `${toCss(mar.top)} ${toCss(mar.right)} ${toCss(mar.bottom)} ${toCss(mar.left)}`,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    minHeight: s.type === "column" ? 48 : height !== "auto" ? height : undefined,
    boxSizing: "border-box",
    borderRadius: st.border?.radius != null && st.border.radius !== "" ? st.border.radius : undefined,
    overflow: st.border?.radius ? "hidden" : undefined,
    boxShadow: st.effects?.shadow || undefined,
    ...(st.effects?.glass ? { backdropFilter: "blur(14px) saturate(1.3)", WebkitBackdropFilter: "blur(14px) saturate(1.3)" } : {}),
  };
}

/**
 * Container layer — honours the section's Width mode:
 *  • full   → background bleeds edge-to-edge; content capped at the container
 *             width (default 1200, override via customWidth)
 *  • boxed  → the whole band (background included) caps at customWidth ∥ 1200
 *  • custom → exact band width via customWidth ("960", "80%", "75rem"…)
 */
function containerCss(s: SectionInstance, device: Device = "desktop"): CSSProperties {
  const L = styleForDevice(s, device).layout ?? {};
  const align = L.align ?? "center";
  const mx = align === "center" ? { marginLeft: "auto", marginRight: "auto" } : align === "right" ? { marginLeft: "auto", marginRight: 0 } : { marginLeft: 0, marginRight: "auto" };
  if (L.width === "custom") {
    const w = cssLen(L.customWidth, 1, 900);
    return { width: typeof w === "number" ? `${w}px` : w || "100%", maxWidth: "100%", ...mx };
  }
  if (L.width === "boxed") {
    const w = cssLen(L.customWidth, 1, 1200);
    return { width: typeof w === "number" ? `${w}px` : w, maxWidth: "100%", ...mx };
  }
  // full — bleed background, cap content
  const maxW = cssLen(L.customWidth, 1, 1200);
  return { width: "100%", maxWidth: typeof maxW === "number" ? `${maxW}px` : maxW, ...mx };
}

function Overlay({ section }: { section: SectionInstance }) {
  const overlay = section.style.colors?.overlay;
  if (!overlay) return null;
  return <div style={{ position: "absolute", inset: 0, background: overlay, pointerEvents: "none" }} />;
}

function Inner({ section, children, align }: { section: SectionInstance; children: ReactNode; align?: "left" | "center" | "right" }) {
  const device = useContext(SiteDeviceContext);
  const L = styleForDevice(section, device).layout ?? {};
  const a = align ?? L.align ?? "center";
  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        textAlign: a === "center" ? "center" : a === "right" ? "right" : "left",
        display: "flex",
        flexDirection: L.direction === "column" ? "column" : undefined,
        alignItems:
          L.direction === "column"
            ? a === "center"
              ? "center"
              : a === "right"
                ? "flex-end"
                : "flex-start"
            : undefined,
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}

function Eyebrow(_props: { children: ReactNode; gold?: boolean }) {
  return null;
}

// ---------------------------------------------------------------------------
// Header + Footer chrome
// ---------------------------------------------------------------------------

function PageHeader({
  device,
  live,
  selected,
  onSelect,
}: {
  device: Device;
  live?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const chrome = useContext(SiteChromeContext);
  const header = chrome?.header;
  const brand = chrome?.brand;
  if (!header || !brand) return null;
  const hh = hydrateHeader(header);
  const overlayDesign = hh.design === "overlay";
  const abs = overlayDesign || (hh.transparent && hh.sticky);
  const designName = HEADER_DESIGNS.find((dsg) => dsg.id === hh.design)?.name ?? hh.design;
  return (
    <div style={{ position: hh.sticky ? "sticky" : "relative", top: 0, height: abs ? 0 : "auto", zIndex: 50 }}>
      <style>{`.ps-sec-holder:hover .ps-header-label { opacity: 1 !important; }`}</style>
      <div className="ps-header-label" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 6, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", opacity: 0, transition: "opacity .15s", pointerEvents: "none" }}>
        <span style={{ background: "var(--ps-primary)", color: "#fff", fontSize: 9.5, fontWeight: 800, letterSpacing: 0.8, padding: "2px 8px", borderRadius: 5 }}>HEADER</span>
        <span style={{ fontSize: 11, color: "#fff", fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,.4)" }}>
          {designName} · {hh.sticky ? "Sticky" : "Static"}{overlayDesign ? " · Overlay" : ""}
        </span>
      </div>
      <div style={{ position: abs ? "absolute" : "relative", top: 0, left: 0, right: 0, zIndex: 4 }}>
        <ChromeHeader header={header} brand={brand} device={device} live={live} selected={selected} onSelect={onSelect} />
      </div>
    </div>
  );
}

function PageFooter({
  device,
  live,
  selected,
  onSelect,
}: {
  device: Device;
  live?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const chrome = useContext(SiteChromeContext);
  const header = chrome?.header;
  const footer = chrome?.footer;
  const brand = chrome?.brand;
  if (!footer || !header || !brand) return null;
  const hf = hydrateFooter(footer);
  const designName = FOOTER_DESIGNS.find((dsg) => dsg.id === hf.design)?.name ?? hf.design;
  return (
    <div style={{ position: "relative" }}>
      <div className="ps-header-label" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 6, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", opacity: 0, transition: "opacity .15s", pointerEvents: "none" }}>
        <span style={{ background: "var(--ps-primary)", color: "#fff", fontSize: 9.5, fontWeight: 800, letterSpacing: 0.8, padding: "2px 8px", borderRadius: 5 }}>FOOTER</span>
        <span style={{ fontSize: 11, color: "#fff", fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,.4)" }}>{designName}</span>
      </div>
      <ChromeFooter footer={footer} header={header} brand={brand} device={device} live={live} selected={selected} onSelect={onSelect} />
    </div>
  );
}
function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

// ---------------------------------------------------------------------------
// Cross-widget interaction helpers (popups, gated downloads, lead events)
// ---------------------------------------------------------------------------

/** Any widget can request a popup by id — PopupSection widgets listen globally. */
export function openPopupById(popupId: string) {
  if (!popupId || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("prestate:open-popup", { detail: { popupId } }));
}

/** Programmatic file download — only ever invoked AFTER a validated submission. */
export function downloadFile(url: string) {
  const target = (url || "").trim();
  if (!target || typeof window === "undefined") return;
  const a = document.createElement("a");
  a.href = target;
  a.download = "";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export const LEAD_SUCCESS_EVENT = "prestate:lead-success";

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return digitsOnly(value).length >= 8;
}

type GateField = { id?: string; type?: string; label: string; placeholder?: string; required?: boolean };

/**
 * Shared gated-download modal. Used by the Brochure widget and any Button /
 * Hero CTA configured with the "brochure" action. The download fires ONLY
 * after every required field passes validation.
 */
function GatedDownloadModal({
  open,
  onClose,
  live,
  pageId,
  file,
  heading,
  text,
  fields,
  submitLabel,
  successMessage,
}: {
  open: boolean;
  onClose: () => void;
  live: boolean;
  pageId?: string;
  file: string;
  heading: string;
  text: string;
  fields: GateField[];
  submitLabel: string;
  successMessage: string;
}) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(8,10,20,.62)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <GateForm onClose={onClose} live={live} pageId={pageId} file={file} heading={heading} text={text} fields={fields} submitLabel={submitLabel} successMessage={successMessage} />
    </div>
  );
}

function GateForm({
  onClose,
  live,
  pageId,
  file,
  heading,
  text,
  fields,
  submitLabel,
  successMessage,
}: {
  onClose: () => void;
  live: boolean;
  pageId?: string;
  file: string;
  heading: string;
  text: string;
  fields: GateField[];
  submitLabel: string;
  successMessage: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const validate = (): boolean => {
    for (const f of fields) {
      const v = (values[f.label] ?? "").trim();
      if ((f.required ?? false) && !v && f.type !== "checkbox") {
        setError(`${f.label} is required.`);
        return false;
      }
      if (v && f.type === "email" && !isValidEmail(v)) {
        setError("Please enter a valid email address.");
        return false;
      }
      if (v && f.type === "phone" && !isValidPhone(v)) {
        setError("Please enter a valid phone number.");
        return false;
      }
    }
    return true;
  };

  const submit = () => {
    if (!validate()) return;
    setDone(true);
    if (!live) return;
    firePrestateLead();
    if (pageId) bumpTracking(pageId, "form");
    if (pageId) bumpTracking(pageId, "brochure");
    window.setTimeout(() => {
      downloadFile(file);
      onClose();
    }, 900);
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="ps-fade-in" style={{ position: "relative", width: 460, maxWidth: "100%", ...wtCard({ padding: "34px 30px 30px", boxShadow: "0 30px 80px rgba(8,10,20,.45)" }) }}>
      <button type="button" aria-label="Close" onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", border: "none", background: WT.surfaceMuted, color: WT.slate, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <X size={16} />
      </button>
        {!done ? (
          <>
            <div style={{ fontSize: 21, fontWeight: 800, color: WT.ink, letterSpacing: -0.3 }}>{heading}</div>
            {text ? <p style={{ fontSize: 13.5, color: WT.slate, lineHeight: 1.6, margin: "8px 0 18px" }}>{text}</p> : <div style={{ height: 14 }} />}
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {(fields.length ? fields : [{ label: "Full Name", type: "text", required: true } as GateField]).map((f, i) => (
                <div key={f.id || f.label || i}>
                  {f.type !== "checkbox" ? (
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: WT.slate, marginBottom: 5, display: "block" }}>
                      {f.label} {f.required !== false ? "*" : ""}
                    </label>
                  ) : null}
                  {f.type === "select" && Array.isArray((f as unknown as { options?: string[] }).options) ? (
                    <select className="ps-input" value={values[f.label] ?? ""} onChange={(e) => setValues((p) => withFieldValue(p, f, e.target.value))} style={{ padding: "11px 12px" }}>
                      <option value="">Choose</option>
                      {((f as unknown as { options: string[] }).options).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea className="ps-input" placeholder={f.placeholder} value={values[f.label] ?? ""} onChange={(e) => setValues((p) => withFieldValue(p, f, e.target.value))} style={{ minHeight: 80, padding: "11px 12px" }} />
                  ) : f.type === "checkbox" ? (
                    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "var(--ps-slate)" }}>
                      <input type="checkbox" checked={(values[f.label] ?? "") === "yes"} onChange={(e) => setValues((p) => withFieldValue(p, f, e.target.checked ? "yes" : ""))} />
                      {f.label}
                    </label>
                  ) : (
                    <input
                      className="ps-input"
                      type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : "text"}
                      placeholder={f.placeholder}
                      value={values[f.label] ?? ""}
                      onChange={(e) => setValues((p) => withFieldValue(p, f, e.target.value))}
                      style={{ padding: "11px 12px" }}
                    />
                  )}
                </div>
              ))}
            </div>
            {error ? <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 10, background: WT.dangerSoft, color: WT.danger, fontSize: 12.5, fontWeight: 600 }}> {error}</div> : null}
            <button type="button" onClick={submit} style={{ ...wtButton({ block: true }), marginTop: 16 }}>
              {submitLabel || "Submit & Download"}
            </button>
            <div style={{ textAlign: "center", fontSize: 11, color: WT.muted, marginTop: 10 }}>The download starts only after a successful submission.</div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "22px 4px" }}>
            <span style={{ width: 58, height: 58, borderRadius: "50%", background: WT.successSoft, color: WT.success, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <CheckCircle2 size={28} />
            </span>
            <div style={{ fontSize: 19, fontWeight: 800, color: WT.ink }}>{successMessage || "Success — your brochure is downloading."}</div>
          </div>
        )}
    </div>
  );
}


function FloatingContactDock({
  live,
  device,
  widget,
}: {
  live?: boolean;
  device: Device;
  widget?: SectionInstance | null;
}) {
  const chrome = useContext(SiteChromeContext);
  const form = useContext(SiteFormContext);
  const pageId = useContext(SitePageIdContext);
  const header = chrome?.header;
  const brand = chrome?.brand;
  const st = widget?.settings ?? {};
  const enabled = widget ? true : (header?.floatEnabled ?? true);
  if (!enabled) return null;

  const showWa = widget ? st.whatsapp !== false : (header?.floatWhatsapp ?? true);
  const showCall = widget ? st.call !== false : (header?.floatCall ?? true);
  const showEnquire = widget ? st.enquire !== false : (header?.floatEnquire ?? true);
  const showEmail = widget ? st.email !== false : (header?.floatEmail ?? true);
  const side = textOf(st.side || header?.floatSide || "right") === "left" ? "left" : "right";

  const phone = textOf(st.phone || brand?.phone || "").trim();
  const waRaw = textOf(st.number || form?.whatsapp || phone).trim();
  const email = String(brand?.email || "").trim();
  const enquireHref = header?.ctaLink || "#lead-form";
  const size = device === "mobile" ? 46 : 52;

  const items: { key: string; href: string; title: string; bg: string; icon: ReactNode; track?: "whatsapp" | "call" | "form"; external?: boolean }[] = [];
  if (showWa && digitsOnly(waRaw)) {
    items.push({
      key: "wa",
      href: `https://wa.me/${digitsOnly(waRaw)}`,
      title: "WhatsApp",
      bg: "linear-gradient(135deg,#25d366,#128c7e)",
      icon: <MessageCircle size={device === "mobile" ? 20 : 22} />,
      track: "whatsapp",
      external: true,
    });
  }
  if (showCall && digitsOnly(phone)) {
    items.push({
      key: "call",
      href: `tel:${digitsOnly(phone)}`,
      title: "Call",
      bg: "linear-gradient(135deg,#2563eb,#1d4ed8)",
      icon: <PhoneCall size={device === "mobile" ? 20 : 22} />,
      track: "call",
    });
  }
  if (showEnquire) {
    items.push({
      key: "enquire",
      href: enquireHref,
      title: header?.cta || "Enquire",
      bg: "linear-gradient(135deg,var(--ps-primary),#8a7bff)",
      icon: <Sparkles size={device === "mobile" ? 20 : 22} />,
      track: "form",
    });
  }
  if (showEmail && email) {
    items.push({
      key: "email",
      href: `mailto:${email}`,
      title: "Email",
      bg: "linear-gradient(135deg,#0f172a,#334155)",
      icon: <Mail size={device === "mobile" ? 20 : 22} />,
    });
  }
  if (!items.length) return null;

  const onActivate = (item: (typeof items)[number], e: ReactMouseEvent) => {
    if (!live) {
      e.preventDefault();
      return;
    }
    if (item.track && pageId) bumpTracking(pageId, item.track === "form" ? "form" : item.track);
  };

  return (
    <div
      className="ps-float-dock"
      data-side={side}
      style={{
        position: live ? "fixed" : "absolute",
        [side]: live ? 16 : 14,
        top: live ? undefined : 160,
        bottom: live ? (device === "mobile" ? 88 : 28) : 100,
        zIndex: 85,
        display: "flex",
        flexDirection: "column",
        justifyContent: live ? "flex-end" : "center",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          title={item.title}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noopener noreferrer" : undefined}
          className={`ps-float-btn${item.key === "wa" ? " ps-float-btn--pulse" : ""}`}
          onClick={(e) => onActivate(item, e)}
          style={{
            pointerEvents: "auto",
            width: size,
            height: size,
            borderRadius: "50%",
            background: item.bg,
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 24px rgba(15,23,42,.28)",
            textDecoration: "none",
          }}
        >
          {item.icon}
          <span className="ps-float-tip">{item.title}</span>
        </a>
      ))}
    </div>
  );
}

function FloatingIconsHint({ s }: { s: SectionInstance }) {
  const st = s.settings;
  return (
    <div style={{ border: `1.5px dashed ${WT.borderStrong}`, borderRadius: WT.radiusSm, padding: "16px 18px", background: hexToSoft(WT.primary, 0.08), color: WT.slate, fontSize: 13, lineHeight: 1.55 }}>
      <strong style={{ color: WT.ink }}>Floating icons</strong> — WhatsApp, Call, Enquire and Email stay on the {textOf(st.side || "right")} edge of the page (builder and live preview).
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section renderer — actual landing page content
// ---------------------------------------------------------------------------

function iconFor(slug: string | undefined, size = 20, fallback = Sparkles) {
  if (isMediaSrc(slug)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={slug} alt="" style={{ width: size, height: size, objectFit: "contain", display: "block" }} />
    );
  }
  const Icon = (slug && SLUG_ICONS[slug]) || fallback;
  return <Icon size={size} />;
}

type CtaAction = "link" | "popup" | "brochure" | "call" | "whatsapp";

function resolveCtaHref(action: CtaAction, link: string, phone?: string): string {
  const target = (link || "").trim();
  if (action === "call") return `tel:${(phone ?? "").replace(/[^+0-9]/g, "")}`;
  if (action === "whatsapp") return `https://wa.me/${digitsOnly(phone ?? "")}`;
  return target || "#";
}

function useCtaHandlers(live: boolean) {
  return (
    action: CtaAction,
    link: string,
    opts?: { openBrochure: () => void; openPopup: () => void },
  ) => ({
    onClick: (e: ReactMouseEvent) => {
      if (!live) {
        e.preventDefault();
        return;
      }
      if (action === "brochure") {
        e.preventDefault();
        opts?.openBrochure();
        return;
      }
      if (action === "popup") {
        e.preventDefault();
        opts?.openPopup();
        return;
      }
      const target = (link || "").trim();
      if (target.startsWith("#") && target.length > 1) {
        const el = document.getElementById(target.slice(1));
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    },
  });
}

function HeroSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const pageId = useContext(SitePageIdContext);
  const wt = useContext(SiteLayoutThemeContext);
  const T = typoCss(s, device);
  const design = String(s.settings.design ?? "classic");
  const primaryAction = textOf(st.primaryAction ?? "link") as CtaAction;
  const secondaryAction = textOf(st.secondaryAction ?? "link") as CtaAction;
  const primaryLink = textOf(st.primaryLink ?? "#enquiry");
  const secondaryLink = textOf(st.secondaryLink ?? "");
  const gateFile = textOf(st.file ?? "").trim();
  const heroStats = Array.isArray(st.heroStats) ? (st.heroStats as { value: string; label: string }[]) : [];
  const highlights = Array.isArray(st.highlights) ? (st.highlights as string[]) : [];
  const [gateOpen, setGateOpen] = useState(false);
  const handle = useCtaHandlers(live);
  const gateFields = Array.isArray(st.gateFields) && st.gateFields.length
    ? (st.gateFields as GateField[])
    : [
        { label: "Full Name", type: "text", required: true },
        { label: "Phone Number", type: "phone", required: true },
      ];
  const isCentered = design === "centered";
  const isSplit = design === "split";
  const sideCardStats = heroStats.slice(0, isSplit ? 3 : 4);
  const contentWidth = isCentered ? 820 : isSplit ? 620 : 680;
  const sideCardColumns = device === "mobile" ? "1fr" : device === "tablet" ? "repeat(2,1fr)" : `repeat(${Math.min(sideCardStats.length || 1, isSplit ? 3 : 2)},1fr)`;
  return (
    <div style={{ position: "relative", minHeight: device === "mobile" ? 580 : device === "tablet" ? 700 : 820, display: "flex", alignItems: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        {isMediaSrc(textOf(st.image || st.heroArt || "")) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={textOf(st.image || st.heroArt)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: "scale(1.02)", transition: wt.transitionSlow }} />
        ) : (
          <SceneImage art={textOf(st.heroArt ?? st.image ?? "hero")} />
        )}
      </div>
      <Overlay section={s} />
      <div style={{ position: "absolute", inset: 0, background: isCentered ? "linear-gradient(180deg, rgba(8,10,20,.58) 0%, rgba(8,10,20,.32) 55%, rgba(8,10,20,.48) 100%)" : "linear-gradient(90deg, rgba(8,10,20,.78) 0%, rgba(8,10,20,.48) 48%, rgba(8,10,20,.16) 100%)", zIndex: 1 }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(800px 400px at 20% 20%, rgba(196,164,106,.10), transparent 60%)", zIndex: 1, pointerEvents: "none" }} />
      <Inner section={s} align={isCentered ? "center" : "left"}>
       <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: isCentered ? "1fr" : device === "desktop" ? (isSplit ? "minmax(0, 1.08fr) minmax(320px, .92fr)" : "minmax(0, 1.15fr) minmax(320px, .85fr)") : "1fr",
            gap: device === "mobile" ? 20 : 28,
            alignItems: "center",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div style={{ maxWidth: contentWidth, margin: isCentered ? "0 auto" : undefined, textAlign: isCentered ? "center" : "left", animation: "ps-fade-in .6s ease both" }}>
            <h1 className="ps-canvas-serif" style={{ fontSize: device === "mobile" ? 34 : device === "tablet" ? 44 : 58, lineHeight: 1.05, fontWeight: 800, color: "#fff", letterSpacing: -0.8, margin: "0 0 12px", textAlign: isCentered ? "center" : "left", textShadow: "0 2px 18px rgba(0,0,0,.28)", ...T }}>{textOf(resolveVars(st.heading))}</h1>
            <p style={{ fontSize: device === "mobile" ? 16.5 : device === "tablet" ? 18 : 20, color: "rgba(255,255,255,.88)", fontWeight: 500, letterSpacing: 0.2, marginBottom: 22, lineHeight: 1.5, textAlign: isCentered ? "center" : "left", maxWidth: isCentered ? 640 : 560, marginLeft: isCentered ? "auto" : undefined, marginRight: isCentered ? "auto" : undefined, ...T }}>{textOf(resolveVars(st.subheading))}</p>
            <div style={{ display: "inline-flex", alignItems: "baseline", gap: 10, marginBottom: 6, justifyContent: isCentered ? "center" : "flex-start", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", padding: "6px 12px", borderRadius: 999, backdropFilter: "blur(6px)" }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", color: "#c4a46a" }}>{textOf(st.priceLabel ?? "STARTING FROM")}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>•</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.75)", letterSpacing: 0.4 }}>{textOf(st.priceNote || "Possession Dec 2027 • RERA Approved")}</span>
            </div>
            <div className="ps-canvas-serif" style={{ fontSize: device === "mobile" ? 30 : 38, fontWeight: 800, color: "#fff", textAlign: isCentered ? "center" : "left", letterSpacing: -0.6, textShadow: "0 2px 12px rgba(0,0,0,.22)", ...T }}>{textOf(resolveVars(st.price)).replace(/^Starting From\s*/i, "")}</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: isCentered ? "center" : "flex-start", marginTop: 22 }}>
              <a
                href={resolveCtaHref(primaryAction, primaryLink)}
                {...handle(primaryAction, primaryLink, { openBrochure: () => setGateOpen(true), openPopup: () => undefined })}
                style={{ ...wtButton({ accent: st.accent, size: "lg" }, wt), padding: "14px 26px", fontSize: 14.5, boxShadow: `0 10px 28px ${hexToSoft(st.accent as string || wt.primary, 0.38)}`, transform: "translateY(0)", transition: wt.transition }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                {textOf(resolveVars(st.ctaPrimary))} <ArrowRight size={15} />
              </a>
              {!isCentered ? (
                <a
                  href={resolveCtaHref(secondaryAction, secondaryLink || (gateFile ? "#" : ""))}
                  {...handle(secondaryAction, secondaryLink, { openBrochure: () => setGateOpen(true), openPopup: () => undefined })}
                  style={{ ...wtButtonLight({ size: "lg" }, wt), padding: "14px 26px", backdropFilter: "blur(10px)" }}
                >
                  <Download size={15} /> {textOf(resolveVars(st.ctaSecondary))}
                </a>
              ) : null}
            </div>
            {!isCentered && highlights.length ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 26, justifyContent: "flex-start" }}>
                {highlights.map((h) => (
                  <span key={h} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.16)", backdropFilter: "blur(8px)", padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, boxShadow: "0 2px 10px rgba(0,0,0,.12)" }}>
                     <CheckCircle2 size={12} style={{ color: "#c4a46a" }} /> {h}
                   </span>
                ))}
               </div>
            ) : null}
           </div>

          {!isCentered ? (
            <div style={{ display: "grid", gap: 14, animation: "ps-fade-in .7s ease .15s both" }}>
              <div style={{ ...wtCardGlass({ padding: device === "mobile" ? "18px" : "22px" }, wt), background: "rgba(11,18,32,.45)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,.14)", borderRadius: wt.radiusLg }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c4a46a" }} />
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(255,255,255,.72)" }}>
                    {isSplit ? "Project at a glance" : "Quick facts"}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.45)", background: "rgba(255,255,255,.08)", padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,.10)" }}>{sideCardStats.length} key facts</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: sideCardColumns, gap: 10 }}>
                  {sideCardStats.map((x) => (
                    <div key={x.label} style={{ background: "rgba(255,255,255,.09)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: "14px 14px", backdropFilter: "blur(8px)", transition: wt.transition }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>{x.value}</div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.68)", marginTop: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{x.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {isSplit ? (
                <div style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)", borderRadius: wt.radiusLg, padding: device === "mobile" ? "18px" : "20px", backdropFilter: "blur(12px)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "#c4a46a", marginBottom: 8 }}>
                    Why buyers choose this
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "rgba(255,255,255,.82)" }}>
                    {textOf(st.priceNote || "Designed for strong enquiry conversion with a clean CTA-first layout — RERA approved, metro connected, ready amenities.")}
                  </div>
                  <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
                    <span style={{ ...wtBadge({ gold: true }, undefined, wt), background: "rgba(196,164,106,.18)", color: "#fff", border: "1px solid rgba(196,164,106,.28)" }}>RERA ✓</span>
                    <span style={{ ...wtBadge(undefined, undefined, wt), background: "rgba(79,70,229,.18)", color: "#fff", border: "1px solid rgba(79,70,229,.28)" }}>Metro 500m</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {isCentered ? (
          <div style={{ width: "100%", maxWidth: 920, margin: "32px auto 0", position: "relative", zIndex: 2 }}>
            <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : device === "tablet" ? "repeat(2,1fr)" : `repeat(${Math.min(heroStats.length || 1, 4)},1fr)`, gap: 12 }}>
              {heroStats.map((x) => (
                <div key={x.label} style={{ background: "rgba(255,255,255,.09)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 14, padding: "16px 16px", textAlign: "center", backdropFilter: "blur(10px)" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>{x.value}</div>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.68)", marginTop: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.7 }}>{x.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
       </Inner>
      {(secondaryAction === "brochure" || primaryAction === "brochure") ? (
       <GatedDownloadModal
         open={gateOpen}
          onClose={() => setGateOpen(false)}
          live={!!live}
          pageId={pageId}
          file={gateFile}
          heading={textOf(st.gateHeading || "Get the brochure")}
          text={textOf(st.gateText || "")}
          fields={gateFields}
          submitLabel={textOf(st.gateButton || "Submit & Download")}
          successMessage={textOf(st.gateSuccessMessage || "Verified — your brochure is downloading.")}
        />
      ) : null}
    </div>
  );
}

function HighlightsSection({ s, device }: { s: SectionInstance; device: Device }) {
  const wt = useContext(SiteLayoutThemeContext);
  const items = (s.settings.items ?? []) as { icon?: string; value: string; label: string }[];
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : Math.min(items.length || 1, 5);
  const txt = s.style.colors?.text;
  const T = typoCss(s, device);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 0, background: txt ? "transparent" : wt.surface, border: txt ? "none" : wt.border, borderRadius: txt ? 0 : wt.radiusLg, overflow: "hidden", boxShadow: txt ? "none" : wt.shadowSm }}>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: "22px 18px",
            borderRight: device === "mobile" || (device === "tablet" && i % 2 === 1) || i === items.length - 1 ? "none" : `1px solid ${txt ? "rgba(255,255,255,.12)" : "rgba(16,24,40,.06)"}`,
            borderBottom: device !== "desktop" && i < items.length - 1 ? `1px solid ${txt ? "rgba(255,255,255,.12)" : "rgba(16,24,40,.06)"}` : "none",
            background: txt ? "transparent" : "#fff",
            transition: wt.transition,
          }}
        >
          <span style={{ ...(txt ? wtIconBadgeGlass(42, wt) : { ...wtIconBadge(undefined, wt), background: wt.primarySoft, color: wt.primary }), boxShadow: txt ? "none" : wt.shadowSm }}>
             {iconFor(it.icon, 20)}
           </span>
           <div>
             <div style={{ fontSize: 19, fontWeight: 800, color: txt ?? wt.ink, letterSpacing: -0.2, ...T }}>{it.value}</div>
             <div style={{ fontSize: 11, color: txt ? "rgba(255,255,255,.72)" : wt.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, ...T }}>{it.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Property Statistics — standalone big-number counters — premium
function StatsSection({ s, device }: { s: SectionInstance; device: Device }) {
  const wt = useContext(SiteLayoutThemeContext);
  const st = s.settings;
  const items = (st.items ?? []) as { icon?: string; value: string; label: string }[];
  const variant = textOf(st.style ?? st.design ?? "cards");
  const cols = device === "mobile" ? 2 : device === "tablet" ? 3 : Math.min(items.length || 1, 5);
  const txt = s.style.colors?.text;
  const T = typoCss(s, device);
  if (variant === "minimal") {
    return (
      <>
        {st.heading ? (
          <Inner section={s}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 28, height: 2, background: wt.gold, borderRadius: 999 }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: wt.gold }}>Key Metrics</span>
            </div>
            <h2 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 24 : 30, fontWeight: 800, margin: 0, letterSpacing: -0.4, ...T }}>{textOf(resolveVars(st.heading))}</h2>
          </Inner>
        ) : null}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: device === "mobile" ? 16 : 28, marginTop: st.heading ? 28 : 0 }}>
          {items.map((it) => (
            <div key={it.label} style={{ textAlign: "center", padding: "14px 8px", color: txt ?? undefined, position: "relative" }}>
               <span style={{ display: "inline-flex", marginBottom: 12, color: txt ? "rgba(255,255,255,.9)" : wt.primary, background: txt ? "rgba(255,255,255,.12)" : wt.primarySoft, width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>{iconFor(it.icon, 22)}</span>
               <div className="ps-canvas-serif" style={{ ...wtStatValue(undefined, wt), fontSize: device === "mobile" ? 28 : 36, letterSpacing: -0.6, ...T }}>{it.value}</div>
               <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: txt ? "rgba(255,255,255,.65)" : wt.muted, marginTop: 6, ...T }}>{it.label}</div>
               <div style={{ width: 32, height: 2, background: wt.gold, borderRadius: 999, margin: "10px auto 0", opacity: 0.6 }} />
            </div>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      {st.heading ? (
        <Inner section={s}>
           <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 28, height: 2, background: wt.primary, borderRadius: 999 }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: wt.primary }}>At a Glance</span>
           </div>
           <h2 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 24 : 32, fontWeight: 800, margin: 0, letterSpacing: -0.4, ...T }}>{textOf(resolveVars(st.heading))}</h2>
        </Inner>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 14, marginTop: st.heading ? 28 : 0 }}>
        {items.map((it) => (
           <div key={it.label} style={{ background: txt ? "rgba(255,255,255,.08)" : wt.surface, border: txt ? "1px solid rgba(255,255,255,.14)" : wt.border, borderRadius: wt.radiusLg, padding: device === "mobile" ? "20px 14px" : "26px 20px", textAlign: "center", color: txt ?? undefined, boxShadow: txt ? "0 8px 24px rgba(0,0,0,.12)" : wt.shadowMd, backdropFilter: txt ? "blur(10px)" : undefined, transition: wt.transition }}>
             <span style={{ background: txt ? "rgba(255,255,255,.14)" : wt.primarySoft, color: txt ? "#fff" : wt.primary, width: 44, height: 44, borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14, boxShadow: txt ? "none" : wt.shadowSm }}>
               {iconFor(it.icon, 20)}
             </span>
             <div style={{ ...wtStatValue(undefined, wt), fontSize: device === "mobile" ? 22 : 28, letterSpacing: -0.4, ...T }}>{it.value}</div>
             <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: txt ? "rgba(255,255,255,.72)" : wt.muted, marginTop: 6, ...T }}>{it.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// Standalone text link
function LinkSection({ s }: { s: SectionInstance }) {
  const live = useContext(SiteLiveContext);
  const text = String(resolveVars(s.settings.text ?? "Learn more"));
  const href = String(s.settings.href ?? "#");
  const align = (s.style.layout?.align as "left" | "center" | "right" | undefined) ?? (String(s.settings.align ?? "center") as "left" | "center" | "right");
  return (
    <div style={{ textAlign: align }}>
      <a
        {...anchorNav(href, live)}
        onClick={(e) => {
          if (!live) {
            e.preventDefault();
            return;
          }
          const target = href.trim();
          if (target.startsWith("#") && target.length > 1) {
            const el = document.getElementById(target.slice(1));
            if (el) {
              e.preventDefault();
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
        }}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14.5, fontWeight: 700, color: WT.primary, textDecoration: "underline", textDecorationColor: hexToSoft(WT.primary, 0.35), textUnderlineOffset: 4, cursor: "pointer" }}
      >
        {text} <ArrowRight size={14} />
      </a>
    </div>
  );
}

// Social sharing row
function SocialShareSection({ s }: { s: SectionInstance }) {
  const heading = String(s.settings.heading ?? "");
  const channels = (Array.isArray(s.settings.channels) ? s.settings.channels : ["whatsapp", "facebook", "x", "linkedin", "copy"]) as string[];
  const [copied, setCopied] = useState(false);
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = encodeURIComponent(String(resolveVars("Check out {{property_name}} — {{starting_price}}")));
  const btn = (label: string, icon: ReactNode, href?: string, bg = "#111827", onClick?: () => void) => (
    <a
      key={label}
      href={onClick ? undefined : href || "#"}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (!onClick) return;
        e.preventDefault();
        onClick();
      }}
      title={label}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 999, background: bg, color: "#fff", cursor: "pointer", textDecoration: "none", boxShadow: WT.shadowSm }}
    >
      {icon}
    </a>
  );
  const items: ReactNode[] = [];
  const urlEnc = encodeURIComponent(pageUrl);
  const glyphBtn = (label: string, glyph: ReactNode, href?: string, bg = "#111827", onClick?: () => void) =>
    btn(label, glyph, href, bg, onClick);
  if (channels.includes("whatsapp")) items.push(glyphBtn("WhatsApp", <MessageCircle size={19} />, `https://wa.me/?text=${shareText}%20${urlEnc}`, "linear-gradient(135deg,#25d366,#128c7e)"));
  if (channels.includes("facebook")) items.push(glyphBtn("Facebook", <span style={{ fontSize: 17, fontWeight: 800, fontFamily: "Georgia, serif" }}>f</span>, `https://www.facebook.com/sharer/sharer.php?u=${urlEnc}`, "#1877f2"));
  if (channels.includes("x")) items.push(glyphBtn("X / Twitter", <span style={{ fontSize: 15, fontWeight: 800 }}>𝕏</span>, `https://twitter.com/intent/tweet?text=${shareText}&url=${urlEnc}`, "#111827"));
  if (channels.includes("linkedin")) items.push(glyphBtn("LinkedIn", <span style={{ fontSize: 14, fontWeight: 800 }}>in</span>, `https://www.linkedin.com/sharing/share-offsite/?url=${urlEnc}`, "#0a66c2"));
  if (channels.includes("copy"))
    items.push(
      btn(
        copied ? "Link copied!" : "Copy link",
        copied ? <Check size={18} /> : <Link2 size={17} />,
        undefined,
        copied ? "#16a34a" : "#64748b",
        () => {
          try {
            void navigator.clipboard?.writeText(pageUrl);
          } catch {
            /* clipboard unavailable */
          }
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        },
      ),
    );
  return (
    <div style={{ textAlign: "center", width: "100%" }}>
      {heading ? <div style={{ fontSize: 13.5, fontWeight: 700, color: WT.slate, marginBottom: 14, display: "inline-flex", alignItems: "center", gap: 7 }}><Share2 size={15} /> {heading}</div> : null}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>{items}</div>
    </div>
  );
}

function OverviewSection({ s, device }: { s: SectionInstance; device: Device }) {
  const wt = useContext(SiteLayoutThemeContext);
  const st = s.settings;
  const T = typoCss(s, device);
  return (
    <div style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "1.05fr 1fr" : "1fr", gap: device === "mobile" ? 28 : 44, alignItems: "center" }}>
      <div style={{ position: "relative" }}>
        <div style={{ borderRadius: wt.radiusLg, overflow: "hidden", boxShadow: wt.shadowLg, border: wt.border, position: "relative" }}>
          {isMediaSrc(textOf(st.image)) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={textOf(st.image)} alt="" style={{ width: "100%", height: "100%", minHeight: 320, objectFit: "cover", display: "block", transition: wt.transition }} />
          ) : (
            <SceneImage art={textOf(st.image || "lobby")} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 60%, rgba(15,23,42,.08))", pointerEvents: "none" }} />
        </div>
         <div style={{ ...wtCardPremium({ position: "absolute", bottom: -18, right: device === "mobile" ? 12 : 24, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, border: wt.borderStrong }, wt), boxShadow: wt.shadowMd }}>
           <span style={{ ...wtIconBadge({ size: 40 }, wt), background: wt.goldSoft, color: wt.gold }}>
             <ShieldCheck size={18} />
           </span>
           <div>
             <div style={{ fontSize: 12.5, fontWeight: 800, color: wt.ink, letterSpacing: -0.2 }}>RERA Approved</div>
             <div style={{ fontSize: 11, color: wt.muted, fontWeight: 600 }}>{PROPERTY.reraNumber}</div>
          </div>
        </div>
      </div>
      <div style={{ paddingLeft: device === "desktop" ? 8 : 0 }}>
         <h2 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 28 : 36, margin: "0 0 14px", lineHeight: 1.12, letterSpacing: -0.6, ...T }}>{textOf(st.heading)}</h2>
         <p style={{ ...wtSectionLede(undefined, wt), lineHeight: 1.75, marginBottom: 20, fontSize: 15, ...T }}>{textOf(st.text)}</p>
         <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
           {((st.bullets as string[] | undefined) ?? []).map((b) => (
             <div key={b} style={{ display: "flex", alignItems: "center", gap: 10, background: wt.surfaceMuted, border: wt.borderFaint, borderRadius: 10, padding: "9px 12px" }}>
               <span style={{ width: 22, height: 22, borderRadius: "50%", background: wt.successSoft, color: wt.success, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                 <Check size={11} strokeWidth={3} />
               </span>
               <span style={{ fontSize: 13, fontWeight: 600, color: wt.inkSoft }}>{b}</span>
             </div>
           ))}
         </div>
         <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "repeat(3,1fr)", gap: 10 }}>
           {((st.stats as { value: string; label: string }[] | undefined) ?? []).map((x) => (
             <div key={x.label} style={{ background: wt.surface, border: wt.border, borderRadius: wt.radius, padding: "14px 12px", textAlign: "center", boxShadow: wt.shadowSm, transition: wt.transition }}>
               <div style={{ fontSize: 18, fontWeight: 800, color: wt.primary, letterSpacing: -0.3 }}>{x.value}</div>
               <div style={{ fontSize: 10, color: wt.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 3 }}>{x.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AmenitiesSection({ s, device }: { s: SectionInstance; device: Device }) {
  const wt = useContext(SiteLayoutThemeContext);
  const st = s.settings;
  const design = String(s.settings.design ?? "grid");
  const items = (st.items ?? []) as { icon?: string; title: string; desc: string }[];
  const T = typoCss(s, device);
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : 4;
  if (design === "list") {
    return (
      <>
         <Inner section={s}><Eyebrow>{textOf(st.eyebrow)}</Eyebrow><h2 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 26 : 34, margin: "14px 0 8px", ...T }}>{textOf(st.heading)}</h2><p style={{ fontSize: 14, color: wt.slate, maxWidth: 560, lineHeight: 1.65, ...T }}>{textOf(st.text)}</p></Inner>
         <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "1fr 1fr", gap: 12, width: "100%", margin: "34px 0 0" }}>
           {items.map((it, i) => (
             <div key={i} className="ps-card" style={{ ...wtCard({ padding: "16px 18px" }, wt), display: "flex", alignItems: "center", gap: 14 }}>
               <span style={{ ...wtIconBadge({ size: 44 }, wt) }}>{iconFor(it.icon, 20)}</span>
               <div><div style={{ fontSize: 14, fontWeight: 800, color: wt.ink, ...T }}>{it.title}</div><div style={{ fontSize: 12.5, color: wt.slate, lineHeight: 1.5, ...T }}>{it.desc}</div></div>
            </div>
          ))}
        </div>
      </>
    );
  }
  if (design === "compact") {
    return (
      <>
         <Inner section={s}><Eyebrow>{textOf(st.eyebrow)}</Eyebrow><h2 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 26 : 34, margin: "14px 0 8px", ...T }}>{textOf(st.heading)}</h2><p style={{ fontSize: 14, color: wt.slate, maxWidth: 560, lineHeight: 1.65, ...T }}>{textOf(st.text)}</p></Inner>
         <div style={{ display: "flex", flexWrap: "wrap", gap: 10, width: "100%", margin: "34px 0 0", justifyContent: device === "mobile" ? "flex-start" : "center" }}>
           {items.map((it, i) => (
             <span key={i} style={{ ...wtPill("#fff", wt.ink, undefined, wt), padding: "10px 16px", border: wt.border, boxShadow: wt.shadowSm }}><span style={{ color: wt.primary, display: "inline-flex" }}>{iconFor(it.icon, 16)}</span> {it.title}</span>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
       <Inner section={s}>
         <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
           <span style={{ width: 28, height: 2, background: wt.gold, borderRadius: 999 }} />
           <Eyebrow>{textOf(st.eyebrow)}</Eyebrow>
         </div>
         <h2 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 26 : 34, margin: "0 0 8px", letterSpacing: -0.4, ...T }}>{textOf(st.heading)}</h2>
         <p style={{ fontSize: 14.5, color: wt.slate, maxWidth: 560, lineHeight: 1.65, ...T }}>{textOf(st.text)}</p>
       </Inner>
       <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 16, width: "100%", margin: "32px 0 0" }}>
         {items.map((it, i) => (
           <div key={i} className="ps-card ps-amenity-card" style={{ ...wtCardPremium({ padding: "22px 18px" }, wt), textAlign: "left", transition: wt.transition }}>
             <span style={{ ...wtIconBadge({ size: 44, gold: i % 3 === 1 }, wt), marginBottom: 14, boxShadow: wt.shadowSm }}>
               {iconFor(it.icon, 21)}
             </span>
             <div style={{ fontSize: 14.5, fontWeight: 800, color: wt.ink, letterSpacing: -0.2, ...T }}>{it.title}</div>
             <div style={{ fontSize: 12.5, color: wt.slate, marginTop: 6, lineHeight: 1.6, ...T }}>{it.desc}</div>
             <div style={{ width: 32, height: 2, background: wt.gold, borderRadius: 999, marginTop: 12, opacity: 0.7 }} />
          </div>
        ))}
      </div>
      <style>{`.ps-amenity-card:hover { transform: translateY(-2px); box-shadow: ${wt.shadowHover} !important; border-color: rgba(79,70,229,.14) !important; }`}</style>
    </>
  );
}

const GALLERY_ART = ["skyline", "lobby", "pool", "tower", "garden", "interior"];

function GallerySection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const wt = useContext(SiteLayoutThemeContext);
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : 3;
  const T = typoCss(s, device);
  const images = (Array.isArray(st.images) ? (st.images as string[]) : []).slice(0, 6);
  const captions = Array.isArray(st.captions) ? (st.captions as string[]) : [];
  const lightboxOn = st.lightbox !== false;
  const canOpen = live && lightboxOn && images.length > 0;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const slides = images.map((img, i) => ({
    type: "image" as const,
    src: isMediaSrc(img) ? img : "",
    alt: captions[i] || `${textOf(st.heading || "Gallery")} ${i + 1}`,
    caption: captions[i] || undefined,
    art: isMediaSrc(img) ? undefined : GALLERY_ART[i % GALLERY_ART.length],
  }));

  return (
    <>
      <Inner section={s}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ width: 28, height: 2, background: wt.primary, borderRadius: 999 }} />
          <Eyebrow>{textOf(st.eyebrow)}</Eyebrow>
        </div>
        <h2 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 26 : 34, letterSpacing: -0.5, margin: "0 0 8px", ...T }}>{textOf(st.heading)}</h2>
        <p style={{ ...wtSectionLede(undefined, wt), fontSize: 14.5, maxWidth: 520, lineHeight: 1.65, ...T }}>{textOf(st.text)}</p>
      </Inner>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 16, margin: "32px 0 0", width: "100%" }}>
        {images.map((img, i) => (
          <div
            key={i}
            onClick={canOpen ? (e) => { e.stopPropagation(); setOpenIndex(i); } : undefined}
            className="ps-gallery-card"
            style={{ borderRadius: wt.radiusLg, overflow: "hidden", position: "relative", aspectRatio: "4/3", cursor: canOpen ? "zoom-in" : "pointer", boxShadow: wt.shadowMd, border: wt.border, background: wt.surface, transition: wt.transition }}
          >
            <div style={{ width: "100%", height: "100%", overflow: "hidden", transition: wt.transition }} className="ps-gallery-img">
              {isMediaSrc(img) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt={captions[i] || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: wt.transitionSlow }} />
              ) : (
                <SceneImage art={GALLERY_ART[i % GALLERY_ART.length]} />
              )}
            </div>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(8,10,20,.62))", opacity: 0, transition: "opacity .2s", display: "flex", alignItems: "flex-end", padding: 14 }} className="ps-gal-overlay">
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.22)", backdropFilter: "blur(8px)", padding: "6px 10px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Eye size={12} /> {captions[i] || `View ${i + 1}`}
              </span>
            </div>
          </div>
        ))}
      </div>
      <style>{`.ps-gallery-card:hover { transform: translateY(-2px); box-shadow: ${wt.shadowHover} !important; } .ps-gallery-card:hover .ps-gallery-img img { transform: scale(1.04); } .ps-gallery-card:hover .ps-gal-overlay { opacity: 1 !important; }`}</style>
      {canOpen && openIndex !== null ? (
        <Lightbox
          open
          index={openIndex}
          slides={slides}
          close={() => setOpenIndex(null)}
          plugins={[Captions, Counter, Zoom, Fullscreen, LightboxDownload]}
          carousel={{ padding: "16px", spacing: 0 }}
          toolbar={{ buttons: ["fullscreen", "zoom", "download", "close"] }}
          animation={{ fade: 200, swipe: 300 }}
          render={{
            slide: ({ slide }) => {
              const sl = slide as { art?: string };
              if (sl.art) {
                return (
                  <div style={{ width: "min(92vw, 1100px)", aspectRatio: "4/3", maxHeight: "84vh", borderRadius: wt.radiusSm, overflow: "hidden" }}>
                    <SceneImage art={sl.art} />
                  </div>
                );
              }
              return undefined;
            },
          }}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Floor Plan Gallery — blurred images gated behind an enquiry form
// ---------------------------------------------------------------------------
function FloorPlanGallerySection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const pageId = useContext(SitePageIdContext);
  const wt = useContext(SiteLayoutThemeContext);
  const T = typoCss(s, device);

  type Plan = { name: string; beds: string; area: string; price: string; image: string };
  const plans = (st.plans ?? []) as Plan[];
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : 3;

  const formHeading = textOf(st.formHeading ?? "Unlock Floor Plan");
  const formButton = textOf(st.formButton ?? "View Floor Plan");

  // Track which plans have been unlocked (by index)
  const [unlocked, setUnlocked] = useState<Set<number>>(() => new Set());
  // Which plan popup is currently open (index or null)
  const [popupIndex, setPopupIndex] = useState<number | null>(null);

  // Form field state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openPopup = (i: number) => {
    if (unlocked.has(i)) return;
    if (!live) return; // in builder preview just show as-is
    setPopupIndex(i);
    setName(""); setPhone(""); setEmail(""); setFormError(""); setSubmitting(false);
  };

  const closePopup = () => setPopupIndex(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const p = phone.trim();
    const em = email.trim();
    if (!n) { setFormError("Please enter your name."); return; }
    if (!p) { setFormError("Please enter your phone number."); return; }
    if (!isValidPhone(p)) { setFormError("Enter a valid phone number."); return; }
    if (em && !isValidEmail(em)) { setFormError("Enter a valid email address."); return; }
    setFormError("");
    setSubmitting(true);
    if (live) {
      firePrestateLead();
      if (pageId) bumpTracking(pageId, "form");
      window.dispatchEvent(new CustomEvent(LEAD_SUCCESS_EVENT));
      void submitLead({
        landingPageId: pageId,
        formName: "Floor Plan Gallery",
        source: "floorplan",
        fields: { Name: n, Phone: p, Email: em },
      }).catch(() => {});
    }
    // Unlock the selected plan
    setUnlocked((prev) => new Set([...prev, popupIndex!]));
    setPopupIndex(null);
    setSubmitting(false);
  };

  const activePlan = popupIndex !== null ? plans[popupIndex] : null;

  return (
    <>
      <Inner section={s}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ width: 28, height: 2, background: wt.primary, borderRadius: 999 }} />
          <Eyebrow>{textOf(st.eyebrow)}</Eyebrow>
        </div>
        <h2 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 26 : 34, letterSpacing: -0.5, margin: "0 0 8px", ...T }}>{textOf(st.heading)}</h2>
        <p style={{ ...wtSectionLede(undefined, wt), fontSize: 14.5, maxWidth: 560, lineHeight: 1.65, ...T }}>{textOf(st.text)}</p>
      </Inner>

      {/* Gallery grid */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 20, marginTop: 32, width: "100%" }}>
        {plans.map((plan, i) => {
          const isUnlocked = unlocked.has(i);
          const img = textOf(plan.image ?? "");
          return (
            <div
              key={i}
              style={{ ...wtCard({ padding: 0 }, wt), overflow: "hidden", display: "flex", flexDirection: "column", textAlign: "left", cursor: isUnlocked ? "default" : "pointer", position: "relative" }}
              onClick={() => openPopup(i)}
              className="ps-fpg-card"
            >
              {/* Image area */}
              <div style={{ position: "relative", height: 220, overflow: "hidden", background: wt.surfaceMuted }}>
                {/* The image — blurred when locked */}
                <div style={{ width: "100%", height: "100%", filter: isUnlocked ? "none" : "blur(14px)", transform: isUnlocked ? "none" : "scale(1.05)", transition: "filter .4s ease, transform .4s ease" }}>
                  {isMediaSrc(img) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={plan.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <SceneImage art="plan" beds={plan.beds} />
                  )}
                </div>
                {/* Lock overlay — shown only when locked */}
                {!isUnlocked && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(17,24,39,0.38)", backdropFilter: "blur(2px)", gap: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
                      <Lock size={20} color="#fff" />
                    </div>
                    <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(8px)", padding: "5px 12px", borderRadius: 999, letterSpacing: 0.3 }}>
                      Click to unlock
                    </span>
                  </div>
                )}
                {/* Unlocked badge */}
                {isUnlocked && (
                  <span style={{ position: "absolute", top: 10, right: 10, background: wt.primary, color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, display: "flex", alignItems: "center", gap: 4 }}>
                    <LockOpen size={11} /> Unlocked
                  </span>
                )}
                <span style={{ position: "absolute", top: 10, left: 10, background: wt.ink, color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: 0.5, padding: "4px 10px", borderRadius: 999 }}>{plan.beds} BHK</span>
              </div>
              {/* Card body */}
              <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: wt.ink }}>{plan.name}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[{ label: "Area", value: plan.area }, { label: "Beds", value: `${plan.beds} BHK` }, { label: "Price", value: plan.price }].map((f) =>
                    f.value ? (
                      <div key={f.label} style={{ background: wt.surfaceMuted, borderRadius: 10, padding: "9px 11px" }}>
                        <div style={{ fontSize: 10, color: wt.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: wt.ink, marginTop: 2 }}>{f.value}</div>
                      </div>
                    ) : null
                  )}
                </div>
                {!isUnlocked && (
                  <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6, color: wt.primary, fontSize: 13, fontWeight: 700, paddingTop: 4 }}>
                    <Lock size={13} /> Submit details to view floor plan
                  </div>
                )}
                {isUnlocked && (
                  <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6, color: "#16a34a", fontSize: 13, fontWeight: 700, paddingTop: 4 }}>
                    <LockOpen size={13} /> Floor plan unlocked
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {plans.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: 40, textAlign: "center", border: `1.5px dashed ${wt.borderStrong}`, borderRadius: 16, color: wt.muted, fontSize: 13 }}>No plans yet — add items in Settings → Content</div>
        )}
      </div>

      <style>{`
        .ps-fpg-card { transition: ${wt.transition}; }
        .ps-fpg-card:hover { transform: translateY(-2px); box-shadow: ${wt.shadowHover} !important; }
      `}</style>

      {/* Unlock popup — portal-style fixed overlay */}
      {popupIndex !== null && activePlan && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(8,10,20,.68)", backdropFilter: "blur(6px)", padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) closePopup(); }}
        >
          <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 32px 80px rgba(0,0,0,.28)", width: "100%", maxWidth: 460, overflow: "hidden", position: "relative" }}>
            {/* Modal header */}
            <div style={{ background: `linear-gradient(135deg, ${wt.primary} 0%, #4f46e5 100%)`, padding: "24px 28px 20px", color: "#fff", position: "relative" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", opacity: 0.82, marginBottom: 6 }}>Floor Plan Gallery</div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>{formHeading}</h3>
              <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.82, lineHeight: 1.5 }}>
                Enter your details to unlock the <strong>{activePlan.name}</strong> floor plan
              </p>
              <button
                type="button"
                onClick={closePopup}
                style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Plan summary pill */}
            <div style={{ padding: "14px 28px 0" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: wt.surfaceMuted, borderRadius: 12, padding: "10px 14px", border: wt.border }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, overflow: "hidden", background: wt.surface, flexShrink: 0 }}>
                  {isMediaSrc(textOf(activePlan.image ?? "")) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={textOf(activePlan.image)} alt={activePlan.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(4px)", transform: "scale(1.1)" }} />
                  ) : (
                    <SceneImage art="plan" beds={activePlan.beds} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: wt.ink }}>{activePlan.name}</div>
                  <div style={{ fontSize: 11.5, color: wt.muted, marginTop: 1 }}>{activePlan.area} · {activePlan.price}</div>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: "16px 28px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Name */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: wt.slate, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Full Name <span style={{ color: "#e11d48" }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${wt.border}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: wt.ink, outline: "none", background: wt.surfaceMuted, transition: "border-color .15s" }}
                  onFocus={(e) => { e.target.style.borderColor = wt.primary; e.target.style.background = "#fff"; }}
                  onBlur={(e) => { e.target.style.borderColor = wt.border; e.target.style.background = wt.surfaceMuted; }}
                />
              </div>
              {/* Phone */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: wt.slate, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Phone Number <span style={{ color: "#e11d48" }}>*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                  style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${wt.border}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: wt.ink, outline: "none", background: wt.surfaceMuted, transition: "border-color .15s" }}
                  onFocus={(e) => { e.target.style.borderColor = wt.primary; e.target.style.background = "#fff"; }}
                  onBlur={(e) => { e.target.style.borderColor = wt.border; e.target.style.background = wt.surfaceMuted; }}
                />
              </div>
              {/* Email */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: wt.slate, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com (optional)"
                  style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${wt.border}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: wt.ink, outline: "none", background: wt.surfaceMuted, transition: "border-color .15s" }}
                  onFocus={(e) => { e.target.style.borderColor = wt.primary; e.target.style.background = "#fff"; }}
                  onBlur={(e) => { e.target.style.borderColor = wt.border; e.target.style.background = wt.surfaceMuted; }}
                />
              </div>
              {/* Error */}
              {formError && (
                <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "9px 12px", color: "#e11d48", fontSize: 13, fontWeight: 600 }}>
                  {formError}
                </div>
              )}
              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                style={{ ...wtButton({ accent: st.accent }, wt), width: "100%", justifyContent: "center", fontSize: 14.5, padding: "13px 20px", marginTop: 2, opacity: submitting ? 0.7 : 1 }}
              >
                <LockOpen size={15} /> {formButton}
              </button>
              <p style={{ margin: 0, fontSize: 11.5, color: wt.muted, textAlign: "center", lineHeight: 1.5 }}>
                🔒 Your details are safe. We respect your privacy.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

function VirtualTourSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const url = textOf(st.url ?? "");
  const [playing, setPlaying] = useState(false);
  const yt = youtubeId(url);
  const embedSrc = yt ? `https://www.youtube.com/embed/${yt}?autoplay=1&rel=0` : url;
  const canPlay = live && !!url;
  const T = typoCss(s, device);
  return (
    <>
      <Inner section={s}>
        <Eyebrow gold> {textOf(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px", color: "#fff", ...T }}>{textOf(st.heading)}</h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", maxWidth: 520, lineHeight: 1.65, ...T }}>{textOf(st.text)}</p>
      </Inner>
      <div style={{ maxWidth: 1000, margin: "30px auto 0", width: "100%" }}>
        <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.5)", aspectRatio: "16/9", cursor: canPlay && !playing ? "pointer" : "default" }} onClick={canPlay && !playing ? (e) => { e.stopPropagation(); setPlaying(true); } : undefined}>
          {playing && canPlay ? (
            <iframe
              src={embedSrc}
              title={textOf(st.videoTitle || st.heading || "Video")}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", display: "block" }}
            />
          ) : (
            <>
              <SceneImage art="tour" />
              <Overlay section={s} />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                <span style={{ width: 74, height: 74, borderRadius: "50%", background: "rgba(255,255,255,.16)", border: "1.5px solid rgba(255,255,255,.4)", display: "inline-flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", transition: "transform .2s" }}>
                  <Play size={30} style={{ color: "#fff", marginLeft: 3 }} />
                </span>
                <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, background: "rgba(8,10,20,.55)", padding: "6px 14px", borderRadius: 999, backdropFilter: "blur(8px)" }}>
                  {textOf(st.videoTitle)} · {textOf(st.duration)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function LocationSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const wt = useContext(SiteLayoutThemeContext);
  const items = (st.items ?? []) as { icon?: string; title: string; meta: string }[];
  const address = textOf(st.address ?? "").trim();
  const zoom = Math.min(20, Math.max(1, Number(st.zoom ?? 14) || 14));
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=${zoom}&output=embed`;
  const dirHref = address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : "";
  const T = typoCss(s, device);
  return (
    <div style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "1fr 1.05fr" : "1fr", gap: 32, alignItems: "stretch" }}>
      <div>
        <Eyebrow>{textOf(st.eyebrow)}</Eyebrow>
        <h2 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 26 : 32, letterSpacing: -0.5, margin: "14px 0 10px", lineHeight: 1.2, ...T }}>{textOf(st.heading)}</h2>
        <p style={{ ...wtSectionLede(undefined, wt), fontSize: 14, lineHeight: 1.7, marginBottom: 24, ...T }}>{textOf(st.text)}</p>
        <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "1fr 1fr", gap: 12 }}>
          {items.map((it, i) => (
            <div key={i} style={{ ...wtCard({ padding: "13px 14px" }, wt), display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: wt.primarySoft, color: wt.primary, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {iconFor(it.icon, 17)}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: wt.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
                <div style={{ fontSize: 11, color: wt.muted, marginTop: 1 }}>{it.meta}</div>
              </div>
            </div>
          ))}
        </div>
        {live && dirHref ? (
          <a
            href={dirHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, marginTop: 20, fontSize: 13, fontWeight: 600, color: wt.primary, textDecoration: "none" }}
          >
            <Navigation size={15} /> Get Directions to {PROPERTY.location}
          </a>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, fontSize: 13, fontWeight: 600, color: wt.primary }}>
            <Navigation size={15} /> Get Directions to {PROPERTY.location}
          </div>
        )}
      </div>
      <div style={{ borderRadius: wt.radius, overflow: "hidden", border: "1px solid var(--ps-line)", boxShadow: "var(--ps-shadow-md)", minHeight: 360 }}>
        {live && address ? (
          <iframe
            title={`Map — ${address}`}
            src={mapSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{ width: "100%", height: "100%", minHeight: 360, border: "none", display: "block" }}
          />
        ) : (
          <SceneImage art="map" />
        )}
      </div>
    </div>
  );
}

function PricingSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const wt = useContext(SiteLayoutThemeContext);
  const planLink = textOf(st.planLink ?? "#lead-form");
  const planPopupId = textOf(st.planPopupId ?? "").trim();
  const plans = (st.plans ?? []) as { name: string; area: string; price: string; per: string; features: string[]; cta: string; featured?: boolean }[];
  const T = typoCss(s, device);
  const planClick = (e: ReactMouseEvent) => {
    if (!live) {
      e.preventDefault();
      return;
    }
    if (planPopupId) {
      e.preventDefault();
      openPopupById(planPopupId);
      return;
    }
    anchorNav(planLink, live).onClick(e);
  };
  return (
    <>
      <Inner section={s}>
        <Eyebrow>{textOf(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px", ...T }}>{textOf(st.heading)}</h2>
        <p style={{ fontSize: 14, color: "var(--ps-slate)", maxWidth: 560, lineHeight: 1.65, ...T }}>{textOf(st.text)}</p>
      </Inner>
      <div style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "repeat(3,1fr)" : device === "tablet" ? "1fr 1fr" : "1fr", gap: 18, margin: "32px 0 0", width: "100%", alignItems: "stretch" }}>
        {plans.map((p) => (
          <div
            key={p.name}
            className="ps-pricing-card"
            style={{
              ...(p.featured
                ? { ...wtCardPremium({ padding: 26 }, wt), background: "linear-gradient(160deg, #4f46e5 0%, #6366f1 55%, #818cf8 100%)", border: "1px solid rgba(255,255,255,.22)", boxShadow: "0 12px 32px rgba(79,70,229,.28)" }
                : { ...wtCardPremium({ padding: 26 }, wt), border: wt.border }),
              position: "relative",
              transition: wt.transition,
            }}
          >
            {p.featured ? (
              <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--ps-grad-primary)", color: "#fff", fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, padding: "5px 14px", borderRadius: 999, textTransform: "uppercase" }}>
                Most Popular
              </span>
            ) : null}
            <div style={{ fontSize: 13, fontWeight: 700, color: p.featured ? "#fff" : wt.primary, textTransform: "uppercase", letterSpacing: 0.8, ...T }}>{p.name}</div>
            <div style={{ fontSize: 12.5, color: p.featured ? "rgba(255,255,255,.72)" : wt.muted, margin: "4px 0 14px", ...T }}>{p.area}</div>
            <div style={{ ...wtStatValue(undefined, wt), fontSize: 30, color: p.featured ? "#fff" : wt.ink, letterSpacing: -0.5, ...T }}>
              {p.price}
              <span style={{ fontSize: 12, fontWeight: 600, color: p.featured ? "rgba(255,255,255,.72)" : wt.muted }}> {p.per}</span>
            </div>
            <div style={{ height: 1, background: p.featured ? "rgba(255,255,255,.2)" : "var(--ps-line)", margin: "18px 0" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 150 }}>
              {(p.features ?? []).map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <CheckCircle2 size={15} style={{ color: p.featured ? "rgba(255,255,255,.9)" : wt.muted, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: p.featured ? "rgba(255,255,255,.85)" : wt.slate }}>{f}</span>
                </div>
              ))}
            </div>
            <a
              href={resolveCtaHref("link", planLink)}
              onClick={planClick}
              style={{
                marginTop: 18,
                ...(p.featured ? wtButtonLight({ block: true }, wt) : wtButton({ accent: st.accent, block: true }, wt)),
              }}
            >
              {p.cta}
            </a>
          </div>
        ))}
      </div>
    </>
  );
}

function TestimonialsSection({ s, device }: { s: SectionInstance; device: Device }) {
  const wt = useContext(SiteLayoutThemeContext);
  const st = s.settings;
  const items = (st.items ?? []) as { name: string; role: string; quote: string; rating: number }[];
  const T = typoCss(s, device);
  return (
    <>
      <Inner section={s}>
        <h2 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 26 : 34, letterSpacing: -0.5, margin: "0 0 8px", ...T }}>{textOf(st.heading)}</h2>
        <p style={{ fontSize: 13, color: wt.slate, maxWidth: 480, ...T }}>Real stories from families who found their home through this page.</p>
      </Inner>
      <div style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "repeat(3,1fr)" : device === "tablet" ? "1fr 1fr" : "1fr", gap: 18, margin: "32px 0 0", width: "100%" }}>
        {items.map((t, i) => (
          <div key={i} className="ps-card ps-testimonial-card" style={{ ...wtCardPremium({ padding: 24 }, wt), display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", transition: wt.transition }}>
            <div style={{ position: "absolute", top: 18, right: 18, width: 44, height: 44, borderRadius: "50%", background: wt.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.9 }}>
              <Quote size={18} style={{ color: wt.gold }} />
            </div>
            <div style={{ display: "flex", gap: 3, marginBottom: 14, marginTop: 2 }}>
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} size={13} fill={j < t.rating ? wt.gold : "none"} color={wt.gold} />
              ))}
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: wt.inkSoft, flex: 1, fontWeight: 500, ...T }}>“{t.quote}”</p>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 20, paddingTop: 16, borderTop: wt.borderFaint }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${wt.primary} 0%, #818cf8 100%)`, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0, boxShadow: wt.shadowSm }}>
                {t.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: wt.ink, letterSpacing: -0.2 }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: wt.muted, fontWeight: 600 }}>{t.role}</div>
              </div>
              <span style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: "50%", background: wt.successSoft, color: wt.success, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={12} strokeWidth={3} />
              </span>
            </div>
          </div>
        ))}
      </div>
      <style>{`.ps-testimonial-card:hover { transform: translateY(-2px); box-shadow: ${wt.shadowHover} !important; }`}</style>
    </>
  );
}

function FaqSection({ s, device }: { s: SectionInstance; device: Device }) {
  const wt = useContext(SiteLayoutThemeContext);
  const st = s.settings;
  const items = (st.items ?? []) as { q?: string; a?: string; title?: string; body?: string }[];
  const [open, setOpen] = useState<number | null>(0);
  const T = typoCss(s, device);
  return (
    <>
      <Inner section={s}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, justifyContent: "center" }}>
          <span style={{ width: 28, height: 2, background: wt.primary, borderRadius: 999 }} />
          <Eyebrow>{textOf(st.eyebrow)}</Eyebrow>
          <span style={{ width: 28, height: 2, background: wt.primary, borderRadius: 999 }} />
        </div>
        <h2 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 26 : 34, letterSpacing: -0.5, margin: "0 0 8px", textAlign: "center", ...T }}>{textOf(st.heading)}</h2>
        <p style={{ textAlign: "center", fontSize: 13, color: wt.slate, maxWidth: 520, margin: "0 auto", ...T }}>Everything you need to know before you book a site visit.</p>
      </Inner>
      <div style={{ maxWidth: 760, margin: "28px auto 0", width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} style={{ background: open === i ? "#fff" : wt.surface, border: open === i ? `1.5px solid ${wt.primary}` : wt.border, borderRadius: wt.radius, boxShadow: open === i ? wt.shadowMd : wt.shadowSm, overflow: "hidden", transition: wt.transition }}>
            <button type="button" onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "18px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
              <span style={{ width: 32, height: 32, borderRadius: 10, background: open === i ? wt.primary : wt.surfaceMuted, color: open === i ? "#fff" : wt.muted, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: open === i ? `0 4px 12px ${wt.primaryGlow}` : "none", transition: wt.transition }}>
                <ChevronDown size={14} style={{ transform: open === i ? "rotate(180deg)" : "none", transition: "transform .18s" }} />
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: open === i ? wt.primary : wt.ink, flex: 1, letterSpacing: -0.2, ...T }}>{it.q ?? (it as { title?: string }).title}</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: open === i ? wt.primary : wt.muted, background: open === i ? wt.primarySoft : wt.surfaceMuted, padding: "4px 8px", borderRadius: 999, border: open === i ? `1px solid ${hexToSoft(wt.primary, 0.22)}` : wt.borderFaint }}>{open === i ? "Open" : "View"}</span>
            </button>
            {open === i ? <div style={{ padding: "0 18px 18px 62px", fontSize: 13.5, lineHeight: 1.7, color: wt.slate, borderTop: `1px solid ${wt.border}`, marginTop: 2, paddingTop: 12, ...T }}>{it.a ?? (it as { body?: string }).body}</div> : null}
          </div>
        ))}
      </div>
    </>
  );
}

function LeadFormSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const cfg = useContext(SiteFormContext);
  const pageId = useContext(SitePageIdContext);
  const live = useContext(SiteLiveContext);
  const wt = useContext(SiteLayoutThemeContext);
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  // Form widget dropdown: if the widget has a formId set, render that library form instead of the page's form.
  const widgetFormId = String((s.settings as Record<string, unknown>).formId ?? "").trim();
  const [libraryForm, setLibraryForm] = useState<SiteConfig["form"] | null>(null);
  useEffect(() => {
    if (!widgetFormId) { setLibraryForm(null); return; }
    try {
      const lib = loadFormLibrary();
      const found = lib.find((f) => f.id === widgetFormId);
      setLibraryForm(found ? (found as unknown as SiteConfig["form"]) : null);
    } catch { setLibraryForm(null); }
  }, [widgetFormId]);
  const effectiveForm = (libraryForm ?? cfg) as SiteConfig["form"];

  const rawFields = effectiveForm?.fields?.length ? effectiveForm.fields : (st.fields ?? []);
  const fields = (Array.isArray(rawFields) ? rawFields : [])
    .map((f, i) => {
      if (typeof f === "string") {
        const type = f === "email" ? "email" : f === "phone" ? "phone" : f === "message" ? "textarea" : "text";
        const label = f.charAt(0).toUpperCase() + f.slice(1);
        return { id: `w${i}`, type, label, placeholder: label, required: type !== "textarea" };
      }
      return f as { type: string; label: string; placeholder?: string; options?: string[]; required?: boolean; id?: string; logic?: unknown };
    })
    .filter((f) => f && f.type !== "hidden");

  // Conditional logic — hide fields whose rules do not match the current answers.
  const visibleAll = fields.filter((f) => isFieldVisible(f as unknown as FormLeadField, fields as unknown as FormLeadField[], values));

  const multi = effectiveForm?.multiStep ?? Boolean(st.steps);
  const chunk = 3;
  const steps = multi ? Math.max(1, Math.ceil(visibleAll.length / chunk)) : 1;
  const visible = multi ? visibleAll.slice(step * chunk, step * chunk + chunk) : visibleAll;
  const submitLabel = effectiveForm?.submitLabel || textOf(st.button || "Submit");
  const last = step >= steps - 1;

  // Universal Dynamic Form: deliverable may come from canvas widget prop, legacy field, or new pdf config per form.
  const pdfCfg = (effectiveForm as unknown as { pdf?: { enabled?: boolean; url?: string; filename?: string; autoDownload?: boolean } })?.pdf;
  const deliverableUrl = String(pdfCfg?.url || st.pdfUrl || effectiveForm?.deliverableUrl || "").trim();
  const pdfEnabled = pdfCfg ? pdfCfg.enabled !== false : true;
  const pdfAuto = pdfCfg?.autoDownload ?? true;
  const pdfFilename = String(pdfCfg?.filename ?? "").trim() || "brochure.pdf";
  const deliverableLabel = textOf(st.pdfLabel || effectiveForm?.deliverableLabel || pdfFilename.replace(/\.pdf$/i, "") || "Download brochure").trim() || "Download brochure";
  // Success actions: inline message · Thank You page redirect · custom URL.
  const legacyRedirect = Boolean(effectiveForm?.redirectThankYou);
  const successAction = String(effectiveForm?.successAction ?? (legacyRedirect ? "thankyou" : "message"));
  const thankYouTarget = String(effectiveForm?.thankYou ?? "").trim();
  const customUrl = String(effectiveForm?.successUrl ?? "").trim();
  const redirectTarget = successAction === "thankyou" ? thankYouTarget : successAction === "url" ? customUrl : "";
  const doRedirect = live && /^(https?:\/\/|\/)/.test(redirectTarget);
  const thankYouPage = (effectiveForm as unknown as { thankYouPage?: { heading?: string; successMessage?: string; showPdfConfirmation?: boolean; enabled?: boolean } })?.thankYouPage;
  const successMsg = String(thankYouPage?.successMessage || thankYouPage?.heading || effectiveForm?.successTitle || effectiveForm?.thankYou || "Thanks — our team will call you shortly.");
  const errorMsg = String(effectiveForm?.errorMessage || "Please fill in the highlighted required fields.");
  const [error, setError] = useState("");
  // Note: answers for fields hidden by conditional logic simply stop being read

  const validateField = (f: { type?: string; label: string; required?: boolean; validation?: { pattern?: string; minLength?: number; maxLength?: number; min?: number; max?: number; customMessage?: string } }, v: string): string | null => {
    const trim = v.trim();
    if ((f.required ?? false) && !trim && f.type !== "checkbox") return f.validation?.customMessage || `${f.label} is required`;
    if (!trim) return null;
    if (f.type === "email" && !isValidEmail(v)) return f.validation?.customMessage || "Enter a valid email address";
    if (f.type === "phone" && !isValidPhone(v)) return f.validation?.customMessage || "Enter a valid phone number";
    const pat = String(f.validation?.pattern ?? "").trim();
    if (pat) {
      const low = pat.toLowerCase();
      if (low !== "email" && low !== "phone") {
        try {
          const re = new RegExp(pat);
          if (!re.test(trim)) return f.validation?.customMessage || `${f.label} is invalid`;
        } catch { /* ignore bad regex */ }
      }
    }
    if (f.validation?.minLength != null && trim.length < f.validation.minLength) return f.validation?.customMessage || `${f.label} must be at least ${f.validation.minLength} characters`;
    if (f.validation?.maxLength != null && trim.length > f.validation.maxLength) return f.validation?.customMessage || `${f.label} must be at most ${f.validation.maxLength} characters`;
    if (f.type === "number" && trim) {
      const num = Number(trim);
      if (Number.isNaN(num)) return f.validation?.customMessage || `${f.label} must be a number`;
      if (f.validation?.min != null && num < f.validation.min) return f.validation?.customMessage || `${f.label} must be ≥ ${f.validation.min}`;
      if (f.validation?.max != null && num > f.validation.max) return f.validation?.customMessage || `${f.label} must be ≤ ${f.validation.max}`;
    }
    return null;
  };

  const submit = () => {
    const fieldsToValidate = last ? visibleAll : visible;
    for (const f of fieldsToValidate) {
      const err = validateField(f, values[(f as { id?: string }).id || f.label] ?? "");
      if (err) {
        setError(err);
        return;
      }
    }
    setError("");
    if (!last) {
      setStep((v) => v + 1);
      return;
    }
    setSent(true);
    if (!live) return;
    firePrestateLead();
    if (pageId) bumpTracking(pageId, "form");
    window.dispatchEvent(new CustomEvent(LEAD_SUCCESS_EVENT));
    // Persist the captured lead server-side (best-effort — never block the UI).
    const leadFields: Record<string, string> = {};
    for (const f of visibleAll) {
      const key = (f as { id?: string }).id || f.label;
      leadFields[f.label] = String(values[key] ?? "");
    }
    void submitLead({
      landingPageId: pageId,
      formName: effectiveForm?.name,
      source: "website",
      fields: leadFields,
    }).catch(() => {});
    // Conditional action: open a popup (offer / thank-you / download gate).
    const popupAfterSubmit = String(effectiveForm?.openPopupId ?? "").trim();
    if (popupAfterSubmit) openPopupById(popupAfterSubmit);
    const digits = digitsOnly(effectiveForm?.whatsapp || "");
    if (effectiveForm?.sendWhatsapp && digits) {
      if (pageId) bumpTracking(pageId, "whatsapp");
      const body = visibleAll.map((f) => `${f.label}: ${values[(f as { id?: string }).id || f.label] || ""}`).join("%0A");
      window.open(`https://wa.me/${digits}?text=${body}`, "_blank", "noopener,noreferrer");
    }
    if (doRedirect) {
      window.location.assign(redirectTarget);
      return;
    }
    // Inline-success deliverable: auto-download after validated submission when enabled.
    // Priority: form.pdf.autoDownload else legacy deliverableUrl.
    const shouldDownload = pdfEnabled && pdfAuto && deliverableUrl;
    if (shouldDownload) window.setTimeout(() => downloadFile(deliverableUrl), 800);
  };

  if (sent) {
    const ty = (effectiveForm as unknown as { thankYouPage?: { heading?: string; description?: string; text?: string; image?: string; icon?: string; buttons?: { label: string; href: string; variant: string }[]; html?: string; showPdfConfirmation?: boolean; enabled?: boolean; alignment?: string; background?: string; typography?: { fontFamily?: string; fontSize?: string | number; textColor?: string }; colors?: { bg?: string; text?: string; accent?: string } } })?.thankYouPage;
    const useCustomThankYou = Boolean(ty?.enabled !== false && (ty?.heading || ty?.description));
    return (
      <div id="lead-form" style={{ maxWidth: 640, margin: "0 auto", textAlign: (ty?.alignment as never) ?? "center", padding: device === "mobile" ? "32px 16px" : "48px 24px", background: ty?.background ?? undefined, borderRadius: 16 }}>
        {useCustomThankYou ? (
          <>
            {ty?.image ? <img src={ty.image} alt="" style={{ width: "100%", maxWidth: 420, borderRadius: 14, margin: "0 auto 14px", display: "block" }} /> : null}
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: ty?.typography?.textColor ?? ty?.colors?.text ?? "var(--ps-ink)", fontFamily: ty?.typography?.fontFamily ? `"${ty.typography.fontFamily}"` : undefined }}>{ty?.heading ?? successMsg}</h2>
            {ty?.description ? <p style={{ color: "var(--ps-slate)", fontSize: 14.5, lineHeight: 1.6, margin: "0 auto", maxWidth: 520 }}>{ty.description}</p> : null}
            {ty?.text ? <p style={{ color: "var(--ps-slate)", fontSize: 13.5, lineHeight: 1.65, margin: "10px auto 0", maxWidth: 520 }}>{ty.text}</p> : null}
            {ty?.html ? <div className="ps-rich" style={{ marginTop: 12, fontSize: 13.5 }} dangerouslySetInnerHTML={{ __html: ty.html }} /> : null}
          </>
        ) : (
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10, color: wt.ink }}>{successMsg}</h2>
        )}
        {!useCustomThankYou && effectiveForm?.notifyEmail ? <p style={{ color: wt.slate, fontSize: 14 }}>A copy can be sent to {effectiveForm.notifyEmail}.</p> : null}
        {deliverableUrl ? (
          <div>
            <a
              href={live ? deliverableUrl : undefined}
              download={live && pdfFilename ? pdfFilename : undefined}
              target={live ? "_blank" : undefined}
              rel={live ? "noopener noreferrer" : undefined}
              onClick={(e) => {
                if (!live) {
                  e.preventDefault();
                  return;
                }
                if (pageId) bumpTracking(pageId, "brochure");
              }}
              style={{ ...wtButton({ accent: st.accent }, wt), marginTop: 16 }}
            >
              <Download size={16} /> {deliverableLabel}
            </a>
            {ty?.showPdfConfirmation !== false ?             <div style={{ marginTop: 8, fontSize: 12, color: wt.muted }}>Your PDF “{pdfFilename}” {pdfAuto ? "downloaded automatically" : "is ready"}.</div> : null}
          </div>
        ) : null}
        {useCustomThankYou && (ty?.buttons?.length ?? 0) > 0 ? (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
            {ty!.buttons!.map((b, i) => (
              <a key={i} href={live ? b.href : undefined} onClick={(e) => { if (!live) e.preventDefault(); }}               style={{ padding: "10px 16px", borderRadius: wt.radiusSm, fontSize: 13, fontWeight: 700, textDecoration: "none", background: b.variant === "primary" ? wt.primary : b.variant === "outline" ? wt.surface : "#111827", color: b.variant === "outline" ? wt.ink : "#fff", border: b.variant === "outline" ? `1px solid ${wt.borderStrong}` : "none", cursor: live ? "pointer" : "default" }}>{b.label}</a>
            ))}
          </div>
        ) : null}
        <div>
            <button type="button" onClick={() => { setSent(false); setStep(0); setValues({}); }} style={{ marginTop: 16, padding: "10px 16px", borderRadius: wt.radiusSm, border: `1px solid ${wt.borderStrong}`, background: wt.surface, cursor: "pointer", fontWeight: 700 }}>
            Send another
          </button>
        </div>
      </div>
    );
  }

  // Pure form widget — no heading/eyebrow/copy. All copy is managed in Forms module (form.name/description).
  // Premium conversion-focused card with trust header
  return (
    <div id="lead-form" style={{ maxWidth: 520, margin: "0 auto", width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: wt.primarySoft, border: `1px solid ${hexToSoft(wt.primary, 0.22)}`, padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800, color: wt.primary, letterSpacing: 0.6, textTransform: "uppercase" }}>
          <ShieldCheck size={12} /> RERA Approved · Trusted by 1200+ buyers
        </div>
        <div style={{ fontSize: 12, color: wt.muted, marginTop: 8, fontWeight: 600 }}>Get price sheet, floor plans & brochure on WhatsApp instantly</div>
      </div>
      <form
        className="ps-card"
        style={{ ...wtCardPremium({ padding: 0 }, wt), overflow: "hidden" }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div style={{ background: `linear-gradient(135deg, ${wt.primary} 0%, #6366f1 100%)`, padding: "18px 24px", color: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.22)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Send size={16} />
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: -0.2 }}>Enquire Now</div>
            <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 1 }}>Response within 15 mins · No spam</div>
          </div>
          <span style={{ marginLeft: "auto", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.22)", padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 4px rgba(34,197,94,.22)" }} /> Live
          </span>
        </div>
        <div style={{ padding: 24 }}>
        {multi ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: wt.ink }}>Step {step + 1} of {steps}</span>
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 22 }}>
              {Array.from({ length: steps }).map((_, i) => (
                <span key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i <= step ? wt.primary : wt.surfaceMuted }} />
              ))}
            </div>
          </>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {visible.map((f, i) => {
            const key = (f as { id?: string }).id || f.label;
            const val = values[key] ?? "";
            return (
              <div key={f.id || key || i}>
                {f.type !== "checkbox" ? (
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: wt.slate, marginBottom: 5, display: "block" }}>
                    {f.label} {"required" in f && f.required ? " *" : ""}
                  </label>
                ) : null}
                {f.type === "select" ? (
                  <select className="ps-input" required={"required" in f ? f.required : false} value={val} onChange={(e) => setValues((p) => withFieldValue(p, f, e.target.value))} style={{ padding: "11px 12px" }}>
                    <option value="">{f.placeholder || "Choose"}</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === "radio" ? (
                  <div role="radiogroup" aria-label={f.label} style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                    {(f.options ?? []).map((o) => (
                      <label key={o} style={{ display: "inline-flex", gap: 7, alignItems: "center", fontSize: 12.5, color: wt.slate, cursor: "pointer" }}>
                        <input type="radio" name={`fld-${f.id || key}`} checked={val === o} onChange={() => setValues((p) => withFieldValue(p, f, o))} />
                        {o}
                      </label>
                    ))}
                  </div>
                ) : f.type === "file" ? (
                  val ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", border: `1px solid ${wt.border}`, borderRadius: wt.radiusSm, background: wt.surfaceMuted }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}> {val}</span>
                      <button type="button" onClick={() => setValues((p) => withFieldValue(p, f, ""))} style={{ background: "none", border: "none", color: wt.danger, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Remove</button>
                    </div>
                  ) : (
                    <label className="ps-input" style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 12px", cursor: "pointer", color: wt.muted, fontSize: 12.5 }}>
                      <Upload size={15} /> Choose file…
                      <input
                        type="file"
                        hidden
                        onChange={(e) => {
                          const name = e.target.files?.[0]?.name ?? "";
                          setValues((p) => withFieldValue(p, f, name));
                        }}
                      />
                    </label>
                  )
                ) : f.type === "textarea" ? (
                  <textarea className="ps-input" required={"required" in f ? f.required : false} placeholder={f.placeholder} value={val} onChange={(e) => setValues((p) => withFieldValue(p, f, e.target.value))} style={{ minHeight: 88, padding: "11px 12px" }} />
                ) : f.type === "checkbox" ? (
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "var(--ps-slate)" }}>
                    <input type="checkbox" required={"required" in f ? f.required : false} checked={val === "yes"} onChange={(e) => setValues((p) => withFieldValue(p, f, e.target.checked ? "yes" : ""))} />
                    {f.label}
                  </label>
                ) : f.type === "number" ? (
                  <input
                    className="ps-input"
                    type="number"
                    required={"required" in f ? f.required : false}
                    placeholder={f.placeholder}
                    value={val}
                    onChange={(e) => setValues((p) => withFieldValue(p, f, e.target.value))}
                    style={{ padding: "11px 12px" }}
                  />
                ) : f.type === "time" ? (
                  <input
                    className="ps-input"
                    type="time"
                    required={"required" in f ? f.required : false}
                    value={val}
                    onChange={(e) => setValues((p) => withFieldValue(p, f, e.target.value))}
                    style={{ padding: "11px 12px" }}
                  />
                ) : (
                  <input
                    className="ps-input"
                    type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : f.type === "date" ? "date" : "text"}
                    required={"required" in f ? f.required : false}
                    placeholder={f.placeholder}
                    value={val}
                    onChange={(e) => setValues((p) => withFieldValue(p, f, e.target.value))}
                    style={{ padding: "11px 12px" }}
                  />
                )}
              </div>
            );
          })}
        </div>
        {error ? (
          <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: wt.radiusSm, background: wt.dangerSoft, color: wt.danger, fontSize: 12.5, fontWeight: 600 }}>
             {/required/i.test(error) ? errorMsg : error}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {step > 0 ? (
            <button type="button" onClick={() => setStep((v) => Math.max(0, v - 1))} style={{ flex: 1, padding: "12px", borderRadius: wt.radiusSm, border: `1px solid ${wt.borderStrong}`, background: wt.surface, color: wt.slate, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Back
            </button>
          ) : null}
          <button type="submit" style={{ ...wtButton({ accent: st.accent, block: true }, wt), flex: 2, boxShadow: `0 10px 24px ${hexToSoft(st.accent as string || wt.primary, 0.32)}` }}>
            {last ? submitLabel : "Continue"} <ArrowRight size={14} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 16, paddingTop: 14, borderTop: wt.borderFaint, fontSize: 11, color: wt.muted, fontWeight: 600 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><ShieldCheck size={11} style={{ color: wt.success }} /> Privacy protected</span>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: wt.faint }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Phone size={11} /> Instant callback</span>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: wt.faint }} />
          <span>No spam</span>
        </div>
        </div>
      </form>
    </div>
  );
}

function CtaBanner({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const wt = useContext(SiteLayoutThemeContext);
  const T = typoCss(s, device);
  // Hooks run unconditionally, before any conditional return below.
  const handle = useCtaHandlers(live);
  // Merged widget: layout "strip" renders a slim one-line offer bar (the old
  // Offer Banner); the default "banner" renders the full conversion wall.
  if (st.layout === "strip") {
    const link = textOf(st.link ?? "#lead-form");
    const popupId = textOf(st.popupId ?? "").trim();
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: device === "mobile" ? 18 : 22, fontWeight: 800, letterSpacing: -0.3, ...T }}>{textOf(st.heading)}</div>
          <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 4, lineHeight: 1.55, ...T }}>{textOf(resolveVars(st.text))}</div>
        </div>
        <a
          {...anchorNav(link, live)}
          onClick={(e) => {
            if (!live) {
              e.preventDefault();
              return;
            }
            if (popupId) {
              e.preventDefault();
              openPopupById(popupId);
              return;
            }
            anchorNav(link, live).onClick(e);
          }}
          style={{ ...wtButtonLight(undefined, wt), whiteSpace: "nowrap" }}
        >
          {textOf(st.cta ?? st.ctaPrimary ?? "Learn more")} <ArrowRight size={14} />
        </a>
      </div>
    );
  }
  const primaryAction = textOf(st.primaryAction ?? "link") as CtaAction;
  const secondaryAction = textOf(st.secondaryAction ?? "call") as CtaAction | "call";
  const primaryLink = textOf(st.primaryLink ?? "#lead-form");
  const secondaryLink = textOf(st.ctaSecondaryLink ?? "");
  const phone = textOf(st.phone ?? "");
  return (
    <div style={{ position: "relative", textAlign: "center", padding: device === "mobile" ? "48px 22px" : "72px 24px" }}>
      <Overlay section={s} />
      <Inner section={s}>
        <Eyebrow gold> {textOf(resolveVars(st.eyebrow))}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 38, fontWeight: 800, letterSpacing: -0.6, margin: "16px 0 12px", color: "#fff", maxWidth: 760, lineHeight: 1.2, ...T }}>{textOf(resolveVars(st.heading))}</h2>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,.78)", maxWidth: 620, lineHeight: 1.7, ...T }}>{textOf(resolveVars(st.sub))}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
          <a
            {...anchorNav(primaryLink, live)}
            {...handle(primaryAction, primaryLink)}
            href={resolveCtaHref(primaryAction === "call" ? "call" : "link", primaryLink, phone)}
            style={{ ...wtButton({ gold: true }, wt) }}
          >
            {textOf(resolveVars(st.ctaPrimary))} <ArrowRight size={15} />
          </a>
          {secondaryAction === "call" ? (
            <a
              href={`tel:${phone.replace(/[^+0-9]/g, "")}`}
              onClick={(e) => {
                if (!live) e.preventDefault();
              }}
              style={{ ...wtButtonLight(undefined, wt) }}
            >
              <PhoneCall size={15} /> {textOf(st.ctaSecondary)}
            </a>
          ) : (
            <a
              href={resolveCtaHref("link", secondaryLink)}
              {...handle(secondaryAction, secondaryLink)}
              style={{ ...wtButtonLight(undefined, wt) }}
            >
              {textOf(st.ctaSecondary)}
            </a>
          )}
        </div>
      </Inner>
    </div>
  );
}

function CountdownSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const wt = useContext(SiteLayoutThemeContext);
  const staticItems = (st.items ?? []) as { title?: string; text?: string; value?: string; label?: string }[];
  const target = textOf(st.date ?? "").trim();
  const [now, setNow] = useState<number | null>(null);
  const T = typoCss(s, device);

  useEffect(() => {
    if (!live || !target) return;
    const kick = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(kick);
      clearInterval(t);
    };
  }, [live, target]);

  const end = target ? new Date(target).getTime() : NaN;
  const ticking = live && target && now !== null && !Number.isNaN(end);
  let cells: { value: string; label: string }[];
  if (ticking) {
    const diff = Math.max(0, end - now);
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    cells = [
      { value: String(days), label: "Days" },
      { value: String(hours).padStart(2, "0"), label: "Hours" },
      { value: String(mins).padStart(2, "0"), label: "Minutes" },
      { value: String(secs).padStart(2, "0"), label: "Seconds" },
    ];
  } else {
    cells = staticItems.map((it) => ({ value: String(it.title ?? it.value ?? ""), label: String(it.text ?? it.label ?? "") }));
  }

  return (
    <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto", width: "100%" }}>
      <div style={{ fontSize: device === "mobile" ? 16 : 18, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 18, ...T }}>{textOf(st.heading)}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(cells.length || 4, 4)},1fr)`, gap: device === "mobile" ? 8 : 14 }}>
        {cells.map((it, i) => (
          <div key={i} style={{ ...wtCardMuted({ padding: device === "mobile" ? "12px 6px" : "16px 10px" }, wt) }}>
            <div className="ps-canvas-serif" style={{ fontSize: device === "mobile" ? 26 : 36, fontWeight: 700, color: wt.ink, ...T }}>{it.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: wt.muted, marginTop: 4, ...T }}>{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmiCalculator({ s, device }: { s: SectionInstance; device: Device }) {
  const wt = useContext(SiteLayoutThemeContext);
  const st = s.settings;
  const T = typoCss(s, device);
  const cur = textOf(st.currency ?? "₹");
  const [price, setPrice] = useState<number>(Number(st.price ?? 125));
  const [down, setDown] = useState<number>(Number(st.downPayment ?? 25));
  const [rate, setRate] = useState<number>(Number(st.rate ?? 8.5));
  const [tenure, setTenure] = useState<number>(Number(st.tenure ?? 20));

  useEffect(() => setPrice(Number(st.price ?? 125)), [st.price]);
  useEffect(() => setDown(Number(st.downPayment ?? 25)), [st.downPayment]);
  useEffect(() => setRate(Number(st.rate ?? 8.5)), [st.rate]);
  useEffect(() => setTenure(Number(st.tenure ?? 20)), [st.tenure]);

  const loan = price * 100000 * (1 - down / 100);
  const r = rate / 100 / 12;
  const n = tenure * 12;
  const emi = r === 0 ? loan / n : (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const stop = (e: import("react").MouseEvent) => e.stopPropagation();
  const slider = (value: number, min: number, max: number, step: number, onChange: (v: number) => void) => (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onMouseDown={stop}
      onPointerDown={stop}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: "100%", accentColor: wt.gold }}
    />
  );

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: wt.goldSoft, border: `1px solid ${hexToSoft(wt.gold, 0.22)}`, padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800, color: wt.gold, letterSpacing: 0.6, textTransform: "uppercase" }}>
          <Gauge size={12} /> Smart Finance
        </div>
        <h3 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 22 : 28, margin: "12px 0 6px", ...T }}>{textOf(st.heading)}</h3>
        <p style={{ fontSize: 13, color: wt.slate, maxWidth: 480, margin: "0 auto", ...T }}>Adjust the sliders — EMI updates instantly. No data leaves your device.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "1.2fr .8fr", gap: 20 }}>
        <div style={{ ...wtCardPremium({ padding: 24 }, wt), background: wt.surface }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: wt.primary }} />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: wt.primary }}>Configure</span>
          </div>
          <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12.5, color: wt.inkSoft, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
              <span>Property Price</span>
              <b style={{ color: wt.primary }}>{cur} {price} Lakh</b>
            </label>
            <div style={{ marginTop: 8 }}>{slider(price, 50, 300, 1, setPrice)}</div>
          </div>
          <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12.5, color: wt.inkSoft, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
              <span>Down Payment</span>
              <b style={{ color: wt.primary }}>{down}%</b>
            </label>
            <div style={{ marginTop: 8 }}>{slider(down, 10, 60, 1, setDown)}</div>
          </div>
          <div style={{ marginBottom: 6 }}>
              <label style={{ fontSize: 12.5, color: wt.inkSoft, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
              <span>Interest Rate</span>
              <b style={{ color: wt.primary }}>{rate}%</b>
            </label>
            <div style={{ marginTop: 8 }}>{slider(rate, 6, 12, 0.1, setRate)}</div>
          </div>
        </div>
        <div style={{ ...wtCardPremium({ padding: 28 }, wt), display: "flex", flexDirection: "column", justifyContent: "center", background: `linear-gradient(135deg, ${wt.ink} 0%, #1e293b 100%)`, color: "#fff", border: `1px solid rgba(255,255,255,.08)` }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,.6)", display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: wt.gold }} /> Estimated EMI</span>
          <strong style={{ fontSize: 36, color: "#fff", marginTop: 8, letterSpacing: -0.8, fontFamily: wt.serif }}>{cur} {Math.round(emi).toLocaleString("en-IN")}</strong>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 4, fontWeight: 600 }}>/ month · {tenure} years · {rate}% p.a.</span>
          <p style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,.72)", lineHeight: 1.6, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "10px 12px" }}>{textOf(st.note ?? "Indicative only. Bank terms may vary.")}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <span style={{ ...wtBadge({ gold: true }, undefined, wt), background: "rgba(196,164,106,.18)", color: "#fff", border: "1px solid rgba(196,164,106,.28)" }}>Bank approved</span>
            <span style={{ ...wtBadge(undefined, undefined, wt), background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.14)" }}>Instant</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StickyCta({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const pageId = useContext(SitePageIdContext);
  const wt = useContext(SiteLayoutThemeContext);
  const text = textOf(resolveVars(st.text));
  const link = textOf(st.link ?? "#lead-form");
  const waNumber = digitsOnly(textOf(st.whatsapp || st.phone || ""));
  const T = typoCss(s, device);
  return (
    <div style={{ position: "relative", height: 0 }}>
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(720px, calc(100% - 24px))",
          ...wtCard({ padding: device === "mobile" ? "12px 12px" : "12px 18px" }, wt),
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: device === "mobile" ? "wrap" : "nowrap",
          boxShadow: "0 18px 50px rgba(17,24,39,.22)",
          zIndex: 40,
        }}
      >
        <div style={{ flex: "1 1 160px", minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: wt.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...T }}>{text}</div>
          <div style={{ fontSize: 11, color: wt.muted, marginTop: 1 }}>{PROPERTY.location}</div>
        </div>
        {device !== "mobile" && textOf(st.phone ?? "").trim() ? (
            <a href={`tel:${textOf(st.phone ?? "").replace(/[^+0-9]/g, "")}`} onClick={(e) => { if (!live) e.preventDefault(); else if (pageId) bumpTracking(pageId, "call"); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: wt.slate, textDecoration: "none" }}>
            <Phone size={13} /> {textOf(st.phone)}
          </a>
        ) : null}
        <a {...anchorNav(link, live)} style={{ ...wtButton({ accent: st.accent }, wt), flex: device === "mobile" ? "1 1 auto" : undefined, textAlign: "center" }}>{textOf(st.ctaLabel)}</a>
        {waNumber ? (
          <a
            href={`https://wa.me/${waNumber}`}
            target={live ? "_blank" : undefined}
            rel="noreferrer"
            onClick={(e) => { if (!live) { e.preventDefault(); return; } if (pageId) bumpTracking(pageId, "whatsapp"); }}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#25d366", background: "rgba(37,211,102,.1)", padding: "8px 12px", borderRadius: 9, cursor: "pointer", textDecoration: "none", flex: device === "mobile" ? "1 1 auto" : undefined }}
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic / basic content widgets
// ---------------------------------------------------------------------------

const RICH_CSS = `
  .ps-rich p { margin: 0 0 0.8em; }
  .ps-rich h1,.ps-rich h2,.ps-rich h3,.ps-rich h4,.ps-rich h5,.ps-rich h6 { margin: 0.45em 0 0.35em; }
  .ps-rich ul,.ps-rich ol { padding-left: 1.35em; margin: 0.4em 0; text-align: inherit; }
  .ps-rich li { margin: 0.25em 0; }
  .ps-rich a { color: var(--ps-primary); text-decoration: underline; }
  .ps-rich blockquote { border-left: 3px solid var(--ps-primary); margin: 0.6em 0; padding-left: 12px; opacity: .92; }
  .ps-rich img { max-width: 100%; border-radius: 10px; }
  .ps-rich hr { border: none; border-top: 1px solid var(--ps-line); margin: 1em 0; }
`;

function TextSection({ s, device }: { s: SectionInstance; device?: Device }) {
  const live = useContext(SiteLiveContext);
  const bundle = useContext(SiteDesignContext);
  const patchSettings = useContext(CanvasEditContext);
  const html = String(s.settings.html ?? "");
  const dev = device ?? "desktop";
  const typo = styleForDevice(s, dev).typography ?? {};
  const token = tokenForDevice("p", bundle, dev);
  const style = resolveType(token, typo, dev, s.style.colors?.text || undefined);
  const exact = devFontSize(s, dev);
  if (exact != null && exact !== "") style.fontSize = typeof exact === "number" ? exact : String(exact).trim();
  if (style.fontSize == null) {
    style.fontSize = 15;
    if (style.lineHeight == null) style.lineHeight = 1.75;
  }

  // Builder mode: click-to-edit directly on the canvas (full editor in Settings).
  if (!live) {
    return (
      <div
        className="ps-rich ps-canvas-editable"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        tabIndex={0}
        style={{ ...style, width: "100%", minHeight: 24, outline: "none", cursor: "text" }}
        dangerouslySetInnerHTML={{ __html: html ? sanitizeHtml(html) : String(s.settings.text ?? "") }}
        onBlur={(e) => {
          const next = e.currentTarget.innerHTML;
          const prev = html || String(s.settings.text ?? "");
          if (next !== prev) patchSettings(s.id, { html: next });
        }}
        onKeyDown={(e) => e.stopPropagation()}
      />
    );
  }

  if (html.trim()) {
    return (
      <>
        <style>{RICH_CSS}</style>
        <div className="ps-rich" style={style} dangerouslySetInnerHTML={{ __html: sanitizeHtml(resolveVars(html)) }} />
      </>
    );
  }
  const text = String(resolveVars(s.settings.text ?? ""));
  return (
    <>
      <style>{RICH_CSS}</style>
      <p className="ps-rich" style={{ ...style, margin: 0 }}>{text}</p>
    </>
  );
}

function ProgressBarSection({ s }: { s: SectionInstance }) {
  const st = s.settings;
  const wt = useContext(SiteLayoutThemeContext);
  const label = textOf(resolveVars(st.label ?? ""));
  const value = Math.max(0, Math.min(100, Number(st.value ?? 50) || 0));
  const height = Math.max(4, Number(st.height ?? 14));
  const radius = st.radius === "" || st.radius == null ? 999 : Number(st.radius);
  const barColor = textOf(st.color ?? "") || wt.primary;
  const trackColor = textOf(st.track ?? "") || wt.surfaceMuted;
  const showValue = st.showValue !== false;
  const T = typoCss(s, "desktop");
  return (
    <div style={{ width: "100%" }}>
      {label || showValue ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
          {label ? <span style={{ fontSize: 13, fontWeight: 700, color: wt.slate, ...T }}>{label}</span> : <span />}
          {showValue ? <span style={{ fontSize: 12.5, fontWeight: 800, color: wt.primary, ...T }}>{value}%</span> : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{ width: "100%", height, borderRadius: typeof radius === "number" ? radius : 999, background: trackColor, overflow: "hidden" }}
      >
        <div style={{ width: `${value}%`, height: "100%", borderRadius: typeof radius === "number" ? radius : 999, background: barColor, transition: "width .6s ease" }} />
      </div>
    </div>
  );
}

function HeadingSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const bundle = useContext(SiteDesignContext);
  const tag = textOf(st.tag ?? "h2");
  const Tag = (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag) ? tag : "h2") as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  const align = textOf(st.align ?? "center") as "left" | "center" | "right";
  const token = tokenForDevice(Tag as TypeKey, bundle, device);
  const ovr = styleForDevice(s, device).typography ?? {};
  const hasOverride = Object.values(ovr).some((v) => v != null && v !== "");
  const hasToken = !!token && (token.fontSize != null || token.fontWeight != null);
  const style = resolveType(token, ovr, device, s.style.colors?.text || undefined);
  // A size explicitly chosen for this device is used exactly as set.
  const exact = devFontSize(s, device);
  if (exact != null && exact !== "") style.fontSize = typeof exact === "number" ? exact : String(exact).trim();
  // Legacy per-widget size applies only when neither an override nor a global
  // token defines sizing — otherwise the design system governs.
  if (!hasOverride && !hasToken && st.size != null) {
    const size = Number(st.size);
    if (Number.isFinite(size) && size > 0) style.fontSize = device === "mobile" ? Math.round(size * 0.8) : size;
  }
  if (style.fontSize == null) style.fontSize = tag === "h1" ? 44 : tag === "h3" ? 28 : 34;
  if (style.fontWeight == null) style.fontWeight = 800;
  if (style.lineHeight == null) style.lineHeight = 1.15;
  if (style.letterSpacing == null) style.letterSpacing = -0.5;
  const text = textOf(resolveVars(st.text ?? ""));
  const elementId = s.style.advanced?.elementId?.trim();
  return (
    <div style={{ textAlign: align }}>
      <Tag id={elementId} style={{ ...wtSectionTitle(), ...style, margin: 0 }}>{text}</Tag>
    </div>
  );
}

function ButtonSection({ s }: { s: SectionInstance }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const pageId = useContext(SitePageIdContext);
  const text = textOf(resolveVars(st.text ?? "Click Here"));
  const wt = useContext(SiteLayoutThemeContext);
  const action = textOf(st.action ?? "link") as CtaAction | "call" | "whatsapp" | "url";
  const link = textOf(st.link ?? "#");
  const variant = textOf(st.style ?? "solid");
  const size = textOf(st.size ?? "md");
  const solid = variant !== "outline" && variant !== "ghost";
  const external = /^https?:\/\//i.test(link.trim());
  const popupId = textOf(st.popupId ?? "");
  const gateFile = textOf(st.file ?? "").trim();
  const [gateOpen, setGateOpen] = useState(false);
  const gateFields = Array.isArray(st.gateFields) && st.gateFields.length
    ? (st.gateFields as GateField[])
    : [
        { label: "Full Name", type: "text", required: true },
        { label: "Phone Number", type: "phone", required: true },
      ];

  const pad = size === "sm" ? "9px 18px" : size === "lg" ? "16px 36px" : "13px 28px";
  const font = size === "sm" ? 12.5 : size === "lg" ? 15.5 : 14;
  const href =
    action === "call"
      ? `tel:${link.replace(/[^+0-9]/g, "")}`
      : action === "whatsapp"
        ? `https://wa.me/${digitsOnly(link)}`
        : link || "#";

  return (
    <div style={{ textAlign: (s.style.layout?.align as "left" | "center" | "right" | undefined) ?? "center", width: "100%" }}>
      <a
        href={href}
        target={live && (external || action === "whatsapp") ? "_blank" : undefined}
        rel={live && (external || action === "whatsapp") ? "noopener noreferrer" : undefined}
        onClick={(e) => {
          if (!live) {
            e.preventDefault();
            return;
          }
          if (action === "brochure") {
            e.preventDefault();
            setGateOpen(true);
            return;
          }
          if (action === "popup") {
            e.preventDefault();
            openPopupById(popupId);
            return;
          }
          const target = (action === "url" ? link : href).trim();
          if (/^https?:\/\//i.test(target)) return;
          if (target.startsWith("#") && target.length > 1) {
            const el = document.getElementById(target.slice(1));
            if (el) {
              e.preventDefault();
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
        }}
        style={{
          ...(solid ? wtButton({ accent: st.accent }, wt) : wtButton({ accent: st.accent, outline: true }, wt)),
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: pad,
          borderRadius: wt.radiusSm,
          fontSize: font,
          textDecoration: "none",
          cursor: "pointer",
          ...typoCss(s, "desktop"),
        }}
      >
        {text}
      </a>
      {action === "brochure" ? (
        <GatedDownloadModal
          open={gateOpen}
          onClose={() => setGateOpen(false)}
          live={live}
          pageId={pageId}
          file={gateFile}
          heading={textOf(st.gateHeading || "Get the brochure")}
          text={textOf(st.gateText || "")}
          fields={gateFields}
          submitLabel={textOf(st.gateButton || "Submit & Download")}
          successMessage={textOf(st.gateSuccessMessage || "Verified — your brochure is downloading.")}
        />
      ) : null}
    </div>
  );
}

function ImageSection({ s }: { s: SectionInstance }) {
  const st = s.settings;
  const wt = useContext(SiteLayoutThemeContext);
  const live = useContext(SiteLiveContext);
  const src = textOf(st.src ?? "");
  const alt = textOf(st.alt ?? "Image");
  const title = textOf(st.title ?? "");
  const width = Math.max(80, Number(st.width ?? 800) || 800);
  const align = (s.style.layout?.align as "left" | "center" | "right" | undefined) ?? (textOf(st.align ?? "center") as "left" | "center" | "right");
  const link = textOf(st.link ?? "").trim();
  const img = isMediaSrc(src) ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} title={title || undefined} style={{ maxWidth: "100%", width: `min(${width}px,100%)`, borderRadius: wt.radius, boxShadow: wt.shadowSm, objectFit: "cover", display: "block" }} />
  ) : src ? (
    // Named art scenes (e.g. "interior", "skyline") render the built-in artwork
    // until a real image is uploaded — same behaviour as the gallery widget.
    <div title={title || undefined} style={{ width: `min(${width}px,100%)`, aspectRatio: "16/9", borderRadius: wt.radius, boxShadow: wt.shadowSm, overflow: "hidden", display: "block" }}>
      <SceneImage art={src} />
    </div>
  ) : (
    <div style={{ width: `min(${width}px,100%)`, aspectRatio: "16/9", borderRadius: wt.radius, border: "1.5px dashed var(--ps-line-strong)", background: "var(--ps-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ps-muted)", fontSize: 13, fontWeight: 600, textAlign: "center", padding: "0 20px" }}>
      Image — upload a file or paste a URL in Content
    </div>
  );
  return (
    <div style={{ display: "flex", justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start" }}>
      {src && live && link ? (
        <a href={link} target={/^https?:\/\//i.test(link) ? "_blank" : undefined} rel="noopener noreferrer" style={{ display: "block", lineHeight: 0 }}>
          {img}
        </a>
      ) : (
        img
      )}
    </div>
  );
}

function IconSection({ s }: { s: SectionInstance }) {
  const st = s.settings;
  const wt = useContext(SiteLayoutThemeContext);
  const name = textOf(st.name ?? st.icon ?? "Sparkles");
  const size = Number(st.size ?? 48);
  const color = textOf(st.color ?? wt.primary);
  if (isMediaSrc(name)) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: size + 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={name} alt="" style={{ width: size, height: size, objectFit: "contain" }} />
      </div>
    );
  }
  const Icon = SLUG_ICONS[name] ?? SLUG_ICONS.Sparkles ?? Sparkles;
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: size + 16 }}>
      <Icon size={size} color={color} strokeWidth={1.8} />
    </div>
  );
}

function IconBoxSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const wt = useContext(SiteLayoutThemeContext);
  const icon = textOf(st.icon ?? "Sparkles");
  const title = textOf(st.title ?? "");
  const text = textOf(st.text ?? "");
  const Icon = SLUG_ICONS[icon] ?? SLUG_ICONS.Sparkles ?? Sparkles;
  return (
    <div
      style={{
        ...wtCard({ padding: device === "mobile" ? "20px 16px" : "28px 22px" }, wt),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 12,
        maxWidth: 360,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <span style={{ ...wtIconBadge({ size: 48 }, wt) }}>
        {isMediaSrc(icon) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
        ) : (
          <Icon size={24} />
        )}
      </span>
      {title ? <div style={{ fontSize: 16, fontWeight: 800, color: wt.ink, letterSpacing: -0.2, ...typoCss(s, device) }}>{title}</div> : null}
      {text ? <div style={{ fontSize: 13, color: wt.slate, lineHeight: 1.6, ...typoCss(s, device) }}>{text}</div> : null}
    </div>
  );
}

function HtmlSection({ s }: { s: SectionInstance }) {
  const live = useContext(SiteLiveContext);
  const code = String(s.settings.code ?? "");
  if (!code.trim()) {
    return (
      <div style={{ fontFamily: "monospace", fontSize: 12, background: "var(--ps-bg)", border: "1.5px dashed var(--ps-line-strong)", borderRadius: 10, padding: 14, color: "var(--ps-muted)", whiteSpace: "pre-wrap", textAlign: "center" }}>
        Custom HTML — write visually or paste embed code via Content
      </div>
    );
  }
  return (
    <div style={{ position: "relative" }}>
      {!live ? (
        <span style={{ position: "absolute", top: -10, right: 8, zIndex: 5, background: "var(--ps-primary)", color: "#fff", fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, padding: "2px 8px", borderRadius: 5 }}>HTML</span>
      ) : null}
      {/* Builder-authored content — scripts and inline handlers stripped. */}
      <div className="ps-rich" dangerouslySetInnerHTML={{ __html: sanitizeHtml(code) }} />
      {!live ? <style>{RICH_CSS}</style> : null}
    </div>
  );
}

function SpacerSection({ s }: { s: SectionInstance }) {
  const h = Math.max(0, Number(s.settings.height ?? 80));
  return <div style={{ height: h }} aria-hidden />;
}

function DividerSection({ s }: { s: SectionInstance }) {
  const st = s.settings;
  const color = textOf(st.color ?? "#e8eaf1");
  const thickness = Math.max(1, Number(st.thickness ?? 1));
  const width = textOf(st.width ?? "100%");
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <hr style={{ width, border: "none", borderTop: `${thickness}px solid ${color}`, margin: 0 }} />
    </div>
  );
}

function ContactSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const wt = useContext(SiteLayoutThemeContext);
  const heading = textOf(st.heading ?? "Get in Touch");
  const rows = [
    { icon: SLUG_ICONS.Phone ?? Sparkles, label: "Call", value: textOf(st.phone ?? "") },
    { icon: SLUG_ICONS.Send ?? Sparkles, label: "Email", value: textOf(st.email ?? "") },
    { icon: SLUG_ICONS.MapPin ?? Sparkles, label: "Address", value: textOf(st.address ?? "") },
  ].filter((r) => r.value);
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
      {heading ? <h3 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 22 : 26, fontWeight: 800, letterSpacing: -0.4, margin: "0 0 18px", textAlign: "center", ...typoCss(s, device) }}>{heading}</h3> : null}
      <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "repeat(3,1fr)", gap: 12 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ ...wtCard({ padding: "16px 18px" }, wt), display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ ...wtIconBadge({ size: 38 }, wt) }}>
              <r.icon size={17} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: wt.muted }}>{r.label}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: wt.ink, marginTop: 2, overflowWrap: "anywhere", ...typoCss(s, device) }}>{r.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Real-estate widget renderers
function PropertyDetailsSection({ s, device }: { s: SectionInstance; device: Device }) {
  const wt = useContext(SiteLayoutThemeContext);
  const items = (s.settings.items ?? []) as { label?: string; value?: string }[];
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : 3;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 12 }}>
      {items.map((it, i) => (
        <div key={i} style={{ ...wtCard({ padding: "16px 18px" }, wt) }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: wt.muted }}>{it.label}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: wt.ink, marginTop: 5, ...typoCss(s, device) }}>{String(resolveVars(it.value ?? ""))}</div>
        </div>
      ))}
    </div>
  );
}

function UnitTypesSection({ s, device }: { s: SectionInstance; device: Device }) {
  const wt = useContext(SiteLayoutThemeContext);
  const items = (s.settings.items ?? []) as { name?: string; beds?: string; area?: string; price?: string }[];
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : 3;
  const T = typoCss(s, device);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 14 }}>
      {items.map((it, i) => (
        <div key={i} style={{ ...wtCard({ padding: "20px 20px 18px" }, wt), position: "relative" }}>
          <span style={{ ...wtPill(wt.primarySoft, wt.primary, undefined, wt), position: "absolute", top: 14, right: 14, fontSize: 11, padding: "3px 9px" }}>
            {it.beds} BHK
          </span>
          <div style={{ fontSize: 17, fontWeight: 800, color: wt.ink, letterSpacing: -0.3, ...T }}>{it.name}</div>
          <div style={{ fontSize: 13, color: wt.slate, marginTop: 8, ...T }}>Area: {it.area}</div>
          {it.price ? <div style={{ fontSize: 18, fontWeight: 800, color: wt.primary, marginTop: 10, ...T }}>{it.price}</div> : null}
        </div>
      ))}
    </div>
  );
}

function PaymentPlansSection({ s, device }: { s: SectionInstance; device: Device }) {
  const wt = useContext(SiteLayoutThemeContext);
  const st = s.settings;
  const heading = textOf(st.heading ?? "Payment Plans");
  const items = (st.items ?? []) as { plan?: string; amount?: string; details?: string }[];
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : 3;
  const T = typoCss(s, device);
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      {heading ? <h3 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 22 : 28, fontWeight: 800, letterSpacing: -0.4, margin: "0 0 20px", textAlign: "center", ...T }}>{heading}</h3> : null}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 14 }}>
        {items.map((it, i) => (
          <div key={i} style={{ ...wtCardMuted({ padding: "20px 20px 18px", borderTop: `3px solid ${st.accent ?? wt.primary}` }, wt) }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: wt.muted }}>{it.plan}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: wt.ink, marginTop: 6 }}>{it.amount}</div>
            {it.details ? <div style={{ fontSize: 12.5, color: wt.slate, marginTop: 8, lineHeight: 1.6 }}>{it.details}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function CallCtaSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const pageId = useContext(SitePageIdContext);
  const wt = useContext(SiteLayoutThemeContext);
  const text = textOf(st.text ?? "");
  const phone = textOf(st.phone ?? "");
  const number = textOf(st.number ?? "") || phone;
  const ctaLabel = textOf(st.ctaLabel ?? "Call Now");
  // Merged widget: mode picks the action — "call" (default) or "whatsapp".
  const mode = textOf(st.mode ?? "call");
  const T = typoCss(s, device);
  if (mode === "whatsapp") {
    return (
      <div style={{ ...wtCardGlass({ padding: device === "mobile" ? "18px 18px" : "22px 28px", background: "linear-gradient(135deg,#25d366,#128c7e)" }, wt), display: "flex", flexDirection: device === "mobile" ? "column" : "row", alignItems: "center", justifyContent: "space-between", gap: 14, color: "#fff" }}>
        <div style={{ fontSize: device === "mobile" ? 15 : 17, fontWeight: 800, letterSpacing: -0.2, lineHeight: 1.4, ...T }}>{text}</div>
        <a
          href={`https://wa.me/${number.replace(/[^0-9]/g, "")}`}
          target={live ? "_blank" : undefined}
          rel="noreferrer"
          onClick={(e) => {
            if (!live) {
              e.preventDefault();
              return;
            }
            if (pageId) bumpTracking(pageId, "whatsapp");
          }}
          style={{ ...wtButtonLight({}, wt), whiteSpace: "nowrap" }}
        >
          <MessageCircle size={16} /> {ctaLabel}
        </a>
      </div>
    );
  }
  return (
    <div style={{ ...wtCardGlass({ padding: device === "mobile" ? "18px 18px" : "22px 28px", background: "linear-gradient(135deg,var(--ps-primary),#8a7bff)" }, wt), display: "flex", flexDirection: device === "mobile" ? "column" : "row", alignItems: "center", justifyContent: "space-between", gap: 14, color: "#fff" }}>
      <div style={{ fontSize: device === "mobile" ? 15 : 17, fontWeight: 800, letterSpacing: -0.2, lineHeight: 1.4, ...T }}>{text}</div>
      <a
        href={`tel:${phone.replace(/[^+0-9]/g, "")}`}
        onClick={(e) => {
          if (!live) {
            e.preventDefault();
            return;
          }
          if (pageId) bumpTracking(pageId, "call");
        }}
        style={{ ...wtButtonLight({}, wt), whiteSpace: "nowrap" }}
       >
          <PhoneCall size={16} /> {ctaLabel}
      </a>
    </div>
  );
}

// Interactive layout widgets (tabs / carousel / slider)
function TabsSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const wt = useContext(SiteLayoutThemeContext);
  const items: { label: string; body: string }[] = Array.isArray(st.items)
    ? (st.items as { label?: string; title?: string; body?: string; text?: string }[]).map((it) => ({
        label: String(it.label ?? it.title ?? ""),
        body: String(it.body ?? it.text ?? ""),
      }))
    : Array.isArray(st.tabs)
    ? (st.tabs as unknown[]).map((t) => ({ label: String(t), body: "" }))
    : [];
  const [active, setActive] = useState(0);
  const idx = items.length ? Math.min(active, items.length - 1) : 0;
  const cur = items[idx];
  const T = typoCss(s, device);
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
       {st.heading ? <h2 style={{ ...wtSectionTitle({ marginBottom: 18 }, wt), textAlign: "center", letterSpacing: -0.4, ...T }}>{textOf(st.heading)}</h2> : null}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
        {items.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); setActive(i); }}
            style={{
              ...wtPill(i === idx ? wt.primarySoft : "#fff", i === idx ? wt.primary : wt.slate, { padding: "9px 18px", border: i === idx ? `1.5px solid ${wt.primary}` : wt.borderStrong, fontSize: 12.5, cursor: "pointer" }, wt),
            }}
          >
            {t.label || `Tab ${i + 1}`}
          </button>
        ))}
      </div>
      {cur ? (
        <div style={{ ...wtCard({ padding: device === "mobile" ? "18px 16px" : "26px 28px", fontSize: 14, lineHeight: 1.7, color: wt.slate }, wt), ...T }}>
          {String(resolveVars(cur.body || "")) || "Add tab content in Settings."}
        </div>
      ) : (
        <div style={{ padding: "18px 16px", border: `1.5px dashed ${wt.borderStrong}`, borderRadius: wt.radiusSm, textAlign: "center", color: wt.muted, fontSize: 13 }}>Add tabs in Settings</div>
      )}
    </div>
  );
}

function CarouselSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const wt = useContext(SiteLayoutThemeContext);
  const slides: { image?: string; caption?: string; art?: string }[] = Array.isArray(st.slides)
    ? (st.slides as { image?: string; caption?: string }[]).map((sl, i) => ({
        image: sl.image ? String(sl.image) : undefined,
        caption: sl.caption ? String(sl.caption) : undefined,
        art: isMediaSrc(String(sl.image ?? "")) ? undefined : GALLERY_ART[i % GALLERY_ART.length],
      }))
    : Array.from({ length: Math.min(Math.max(Number(st.slides ?? 3) || 3, 1), 8) }).map((_, i) => ({ art: GALLERY_ART[i % GALLERY_ART.length] }));
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const autoplay = st.autoplay !== false;
  const interval = Math.max(2000, Number(st.interval ?? 5000) || 5000);

  useEffect(() => {
    if (!live || !autoplay || count <= 1) return;
    const t = setInterval(() => setIndex((v) => (v + 1) % count), interval);
    return () => clearInterval(t);
  }, [live, autoplay, count, interval]);

  if (!count) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%", padding: "18px 16px", border: `1.5px dashed ${wt.borderStrong}`, borderRadius: wt.radiusSm, textAlign: "center", color: wt.muted, fontSize: 13 }}>Add slides in Settings</div>
    );
  }
  const idx = Math.min(index, count - 1);
  const cur = slides[idx];
  const arrowStyle = (side: "left" | "right"): CSSProperties => ({
    position: "absolute",
    top: "50%",
    [side]: 12,
    transform: "translateY(-50%)",
    width: 40,
    height: 40,
    borderRadius: wt.radiusPill,
    border: `1px solid ${wt.border}`,
    background: wt.surface,
    color: wt.primary,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: wt.shadowSm,
  });
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
       {st.heading ? <h2 style={{ ...wtSectionTitle({ marginBottom: 18 }, wt), textAlign: "center", letterSpacing: -0.4, ...typoCss(s, device) }}>{textOf(st.heading)}</h2> : null}
      <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", aspectRatio: "16/9", boxShadow: "var(--ps-shadow-md)", border: "1px solid var(--ps-line)" }}>
        {cur.image && isMediaSrc(cur.image) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cur.image} alt={cur.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <SceneImage art={cur.art ?? "skyline"} />
        )}
        {cur.caption ? (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "28px 20px 16px", background: "linear-gradient(180deg, transparent, rgba(8,10,20,.7))", color: "#fff", fontSize: 14, fontWeight: 700, ...typoCss(s, device) }}>{cur.caption}</div>
        ) : null}
        {count > 1 ? (
          <>
            <button type="button" aria-label="Previous slide" onClick={(e) => { e.stopPropagation(); setIndex((v) => (v - 1 + count) % count); }} style={arrowStyle("left")}>
              <ChevronLeft size={20} />
            </button>
            <button type="button" aria-label="Next slide" onClick={(e) => { e.stopPropagation(); setIndex((v) => (v + 1) % count); }} style={arrowStyle("right")}>
              <ChevronRight size={20} />
            </button>
          </>
        ) : null}
      </div>
      {count > 1 ? (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={(e) => { e.stopPropagation(); setIndex(i); }}
              style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 999, border: "none", background: i === idx ? wt.primary : wt.borderStrong, cursor: "pointer", transition: "width .2s", padding: 0 }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function anchorNav(link: string, live: boolean) {
  const target = (link || "").trim();
  const external = /^https?:\/\//i.test(target);
  return {
    href: target || "#",
    target: live && external ? "_blank" : undefined,
    rel: live && external ? "noopener noreferrer" : undefined,
    onClick: (e: ReactMouseEvent) => {
      if (!live) {
        e.preventDefault();
        return;
      }
      if (target.startsWith("#") && target.length > 1) {
        const el = document.getElementById(target.slice(1));
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    },
  };
}

/** Extra rule a popup can require before (or besides) its main trigger fires. */
interface PopupCondition {
  type: string;
  value?: string | number;
}

function PopupSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const pageId = useContext(SitePageIdContext);
  const formCfg = useContext(SiteFormContext);
  const wt = useContext(SiteLayoutThemeContext);
  const heading = textOf(st.heading ?? "");
  const text = textOf(resolveVars(st.text ?? ""));
  const cta = textOf(st.cta ?? st.ctaLabel ?? "");
  const link = textOf(st.link ?? "");
  const popupId = textOf(st.popupId ?? "").trim();
  const trigger = textOf(st.trigger ?? "delay");
  const delaySeconds = Math.max(0, Number(st.delaySeconds ?? 3) || 0);
  const scrollPercent = Math.min(100, Math.max(1, Number(st.scrollPercent ?? 40) || 40));
  const urlParam = textOf(st.urlParam ?? "").trim();
  const showForm = st.showForm === true;
  // Frequency — how often the same visitor sees this popup. The legacy boolean
  // oncePerSession maps: true → "session", false → "always".
  const frequency = textOf(st.frequency ?? (st.oncePerSession === false ? "always" : "session")) as "always" | "session" | "once";
  // Compound conditions — AND requires every rule on top of the trigger,
  // OR lets any single rule open the popup on its own.
  const conditionMatch: "all" | "any" = st.conditionMatch === "any" ? "any" : "all";
  const rawConditions = st.conditions;
  const conditions = useMemo(
    () => (Array.isArray(rawConditions) ? ((rawConditions as PopupCondition[]) ?? []).filter((c) => c && typeof c.type === "string") : []),
    [rawConditions],
  );
  const [open, setOpen] = useState(false);
  const storageKey = `prestate.popup.${s.id}`;

  // Embedded lead-form state
  const [values, setValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [formDone, setFormDone] = useState(false);

  useEffect(() => {
    if (!live) return;
    try {
      const store = frequency === "once" ? window.localStorage : window.sessionStorage;
      if (frequency !== "always" && store.getItem(storageKey) === "1") return;
    } catch {
      /* private mode */
    }

    const startedAt = Date.now();
    let maxScrollPct = 0;
    let fired = false;
    let armed = false;

    const fire = () => {
      if (fired) return;
      fired = true;
      setOpen(true);
    };
    const scrollPctNow = () => {
      const h = document.documentElement;
      return h.scrollHeight > 0 ? ((h.scrollTop + window.innerHeight) / h.scrollHeight) * 100 : 0;
    };
    const deviceNow = () => (window.innerWidth < 700 ? "mobile" : window.innerWidth < 1100 ? "tablet" : "desktop");
    const condMet = (c: PopupCondition) => {
      if (c.type === "scroll") return maxScrollPct >= Math.min(100, Math.max(1, Number(c.value ?? 40) || 40));
      if (c.type === "delay") return Date.now() - startedAt >= Math.max(0, Number(c.value ?? 3) || 3) * 1000;
      if (c.type === "device") return deviceNow() === String(c.value ?? "desktop");
      return true;
    };
    const evaluate = () => {
      if (fired) return;
      if (!conditions.length) {
        if (armed) fire();
        return;
      }
      const results = conditions.map(condMet);
      const okAll = results.every(Boolean);
      const okAny = results.some(Boolean);
      if ((conditionMatch === "all" && armed && okAll) || (conditionMatch === "any" && (armed || okAny))) fire();
    };
    const markArmed = () => {
      armed = true;
      evaluate();
    };

    let timer: ReturnType<typeof setTimeout> | undefined;

    const onOpenRequest = (e: Event) => {
      const detail = (e as CustomEvent<{ popupId?: string }>).detail;
      const requested = String(detail?.popupId ?? "").trim();
      // Targeted events open only the matching id; generic events reach only
      // popups without an id — so two popups can never fight over one call.
      if (requested ? requested === popupId : !popupId) markArmed();
    };
    const onLeadSuccess = () => {
      if (trigger === "form-success") markArmed();
    };
    const onDocClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(`[data-open-popup]`) as HTMLElement | null;
      if (!el) return;
      const requested = el.getAttribute("data-open-popup") ?? "";
      if (requested ? requested === popupId : !popupId) {
        e.preventDefault();
        markArmed();
      }
    };
    const onScroll = () => {
      maxScrollPct = Math.max(maxScrollPct, scrollPctNow());
      if (trigger === "scroll" && !conditions.length) {
        if (maxScrollPct >= scrollPercent) markArmed();
      } else evaluate();
    };
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        if (!conditions.length) {
          document.removeEventListener("mouseout", onLeave);
          markArmed();
        } else evaluate();
      }
    };

    if (trigger === "load") {
      timer = setTimeout(markArmed, 400);
    } else if (trigger === "delay") {
      timer = setTimeout(markArmed, delaySeconds * 1000);
    } else if (trigger === "scroll") {
      maxScrollPct = scrollPctNow(); // page may load already scrolled
    } else if (trigger === "exit") {
      document.addEventListener("mouseout", onLeave);
    } else if (trigger === "click") {
      document.addEventListener("click", onDocClick);
    }

    // Click delegation stays active so Button/CTA widgets can open any popup.
    if (trigger !== "click" && popupId) document.addEventListener("click", onDocClick);
    window.addEventListener("prestate:open-popup", onOpenRequest as EventListener);
    window.addEventListener(LEAD_SUCCESS_EVENT, onLeadSuccess);
    window.addEventListener("scroll", onScroll, { passive: true });
    const tick = setInterval(evaluate, 600);

    // URL parameter trigger — /page?offer=1 opens the popup whose id is "offer".
    try {
      const param = new URLSearchParams(window.location.search).get(urlParam || "popup");
      if (param && (!popupId || param === popupId)) timer = setTimeout(markArmed, 600);
    } catch {
      /* SSR guard */
    }

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(tick);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onLeave);
      document.removeEventListener("click", onDocClick);
      window.removeEventListener("prestate:open-popup", onOpenRequest as EventListener);
      window.removeEventListener(LEAD_SUCCESS_EVENT, onLeadSuccess);
    };
  }, [live, trigger, delaySeconds, scrollPercent, storageKey, frequency, popupId, urlParam, conditionMatch, conditions]);

  const dismiss = () => {
    setOpen(false);
    if (frequency !== "always") {
      try {
        (frequency === "once" ? window.localStorage : window.sessionStorage).setItem(storageKey, "1");
      } catch {
        /* private mode */
      }
    }
  };

  const popupFields: GateField[] = Array.isArray(st.fields) && st.fields.length
    ? (st.fields as GateField[])
    : (formCfg?.fields?.length ? formCfg.fields.slice(0, 3).map((f) => ({ ...f })) : [
        { label: "Full Name", type: "text", required: true },
        { label: "Phone Number", type: "phone", required: true },
      ]);

  const submitPopupForm = () => {
    for (const f of popupFields) {
      const v = (values[f.label] ?? "").trim();
      if ((f.required ?? false) && !v && f.type !== "checkbox") {
        setFormError(`${f.label} is required.`);
        return;
      }
      if (v && f.type === "email" && !isValidEmail(v)) {
        setFormError("Please enter a valid email address.");
        return;
      }
      if (v && f.type === "phone" && !isValidPhone(v)) {
        setFormError("Please enter a valid phone number.");
        return;
      }
    }
    setFormError("");
    setFormDone(true);
    if (!live) return;
    firePrestateLead();
    if (pageId) bumpTracking(pageId, "form");
    window.dispatchEvent(new CustomEvent(LEAD_SUCCESS_EVENT));
    const deliverable = textOf(st.pdfUrl || formCfg?.deliverableUrl || "").trim();
    if (deliverable) window.setTimeout(() => downloadFile(deliverable), 800);
    window.setTimeout(() => dismiss(), 1600);
  };

  if (!live) {
    const condSummary = conditions.length
      ? ` · ${conditionMatch === "all" ? "ALL" : "ANY"} of: ${conditions.map((c) => (c.type === "scroll" ? `scroll ≥ ${c.value ?? 40}%` : c.type === "delay" ? `${c.value ?? 3}s on page` : c.type === "device" ? String(c.value ?? "") : c.type)).join(", ")}`
      : "";
    return (
      <div style={{ maxWidth: 460, margin: "0 auto", width: "100%", border: `1.5px dashed ${wt.borderStrong}`, borderRadius: wt.radius, padding: "30px 22px 24px", textAlign: "center", background: wt.surfaceMuted, position: "relative" }}>
         <div style={{ position: "absolute", top: 10, left: 14, fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: wt.muted }}>
          Conditional popup · {trigger}{popupId ? ` · id: ${popupId}` : ""} · shows {frequency === "always" ? "every visit" : frequency === "once" ? "once ever" : "once per visit"}
        </div>
        {conditions.length ? (
           <div style={{ fontSize: 10.5, fontWeight: 700, color: wt.primary, marginTop: 26 }}>{condSummary}</div>
        ) : null}
         {heading ? <div style={{ fontSize: 20, fontWeight: 800, color: wt.ink, marginTop: conditions.length ? 6 : 14 }}>{heading}</div> : null}
         {text ? <p style={{ fontSize: 13.5, color: wt.slate, lineHeight: 1.6, margin: "8px 0 16px" }}>{text}</p> : null}
         {showForm ? <div style={{ fontSize: 12, color: wt.muted }}>Embedded lead form renders here on the live page.</div> : null}
         {!showForm && cta ? <span style={{ display: "inline-flex", background: st.accent || wt.primary, color: "#fff", fontWeight: 700, fontSize: 13, padding: "11px 22px", borderRadius: wt.radiusSm }}>{cta}</span> : null}
      </div>
    );
  }

  if (!open) return null;
  return (
    <div onClick={dismiss} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(8,10,20,.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="ps-fade-in" style={{ ...wtCard({ width: showForm ? 480 : 440, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", padding: device === "mobile" ? "34px 22px 30px" : "40px 34px", textAlign: "center", borderRadius: 20, boxShadow: "0 30px 80px rgba(8,10,20,.4)" }, wt) }}>
         <button type="button" aria-label="Close" onClick={dismiss} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", border: "none", background: wt.surfaceMuted, color: wt.slate, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <X size={16} />
        </button>
        {formDone ? (
          <>
             <span style={{ width: 58, height: 58, borderRadius: "50%", background: wt.successSoft, color: wt.success, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <CheckCircle2 size={28} />
            </span>
             <div style={{ fontSize: 20, fontWeight: 800, color: wt.ink }}>{textOf(st.successMessage || "Thanks! We'll be in touch shortly.")}</div>
          </>
        ) : (
          <>
             {heading ? <div style={{ fontSize: 24, fontWeight: 800, color: wt.ink, letterSpacing: -0.4 }}>{heading}</div> : null}
             {text ? <p style={{ fontSize: 14, color: wt.slate, lineHeight: 1.65, margin: "10px 0 22px" }}>{text}</p> : null}
            {showForm ? (
              <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 11 }}>
                {popupFields.map((f, i) => (
                  <div key={f.id || f.label || i}>
                    {f.type !== "checkbox" ? (
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: wt.slate, marginBottom: 5, display: "block" }}>
                        {f.label} {f.required !== false ? "*" : ""}
                      </label>
                    ) : null}
                    {f.type === "textarea" ? (
                      <textarea className="ps-input" placeholder={f.placeholder} value={values[f.label] ?? ""} onChange={(e) => setValues((p) => withFieldValue(p, f, e.target.value))} style={{ minHeight: 74, padding: "11px 12px" }} />
                    ) : f.type === "checkbox" ? (
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: wt.slate }}>
                        <input type="checkbox" checked={(values[f.label] ?? "") === "yes"} onChange={(e) => setValues((p) => withFieldValue(p, f, e.target.checked ? "yes" : ""))} />
                        {f.label}
                      </label>
                    ) : (
                      <input
                        className="ps-input"
                        type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : "text"}
                        placeholder={f.placeholder}
                        value={values[f.label] ?? ""}
                        onChange={(e) => setValues((p) => withFieldValue(p, f, e.target.value))}
                        style={{ padding: "11px 12px" }}
                      />
                    )}
                  </div>
                ))}
                 {formError ? <div style={{ padding: "9px 12px", borderRadius: 10, background: wt.dangerSoft, color: wt.danger, fontSize: 12.5, fontWeight: 600 }}> {formError}</div> : null}
                 <button type="button" onClick={submitPopupForm} style={{ ...wtButton({ accent: st.accent }, wt), marginTop: 4, padding: "13px 20px", borderRadius: wt.radiusSm, cursor: "pointer" }}>
                  {textOf(st.formButton || "Submit")}
                </button>
              </div>
            ) : cta ? (
              <a
                {...anchorNav(link, live)}
                onClick={(e) => {
                  anchorNav(link, live).onClick(e);
                  dismiss();
                }}
                 style={{ ...wtButton({ accent: st.accent }, wt), padding: "13px 28px", borderRadius: wt.radiusSm, textDecoration: "none" }}
              >
                {cta} <ArrowRight size={15} />
              </a>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function VideoGallerySection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const wt = useContext(SiteLayoutThemeContext);
  const videos = (st.videos ?? []) as { title?: string; url?: string }[];
  const heading = textOf(st.heading ?? st.title ?? "");
  const text = textOf(st.text ?? st.sub ?? "");
  const [active, setActive] = useState<number | null>(null);
  const cur = active !== null ? videos[active] : null;
  const curUrl = cur ? String(cur.url ?? "") : "";
  const ytId = youtubeId(curUrl);
  const embedSrc = ytId ? `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0` : curUrl;
  const T = typoCss(s, device);
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
       {heading ? <h2 style={{ ...wtSectionTitle(undefined, wt), textAlign: "center", letterSpacing: -0.4, ...T }}>{heading}</h2> : null}
       {text ? <p style={{ fontSize: 14.5, color: wt.slate, textAlign: "center", maxWidth: 620, margin: "10px auto 0", lineHeight: 1.7, ...T }}>{String(resolveVars(text))}</p> : null}
       <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "1fr 1fr", gap: 12, marginTop: 22 }}>
         {videos.map((v, i) => {
           const clickable = live && !!v.url;
           return (
             <div
               key={i}
               onClick={clickable ? (e) => { e.stopPropagation(); setActive(i); } : undefined}
               style={{ borderRadius: wt.radiusSm, overflow: "hidden", border: wt.border, position: "relative", aspectRatio: "16/9", cursor: clickable ? "pointer" : "default" }}
             >
              <SceneImage art="tour" />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#fff", background: "rgba(8,10,20,.28)" }}>
                 <span style={{ ...wtIconBadgeGlass(52, wt) }}>
                  <Play size={22} style={{ marginLeft: 3 }} />
                </span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{v.title || `Video ${i + 1}`}</span>
              </div>
            </div>
          );
        })}
      </div>
      {live && cur ? (
        <div onClick={() => setActive(null)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(8,10,20,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "min(92vw, 960px)", aspectRatio: "16/9", background: "#000", borderRadius: 14, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}>
            <button type="button" aria-label="Close" onClick={() => setActive(null)} style={{ position: "absolute", top: 10, right: 10, zIndex: 2, width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(8,10,20,.6)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <X size={18} />
            </button>
            {embedSrc ? (
              <iframe
                src={embedSrc}
                title={cur.title || "Video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DownloadsSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const pageId = useContext(SitePageIdContext);
  const wt = useContext(SiteLayoutThemeContext);
  const files = (st.files ?? []) as { name?: string; title?: string; url?: string }[];
  const heading = textOf(st.heading ?? st.title ?? "");
  const text = textOf(st.text ?? st.sub ?? "");
  const T = typoCss(s, device);
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
      {heading ? <h2 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 22 : 28, letterSpacing: -0.4, textAlign: "center", ...T }}>{heading}</h2> : null}
      {text ? <p style={{ ...wtSectionLede(undefined, wt), textAlign: "center", maxWidth: 620, margin: "10px auto 0", lineHeight: 1.7, ...T }}>{String(resolveVars(text))}</p> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 22 }}>
        {files.map((f, i) => {
          const name = f.name || f.title || `File ${i + 1}`;
          const url = String(f.url ?? "");
          const active = live && !!url;
          return (
            <a
              key={i}
              href={active ? url : undefined}
              {...(active ? { download: "", target: "_blank", rel: "noopener noreferrer" } : {})}
              onClick={(e) => {
                if (!active) {
                  e.preventDefault();
                  return;
                }
                if (pageId) bumpTracking(pageId, "brochure");
              }}
              style={{ ...wtCardMuted({ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", gap: 12, borderRadius: wt.radius }, wt), textDecoration: "none", cursor: active ? "pointer" : "default" }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 12, fontWeight: 700, fontSize: 13, color: wt.ink }}>
                <span style={{ ...wtIconBadge({ size: 36 }, wt) }}>
                  <FileText size={16} style={{ color: wt.primary }} />
                </span>
                {name}
              </span>
              <span style={{ ...wtButton({ accent: st.accent }, wt), ...(active ? {} : { background: wt.surfaceMuted, color: wt.muted, boxShadow: "none", borderColor: "transparent", cursor: "default" }) }}>
                <Download size={14} /> Download
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function BrochureSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const pageId = useContext(SitePageIdContext);
  const wt = useContext(SiteLayoutThemeContext);
  const heading = textOf(st.heading ?? st.title ?? "Download Brochure");
  const text = textOf(resolveVars(st.text ?? ""));
  const btnLabel = textOf(st.title ?? st.cta ?? "Download Brochure");
  const file = textOf(st.file ?? "").trim();
  const gateEnabled = st.gateEnabled !== false;
  const popupId = textOf(st.popupId ?? "");
  const [gateOpen, setGateOpen] = useState(false);
  const active = live && !!file;
  const gateFields = Array.isArray(st.gateFields) && st.gateFields.length
    ? (st.gateFields as GateField[])
    : [
        { label: "Full Name", type: "text", required: true },
        { label: "Phone Number", type: "phone", required: true },
        { label: "Email Address", type: "email", required: false },
      ];
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", width: "100%", textAlign: "center", ...wtCard({ padding: device === "mobile" ? "26px 20px" : "36px 32px" }, wt) }}>
      <span style={{ ...wtIconBadge({ size: 54 }, wt), marginBottom: 14 }}>
        <FileText size={26} />
      </span>
      <div style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 20 : 22, ...typoCss(s, device) }}>{heading}</div>
      {text ? <p style={{ ...wtSectionLede(undefined, wt), lineHeight: 1.65, margin: "10px auto 20px", maxWidth: 440 }}>{text}</p> : <div style={{ height: 18 }} />}
      {gateEnabled && !popupId ? (
        <button
          type="button"
          onClick={() => {
            if (!active) return;
            setGateOpen(true);
          }}
          style={{ ...wtButton({ accent: st.accent }, wt), ...(active ? {} : { background: wt.surfaceMuted, color: wt.muted, boxShadow: "none", borderColor: "transparent", cursor: "not-allowed" }) }}
        >
          <Download size={16} /> {btnLabel}
        </button>
      ) : (
        <a
          {...anchorNav(popupId ? `#` : file, live)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!active) return;
            if (popupId) {
              openPopupById(popupId);
              return;
            }
            if (!live || !file) return;
            downloadFile(file);
            if (pageId) bumpTracking(pageId, "brochure");
          }}
          style={{ ...wtButton({ accent: st.accent }, wt), textDecoration: "none", ...(active ? {} : { background: wt.surfaceMuted, color: wt.muted, boxShadow: "none", borderColor: "transparent", cursor: "not-allowed" }) }}
        >
          <Download size={16} /> {btnLabel}
        </a>
      )}
      {!active ? <div style={{ fontSize: 11.5, color: wt.muted, marginTop: 12 }}>Set a brochure file in Content to enable downloads.</div> : null}
      {gateEnabled && !popupId ? (
        <GatedDownloadModal
          open={gateOpen}
          onClose={() => setGateOpen(false)}
          live={!!live}
          pageId={pageId}
          file={file}
          heading={textOf(st.gateHeading || "Get the brochure")}
          text={textOf(st.gateText || "")}
          fields={gateFields}
          submitLabel={textOf(st.gateButton || "Submit & Download")}
          successMessage={textOf(st.gateSuccessMessage || "Verified — your brochure is downloading.")}
        />
      ) : null}
    </div>
  );
}

// Generic renderers for widgets not in the default page
function CatalogSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const pageIdCtx = useContext(SitePageIdContext);
  const wt = useContext(SiteLayoutThemeContext);
  const heading = textOf(st.heading ?? st.title ?? s.label);
  const text = textOf(st.text ?? st.subheading ?? st.sub ?? "");
  const tabs = (st.tabs as string[] | undefined) ?? [];
  const slides = Number(st.slides ?? 0);
  const files = (st.files as { name?: string; title?: string; url?: string }[] | undefined) ?? [];
  const videos = (st.videos as { title?: string; url?: string }[] | undefined) ?? [];
  const rows = (st.rows as { label?: string; value?: string }[] | undefined) ?? [];
  const items = (st.items as { title?: string; name?: string; label?: string; text?: string; body?: string; value?: string; meta?: string }[] | undefined) ?? [];
  const T = typoCss(s, device);
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      <h2 style={{ ...wtSectionTitle(undefined, wt), fontSize: device === "mobile" ? 22 : 28, letterSpacing: -0.4, textAlign: "center", ...T }}>{heading}</h2>
      {text ? <p style={{ ...wtSectionLede(undefined, wt), textAlign: "center", maxWidth: 620, margin: "10px auto 0", lineHeight: 1.7, ...T }}>{String(resolveVars(text))}</p> : null}
      {tabs.length ? (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 22 }}>
          {tabs.map((t, i) => (
            <span key={t} style={i === 0 ? wtPill(hexToSoft(wt.primary, 0.12), wt.primary, undefined, wt) : wtPill(wt.surfaceMuted, wt.slate, undefined, wt)}>{t}</span>
          ))}
        </div>
      ) : null}
      {slides > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : `repeat(${Math.min(slides, 3)},1fr)`, gap: 12, marginTop: 22 }}>
          {Array.from({ length: Math.min(slides, 6) }).map((_, i) => (
            <div key={i} style={{ aspectRatio: "16/9", borderRadius: wt.radius, overflow: "hidden", border: wt.border }}>
              <SceneImage art={GALLERY_ART[i % GALLERY_ART.length]} />
            </div>
          ))}
        </div>
      ) : null}
      {videos.length ? (
        <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "1fr 1fr", gap: 12, marginTop: 22 }}>
          {videos.map((v, i) => (
            <div key={i} style={{ borderRadius: wt.radius, overflow: "hidden", border: wt.border, position: "relative", aspectRatio: "16/9" }}>
              <SceneImage art="tour" />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>{v.title || "Video"}</div>
            </div>
          ))}
        </div>
      ) : null}
      {rows.length ? (
        <div style={{ marginTop: 22, ...wtCard({ padding: 0, overflow: "hidden", borderRadius: wt.radius }, wt) }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 16px", background: i % 2 ? wt.surfaceMuted : wt.surface, borderTop: i ? wt.border : "none" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: wt.muted }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: wt.ink }}>{String(resolveVars(r.value ?? ""))}</span>
            </div>
          ))}
        </div>
      ) : null}
      {files.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 22 }}>
          {files.map((f, i) => {
            const url = String(f.url ?? "").trim();
            const active = live && !!url;
            return (
              <a
                key={i}
                href={active ? url : undefined}
                download={active ? "" : undefined}
                target={active ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!active) {
                    e.preventDefault();
                    return;
                  }
                  if (pageIdCtx) bumpTracking(pageIdCtx, "brochure");
                }}
                style={{ ...wtCardMuted({ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", gap: 12, borderRadius: wt.radius }, wt), textDecoration: "none", cursor: active ? "pointer" : "default" }}
              >
                <span style={{ fontWeight: 700, fontSize: 13, color: wt.ink }}>{f.name || f.title || `File ${i + 1}`}</span>
                <span style={{ ...wtButton({ accent: st.accent }, wt), ...(active ? {} : { background: wt.surfaceMuted, color: wt.muted, boxShadow: "none", borderColor: "transparent", cursor: "default" }) }}>
                  {active ? (
                    <>
                      <Download size={13} /> Download
                    </>
                  ) : (
                    "Set file URL in Settings"
                  )}
                </span>
              </a>
            );
          })}
        </div>
      ) : null}
      {items.length ? (
        <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : device === "tablet" ? "1fr 1fr" : "repeat(3,1fr)", gap: 14, marginTop: 22 }}>
          {items.map((it, i) => (
            <div key={i} className="ps-card" style={{ ...wtCard({ padding: 18 }, wt) }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: wt.ink, ...T }}>{it.title ?? it.name ?? it.label ?? it.value ?? `Item ${i + 1}`}</div>
              {it.text || it.body || it.meta ? <div style={{ fontSize: 12.5, color: wt.slate, marginTop: 5, lineHeight: 1.6, ...T }}>{it.text ?? it.body ?? it.meta}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
      {!text && !tabs.length && !slides && !items.length && !files.length && !rows.length && !videos.length ? (
        <div style={{ marginTop: 16, padding: "18px 16px", border: "1.5px dashed var(--ps-line-strong)", borderRadius: 12, textAlign: "center", color: "var(--ps-muted)", fontSize: 13 }}>
          {s.label} added — edit content in Settings
        </div>
      ) : null}
    </div>
  );
}

function GenericSection({ s, device }: { s: SectionInstance; device: Device }) {
  return <CatalogSection s={s} device={device} />;
}

function AnnouncementBar({ s }: { s: SectionInstance }) {
  const text = String(s.settings.text ?? "");
  return (
    <div style={{ textAlign: "center", fontSize: 12, fontWeight: 600, letterSpacing: 0.3, color: s.style.colors?.text ?? "#f4f1ea", padding: "10px 16px" }}>
      {text}
    </div>
  );
}

function SectionBody({ s, device }: { s: SectionInstance; device: Device }) {
  const live = useContext(SiteLiveContext);
  switch (s.type) {
    case "announcement":
      return <AnnouncementBar s={s} />;
    case "hero":
      return <HeroSection s={s} device={device} />;
    case "highlights":
      return <HighlightsSection s={s} device={device} />;
    case "stats":
      return <StatsSection s={s} device={device} />;
    case "overview":
      return <OverviewSection s={s} device={device} />;
    case "amenities":
      return <AmenitiesSection s={s} device={device} />;
    case "floorplans":
    case "floor-plan-gallery":
      return <FloorPlanGallerySection s={s} device={device} />;
    case "gallery":
      return <GallerySection s={s} device={device} />;
    case "video":
    case "virtual-tour":
    case "youtube":
      return <VirtualTourSection s={s} device={device} />;
    case "location-advantages":
      return <LocationSection s={s} device={device} />;
    case "pricing":
      return <PricingSection s={s} device={device} />;
    case "testimonials":
      return <TestimonialsSection s={s} device={device} />;
    case "faq":
      return <FaqSection s={s} device={device} />;
    case "lead-form":
      return <LeadFormSection s={s} device={device} />;
    case "cta-banner":
      return <CtaBanner s={s} device={device} />;
    case "countdown":
      return <CountdownSection s={s} device={device} />;
    case "sticky-cta":
      return <StickyCta s={s} device={device} />;
    case "heading":
      return <HeadingSection s={s} device={device} />;
    case "text":
      return <TextSection s={s} device={device} />;
    case "progress-bar":
      return <ProgressBarSection s={s} />;
    case "link":
      return <LinkSection s={s} />;
    case "button":
      return <ButtonSection s={s} />;
    case "image":
      return <ImageSection s={s} />;
    case "icon":
      return <IconSection s={s} />;
    case "icon-box":
      return <IconBoxSection s={s} device={device} />;
    case "html":
      return <HtmlSection s={s} />;
    case "spacer":
      return <SpacerSection s={s} />;
    case "divider":
      return <DividerSection s={s} />;
    case "emi-calculator":
      return <EmiCalculator s={s} device={device} />;
    case "contact":
      return <ContactSection s={s} device={device} />;
    case "property-details":
      return <PropertyDetailsSection s={s} device={device} />;
    case "unit-types":
      return <UnitTypesSection s={s} device={device} />;
    case "payment-plans":
      return <PaymentPlansSection s={s} device={device} />;
    case "call-cta":
      return <CallCtaSection s={s} device={device} />;
    case "floating-icons":
      return live ? null : <FloatingIconsHint s={s} />;
    case "tabs":
      return <TabsSection s={s} device={device} />;
    case "carousel":
      return <CarouselSection s={s} device={device} />;
    case "video-gallery":
      return <VideoGallerySection s={s} device={device} />;
    case "brochure":
      return <BrochureSection s={s} device={device} />;
    case "downloads":
      return <DownloadsSection s={s} device={device} />;
    case "popup-cta":
    case "popup":
      return <PopupSection s={s} device={device} />;
    case "social-share":
      return <SocialShareSection s={s} />;
    case "section":
    case "master-plan":
    case "features":
    case "specifications":
    case "timeline":
    case "construction":
    case "builder-profile":
      return <CatalogSection s={s} device={device} />;
    default:
      return <GenericSection s={s} device={device} />;
  }
}

// ---------------------------------------------------------------------------
// Section wrapper with chrome
// ---------------------------------------------------------------------------

function SectionWrap({
  s,
  index,
  total,
  selected,
  device,
  readOnly,
  structural,
  wrapStyle,
  resizable,
  onSelect,
  onResizeColumn,
  onDuplicate,
  onDelete,
  onToggleHidden,
  onToggleLock,
  onSaveTemplate,
  onMakeGlobal,
  onMoveUp,
  onMoveDown,
  children,
}: {
  s: SectionInstance;
  index: number;
  total: number;
  selected: boolean;
  device: Device;
  readOnly?: boolean;
  structural?: boolean;
  wrapStyle?: CSSProperties;
  resizable?: boolean;
  onSelect: () => void;
  onResizeColumn: (delta: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleHidden: () => void;
  onToggleLock: () => void;
  onSaveTemplate: () => void;
  onMakeGlobal: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  children?: ReactNode;
}) {
  const { attributes: sortAttributes, listeners: sortListeners, setNodeRef: setSortRef, transform, transition, isDragging } = useSortable({
    id: s.id,
    data: { type: "section" },
    disabled: !!readOnly,
  });
  const live = useContext(SiteLiveContext);
  const hidden = s.hidden === true;
  const locked = s.locked === true;
  const sc = sectionStyle(s, device);
  // Overlay widgets render as fixed/portal chrome in live mode - collapse their
  // in-flow slot so they don't leave an empty band on the published page.
  if (live && (s.type === "popup" || s.type === "popup-cta" || s.type === "sticky-cta" || s.type === "floating-icons")) {
    sc.padding = 0;
    sc.margin = 0;
    sc.minHeight = 0;
    sc.background = "transparent";
    sc.backgroundImage = undefined;
  }
  const Icon = SLUG_ICONS[s.icon] ?? SquareStack;
  const resp = s.style.responsive ?? {};
  if ((device === "desktop" && resp.hideDesktop) || (device === "tablet" && resp.hideTablet) || (device === "mobile" && resp.hideMobile)) {
    return null;
  }

  return (
    <div
      ref={setSortRef}
      className="ps-sec-holder"
      data-sec-id={s.id}
      data-selected={selected && !readOnly ? "true" : "false"}
      data-structural={structural ? "true" : "false"}
      onClick={readOnly ? undefined : (e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        position: "relative",
        margin: readOnly ? 0 : "18px 0",
        borderRadius: 14,
        ...wrapStyle,
        transform: DndCSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 40 : undefined,
      }}
    >
      {!readOnly ? (
        <>
          {/* hover label */}
          <div style={{ position: "absolute", top: -16, left: 10, zIndex: 55, display: "flex", alignItems: "center", gap: 6, pointerEvents: "none", opacity: selected ? 1 : 0, transition: "opacity .15s" }} className="ps-sec-label">
            <span style={{ background: "var(--ps-primary)", color: "#fff", fontSize: 9.5, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", padding: "2px 9px", borderRadius: 5, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Icon size={10} /> {s.label}
            </span>
            {s.global ? <span style={{ background: "var(--ps-secondary)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 5 }}>GLOBAL</span> : null}
            {hidden ? <span style={{ background: "#e5484d", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 5 }}>HIDDEN</span> : null}
          </div>

          {/* chrome toolbar — consistent: drag · index · up/down · edit · duplicate · hide · delete */}
          <div
            className="ps-sec-toolbar"
            data-selected={selected ? "true" : "false"}
            style={{
              position: "absolute",
              top: -14,
              right: 10,
              zIndex: 60,
              display: "flex",
              alignItems: "center",
              gap: 2,
              borderRadius: 9,
              padding: 3,
              opacity: selected ? 1 : 0,
              transition: "opacity .15s",
              boxShadow: selected ? "0 6px 18px rgba(0,0,0,.2)" : undefined,
            }}
          >
            <span
              {...sortAttributes}
              {...sortListeners}
              style={{ color: selected ? "#fff" : "var(--ps-muted)", display: "inline-flex", cursor: "grab", padding: "3px 5px", background: selected ? "rgba(255,255,255,.18)" : "transparent", borderRadius: 6 }}
              title="Drag to reorder — also in Layers panel"
            >
              <GripVertical size={12} />
            </span>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: selected ? "#fff" : "var(--ps-muted)", padding: "0 4px", letterSpacing: 0.4 }}>{index + 1}/{total}</span>
            <ChromeBtn selected={selected} title="Move up" onClick={onMoveUp}>
              <ChevronUp size={12} />
            </ChromeBtn>
            <ChromeBtn selected={selected} title="Move down" onClick={onMoveDown}>
              <ChevronDown size={12} />
            </ChromeBtn>
            <span style={{ width: 1, height: 14, background: selected ? "rgba(255,255,255,.2)" : "var(--ps-line)", margin: "0 2px" }} />
            <ChromeBtn selected={selected} title="Edit section — also click to select" onClick={onSelect}>
              <SquareStack size={12} />
            </ChromeBtn>
            <ChromeBtn selected={selected} title="Duplicate — creates copy right below" onClick={onDuplicate}>
              <Copy size={12} />
            </ChromeBtn>
            <ChromeBtn selected={selected} title="Save as template" onClick={onSaveTemplate}>
              <Save size={12} />
            </ChromeBtn>
            <ChromeBtn selected={selected} title={hidden ? "Show" : "Hide from visitors"} onClick={onToggleHidden}>
              {hidden ? <Eye size={12} /> : <EyeOff size={12} />}
            </ChromeBtn>
            <ChromeBtn selected={selected} danger title="Delete section" onClick={onDelete}>
              <Trash2 size={12} />
            </ChromeBtn>
          </div>
        </>
      ) : null}

      {/* body */}
      {(() => {
        const cc = containerCss(s, device);
        const bandNarrow = s.style.layout?.width === "boxed" || s.style.layout?.width === "custom";
        const outerStyle: CSSProperties = bandNarrow ? { ...sc, ...cc } : sc;
        const body = (
          <>
            <Overlay section={s} />
            <div style={{ position: "relative", zIndex: 2, ...(bandNarrow ? undefined : cc) }}>
              {children ?? <SectionBody s={s} device={device} />}
            </div>
          </>
        );
        return (
          <div style={{ opacity: hidden ? 0.3 : 1, pointerEvents: hidden && !readOnly ? "none" : "auto" }}>
            <div style={outerStyle}>{body}</div>
          </div>
        );
      })()}

      {/* column resize handle */}
      {resizable ? <ColumnResizeHandle onResize={onResizeColumn} /> : null}

      {/* hidden placeholder */}
      {hidden ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.55)", backdropFilter: "blur(2px)", borderRadius: 14, zIndex: 50, pointerEvents: "none" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--ps-line)", borderRadius: 999, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "var(--ps-slate)", boxShadow: "var(--ps-shadow-md)" }}>
            <EyeOff size={14} /> Hidden from visitors
          </span>
        </div>
      ) : null}
      {locked ? (
        <div style={{ position: "absolute", top: 2, left: 10, zIndex: 50, background: "rgba(17,24,39,.7)", color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 5, display: "inline-flex", alignItems: "center", gap: 4, pointerEvents: "none" }}>
          <Lock size={9} /> LOCKED
        </div>
      ) : null}

      <style>{`.ps-sec-holder:hover .ps-sec-toolbar, .ps-sec-holder:hover .ps-sec-label { opacity: 1 !important; }`}</style>
    </div>
  );
}

function ColumnResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      draggable={false}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setDragging(true);
        const host = (e.currentTarget.parentElement ?? e.currentTarget) as HTMLElement;
        const startX = e.clientX;
        const startW = host.getBoundingClientRect().width || 1;
        const move = (ev: PointerEvent) => onResize(((ev.clientX - startX) / startW) * 100);
        const up = () => {
          setDragging(false);
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }}
      title="Drag to resize column"
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        right: -7,
        width: 14,
        cursor: "col-resize",
        zIndex: 80,
        touchAction: "none",
        opacity: dragging ? 1 : 0.45,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ width: 4, height: 42, borderRadius: 999, background: dragging ? "var(--ps-primary)" : "var(--ps-line-strong)", transition: "background .12s, box-shadow .12s", boxShadow: dragging ? "0 0 0 3px var(--ps-primary-mist)" : "none" }} />
    </div>
  );
}

function ChromeBtn({ children, onClick, danger, selected, title }: { children: ReactNode; onClick: () => void; danger?: boolean; selected: boolean; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 24,
        height: 24,
        border: "none",
        borderRadius: 6,
        background: "transparent",
        color: selected ? "#fff" : "var(--ps-slate)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...(danger ? { color: selected ? "#ffd7d7" : "#e5484d" } : {}),
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

export function Canvas({
  sections,
  selectedId,
  device,
  readOnly,
  onSelect,
  onMutate,
  compact,
  live,
  theme,
  form,
  chrome,
  pageId,
  design,
  onSaveSectionTemplate,
  onAddAt,
}: {
  sections: SectionInstance[];
  selectedId: string | null;
  device: Device;
  readOnly?: boolean;
  onSelect: (id: string) => void;
  onMutate: (patch: (prev: SectionInstance[]) => SectionInstance[]) => void;
  compact?: boolean;
  live?: boolean;
  theme?: CanvasTheme;
  form?: SiteConfig["form"];
  chrome?: { header: SiteConfig["header"]; footer: SiteConfig["footer"]; brand: SiteConfig["brand"] };
  pageId?: string;
  /** Design-system stylesheet + tokens for this template. */
  design?: { css?: string; bundle?: DesignBundle | null };
  /** Toolbar "Save as template" — persists the section for reuse. */
  onSaveSectionTemplate?: (node: SectionInstance) => void;
  /** Insert new section at index — used by between-section + buttons */
  onAddAt?: (index: number) => void;
}) {
  const width = live ? "100%" : device === "desktop" ? 1280 : device === "tablet" ? 768 : 390;

  const mutate = (patch: (prev: SectionInstance[]) => SectionInstance[]) => onMutate(patch);

  useEffect(() => {
    if (!selectedId || readOnly) return;
    const el = document.querySelector(`[data-sec-id="${CSS.escape(selectedId)}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedId, readOnly]);

  const handleMoveUp = (id: string) => {
    mutate((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx <= 0) return prev;
      return reorderSection(prev, id, prev[idx - 1].id, false) ?? prev;
    });
  };
  const handleMoveDown = (id: string) => {
    mutate((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      return reorderSection(prev, id, prev[idx + 1].id, true) ?? prev;
    });
  };

  // Resize a column inside its row; the width delta is applied to the column
  // and compensated on its neighbor so the row keeps a sane total.
  const handleResizeColumn = (colId: string, deltaPercent: number) => {
    mutate((prev) => {
      const t = cloneTree(prev);
      const ctx = findParentNode(t, colId);
      if (!ctx || ctx.parent.type !== "row") return prev;
      const cols = ctx.children;
      const i = cols.findIndex((c) => c.id === colId);
      if (i < 0) return prev;
      const share = 100 / Math.max(1, cols.length);
      const total = cols.reduce((a, c) => a + (Number(c.settings?.width) || 0), 0);
      const clamp = (v: number) => Math.max(8, Math.min(84, Math.round(v)));
      const setW = (idx: number, v: number) => {
        cols[idx] = { ...cols[idx], settings: { ...cols[idx].settings, width: v } };
      };
      if (total > 105 || total < 5) {
        cols.forEach((_, idx) => setW(idx, Math.round(share * 100) / 100));
      }
      const cur = Number(cols[i].settings?.width) || share;
      const next = clamp(cur + deltaPercent);
      setW(i, next);
      const delta = next - cur;
      if (i < cols.length - 1) {
        const sibCur = Number(cols[i + 1].settings?.width) || share;
        setW(i + 1, Math.max(0, Math.round(sibCur - delta)));
      } else if (i > 0) {
        const sibCur = Number(cols[i - 1].settings?.width) || share;
        setW(i - 1, Math.max(0, Math.round(sibCur - delta)));
      }
      return t;
    });
  };

  // Announcement bars are global chrome: render them above the sticky header.
  const announcements = sections.filter((s) => s.type === "announcement");
  const floatWidget = sections.find((s) => s.type === "floating-icons" && !s.hidden) ?? null;
  const content = sections.filter((s) => s.type !== "announcement");

  const renderItem = (s: SectionInstance, index: number, total: number, wrapStyle?: CSSProperties, resizable = false) => {
    const structural = isStructural(s.type);
    const common = {
      index,
      total,
      structural,
      device,
      readOnly,
      wrapStyle,
      resizable,
      selected: selectedId === s.id,
      onSelect: () => onSelect(s.id),
      onResizeColumn: (delta: number) => handleResizeColumn(s.id, delta),
      onDuplicate: () =>
        mutate((prev) => {
          const { list, copy } = duplicateSection(prev, s.id);
          if (copy) setTimeout(() => onSelect(copy.id), 30);
          return list;
        }),
      onDelete: () => mutate((prev) => removeSection(prev, s.id).list),
      onToggleHidden: () => mutate((prev) => toggleSectionFlag(prev, s.id, "hidden")),
      onToggleLock: () => mutate((prev) => toggleSectionFlag(prev, s.id, "locked")),
      onSaveTemplate: () => {
        if (onSaveSectionTemplate) onSaveSectionTemplate(s);
        else onSelect("__template_" + s.id);
      },
      onMakeGlobal: () => mutate((prev) => toggleSectionFlag(prev, s.id, "global")),
      onMoveUp: () => handleMoveUp(s.id),
      onMoveDown: () => handleMoveDown(s.id),
    };
    return (
      <SectionWrap key={s.id} s={s} {...common}>
        {structural ? renderChildren(s) : undefined}
      </SectionWrap>
    );
  };

  const renderChildren = (s: SectionInstance) => {
    const kids = s.children ?? [];
    if (s.type === "row") {
      const gap = (Number(s.settings.gap) || s.style.spacing?.gap) ?? 20;
      const widths = kids.map((child) => Number(child.settings?.width) || 0);
      const sum = widths.reduce((a, b) => a + b, 0);
      const tracks =
        device === "mobile"
          ? "1fr"
          : kids
              .map((child, i) => {
                if (child.type !== "column") return "1fr";
                const w = widths[i];
                if (!w || sum > 105) return "1fr";
                return `${w}fr`;
              })
              .join(" ");
      return (
        <div style={{ display: "grid", gridTemplateColumns: tracks, gap, alignItems: "stretch", width: "100%", minWidth: 0 }}>
          {kids.map((child, i) => {
            const isCol = child.type === "column";
            return renderItem(
              child,
              i,
              kids.length,
              {
                minWidth: 0,
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
              },
              isCol && !readOnly && i < kids.length - 1,
            );
          })}
          {!readOnly ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <NestedDropZone empty={kids.length === 0} id={s.id} />
            </div>
          ) : null}
        </div>
      );
    }
    if (s.type === "grid") {
      const cols = Math.min(Number(s.settings.columns) || Math.max(1, kids.length), Math.max(1, kids.length));
      const gap = (Number(s.settings.gap) || s.style.spacing?.gap) ?? 20;
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: device === "mobile" ? "1fr" : `repeat(${cols},1fr)`,
            gap,
            width: "100%",
            minWidth: 0,
          }}
        >
          {kids.map((child, i) => renderItem(child, i, kids.length, { minWidth: 0, width: "100%", boxSizing: "border-box" }))}
          {!readOnly ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <NestedDropZone empty={kids.length === 0} id={s.id} />
            </div>
          ) : null}
        </div>
      );
    }
    // container / column — vertical stack
    const gap = s.style.spacing?.gap ?? 24;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap, minWidth: 0, width: "100%" }}>
        {kids.map((child, i) => renderItem(child, i, kids.length, { minWidth: 0, width: "100%" }))}
        {!readOnly ? <NestedDropZone key="__nested_drop" empty={kids.length === 0} id={s.id} /> : null}
      </div>
    );
  };

  return (
    <SitePageIdContext.Provider value={pageId ?? ""}>
    <SiteDeviceContext.Provider value={device}>
    <SiteChromeContext.Provider value={chrome}>
    <SiteFormContext.Provider value={form}>
    <SiteLiveContext.Provider value={!!live}>
    <SiteDesignContext.Provider value={design?.bundle ?? null}>
    <SiteLayoutThemeContext.Provider value={getWidgetTheme(theme?.layoutTheme)}>
    <CanvasEditContext.Provider
      value={(id, patch) =>
        mutate((prev) => {
          const ref = findSection(prev, id);
          if (!ref) return prev;
          return patchSection(prev, id, { settings: { ...ref.node.settings, ...patch } });
        })
      }
    >
    <div
      className={live ? "ps-typo-scope" : "ps-canvas-dots ps-typo-scope"}
      style={{
        flex: 1,
        overflow: live ? "visible" : "auto",
        position: "relative",
        background: live ? "#fff" : undefined,
        ...(theme
          ? siteThemeStyle({
              name: theme.name ?? "",
              tagline: "",
              email: "",
              phone: theme.phone ?? "",
              primary: theme.primary,
              accent: theme.accent,
              headingFont: theme.headingFont || "Inter",
              bodyFont: theme.font,
              logo: theme.logo ?? "",
              facebook: "",
              instagram: "",
              twitter: "",
              youtube: "",
              linkedin: "",
              accentButtons: true,
            })
          : {}),
      }}
    >
      {theme && googleFontsHref(theme.headingFont || "", theme.font) ? (
        <link rel="stylesheet" href={googleFontsHref(theme.headingFont || "", theme.font)} />
      ) : null}
      {/* Design system: uploaded @font-face rules + scoped H1–P typography. */}
      {design?.css ? <style>{design.css}</style> : null}
      <div style={{ padding: live ? 0 : compact ? "10px 8px 28px" : "34px 18px 90px" }}>
        <div
          style={{
            width,
            maxWidth: "100%",
            minWidth: live || compact ? 0 : width,
            margin: "0 auto",
            background: "#fff",
            borderRadius: live ? 0 : 18,
            overflow: "visible",
            boxShadow: live ? "none" : device === "desktop" ? "0 10px 50px rgba(17,24,39,.16)" : "0 30px 90px rgba(17,24,39,.4)",
            outline: "none",
            outlineOffset: 4,
            position: "relative",
          }}
        >
          {!live ? (
            <div className="ps-artboard-chrome">
              <span className="ps-canvas-label">{device} preview</span>
              <span style={{ display: "flex", gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#f0a8a8" }} />
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#f2d3a2" }} />
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#a9d3ab" }} />
              </span>
            </div>
          ) : null}

          <div style={{ position: "relative" }}>
            {announcements.map((s, i) => renderItem(s, i, announcements.length))}

            <PageHeader
              device={device}
              selected={!live && !readOnly && selectedId === CHROME_HEADER_ID}
              onSelect={!live && !readOnly ? () => onSelect(CHROME_HEADER_ID) : undefined}
            />

            {sections.length === 0 ? (
              <div style={{ padding: "80px 40px", textAlign: "center" }}>
                <div style={{ border: "2px dashed #c4c9d8", borderRadius: 18, padding: "70px 30px", color: "var(--ps-muted)" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <span style={{ width: 56, height: 56, borderRadius: 16, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <SquareStack size={26} />
                    </span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ps-ink)", marginBottom: 6 }}>Start building your page</div>
                  <div style={{ fontSize: 13, maxWidth: 320, margin: "0 auto", lineHeight: 1.6 }}>Drag a widget from the left library onto this canvas, or click any widget to add it instantly.</div>
                </div>
              </div>
            ) : (
              <>
                {content.map((s, i) => (
                  <div key={s.id}>
                    <SectionAddStrip index={i} onAdd={onAddAt} />
                    {renderItem(s, i, content.length)}
                  </div>
                ))}
                <SectionAddStrip index={content.length} onAdd={onAddAt} />
              </>
            )}

            {!live ? (
              <DropZone index={content.length} />
            ) : null}

            <PageFooter
              device={device}
              live={live}
              selected={!live && !readOnly && selectedId === CHROME_FOOTER_ID}
              onSelect={!live && !readOnly ? () => onSelect(CHROME_FOOTER_ID) : undefined}
            />
            <FloatingContactDock live={live} device={device} widget={floatWidget} />
          </div>
        </div>
      </div>
    </div>
    </CanvasEditContext.Provider>
    </SiteLayoutThemeContext.Provider>
    </SiteDesignContext.Provider>
    </SiteLiveContext.Provider>
    </SiteFormContext.Provider>
    </SiteChromeContext.Provider>
    </SiteDeviceContext.Provider>
    </SitePageIdContext.Provider>
  );
}

function DropZone({ index }: { index: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: "strip-end", data: { type: "strip", index } });
  return (
    <div
      ref={setNodeRef}
      style={{
        height: 46,
        margin: "10px 0",
        borderRadius: 12,
        border: isOver ? "2px dashed var(--ps-primary)" : "2px dashed #c4c9d8",
        background: isOver ? "var(--ps-primary-mist)" : "rgba(244,245,250,.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: isOver ? "var(--ps-primary)" : "var(--ps-muted)",
        fontSize: 12,
        fontWeight: 700,
        transition: "border-color .12s, background .12s, color .12s",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span> Drop widget or section here
      </span>
    </div>
  );
}

function NestedDropZone({ id, empty }: { id: string; empty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `container-${id}`, data: { type: "container", id } });
  return (
    <div
      ref={setNodeRef}
      style={{
        height: empty ? 64 : 38,
        borderRadius: 11,
        border: isOver ? "2px dashed var(--ps-primary)" : "2px dashed #c4c9d8",
        background: isOver ? "var(--ps-primary-mist)" : "rgba(244,245,250,.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        color: isOver ? "var(--ps-primary)" : "var(--ps-muted)",
        fontSize: empty ? 12.5 : 11.5,
        fontWeight: 700,
        transition: "border-color .12s, background .12s, color .12s",
        margin: empty ? "6px 0" : "2px 0 6px",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>＋</span> Drop widget or section here
      </span>
    </div>
  );
}

function SectionAddStrip({ index, onAdd }: { index: number; onAdd?: (idx: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `strip-${index}`, data: { type: "strip", index } });
  const over = isOver;
  return (
    <div
      ref={setNodeRef}
      style={{
        height: over ? 44 : 18,
        margin: "2px 0",
        borderRadius: 9,
        border: over ? "1.5px dashed var(--ps-primary)" : "1px dashed transparent",
        background: over ? "var(--ps-primary-mist)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        transition: "all .12s",
        cursor: onAdd ? "pointer" : "default",
      }}
      className="ps-insert-strip"
      onClick={() => onAdd?.(index)}
      title={onAdd ? `Add section at position ${index + 1}` : undefined}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          fontWeight: 800,
          color: over ? "var(--ps-primary)" : "var(--ps-muted)",
          background: over ? "#fff" : "var(--ps-bg)",
          border: over ? "1px solid var(--ps-primary)" : "1px solid var(--ps-line)",
          borderRadius: 999,
          padding: "4px 10px",
          boxShadow: over ? "0 2px 10px rgba(109,93,252,.2)" : "none",
          opacity: over ? 1 : 0,
          transform: over ? "scale(1)" : "scale(0.95)",
          transition: "all .12s",
        }}
        className="ps-insert-label"
      >
        <Plus size={11} /> Add section here · {index + 1}
      </span>
      <style>{`.ps-insert-strip:hover .ps-insert-label { opacity: 1 !important; transform: scale(1) !important; } .ps-insert-strip:hover { background: var(--ps-primary-mist); border-color: var(--ps-line-strong); height: 28px !important; }`}</style>
    </div>
  );
}
