"use client";

import { createContext, useContext, useEffect, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Eye,
  EyeOff,
  Globe,
  GripVertical,
  Lock,
  LockOpen,
  MessageCircle,
  Phone,
  Play,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Wallet,
  CalendarClock,
  Navigation,
  ArrowRight,
  Quote,
  PhoneCall,
  SquareStack,
  Mail,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
} from "lucide-react";
import { Lightbox } from "yet-another-react-lightbox";
import { Captions, Counter, Zoom, Fullscreen, Download as LightboxDownload } from "yet-another-react-lightbox/plugins";
import "yet-another-react-lightbox/styles.css";
import type { Device, SectionInstance, SiteConfig } from "@/lib/prestate/types";
import { PROPERTY, SLUG_ICONS, resolveVars, WIDGETS } from "@/lib/prestate/data";
import { cssUrl, isMediaSrc } from "@/lib/media";
import {
  cloneTree,
  dropColumnOn,
  duplicateSection,
  findParentNode,
  findSection,
  insertChild,
  isDescendant,
  isStructural,
  newSectionId,
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
import { bumpTracking } from "@/lib/prestate/tracking";
import { firePrestateLead } from "@/components/prestate/tracking-scripts";

type CanvasTheme = {
  primary: string;
  accent: string;
  font: string;
  headingFont?: string;
  name?: string;
  phone?: string;
  logo?: string;
};

const SiteFormContext = createContext<SiteConfig["form"] | undefined>(undefined);
const SiteChromeContext = createContext<{ header: SiteConfig["header"]; footer: SiteConfig["footer"]; brand: SiteConfig["brand"] } | undefined>(undefined);
const SitePageIdContext = createContext("");
const SiteLiveContext = createContext(false);
import { SceneImage } from "@/components/prestate/art";
import { isWidgetDrag, readWidgetId } from "./widgets-panel";

// ---------------------------------------------------------------------------
// section style → css
// ---------------------------------------------------------------------------

function sectionStyle(s: SectionInstance, device: Device = "desktop"): CSSProperties {
  const st = s.style;
  const pad = st.spacing?.padding ?? { top: 72, right: 24, bottom: 72, left: 24 };
  const shrink = device === "mobile" ? 0.55 : device === "tablet" ? 0.78 : 1;
  const structural = isStructural(s.type);
  const bg = st.colors?.bg ?? (structural ? "transparent" : "#ffffff");
  const gradient = st.colors?.gradient;
  const styleImg = typeof st.colors?.image === "string" ? st.colors.image : "";
  const settingImg = typeof s.settings.image === "string" ? s.settings.image : "";
  const img = isMediaSrc(styleImg) ? styleImg : isMediaSrc(settingImg) && s.type !== "image" ? settingImg : undefined;

  const width =
    st.layout?.width === "boxed"
      ? "1200px"
      : st.layout?.width === "custom"
        ? `${st.layout.customWidth ?? 900}px`
        : "100%";
  const height =
    st.layout?.height === "vh" ? (device === "mobile" ? "auto" : "100vh") : st.layout?.height === "fixed" ? `${st.layout.fixedHeight ?? 400}px` : "auto";

  const padX = structural ? Math.round(pad.right * shrink) : Math.max(16, Math.round(pad.right * shrink));
  const padXL = structural ? Math.round(pad.left * shrink) : Math.max(16, Math.round(pad.left * shrink));

  return {
    background: gradient ? undefined : bg,
    backgroundImage: gradient ?? (img ? cssUrl(img) : undefined),
    backgroundSize: img || gradient ? "cover" : undefined,
    backgroundPosition: "center",
    position: "relative",
    color: st.colors?.text ?? "#111827",
    padding: `${Math.round(pad.top * shrink)}px ${padX}px ${Math.round(pad.bottom * shrink)}px ${padXL}px`,
    width,
    maxWidth: "100%",
    minWidth: 0,
    minHeight: s.type === "column" ? 72 : height !== "auto" ? height : undefined,
    boxSizing: "border-box",
    borderRadius: st.border?.radius ? st.border.radius : undefined,
    overflow: st.border?.radius ? "hidden" : undefined,
    boxShadow: st.effects?.shadow || undefined,
    ...(st.effects?.glass ? { backdropFilter: "blur(14px) saturate(1.3)", WebkitBackdropFilter: "blur(14px) saturate(1.3)" } : {}),
  };
}

function Overlay({ section }: { section: SectionInstance }) {
  const overlay = section.style.colors?.overlay;
  if (!overlay) return null;
  return <div style={{ position: "absolute", inset: 0, background: overlay, pointerEvents: "none" }} />;
}

function Inner({ section, children, max = 1200, align }: { section: SectionInstance; children: ReactNode; max?: number; align?: "left" | "center" | "right" }) {
  const a = align ?? section.style.layout?.align ?? "center";
  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        maxWidth: section.style.layout?.width === "boxed" ? undefined : max,
        margin: a === "center" ? "0 auto" : a === "right" ? "0 0 0 auto" : "0 auto 0 0",
        textAlign: a === "center" ? "center" : a === "right" ? "right" : "left",
        display: "flex",
        flexDirection: section.style.layout?.direction === "column" ? "column" : undefined,
        alignItems:
          a === "center" ? "center" : a === "right" ? "flex-end" : "flex-start",
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children, gold }: { children: ReactNode; gold?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: 1.6,
        textTransform: "uppercase",
        color: gold ? "var(--ps-gold)" : "var(--ps-primary)",
        background: gold ? "rgba(201,165,106,.12)" : "rgba(109,93,252,.14)",
        padding: "5px 12px",
        borderRadius: 999,
        border: gold ? "1px solid rgba(201,165,106,.35)" : "1px solid rgba(109,93,252,.25)",
      }}
    >
      {children}
    </span>
  );
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
  const side = String(st.side || header?.floatSide || "right") === "left" ? "left" : "right";

  const phone = String(st.phone || brand?.phone || "").trim();
  const waRaw = String(st.number || form?.whatsapp || phone).trim();
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
    <div style={{ border: "1.5px dashed var(--ps-line-strong)", borderRadius: 14, padding: "16px 18px", background: "var(--ps-primary-mist)", color: "var(--ps-slate)", fontSize: 13, lineHeight: 1.55 }}>
      <strong style={{ color: "var(--ps-ink)" }}>Floating icons</strong> — WhatsApp, Call, Enquire and Email stay on the {String(st.side || "right")} edge of the page (builder and live preview).
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

function HeroSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  return (
    <div style={{ position: "relative", minHeight: device === "mobile" ? 560 : device === "tablet" ? 680 : 780, display: "flex", alignItems: "center" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        {isMediaSrc(String(st.image || st.heroArt || "")) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={String(st.image || st.heroArt)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <SceneImage art={String(st.heroArt ?? st.image ?? "hero")} />
        )}
      </div>
      <Overlay section={s} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(8,10,20,.78) 0%, rgba(8,10,20,.35) 55%, transparent 100%)", zIndex: 1 }} />
      <Inner section={s} align="left" max={1200}>
        <div style={{ maxWidth: device === "mobile" ? "100%" : 640 }}>
          <Eyebrow gold>★ {String(resolveVars(st.eyebrow))}</Eyebrow>
          <h1 className="ps-canvas-serif" style={{ fontSize: device === "mobile" ? 32 : device === "tablet" ? 42 : 56, lineHeight: 1.08, fontWeight: 700, color: "#fff", letterSpacing: -0.5, margin: "16px 0 10px" }}>{String(resolveVars(st.heading))}</h1>
          <p style={{ fontSize: device === "mobile" ? 16 : device === "tablet" ? 18 : 21, color: "#c9a56a", fontWeight: 600, letterSpacing: 0.3, marginBottom: 20 }}>{String(st.subheading)}</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>{String(st.priceLabel ?? "STARTING FROM")}</span>
          </div>
          <div className="ps-canvas-serif" style={{ fontSize: device === "mobile" ? 28 : 36, fontWeight: 700, color: "#fff" }}>{String(resolveVars(st.price)).replace(/^Starting From\s*/i, "")}</div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)", margin: "4px 0 26px" }}>{String(st.priceNote)}</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span style={{ background: String(st.accent || "#cda45e"), color: "#0a0c10", fontWeight: 700, fontSize: 13.5, padding: "13px 24px", borderRadius: 11, cursor: "pointer", boxShadow: "0 10px 28px rgba(0,0,0,.25)", display: "inline-flex", alignItems: "center", gap: 8 }}>
              {String(st.ctaPrimary)} <ArrowRight size={15} />
            </span>
            <span style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.35)", color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "13px 24px", borderRadius: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, backdropFilter: "blur(8px)" }}>
              <Download size={15} /> {String(st.ctaSecondary)}
            </span>
          </div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 28 }}>
            {((st.highlights as string[] | undefined) ?? []).map((h) => (
              <span key={h} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.18)", color: "#fff", fontSize: 11.5, fontWeight: 600, padding: "7px 13px", borderRadius: 999, backdropFilter: "blur(8px)" }}>
                <CheckCircle2 size={13} style={{ color: "#cda45e" }} /> {h}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "repeat(4,1fr)" : "1fr 1fr", gap: 12, width: "100%", marginTop: 44 }}>
          {((st.heroStats as { value: string; label: string }[] | undefined) ?? []).map((x) => (
            <div key={x.label} style={{ background: "rgba(255,255,255,.09)", border: "1px solid rgba(255,255,255,.16)", borderRadius: 14, padding: "16px 18px", backdropFilter: "blur(12px)" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{x.value}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.65)", marginTop: 2, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>{x.label}</div>
            </div>
          ))}
        </div>
      </Inner>
    </div>
  );
}

function HighlightsSection({ s, device }: { s: SectionInstance; device: Device }) {
  const items = (s.settings.items ?? []) as { icon?: string; value: string; label: string }[];
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : Math.min(items.length || 1, 5);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 0 }}>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: "20px 16px",
            borderRight: device === "mobile" || (device === "tablet" && i % 2 === 1) || i === items.length - 1 ? "none" : "1px solid var(--ps-line)",
            borderBottom: device !== "desktop" && i < items.length - 1 ? "1px solid var(--ps-line)" : "none",
          }}
        >
          <span style={{ width: 42, height: 42, borderRadius: 12, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {iconFor(it.icon, 20)}
          </span>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "var(--ps-ink)" }}>{it.value}</div>
            <div style={{ fontSize: 11, color: "var(--ps-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{it.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function OverviewSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  return (
    <div style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "1.05fr 1fr" : "1fr", gap: device === "mobile" ? 28 : 40, alignItems: "center" }}>
      <div style={{ position: "relative" }}>
        <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 60px rgba(17,24,39,.16)" }}>
          {isMediaSrc(String(st.image)) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={String(st.image)} alt="" style={{ width: "100%", height: "100%", minHeight: 280, objectFit: "cover", display: "block" }} />
          ) : (
            <SceneImage art={String(st.image || "lobby")} />
          )}
        </div>
        <div style={{ position: "absolute", bottom: -22, right: 28, background: "#fff", border: "1px solid var(--ps-line)", borderRadius: 16, padding: "14px 18px", boxShadow: "var(--ps-shadow-md)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: "var(--ps-grad-primary)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={20} />
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>RERA Approved</div>
            <div style={{ fontSize: 11, color: "var(--ps-muted)" }}>{PROPERTY.reraNumber}</div>
          </div>
        </div>
      </div>
      <div>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 14px", lineHeight: 1.15 }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.75, color: "var(--ps-slate)", marginBottom: 18 }}>{String(st.text)}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
          {((st.bullets as string[] | undefined) ?? []).map((b) => (
            <div key={b} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 20, height: 20, borderRadius: 7, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Check size={12} strokeWidth={3} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ps-slate)" }}>{b}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "repeat(3,1fr)", gap: 12 }}>
          {((st.stats as { value: string; label: string }[] | undefined) ?? []).map((x) => (
            <div key={x.label} style={{ background: "#f8fafc", border: "1px solid var(--ps-line)", borderRadius: 13, padding: "14px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ps-primary)" }}>{x.value}</div>
              <div style={{ fontSize: 10.5, color: "var(--ps-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{x.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AmenitiesSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const items = (st.items ?? []) as { icon?: string; title: string; desc: string }[];
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : 4;
  return (
    <>
      <Inner section={s}>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px" }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 14, color: "var(--ps-slate)", maxWidth: 560, lineHeight: 1.65 }}>{String(st.text)}</p>
      </Inner>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 16, marginTop: 34, maxWidth: 1200, width: "100%", margin: "34px auto 0" }}>
        {items.map((it, i) => (
          <div key={i} className="ps-card" style={{ padding: "22px 18px", borderRadius: 15, transition: "all .2s", cursor: "default" }}>
            <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--ps-grad-primary)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14, boxShadow: "0 8px 20px rgba(109,93,252,.28)" }}>
              {iconFor(it.icon, 21)}
            </span>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--ps-ink)" }}>{it.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--ps-slate)", marginTop: 5, lineHeight: 1.6 }}>{it.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function FloorPlansSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const plans = (st.plans ?? []) as { name: string; beds: string; area: string; price: string }[];
  const [active, setActive] = useState(0);
  const plan = plans[active];
  return (
    <>
      <Inner section={s}>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px" }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 14, color: "var(--ps-slate)", maxWidth: 600, lineHeight: 1.65 }}>{String(st.text)}</p>
      </Inner>
      <div style={{ maxWidth: 1200, margin: "30px auto 0", width: "100%" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 26 }}>
          {plans.map((p, i) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setActive(i)}
              style={{
                padding: "9px 18px",
                borderRadius: 999,
                border: active === i ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line-strong)",
                background: active === i ? "var(--ps-primary-soft)" : "#fff",
                color: active === i ? "var(--ps-primary)" : "var(--ps-slate)",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
        {plan ? (
          <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "1.4fr 1fr", gap: 28, alignItems: "center" }}>
            <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid var(--ps-line)", boxShadow: "var(--ps-shadow-md)" }}>
              <SceneImage art="plan" beds={plan.beds} />
            </div>
            <div style={{ padding: device === "mobile" ? 0 : 10 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ps-ink)" }}>{plan.name}</div>
              <div style={{ fontSize: 13, color: "var(--ps-muted)", marginTop: 4 }}>Vastu-compliant · Corner & regular units available</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "20px 0" }}>
                {[
                  { label: "Carpet Area", value: plan.area },
                  { label: "Bedrooms", value: `${plan.beds} BHK` },
                  { label: "Price", value: plan.price },
                  { label: "Possession", value: "Dec 2027" },
                ].map((f) => (
                  <div key={f.label} style={{ background: "#f8fafc", border: "1px solid var(--ps-line)", borderRadius: 11, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10.5, color: "var(--ps-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ps-ink)", marginTop: 3 }}>{f.value}</div>
                  </div>
                ))}
              </div>
              <span style={{ background: "var(--ps-grad-primary)", color: "#fff", fontSize: 13, fontWeight: 700, padding: "12px 22px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", boxShadow: "0 8px 22px rgba(109,93,252,.3)" }}>
                Request {plan.name} Details <ArrowRight size={14} />
              </span>
            </div>
          </div>
        ) : null}
        <div style={{ textAlign: "center", fontSize: 12.5, color: "var(--ps-muted)", marginTop: 26 }}>{String(st.note)}</div>
      </div>
    </>
  );
}

const GALLERY_ART = ["skyline", "lobby", "pool", "tower", "garden", "interior"];

function GallerySection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : 3;
  const images = (Array.isArray(st.images) ? (st.images as string[]) : []).slice(0, 6);
  const captions = Array.isArray(st.captions) ? (st.captions as string[]) : [];
  const lightboxOn = st.lightbox !== false;
  const canOpen = live && lightboxOn && images.length > 0;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const slides = images.map((img, i) => ({
    type: "image" as const,
    src: isMediaSrc(img) ? img : "",
    alt: captions[i] || `${String(st.heading || "Gallery")} ${i + 1}`,
    caption: captions[i] || undefined,
    art: isMediaSrc(img) ? undefined : GALLERY_ART[i % GALLERY_ART.length],
  }));

  return (
    <>
      <Inner section={s}>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px" }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 14, color: "var(--ps-slate)", maxWidth: 520, lineHeight: 1.65 }}>{String(st.text)}</p>
      </Inner>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 14, maxWidth: 1200, margin: "30px auto 0", width: "100%" }}>
        {images.map((img, i) => (
          <div
            key={i}
            onClick={canOpen ? (e) => { e.stopPropagation(); setOpenIndex(i); } : undefined}
            style={{ borderRadius: 16, overflow: "hidden", position: "relative", aspectRatio: "4/3", cursor: canOpen ? "zoom-in" : "pointer", boxShadow: "var(--ps-shadow-sm)" }}
          >
            {isMediaSrc(img) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={captions[i] || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <SceneImage art={GALLERY_ART[i % GALLERY_ART.length]} />
            )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, rgba(8,10,20,.55))", opacity: 0, transition: "opacity .2s" }} className="ps-gal-overlay" />
            <style>{`.ps-sec-holder:hover .ps-gal-overlay { opacity: 1 }`}</style>
          </div>
        ))}
      </div>
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
                  <div style={{ width: "min(92vw, 1100px)", aspectRatio: "4/3", maxHeight: "84vh", borderRadius: 12, overflow: "hidden" }}>
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

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

function VirtualTourSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const url = String(st.url ?? "");
  const [playing, setPlaying] = useState(false);
  const yt = youtubeId(url);
  const embedSrc = yt ? `https://www.youtube.com/embed/${yt}?autoplay=1&rel=0` : url;
  const canPlay = live && !!url;
  return (
    <>
      <Inner section={s}>
        <Eyebrow gold>★ {String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px", color: "#fff" }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", maxWidth: 520, lineHeight: 1.65 }}>{String(st.text)}</p>
      </Inner>
      <div style={{ maxWidth: 1000, margin: "30px auto 0", width: "100%" }}>
        <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.5)", aspectRatio: "16/9", cursor: canPlay && !playing ? "pointer" : "default" }} onClick={canPlay && !playing ? (e) => { e.stopPropagation(); setPlaying(true); } : undefined}>
          {playing && canPlay ? (
            <iframe
              src={embedSrc}
              title={String(st.videoTitle || st.heading || "Video")}
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
                  {String(st.videoTitle)} · {String(st.duration)}
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
  const items = (st.items ?? []) as { icon?: string; title: string; meta: string }[];
  const address = String(st.address ?? "").trim();
  const zoom = Math.min(20, Math.max(1, Number(st.zoom ?? 14) || 14));
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=${zoom}&output=embed`;
  const dirHref = address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : "";
  return (
    <div style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "1fr 1.05fr" : "1fr", gap: 32, alignItems: "stretch" }}>
      <div>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 32, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 10px", lineHeight: 1.2 }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 14, color: "var(--ps-slate)", lineHeight: 1.7, marginBottom: 24 }}>{String(st.text)}</p>
        <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "1fr 1fr", gap: 12 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "#f8fafc", border: "1px solid var(--ps-line)", borderRadius: 12, padding: "13px 14px" }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {iconFor(it.icon, 17)}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
                <div style={{ fontSize: 11, color: "var(--ps-muted)", marginTop: 1 }}>{it.meta}</div>
              </div>
            </div>
          ))}
        </div>
        {live && dirHref ? (
          <a
            href={dirHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, marginTop: 20, fontSize: 13, fontWeight: 600, color: "var(--ps-primary)", textDecoration: "none" }}
          >
            <Navigation size={15} /> Get Directions to {PROPERTY.location}
          </a>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, fontSize: 13, fontWeight: 600, color: "var(--ps-primary)" }}>
            <Navigation size={15} /> Get Directions to {PROPERTY.location}
          </div>
        )}
      </div>
      <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid var(--ps-line)", boxShadow: "var(--ps-shadow-md)", minHeight: 360 }}>
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
  const plans = (st.plans ?? []) as { name: string; area: string; price: string; per: string; features: string[]; cta: string; featured?: boolean }[];
  return (
    <>
      <Inner section={s}>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px" }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 14, color: "var(--ps-slate)", maxWidth: 560, lineHeight: 1.65 }}>{String(st.text)}</p>
      </Inner>
      <div style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "repeat(3,1fr)" : device === "tablet" ? "1fr 1fr" : "1fr", gap: 18, maxWidth: 1200, margin: "34px auto 0", width: "100%", alignItems: "stretch" }}>
        {plans.map((p) => (
          <div
            key={p.name}
            style={{
              borderRadius: 18,
              border: p.featured ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line)",
              background: p.featured ? "linear-gradient(180deg, var(--ps-primary-mist), #fff 42%)" : "#fff",
              boxShadow: p.featured ? "0 22px 50px rgba(109,93,252,.18)" : "var(--ps-shadow-sm)",
              padding: 26,
              position: "relative",
            }}
          >
            {p.featured ? (
              <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--ps-grad-primary)", color: "#fff", fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, padding: "5px 14px", borderRadius: 999, textTransform: "uppercase" }}>
                Most Popular
              </span>
            ) : null}
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ps-primary)", textTransform: "uppercase", letterSpacing: 0.8 }}>{p.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--ps-muted)", margin: "4px 0 14px" }}>{p.area}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "var(--ps-ink)", letterSpacing: -0.5 }}>
              {p.price}
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ps-muted)" }}> {p.per}</span>
            </div>
            <div style={{ height: 1, background: "var(--ps-line)", margin: "18px 0" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 150 }}>
              {(p.features ?? []).map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <CheckCircle2 size={15} style={{ color: p.featured ? "var(--ps-primary)" : "#94a3b8", flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: "var(--ps-slate)" }}>{f}</span>
                </div>
              ))}
            </div>
            <span
              style={{
                display: "block",
                textAlign: "center",
                marginTop: 18,
                padding: "12px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                background: p.featured ? "var(--ps-grad-primary)" : "#f1f4f9",
                color: p.featured ? "#fff" : "var(--ps-ink)",
                boxShadow: p.featured ? "0 8px 22px rgba(109,93,252,.3)" : "none",
              }}
            >
              {p.cta}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function TestimonialsSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const items = (st.items ?? []) as { name: string; role: string; quote: string; rating: number }[];
  return (
    <>
      <Inner section={s}>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px" }}>{String(st.heading)}</h2>
      </Inner>
      <div style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "repeat(3,1fr)" : device === "tablet" ? "1fr 1fr" : "1fr", gap: 18, maxWidth: 1200, margin: "30px auto 0", width: "100%" }}>
        {items.map((t, i) => (
          <div key={i} className="ps-card" style={{ padding: 26, borderRadius: 16, display: "flex", flexDirection: "column", position: "relative" }}>
            <Quote size={30} style={{ color: "var(--ps-secondary)", opacity: 0.6, marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} size={14} fill={j < t.rating ? "#cda45e" : "none"} color="#cda45e" />
              ))}
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--ps-slate)", flex: 1 }}>“{t.quote}”</p>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 18 }}>
              <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--ps-grad-brand)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                {t.name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--ps-muted)" }}>{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function FaqSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const items = (st.items ?? []) as { q?: string; a?: string; title?: string; body?: string }[];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <Inner section={s}>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px" }}>{String(st.heading)}</h2>
      </Inner>
      <div style={{ maxWidth: 820, margin: "30px auto 0", width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{ border: open === i ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line)", borderRadius: 14, background: "#fff", overflow: "hidden", boxShadow: open === i ? "0 10px 30px rgba(109,93,252,.1)" : "none", transition: "all .18s" }}>
            <button type="button" onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "17px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
              <span style={{ width: 24, height: 24, borderRadius: 8, background: open === i ? "var(--ps-primary-soft)" : "#f1f4f9", color: open === i ? "var(--ps-primary)" : "var(--ps-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ChevronDown size={14} style={{ transform: open === i ? "rotate(180deg)" : "none", transition: "transform .18s" }} />
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ps-ink)", flex: 1 }}>{it.q ?? (it as { title?: string }).title}</span>
            </button>
            {open === i ? <div style={{ padding: "0 20px 18px 56px", fontSize: 13, lineHeight: 1.7, color: "var(--ps-slate)" }}>{it.a ?? (it as { body?: string }).body}</div> : null}
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
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const rawFields = cfg?.fields?.length ? cfg.fields : (st.fields ?? []);
  const fields = (Array.isArray(rawFields) ? rawFields : [])
    .map((f, i) => {
      if (typeof f === "string") {
        const type = f === "email" ? "email" : f === "phone" ? "phone" : f === "message" ? "textarea" : "text";
        const label = f.charAt(0).toUpperCase() + f.slice(1);
        return { id: `w${i}`, type, label, placeholder: label, required: type !== "textarea" };
      }
      return f as { type: string; label: string; placeholder?: string; options?: string[]; required?: boolean; id?: string };
    })
    .filter((f) => f && f.type !== "hidden");

  const multi = cfg?.multiStep ?? Boolean(st.steps);
  const chunk = 3;
  const steps = multi ? Math.max(1, Math.ceil(fields.length / chunk)) : 1;
  const visible = multi ? fields.slice(step * chunk, step * chunk + chunk) : fields;
  const submitLabel = cfg?.submitLabel || String(st.button || "Submit");
  const last = step >= steps - 1;

  const deliverableUrl = String(st.pdfUrl || cfg?.deliverableUrl || "").trim();
  const deliverableLabel = String(st.pdfLabel || cfg?.deliverableLabel || "Download brochure").trim() || "Download brochure";
  const redirectTarget = cfg?.redirectThankYou ? String(cfg?.thankYou ?? "").trim() : "";
  const doRedirect = live && /^(https?:\/\/|\/)/.test(redirectTarget);
  const successMsg = !cfg?.redirectThankYou && cfg?.thankYou ? cfg.thankYou : "Thanks — our team will call you shortly.";

  const submit = () => {
    const missing = visible.find((f) => ("required" in f ? f.required : false) && !(values[f.label] || "").trim() && f.type !== "checkbox");
    if (missing) return;
    if (!last) {
      setStep((v) => v + 1);
      return;
    }
    setSent(true);
    if (!live) return;
    firePrestateLead();
    if (pageId) bumpTracking(pageId, "form");
    const digits = (cfg?.whatsapp || "").replace(/\D/g, "");
    if (cfg?.sendWhatsapp && digits) {
      if (pageId) bumpTracking(pageId, "whatsapp");
      const body = fields.map((f) => `${f.label}: ${values[f.label] || ""}`).join("%0A");
      window.open(`https://wa.me/${digits}?text=${body}`, "_blank", "noopener,noreferrer");
    }
    if (doRedirect) window.location.assign(redirectTarget);
  };

  if (sent) {
    return (
      <div id="lead-form" style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: device === "mobile" ? "32px 16px" : "48px 24px" }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>{successMsg}</h2>
        {cfg?.notifyEmail ? <p style={{ color: "var(--ps-slate)", fontSize: 14 }}>A copy can be sent to {cfg.notifyEmail}.</p> : null}
        {deliverableUrl ? (
          <div>
            <a
              href={live ? deliverableUrl : undefined}
              {...(live ? { download: "", target: "_blank", rel: "noopener noreferrer" } : {})}
              onClick={(e) => {
                if (!live) {
                  e.preventDefault();
                  return;
                }
                if (pageId) bumpTracking(pageId, "brochure");
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16, padding: "12px 22px", borderRadius: 11, background: "var(--ps-grad-primary)", color: "#fff", fontWeight: 700, fontSize: 13.5, textDecoration: "none", boxShadow: "0 10px 26px rgba(109,93,252,.32)", cursor: live ? "pointer" : "default" }}
            >
              <Download size={16} /> {deliverableLabel}
            </a>
          </div>
        ) : null}
        <div>
          <button type="button" onClick={() => { setSent(false); setStep(0); setValues({}); }} style={{ marginTop: 16, padding: "10px 16px", borderRadius: 10, border: "1px solid var(--ps-line-strong)", background: "#fff", cursor: "pointer", fontWeight: 700 }}>
            Send another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="lead-form" style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "1fr 1.1fr" : "1fr", gap: 32, alignItems: "center" }}>
      <div>
        <Eyebrow gold>★ {String(st.eyebrow || "Enquire")}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 32, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 10px" }}>{String(st.heading || "Book a site visit")}</h2>
        <p style={{ fontSize: 14, color: "var(--ps-slate)", lineHeight: 1.7, marginBottom: 26 }}>{String(st.sub || "Share your details and our team will get in touch.")}</p>
      </div>
      <form
        className="ps-card"
        style={{ borderRadius: 20, padding: 28, boxShadow: "var(--ps-shadow-md)" }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {multi ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>Step {step + 1} of {steps}</span>
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 22 }}>
              {Array.from({ length: steps }).map((_, i) => (
                <span key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i <= step ? "var(--ps-grad-primary)" : "#e8eaf1" }} />
              ))}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", marginBottom: 16 }}>Lead capture</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {visible.map((f, i) => {
            const key = f.label;
            const val = values[key] ?? "";
            return (
              <div key={f.id || key || i}>
                {f.type !== "checkbox" ? (
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ps-slate)", marginBottom: 5, display: "block" }}>
                    {f.label} {"required" in f && f.required ? " *" : ""}
                  </label>
                ) : null}
                {f.type === "select" ? (
                  <select className="ps-input" required={"required" in f ? f.required : false} value={val} onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))} style={{ padding: "11px 12px" }}>
                    <option value="">{f.placeholder || "Choose"}</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea className="ps-input" required={"required" in f ? f.required : false} placeholder={f.placeholder} value={val} onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))} style={{ minHeight: 88, padding: "11px 12px" }} />
                ) : f.type === "checkbox" ? (
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "var(--ps-slate)" }}>
                    <input type="checkbox" required={"required" in f ? f.required : false} checked={val === "yes"} onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.checked ? "yes" : "" }))} />
                    {f.label}
                  </label>
                ) : (
                  <input
                    className="ps-input"
                    type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : f.type === "date" ? "date" : "text"}
                    required={"required" in f ? f.required : false}
                    placeholder={f.placeholder}
                    value={val}
                    onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                    style={{ padding: "11px 12px" }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {step > 0 ? (
            <button type="button" onClick={() => setStep((v) => Math.max(0, v - 1))} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--ps-line-strong)", background: "#fff", color: "var(--ps-slate)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Back
            </button>
          ) : null}
          <button type="submit" style={{ flex: 2, padding: "12px", borderRadius: 10, border: "none", background: "var(--ps-grad-primary)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {last ? submitLabel : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CtaBanner({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  return (
    <div style={{ position: "relative", textAlign: "center", padding: device === "mobile" ? "48px 22px" : "72px 24px" }}>
      <Overlay section={s} />
      <Inner section={s}>
        <Eyebrow gold>★ {String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 38, fontWeight: 800, letterSpacing: -0.6, margin: "16px 0 12px", color: "#fff", maxWidth: 760, lineHeight: 1.2 }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,.78)", maxWidth: 620, lineHeight: 1.7 }}>{String(st.sub)}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
          <span style={{ background: "linear-gradient(135deg,#cda45e,#b08a3e)", color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "13px 26px", borderRadius: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 10px 28px rgba(205,164,94,.4)" }}>
            {String(st.ctaPrimary)} <ArrowRight size={15} />
          </span>
          <span style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.35)", color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "13px 26px", borderRadius: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <PhoneCall size={15} /> {String(st.ctaSecondary)}
          </span>
        </div>
      </Inner>
    </div>
  );
}

function OfferBanner({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: device === "mobile" ? 18 : 22, fontWeight: 800, letterSpacing: -0.3 }}>{String(st.heading)}</div>
        <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 4, lineHeight: 1.55 }}>{String(st.text)}</div>
      </div>
      <span style={{ background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.35)", fontWeight: 700, fontSize: 13, padding: "11px 18px", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap" }}>{String(st.cta ?? "Learn more")}</span>
    </div>
  );
}

function CountdownSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const staticItems = (st.items ?? []) as { title?: string; text?: string; value?: string; label?: string }[];
  const target = String(st.date ?? "").trim();
  const [now, setNow] = useState<number | null>(null);

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
      <div style={{ fontSize: device === "mobile" ? 16 : 18, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 18 }}>{String(st.heading)}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(cells.length || 4, 4)},1fr)`, gap: device === "mobile" ? 8 : 14 }}>
        {cells.map((it, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)", borderRadius: 14, padding: device === "mobile" ? "12px 6px" : "16px 10px" }}>
            <div className="ps-canvas-serif" style={{ fontSize: device === "mobile" ? 26 : 36, fontWeight: 700 }}>{it.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.7, marginTop: 4 }}>{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StickyCta({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  return (
    <div style={{ position: "relative", height: 0 }}>
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(720px, calc(100% - 24px))",
          background: "rgba(255,255,255,.94)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(17,24,39,.1)",
          borderRadius: 16,
          padding: device === "mobile" ? "12px 12px" : "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: device === "mobile" ? "wrap" : "nowrap",
          boxShadow: "0 18px 50px rgba(17,24,39,.22)",
          zIndex: 40,
        }}
      >
        <div style={{ flex: "1 1 160px", minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ps-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(resolveVars(st.text))}</div>
          <div style={{ fontSize: 11, color: "var(--ps-muted)", marginTop: 1 }}>{PROPERTY.location}</div>
        </div>
        {device !== "mobile" ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ps-slate)" }}>
            <Phone size={13} /> {String(st.phone)}
          </span>
        ) : null}
        <span style={{ background: "linear-gradient(135deg,#c9a56a,#a8844a)", color: "#0a0c10", fontSize: 12.5, fontWeight: 700, padding: "10px 16px", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap", flex: device === "mobile" ? "1 1 auto" : undefined, textAlign: "center" }}>{String(st.ctaLabel)}</span>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#25d366", background: "rgba(37,211,102,.1)", padding: "8px 12px", borderRadius: 9, cursor: "pointer", flex: device === "mobile" ? "1 1 auto" : undefined }}>
          <MessageCircle size={14} /> WhatsApp
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic / basic content widgets
// ---------------------------------------------------------------------------

function HeadingSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const tag = String(st.tag ?? "h2");
  const size = Number(st.size ?? (tag === "h1" ? 44 : tag === "h3" ? 28 : 34));
  const align = String(st.align ?? "center") as "left" | "center" | "right";
  const color = s.style.colors?.text ?? "var(--ps-ink)";
  const text = String(resolveVars(st.text ?? ""));
  const fontSize = device === "mobile" ? Math.round(size * 0.8) : size;
  return (
    <div style={{ textAlign: align }}>
      <div style={{ fontSize, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.15, color, margin: 0 }}>{text}</div>
    </div>
  );
}

function TextSection({ s }: { s: SectionInstance }) {
  const text = String(resolveVars(s.settings.text ?? ""));
  return <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--ps-slate)", margin: 0 }}>{text}</p>;
}

function ButtonSection({ s }: { s: SectionInstance }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const text = String(resolveVars(st.text ?? "Click Here"));
  const link = String(st.link ?? "#");
  const variant = String(st.style ?? "solid");
  const solid = variant !== "outline" && variant !== "ghost";
  const external = /^https?:\/\//i.test(link.trim());
  return (
    <div style={{ textAlign: "center" }}>
      <a
        href={link || "#"}
        target={live && external ? "_blank" : undefined}
        rel={live && external ? "noopener noreferrer" : undefined}
        onClick={(e) => {
          if (!live) {
            e.preventDefault();
            return;
          }
          const target = link.trim();
          if (target.startsWith("#") && target.length > 1) {
            const el = document.getElementById(target.slice(1));
            if (el) {
              e.preventDefault();
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "13px 28px",
          borderRadius: 11,
          fontWeight: 700,
          fontSize: 14,
          background: solid ? "var(--ps-primary)" : "transparent",
          color: solid ? "#fff" : "var(--ps-primary)",
          border: variant === "outline" ? "1.5px solid var(--ps-primary)" : "none",
          boxShadow: solid ? "0 10px 26px rgba(109,93,252,.35)" : "none",
          textDecoration: "none",
          cursor: "pointer",
        }}
      >
        {text}
      </a>
    </div>
  );
}

function ImageSection({ s }: { s: SectionInstance }) {
  const st = s.settings;
  const src = String(st.src ?? "");
  const alt = String(st.alt ?? "Image");
  const radius = Number(st.radius ?? 12);
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {src ? (
        <img src={src} alt={alt} style={{ maxWidth: "100%", width: "min(800px,100%)", borderRadius: radius, objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "min(800px,100%)", aspectRatio: "16/9", borderRadius: radius, border: "1.5px dashed var(--ps-line-strong)", background: "var(--ps-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ps-muted)", fontSize: 13, fontWeight: 600, textAlign: "center", padding: "0 20px" }}>
          Image — upload a file or paste a URL in Content
        </div>
      )}
    </div>
  );
}

function IconSection({ s }: { s: SectionInstance }) {
  const st = s.settings;
  const name = String(st.name ?? st.icon ?? "Sparkles");
  const size = Number(st.size ?? 48);
  const color = String(st.color ?? "var(--ps-primary)");
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
  const icon = String(st.icon ?? "Sparkles");
  const title = String(st.title ?? "");
  const text = String(st.text ?? "");
  const Icon = SLUG_ICONS[icon] ?? SLUG_ICONS.Sparkles ?? Sparkles;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 12,
        padding: device === "mobile" ? "20px 16px" : "28px 22px",
        borderRadius: 16,
        border: "1px solid var(--ps-line)",
        background: "var(--ps-panel-raised)",
        maxWidth: 360,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <span style={{ width: 48, height: 48, borderRadius: 13, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {isMediaSrc(icon) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
        ) : (
          <Icon size={24} />
        )}
      </span>
      {title ? <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ps-ink)", letterSpacing: -0.2 }}>{title}</div> : null}
      {text ? <div style={{ fontSize: 13, color: "var(--ps-slate)", lineHeight: 1.6 }}>{text}</div> : null}
    </div>
  );
}

function HtmlSection({ s }: { s: SectionInstance }) {
  const code = String(s.settings.code ?? "");
  return (
    <div style={{ fontFamily: "monospace", fontSize: 12, background: "var(--ps-bg)", border: "1px dashed var(--ps-line-strong)", borderRadius: 10, padding: 14, color: "var(--ps-muted)", whiteSpace: "pre-wrap", overflow: "auto" }}>
      {code || "<!-- your custom HTML here -->"}
    </div>
  );
}

function SpacerSection({ s }: { s: SectionInstance }) {
  const h = Math.max(0, Number(s.settings.height ?? 80));
  return <div style={{ height: h }} aria-hidden />;
}

function DividerSection({ s }: { s: SectionInstance }) {
  const st = s.settings;
  const color = String(st.color ?? "#e8eaf1");
  const thickness = Math.max(1, Number(st.thickness ?? 1));
  const width = String(st.width ?? "100%");
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <hr style={{ width, border: "none", borderTop: `${thickness}px solid ${color}`, margin: 0 }} />
    </div>
  );
}

function ContactSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const heading = String(st.heading ?? "Get in Touch");
  const rows = [
    { icon: SLUG_ICONS.Phone ?? Sparkles, label: "Call", value: String(st.phone ?? "") },
    { icon: SLUG_ICONS.Send ?? Sparkles, label: "Email", value: String(st.email ?? "") },
    { icon: SLUG_ICONS.MapPin ?? Sparkles, label: "Address", value: String(st.address ?? "") },
  ].filter((r) => r.value);
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
      {heading ? <h3 style={{ fontSize: device === "mobile" ? 22 : 26, fontWeight: 800, letterSpacing: -0.4, margin: "0 0 18px", textAlign: "center" }}>{heading}</h3> : null}
      <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "repeat(3,1fr)", gap: 12 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line)", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <r.icon size={17} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ps-muted)" }}>{r.label}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ps-ink)", marginTop: 2, overflowWrap: "anywhere" }}>{r.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Real-estate widget renderers
function PropertyDetailsSection({ s, device }: { s: SectionInstance; device: Device }) {
  const items = (s.settings.items ?? []) as { label?: string; value?: string }[];
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : 3;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 12 }}>
      {items.map((it, i) => (
        <div key={i} style={{ background: "var(--ps-bg)", border: "1px solid var(--ps-line)", borderRadius: 13, padding: "16px 18px" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--ps-muted)" }}>{it.label}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ps-ink)", marginTop: 5 }}>{String(resolveVars(it.value ?? ""))}</div>
        </div>
      ))}
    </div>
  );
}

function UnitTypesSection({ s, device }: { s: SectionInstance; device: Device }) {
  const items = (s.settings.items ?? []) as { name?: string; beds?: string; area?: string; price?: string }[];
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : 3;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 14 }}>
      {items.map((it, i) => (
        <div key={i} style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line)", borderRadius: 15, padding: "20px 20px 18px", position: "relative" }}>
          <span style={{ position: "absolute", top: 14, right: 14, fontSize: 11, fontWeight: 700, color: "var(--ps-primary)", background: "var(--ps-primary-soft)", padding: "3px 9px", borderRadius: 999 }}>
            {it.beds} BHK
          </span>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ps-ink)", letterSpacing: -0.3 }}>{it.name}</div>
          <div style={{ fontSize: 13, color: "var(--ps-slate)", marginTop: 8 }}>Area: {it.area}</div>
          {it.price ? <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ps-primary)", marginTop: 10 }}>{it.price}</div> : null}
        </div>
      ))}
    </div>
  );
}

function PaymentPlansSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const heading = String(st.heading ?? "Payment Plans");
  const items = (st.items ?? []) as { plan?: string; amount?: string; details?: string }[];
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : 3;
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      {heading ? <h3 style={{ fontSize: device === "mobile" ? 22 : 28, fontWeight: 800, letterSpacing: -0.4, margin: "0 0 20px", textAlign: "center" }}>{heading}</h3> : null}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 14 }}>
        {items.map((it, i) => (
          <div key={i} style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line)", borderTop: "3px solid var(--ps-primary)", borderRadius: 14, padding: "20px 20px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ps-muted)" }}>{it.plan}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ps-ink)", marginTop: 6 }}>{it.amount}</div>
            {it.details ? <div style={{ fontSize: 12.5, color: "var(--ps-slate)", marginTop: 8, lineHeight: 1.6 }}>{it.details}</div> : null}
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
  const text = String(st.text ?? "");
  const phone = String(st.phone ?? "");
  const ctaLabel = String(st.ctaLabel ?? "Call Now");
  return (
    <div style={{ display: "flex", flexDirection: device === "mobile" ? "column" : "row", alignItems: "center", justifyContent: "space-between", gap: 14, background: "linear-gradient(135deg,var(--ps-primary),#8a7bff)", borderRadius: 16, padding: device === "mobile" ? "18px 18px" : "22px 28px", color: "#fff" }}>
      <div style={{ fontSize: device === "mobile" ? 15 : 17, fontWeight: 800, letterSpacing: -0.2, lineHeight: 1.4 }}>{text}</div>
      <a
        href={`tel:${phone.replace(/[^+0-9]/g, "")}`}
        onClick={(e) => {
          if (!live) {
            e.preventDefault();
            return;
          }
          if (pageId) bumpTracking(pageId, "call");
        }}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 11, background: "#fff", color: "var(--ps-primary)", fontWeight: 800, fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}
      >
        <PhoneCall size={16} /> {ctaLabel}
      </a>
    </div>
  );
}

function WhatsAppCtaSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const pageId = useContext(SitePageIdContext);
  const text = String(st.text ?? "");
  const number = String(st.number ?? "");
  const ctaLabel = String(st.ctaLabel ?? "Chat Now");
  const href = `https://wa.me/${number.replace(/[^0-9]/g, "")}`;
  return (
    <div style={{ display: "flex", flexDirection: device === "mobile" ? "column" : "row", alignItems: "center", justifyContent: "space-between", gap: 14, background: "linear-gradient(135deg,#25d366,#128c7e)", borderRadius: 16, padding: device === "mobile" ? "18px 18px" : "22px 28px", color: "#fff" }}>
      <div style={{ fontSize: device === "mobile" ? 15 : 17, fontWeight: 800, letterSpacing: -0.2, lineHeight: 1.4 }}>{text}</div>
      <a
        href={href}
        target={live ? "_blank" : undefined}
        rel="noreferrer"
        onClick={(e) => {
          if (!live) {
            e.preventDefault();
            return;
          }
          if (pageId) bumpTracking(pageId, "whatsapp");
        }}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 11, background: "#fff", color: "#128c7e", fontWeight: 800, fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}
      >
        <MessageCircle size={16} /> {ctaLabel}
      </a>
    </div>
  );
}

// Interactive layout widgets (tabs / carousel / slider)
function TabsSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
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
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
      {st.heading ? <h2 style={{ fontSize: device === "mobile" ? 22 : 28, fontWeight: 800, letterSpacing: -0.4, color: "var(--ps-ink)", textAlign: "center", marginBottom: 18 }}>{String(st.heading)}</h2> : null}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
        {items.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); setActive(i); }}
            style={{
              padding: "9px 18px",
              borderRadius: 999,
              border: i === idx ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line-strong)",
              background: i === idx ? "var(--ps-primary-soft)" : "#fff",
              color: i === idx ? "var(--ps-primary)" : "var(--ps-slate)",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t.label || `Tab ${i + 1}`}
          </button>
        ))}
      </div>
      {cur ? (
        <div style={{ border: "1px solid var(--ps-line)", borderRadius: 16, background: "#fff", padding: device === "mobile" ? "18px 16px" : "26px 28px", fontSize: 14, lineHeight: 1.7, color: "var(--ps-slate)", boxShadow: "var(--ps-shadow-sm)" }}>
          {String(resolveVars(cur.body || "")) || "Add tab content in Settings."}
        </div>
      ) : (
        <div style={{ padding: "18px 16px", border: "1.5px dashed var(--ps-line-strong)", borderRadius: 12, textAlign: "center", color: "var(--ps-muted)", fontSize: 13 }}>Add tabs in Settings</div>
      )}
    </div>
  );
}

function CarouselSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
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
      <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%", padding: "18px 16px", border: "1.5px dashed var(--ps-line-strong)", borderRadius: 12, textAlign: "center", color: "var(--ps-muted)", fontSize: 13 }}>Add slides in Settings</div>
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
    borderRadius: "50%",
    border: "none",
    background: "rgba(8,10,20,.5)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    backdropFilter: "blur(6px)",
  });
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      {st.heading ? <h2 style={{ fontSize: device === "mobile" ? 22 : 28, fontWeight: 800, letterSpacing: -0.4, color: "var(--ps-ink)", textAlign: "center", marginBottom: 18 }}>{String(st.heading)}</h2> : null}
      <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", aspectRatio: "16/9", boxShadow: "var(--ps-shadow-md)", border: "1px solid var(--ps-line)" }}>
        {cur.image && isMediaSrc(cur.image) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cur.image} alt={cur.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <SceneImage art={cur.art ?? "skyline"} />
        )}
        {cur.caption ? (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "28px 20px 16px", background: "linear-gradient(180deg, transparent, rgba(8,10,20,.7))", color: "#fff", fontSize: 14, fontWeight: 700 }}>{cur.caption}</div>
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
              style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 999, border: "none", background: i === idx ? "var(--ps-primary)" : "var(--ps-line-strong)", cursor: "pointer", transition: "width .2s", padding: 0 }}
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

function PopupSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const heading = String(st.heading ?? "");
  const text = String(resolveVars(st.text ?? ""));
  const cta = String(st.cta ?? st.ctaLabel ?? "");
  const link = String(st.link ?? "#lead-form");
  const trigger = String(st.trigger ?? "delay");
  const delaySeconds = Math.max(0, Number(st.delaySeconds ?? 3) || 0);
  const scrollPercent = Math.min(100, Math.max(1, Number(st.scrollPercent ?? 40) || 40));
  const [open, setOpen] = useState(false);
  const storageKey = `prestate.popup.${s.id}`;

  useEffect(() => {
    if (!live) return;
    try {
      if (sessionStorage.getItem(storageKey) === "1") return;
    } catch {
      /* private mode */
    }
    const fire = () => setOpen(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      const h = document.documentElement;
      const pct = ((h.scrollTop + window.innerHeight) / h.scrollHeight) * 100;
      if (pct >= scrollPercent) {
        fire();
        window.removeEventListener("scroll", onScroll);
      }
    };
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        fire();
        document.removeEventListener("mouseout", onLeave);
      }
    };
    if (trigger === "load") {
      fire();
    } else if (trigger === "scroll") {
      window.addEventListener("scroll", onScroll, { passive: true });
    } else if (trigger === "exit") {
      document.addEventListener("mouseout", onLeave);
    } else {
      timer = setTimeout(fire, delaySeconds * 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [live, trigger, delaySeconds, scrollPercent, storageKey]);

  const dismiss = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      /* private mode */
    }
  };

  if (!live) {
    return (
      <div style={{ maxWidth: 460, margin: "0 auto", width: "100%", border: "1.5px dashed var(--ps-line-strong)", borderRadius: 16, padding: "30px 22px 24px", textAlign: "center", background: "var(--ps-panel-raised)", position: "relative" }}>
        <div style={{ position: "absolute", top: 10, left: 14, fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ps-muted)" }}>Popup preview · {trigger}</div>
        {heading ? <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ps-ink)" }}>{heading}</div> : null}
        {text ? <p style={{ fontSize: 13.5, color: "var(--ps-slate)", lineHeight: 1.6, margin: "8px 0 16px" }}>{text}</p> : null}
        {cta ? <span style={{ display: "inline-flex", background: "var(--ps-grad-primary)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "11px 22px", borderRadius: 10 }}>{cta}</span> : null}
      </div>
    );
  }

  if (!open) return null;
  return (
    <div onClick={dismiss} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(8,10,20,.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="ps-fade-in" style={{ position: "relative", width: 440, maxWidth: "100%", background: "#fff", borderRadius: 18, padding: device === "mobile" ? "34px 22px 30px" : "40px 34px", textAlign: "center", boxShadow: "0 30px 80px rgba(8,10,20,.4)" }}>
        <button type="button" aria-label="Close" onClick={dismiss} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", border: "none", background: "#f1f4f9", color: "var(--ps-slate)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <X size={16} />
        </button>
        {heading ? <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ps-ink)", letterSpacing: -0.4 }}>{heading}</div> : null}
        {text ? <p style={{ fontSize: 14, color: "var(--ps-slate)", lineHeight: 1.65, margin: "10px 0 22px" }}>{text}</p> : null}
        {cta ? (
          <a
            {...anchorNav(link, live)}
            onClick={(e) => {
              anchorNav(link, live).onClick(e);
              dismiss();
            }}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--ps-grad-primary)", color: "#fff", fontWeight: 700, fontSize: 14, padding: "13px 28px", borderRadius: 11, textDecoration: "none", boxShadow: "0 10px 26px rgba(109,93,252,.35)" }}
          >
            {cta} <ArrowRight size={15} />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function StickyFooterBar({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const text = String(resolveVars(st.text ?? "")) || "Interested? Get in touch with our team.";
  const ctaLabel = String(st.ctaLabel ?? "Enquire Now");
  const link = String(st.link ?? "#lead-form");
  const bar = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--ps-ink, #111827)", color: "#fff", padding: device === "mobile" ? "12px 14px" : "14px 24px", boxShadow: "0 -8px 30px rgba(8,10,20,.25)" }}>
      <div style={{ fontSize: device === "mobile" ? 13 : 15, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</div>
      <a {...anchorNav(link, live)} style={{ background: "var(--ps-grad-primary)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 10, textDecoration: "none", whiteSpace: "nowrap" }}>
        {ctaLabel}
      </a>
    </div>
  );
  if (live) {
    return <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60 }}>{bar}</div>;
  }
  return <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "var(--ps-shadow-sm)" }}>{bar}</div>;
}

function VideoGallerySection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const live = useContext(SiteLiveContext);
  const videos = (st.videos ?? []) as { title?: string; url?: string }[];
  const heading = String(st.heading ?? st.title ?? "");
  const text = String(st.text ?? st.sub ?? "");
  const [active, setActive] = useState<number | null>(null);
  const cur = active !== null ? videos[active] : null;
  const curUrl = cur ? String(cur.url ?? "") : "";
  const ytId = youtubeId(curUrl);
  const embedSrc = ytId ? `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0` : curUrl;
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      {heading ? <h2 style={{ fontSize: device === "mobile" ? 22 : 28, fontWeight: 800, letterSpacing: -0.4, color: "var(--ps-ink)", textAlign: "center" }}>{heading}</h2> : null}
      {text ? <p style={{ fontSize: 14.5, color: "var(--ps-slate)", textAlign: "center", maxWidth: 620, margin: "10px auto 0", lineHeight: 1.7 }}>{String(resolveVars(text))}</p> : null}
      <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "1fr 1fr", gap: 12, marginTop: 22 }}>
        {videos.map((v, i) => {
          const clickable = live && !!v.url;
          return (
            <div
              key={i}
              onClick={clickable ? (e) => { e.stopPropagation(); setActive(i); } : undefined}
              style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--ps-line)", position: "relative", aspectRatio: "16/9", cursor: clickable ? "pointer" : "default" }}
            >
              <SceneImage art="tour" />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#fff", background: "rgba(8,10,20,.28)" }}>
                <span style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.18)", border: "1.5px solid rgba(255,255,255,.4)", display: "inline-flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}>
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
  const files = (st.files ?? []) as { name?: string; title?: string; url?: string }[];
  const heading = String(st.heading ?? st.title ?? "");
  const text = String(st.text ?? st.sub ?? "");
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
      {heading ? <h2 style={{ fontSize: device === "mobile" ? 22 : 28, fontWeight: 800, letterSpacing: -0.4, color: "var(--ps-ink)", textAlign: "center" }}>{heading}</h2> : null}
      {text ? <p style={{ fontSize: 14.5, color: "var(--ps-slate)", textAlign: "center", maxWidth: 620, margin: "10px auto 0", lineHeight: 1.7 }}>{String(resolveVars(text))}</p> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 22 }}>
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
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "1px solid var(--ps-line)", borderRadius: 12, textDecoration: "none", background: "#fff", cursor: active ? "pointer" : "default" }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 13, color: "var(--ps-ink)" }}>
                <FileText size={16} style={{ color: "var(--ps-primary)" }} /> {name}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ps-primary)" }}>
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
  const heading = String(st.heading ?? st.title ?? "Download Brochure");
  const text = String(resolveVars(st.text ?? ""));
  const btnLabel = String(st.title ?? st.cta ?? "Download Brochure");
  const file = String(st.file ?? "").trim();
  const active = live && !!file;
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", width: "100%", textAlign: "center", border: "1px solid var(--ps-line)", borderRadius: 18, padding: device === "mobile" ? "26px 20px" : "36px 32px", background: "#fff", boxShadow: "var(--ps-shadow-sm)" }}>
      <span style={{ width: 54, height: 54, borderRadius: 14, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <FileText size={26} />
      </span>
      <div style={{ fontSize: device === "mobile" ? 20 : 22, fontWeight: 800, color: "var(--ps-ink)" }}>{heading}</div>
      {text ? <p style={{ fontSize: 14, color: "var(--ps-slate)", lineHeight: 1.65, margin: "10px auto 20px", maxWidth: 440 }}>{text}</p> : <div style={{ height: 18 }} />}
      <a
        href={active ? file : undefined}
        {...(active ? { download: "", target: "_blank", rel: "noopener noreferrer" } : {})}
        onClick={(e) => {
          if (!active) {
            e.preventDefault();
            return;
          }
          if (pageId) bumpTracking(pageId, "brochure");
        }}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--ps-grad-primary)", color: "#fff", fontWeight: 700, fontSize: 14, padding: "13px 28px", borderRadius: 11, textDecoration: "none", boxShadow: "0 10px 26px rgba(109,93,252,.35)", cursor: active ? "pointer" : "default" }}
      >
        <Download size={16} /> {btnLabel}
      </a>
    </div>
  );
}

// Generic renderers for widgets not in the default page
function CatalogSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const heading = String(st.heading ?? st.title ?? s.label);
  const text = String(st.text ?? st.subheading ?? st.sub ?? "");
  const tabs = (st.tabs as string[] | undefined) ?? [];
  const slides = Number(st.slides ?? 0);
  const files = (st.files as { name?: string; title?: string }[] | undefined) ?? [];
  const videos = (st.videos as { title?: string; url?: string }[] | undefined) ?? [];
  const rows = (st.rows as { label?: string; value?: string }[] | undefined) ?? [];
  const items = (st.items as { title?: string; name?: string; label?: string; text?: string; body?: string; value?: string; meta?: string }[] | undefined) ?? [];
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      <h2 style={{ fontSize: device === "mobile" ? 22 : 28, fontWeight: 800, letterSpacing: -0.4, color: "var(--ps-ink)", textAlign: "center" }}>{heading}</h2>
      {text ? <p style={{ fontSize: 14.5, color: "var(--ps-slate)", textAlign: "center", maxWidth: 620, margin: "10px auto 0", lineHeight: 1.7 }}>{String(resolveVars(text))}</p> : null}
      {tabs.length ? (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 22 }}>
          {tabs.map((t, i) => (
            <span key={t} style={{ padding: "8px 16px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, background: i === 0 ? "var(--ps-primary-soft)" : "#f1f4f9", color: i === 0 ? "var(--ps-primary)" : "var(--ps-slate)", border: "1px solid var(--ps-line)" }}>{t}</span>
          ))}
        </div>
      ) : null}
      {slides > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : `repeat(${Math.min(slides, 3)},1fr)`, gap: 12, marginTop: 22 }}>
          {Array.from({ length: Math.min(slides, 6) }).map((_, i) => (
            <div key={i} style={{ aspectRatio: "16/9", borderRadius: 14, overflow: "hidden", border: "1px solid var(--ps-line)" }}>
              <SceneImage art={GALLERY_ART[i % GALLERY_ART.length]} />
            </div>
          ))}
        </div>
      ) : null}
      {videos.length ? (
        <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "1fr 1fr", gap: 12, marginTop: 22 }}>
          {videos.map((v, i) => (
            <div key={i} style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--ps-line)", position: "relative", aspectRatio: "16/9" }}>
              <SceneImage art="tour" />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>{v.title || "Video"}</div>
            </div>
          ))}
        </div>
      ) : null}
      {rows.length ? (
        <div style={{ marginTop: 22, border: "1px solid var(--ps-line)", borderRadius: 14, overflow: "hidden" }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 16px", background: i % 2 ? "#f8fafc" : "#fff", borderTop: i ? "1px solid var(--ps-line)" : "none" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-muted)" }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ps-ink)" }}>{String(resolveVars(r.value ?? ""))}</span>
            </div>
          ))}
        </div>
      ) : null}
      {files.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 22 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "1px solid var(--ps-line)", borderRadius: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{f.name || f.title || `File ${i + 1}`}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ps-primary)" }}>Download</span>
            </div>
          ))}
        </div>
      ) : null}
      {items.length ? (
        <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : device === "tablet" ? "1fr 1fr" : "repeat(3,1fr)", gap: 14, marginTop: 22 }}>
          {items.map((it, i) => (
            <div key={i} className="ps-card" style={{ padding: 18, borderRadius: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>{it.title ?? it.name ?? it.label ?? it.value ?? `Item ${i + 1}`}</div>
              {it.text || it.body || it.meta ? <div style={{ fontSize: 12.5, color: "var(--ps-slate)", marginTop: 5, lineHeight: 1.6 }}>{it.text ?? it.body ?? it.meta}</div> : null}
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
  switch (s.type) {
    case "announcement":
      return <AnnouncementBar s={s} />;
    case "hero":
      return <HeroSection s={s} device={device} />;
    case "highlights":
      return <HighlightsSection s={s} device={device} />;
    case "overview":
      return <OverviewSection s={s} device={device} />;
    case "amenities":
      return <AmenitiesSection s={s} device={device} />;
    case "floorplans":
      return <FloorPlansSection s={s} device={device} />;
    case "gallery":
      return <GallerySection s={s} device={device} />;
    case "virtual-tour":
    case "youtube":
      return <VirtualTourSection s={s} device={device} />;
    case "location-advantages":
    case "map":
      return <LocationSection s={s} device={device} />;
    case "pricing":
      return <PricingSection s={s} device={device} />;
    case "testimonials":
      return <TestimonialsSection s={s} device={device} />;
    case "faq":
    case "accordion":
      return <FaqSection s={s} device={device} />;
    case "multistep-form":
    case "lead-form":
    case "whatsapp-form":
    case "enquiry-form":
      return <LeadFormSection s={s} device={device} />;
    case "cta-banner":
      return <CtaBanner s={s} device={device} />;
    case "countdown":
      return <CountdownSection s={s} device={device} />;
    case "offer-banner":
      return <OfferBanner s={s} device={device} />;
    case "sticky-cta":
      return <StickyCta s={s} device={device} />;
    case "heading":
      return <HeadingSection s={s} device={device} />;
    case "text":
      return <TextSection s={s} />;
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
    case "whatsapp-cta":
      return <WhatsAppCtaSection s={s} device={device} />;
    case "floating-icons":
      return <FloatingIconsHint s={s} />;
    case "tabs":
      return <TabsSection s={s} device={device} />;
    case "carousel":
    case "slider":
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
    case "sticky-footer-bar":
      return <StickyFooterBar s={s} device={device} />;
    case "section":
    case "master-plan":
    case "features":
    case "specifications":
    case "timeline":
    case "construction":
    case "nearby":
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
  onReorder,
  onWidgetDrop,
  onNest,
  onResizeColumn,
  onDuplicate,
  onDelete,
  onToggleHidden,
  onToggleLock,
  onSaveTemplate,
  onMakeGlobal,
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
  onReorder: (fromId: string, toId: string, after: boolean) => void;
  onWidgetDrop: (widgetId: string, afterId?: string, after?: boolean) => void;
  onNest: (fromId: string, isWidget: boolean) => void;
  onResizeColumn: (delta: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleHidden: () => void;
  onToggleLock: () => void;
  onSaveTemplate: () => void;
  onMakeGlobal: () => void;
  children?: ReactNode;
}) {
  const [dropPos, setDropPos] = useState<"before" | "after" | "inside" | null>(null);
  const live = useContext(SiteLiveContext);
  const hidden = s.hidden === true;
  const locked = s.locked === true;
  const sc = sectionStyle(s, device);
  // Overlay widgets render as fixed/portal chrome in live mode — collapse their
  // in-flow slot so they don't leave an empty band on the published page.
  if (live && (s.type === "popup" || s.type === "popup-cta" || s.type === "sticky-footer-bar")) {
    sc.padding = 0;
    sc.minHeight = 0;
    sc.background = "transparent";
  }
  const Icon = SLUG_ICONS[s.icon] ?? SquareStack;
  const resp = s.style.responsive ?? {};
  if ((device === "desktop" && resp.hideDesktop) || (device === "tablet" && resp.hideTablet) || (device === "mobile" && resp.hideMobile)) {
    return null;
  }

  return (
    <div
      className="ps-sec-holder"
      data-sec-id={s.id}
      data-selected={selected && !readOnly ? "true" : "false"}
      data-structural={structural ? "true" : "false"}
      draggable={!readOnly}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/x-prestate-section", s.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (readOnly) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        if (structural && y > rect.height * 0.28 && y < rect.height * 0.72) setDropPos("inside");
        else setDropPos(y < rect.height / 2 ? "before" : "after");
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropPos(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = dropPos ?? "after";
        setDropPos(null);
        if (readOnly) return;
        const widgetId = readWidgetId(e);
        if (pos === "inside" && structural) {
          if (widgetId) onNest(widgetId, true);
          else {
            const fromId = e.dataTransfer.getData("text/x-prestate-section");
            if (fromId) onNest(fromId, false);
          }
          return;
        }
        if (widgetId) {
          onWidgetDrop(widgetId, s.id, pos === "after");
          return;
        }
        const fromId = e.dataTransfer.getData("text/x-prestate-section");
        if (fromId && fromId !== s.id) onReorder(fromId, s.id, pos === "after");
      }}
      onDragEnd={() => setDropPos(null)}
      onClick={readOnly ? undefined : (e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        position: "relative",
        margin: readOnly ? 0 : "18px 0",
        borderRadius: 14,
        ...wrapStyle,
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

          {/* chrome toolbar */}
          <div
            className="ps-sec-toolbar"
            data-selected={selected ? "true" : "false"}
            style={{
              position: "absolute",
              top: -16,
              right: 10,
              zIndex: 60,
              display: "flex",
              alignItems: "center",
              gap: 1,
              borderRadius: 9,
              padding: 2,
              opacity: selected ? 1 : 0,
              transition: "opacity .15s",
            }}
          >
            <span style={{ color: selected ? "#fff" : "var(--ps-muted)", display: "inline-flex", cursor: "grab", padding: "3px 5px" }} title="Drag to reorder">
              <GripVertical size={13} />
            </span>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: selected ? "#fff" : "var(--ps-muted)", padding: "0 4px", letterSpacing: 0.4 }}>{index + 1}/{total}</span>
            <ChromeBtn selected={selected} title="Duplicate" onClick={onDuplicate}>
              <Copy size={13} />
            </ChromeBtn>
            <ChromeBtn selected={selected} title="Save as template" onClick={onSaveTemplate}>
              <Save size={13} />
            </ChromeBtn>
            <ChromeBtn selected={selected} title={s.global ? "Unglobal" : "Make global section"} onClick={onMakeGlobal}>
              <Globe size={13} />
            </ChromeBtn>
            <ChromeBtn selected={selected} title={hidden ? "Show" : "Hide"} onClick={onToggleHidden}>
              {hidden ? <Eye size={13} /> : <EyeOff size={13} />}
            </ChromeBtn>
            <ChromeBtn selected={selected} title={locked ? "Unlock" : "Lock"} onClick={onToggleLock}>
              {locked ? <Lock size={13} /> : <LockOpen size={13} />}
            </ChromeBtn>
            <ChromeBtn selected={selected} danger title="Delete" onClick={onDelete}>
              <Trash2 size={13} />
            </ChromeBtn>
          </div>
        </>
      ) : null}

      {/* body */}
      <div style={{ opacity: hidden ? 0.3 : 1, pointerEvents: hidden && !readOnly ? "none" : "auto" }}>
        <div style={sc}>
          <Overlay section={s} />
          <div style={{ position: "relative", zIndex: 2 }}>
            {children ?? <SectionBody s={s} device={device} />}
          </div>
        </div>
      </div>

      {/* column resize handle */}
      {resizable ? <ColumnResizeHandle onResize={onResizeColumn} /> : null}

      {/* insertion indicator */}
      {!readOnly && dropPos ? (
        dropPos === "inside" ? (
          <div
            style={{
              position: "absolute",
              inset: -3,
              borderRadius: 16,
              border: "2px dashed var(--ps-primary)",
              background: "rgba(109,93,252,.08)",
              zIndex: 70,
              pointerEvents: "none",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              left: -6,
              right: -6,
              top: dropPos === "before" ? -10 : undefined,
              bottom: dropPos === "after" ? -10 : undefined,
              height: 4,
              borderRadius: 999,
              background: "var(--ps-primary)",
              boxShadow: "0 0 0 3px var(--ps-primary-mist), 0 2px 8px rgba(109,93,252,.5)",
              zIndex: 70,
              pointerEvents: "none",
            }}
          />
        )
      ) : null}

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
}) {
  const [dragOverBg, setDragOverBg] = useState(false);
  const width = live ? "100%" : device === "desktop" ? 1280 : device === "tablet" ? 768 : 390;

  const mutate = (patch: (prev: SectionInstance[]) => SectionInstance[]) => onMutate(patch);

  useEffect(() => {
    if (!selectedId || readOnly) return;
    const el = document.querySelector(`[data-sec-id="${CSS.escape(selectedId)}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedId, readOnly]);

  const handleReorder = (fromId: string, toId: string, after: boolean) => {
    mutate((prev) => {
      const next = reorderSection(prev, fromId, toId, after);
      return next ?? prev;
    });
  };

  const handleWidgetDrop = (widgetId: string, afterId?: string, after = true) => {
    mutate((prev) => {
      if (widgetId === "column" && afterId) {
        const placed = dropColumnOn(prev, afterId, false);
        setTimeout(() => onSelect(placed.selectId), 30);
        return placed.list;
      }
      const widget = WIDGET_FROM_ID(widgetId);
      if (!widget) return prev;
      const copy = { ...widget, id: newSectionId() };
      const ref = afterId ? findSection(prev, afterId) : null;
      const next = ref ? insertChild(prev, ref.parentId, copy, ref.index + (after ? 1 : 0)) : insertChild(prev, null, copy);
      setTimeout(() => onSelect(copy.id), 30);
      return next;
    });
  };

  // Drop a widget or existing section into the children of a structural node.
  const nestFrom = (fromId: string, isWidget: boolean, targetId: string) => {
    if (!isWidget) {
      mutate((prev) => {
        if (isDescendant(prev, targetId, fromId)) return prev;
        const { list, removed } = removeSection(prev, fromId);
        if (!removed) return prev;
        return insertChild(list, targetId, removed);
      });
      return;
    }
    mutate((prev) => {
      if (fromId === "column") {
        const placed = dropColumnOn(prev, targetId, true);
        setTimeout(() => onSelect(placed.selectId), 30);
        return placed.list;
      }
      const widget = WIDGET_FROM_ID(fromId);
      if (!widget) return prev;
      const copy = { ...widget, id: newSectionId() };
      const next = insertChild(prev, targetId, copy);
      setTimeout(() => onSelect(copy.id), 30);
      return next;
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
      onReorder: handleReorder,
      onWidgetDrop: handleWidgetDrop,
      onNest: (fromId: string, isWidget: boolean) => nestFrom(fromId, isWidget, s.id),
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
      onSaveTemplate: () => onSelect("__template_" + s.id),
      onMakeGlobal: () => mutate((prev) => toggleSectionFlag(prev, s.id, "global")),
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
                margin: 0,
                boxSizing: "border-box",
              },
              isCol && !readOnly && i < kids.length - 1,
            );
          })}
          {!readOnly ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <NestedDropZone empty={kids.length === 0} onNest={(fromId, isWidget) => nestFrom(fromId, isWidget, s.id)} />
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
          {kids.map((child, i) => renderItem(child, i, kids.length, { minWidth: 0, width: "100%", margin: 0, boxSizing: "border-box" }))}
          {!readOnly ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <NestedDropZone empty={kids.length === 0} onNest={(fromId, isWidget) => nestFrom(fromId, isWidget, s.id)} />
            </div>
          ) : null}
        </div>
      );
    }
    // container / column — vertical stack
    const gap = s.style.spacing?.gap ?? 24;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap, minWidth: 0, width: "100%" }}>
        {kids.map((child, i) => renderItem(child, i, kids.length, { minWidth: 0, margin: 0, width: "100%" }))}
        {!readOnly ? <NestedDropZone key="__nested_drop" empty={kids.length === 0} onNest={(fromId, isWidget) => nestFrom(fromId, isWidget, s.id)} /> : null}
      </div>
    );
  };

  return (
    <SitePageIdContext.Provider value={pageId ?? ""}>
    <SiteChromeContext.Provider value={chrome}>
    <SiteFormContext.Provider value={form}>
    <SiteLiveContext.Provider value={!!live}>
    <div
      className={live ? undefined : "ps-canvas-dots"}
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
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = isWidgetDrag(e) ? "copy" : "move";
        if (isWidgetDrag(e)) setDragOverBg(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOverBg(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOverBg(false);
        if (readOnly) return;
        const widgetId = readWidgetId(e);
        if (widgetId) {
          handleWidgetDrop(widgetId);
          return;
        }
        const fromId = e.dataTransfer.getData("text/x-prestate-section");
        if (fromId) {
          mutate((prev) => {
            const { list, removed } = removeSection(prev, fromId);
            if (!removed) return prev;
            return insertChild(list, null, removed);
          });
        }
      }}
    >
      {theme && googleFontsHref(theme.headingFont || "", theme.font) ? (
        <link rel="stylesheet" href={googleFontsHref(theme.headingFont || "", theme.font)} />
      ) : null}
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
            outline: dragOverBg && !readOnly ? "3px dashed var(--ps-primary)" : "none",
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
              content.map((s, i) => renderItem(s, i, content.length))
            )}

            {!live ? (
              <DropZone
                onWidgetDrop={(wid) => handleWidgetDrop(wid)}
                onSectionDrop={(fromId) =>
                  mutate((prev) => {
                    const { list, removed } = removeSection(prev, fromId);
                    if (!removed) return prev;
                    return insertChild(list, null, removed);
                  })
                }
              />
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
    </SiteLiveContext.Provider>
    </SiteFormContext.Provider>
    </SiteChromeContext.Provider>
    </SitePageIdContext.Provider>
  );
}

function DropZone({
  onWidgetDrop,
  onSectionDrop,
}: {
  onWidgetDrop: (widgetId: string) => void;
  onSectionDrop: (fromId: string) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        const widgetId = readWidgetId(e);
        if (widgetId) {
          onWidgetDrop(widgetId);
          return;
        }
        const fromId = e.dataTransfer.getData("text/x-prestate-section");
        if (fromId) onSectionDrop(fromId);
      }}
      style={{
        height: 46,
        margin: "10px 0",
        borderRadius: 12,
        border: over ? "2px dashed var(--ps-primary)" : "2px dashed #c4c9d8",
        background: over ? "var(--ps-primary-mist)" : "rgba(244,245,250,.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: over ? "var(--ps-primary)" : "var(--ps-muted)",
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

function NestedDropZone({ empty, onNest }: { empty: boolean; onNest: (fromId: string, isWidget: boolean) => void }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        const widgetId = readWidgetId(e);
        if (widgetId) {
          onNest(widgetId, true);
          return;
        }
        const fromId = e.dataTransfer.getData("text/x-prestate-section");
        if (fromId) onNest(fromId, false);
      }}
      style={{
        height: empty ? 64 : 38,
        borderRadius: 11,
        border: over ? "2px dashed var(--ps-primary)" : "2px dashed #c4c9d8",
        background: over ? "var(--ps-primary-mist)" : "rgba(244,245,250,.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        color: over ? "var(--ps-primary)" : "var(--ps-muted)",
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

function WIDGET_FROM_ID(id: string): SectionInstance | null {
  const def = WIDGETS.find((w) => w.id === id);
  return def ? def.make() : null;
}