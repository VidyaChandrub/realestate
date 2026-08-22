"use client";

import { useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { ArrowRight, Mail, MapPin, Menu, MessageCircle, Phone, Search, X } from "lucide-react";
import type { Device, MenuLink, SectionStyle, SiteConfig } from "@/lib/prestate/types";
import { hydrateFooter, hydrateHeader, sbool, snum, sstr } from "@/lib/prestate/chrome-presets";
import { cssUrl, isMediaSrc } from "@/lib/media";

interface BrandBits {
  name: string;
  initials: string;
  tagline: string;
  logoUrl: string;
  phone: string;
  email: string;
  primary: string;
  accent: string;
  headingFont: string;
  socials: { label?: string; href?: string }[];
}

function brandBits(brand: SiteConfig["brand"]): BrandBits {  const name = (brand.name || "Brand").trim();
  return {
    name,
    initials: name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "B",
    tagline: brand.tagline || "",
    logoUrl: brand.logo || "",
    phone: brand.phone || "",
    email: brand.email || "",
    primary: brand.primary || "#6D5DFC",
    accent: brand.accent || "#CDA45E",
    headingFont: brand.headingFont || "",
    socials: [
      { label: "Facebook", href: brand.facebook },
      { label: "Instagram", href: brand.instagram },
      { label: "X", href: brand.twitter },
      { label: "YouTube", href: brand.youtube },
      { label: "LinkedIn", href: brand.linkedin },
    ].filter((s) => !!s.href),
  };
}

function alpha(hex: string, a: number): string {
  const raw = hex.replace("#", "").trim();
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (full.length !== 6) return `rgba(17,24,39,${a})`;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(17,24,39,${a})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const gscale = (d: Device): number => (d === "mobile" ? 0.62 : d === "tablet" ? 0.82 : 1);

const fsize = (base: number, d: Device): number =>
  Math.max(9, Math.round(base * (d === "mobile" ? 0.84 : d === "tablet" ? 0.93 : 1) * 10) / 10);

const digits = (v: string): string => v.replace(/[^+0-9]/g, "");

type Box = { top: number; right: number; bottom: number; left: number };

function padCss(p: Box | undefined, d: Device): string {
  const v = p ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const k = gscale(d);
  const side = (n: number) => Math.round(n * k);
  return `${Math.round(v.top * k)}px ${side(v.right)}px ${Math.round(v.bottom * k)}px ${side(v.left)}px`;
}

function marCss(m: Box | undefined, d: Device): string {
  const v = m ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const k = gscale(d);
  return `${Math.round(v.top * k)}px ${Math.round(v.right * k)}px ${Math.round(v.bottom * k)}px ${Math.round(v.left * k)}px`;
}

function gapCss(style: SectionStyle | undefined, d: Device, fallback = 0): number {
  const g = style?.spacing?.gap;
  return Math.round((typeof g === "number" ? g : fallback) * gscale(d));
}

function chromeBox(style: SectionStyle | undefined): CSSProperties {
  const st = style ?? {};
  const bg = st.colors?.bg ?? "";
  const gradient = st.colors?.gradient ?? "";
  const imgRaw = st.colors?.image;
  const img = typeof imgRaw === "string" && isMediaSrc(imgRaw) ? imgRaw : "";
  const border = st.border ?? {};
  const effects = st.effects ?? {};
  return {
    position: "relative",
    background: gradient ? undefined : bg || undefined,
    backgroundImage: gradient || img ? gradient || cssUrl(img) : undefined,
    backgroundSize: gradient || img ? "cover" : undefined,
    backgroundPosition: "center",
    color: st.colors?.text || undefined,
    borderRadius: border.radius || undefined,
    border: border.width ? `${border.width}px ${border.style || "solid"} ${border.color || "#e8eaf1"}` : undefined,
    boxShadow: effects.shadow && effects.shadow !== "none" ? effects.shadow : undefined,
    ...(effects.glass ? { backdropFilter: "blur(14px) saturate(1.3)", WebkitBackdropFilter: "blur(14px) saturate(1.3)" as never } : {}),
    ...(st.typography?.fontFamily ? { fontFamily: `${st.typography.fontFamily}, Inter, system-ui, sans-serif` } : {}),
    ...(st.advanced?.zIndex ? { zIndex: st.advanced.zIndex } : {}),
  };
}

export function chromeHidden(style: SectionStyle | undefined, device: Device): boolean {
  const r = style?.responsive ?? {};
  if (device === "desktop") return r.hideDesktop === true;
  if (device === "tablet") return r.hideTablet === true;
  return r.hideMobile === true;
}

interface AnchorProps {
  href: string;
  target?: string;
  rel?: string;
  onClick: (e: ReactMouseEvent) => void;
}

function anchor(href: string, live: boolean): AnchorProps {
  const target = (href || "").trim();
  const external = /^https?:\/\//i.test(target);
  return {
    href: target || "#",
    target: external && live ? "_blank" : undefined,
    rel: external && live ? "noopener noreferrer" : undefined,
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

type SocialItem = { label?: string; href?: string };

function cleanSocials(items: unknown): SocialItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => ({ label: String((it as SocialItem)?.label ?? ""), href: String((it as SocialItem)?.href ?? "") }))
    .filter((s) => s.label.trim().length > 0);
}

function socialLetter(label: string): string {
  const l = label.toLowerCase().trim();
  if (l.includes("facebook")) return "f";
  if (l.includes("instagram")) return "ig";
  if (l.includes("twitter") || l === "x") return "x";
  if (l.includes("youtube")) return "yt";
  if (l.includes("linkedin")) return "in";
  if (l.includes("whatsapp")) return "wa";
  return l.slice(0, 1) || "•";
}

interface Shell {
  d: Device;
  b: BrandBits;
  live: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export interface ChromeShellProps {
  device: Device;
  brand: SiteConfig["brand"];
  live?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

function shellOf(props: ChromeShellProps): Shell {
  return { d: props.device, b: brandBits(props.brand), live: !!props.live, selected: props.selected, onSelect: props.onSelect };
}

interface HProps {
  h: ReturnType<typeof hydrateHeader>;
  shell: Shell;
}

interface FProps {
  f: ReturnType<typeof hydrateFooter>;
  links: MenuLink[];
  shell: Shell;
}

function ChromeFrame({ shell, children }: { shell: Pick<Shell, "selected" | "onSelect">; children: ReactNode }) {
  if (!shell.onSelect) return <>{children}</>;
  return (
    <div
      onClick={() => shell.onSelect?.()}
      style={{ cursor: "pointer", outline: shell.selected ? "2px solid var(--ps-primary)" : undefined, outlineOffset: -2 }}
    >
      {children}
    </div>
  );
}

function BrandMark({
  url,
  size,
  radius,
  b,
}: {
  url: string;
  size: number;
  radius: number | string;
  b: BrandBits;
}) {
  if (url && isMediaSrc(url)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0, display: "block" }} />;
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(135deg, ${b.accent}, ${b.primary})`,
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: Math.max(9, Math.round(size * 0.42)),
        flexShrink: 0,
      }}
    >
      {b.initials.slice(0, 1)}
    </span>
  );
}

function CtaButton({
  label,
  href,
  live,
  bg,
  fg = "#ffffff",
  radius = 9,
  fontSize = 12,
  paddingX = 16,
  paddingY = 9,
  shadow,
  title,
}: {
  label: ReactNode;
  href: string;
  live: boolean;
  bg: string;
  fg?: string;
  radius?: number;
  fontSize?: number;
  paddingX?: number;
  paddingY?: number;
  shadow?: string;
  title?: string;
}) {
  return (
    <a
      {...anchor(href, live)}
      title={title}
      style={{
        background: bg,
        color: fg,
        fontSize,
        fontWeight: 700,
        padding: `${paddingY}px ${paddingX}px`,
        borderRadius: radius,
        cursor: "pointer",
        whiteSpace: "nowrap",
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        lineHeight: 1.25,
        boxShadow: shadow,
      }}
    >
      {label}
    </a>
  );
}

function SocialRow({
  items,
  live,
  dark,
  size = 30,
  marginTop,
}: {
  items: SocialItem[];
  live: boolean;
  dark?: boolean;
  size?: number;
  marginTop?: number;
}) {
  if (!items.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop }}>
      {items.map((s, i) => (
        <a
          key={`${i}-${s.label}`}
          {...anchor(s.href ?? "#", live)}
          aria-label={s.label}
          title={s.label}
          style={{
            minWidth: size,
            height: size,
            padding: "0 7px",
            borderRadius: 999,
            border: dark ? "1px solid rgba(17,24,39,.16)" : "1px solid rgba(255,255,255,.16)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.round(size * 0.36),
            fontWeight: 800,
            color: dark ? "#111827" : "#ffffff",
            textDecoration: "none",
          }}
        >
          {socialLetter(s.label ?? "")}
        </a>
      ))}
    </div>
  );
}

function DropdownPanel({
  open,
  onClose,
  links,
  live,
  bg,
  fg,
  hairline,
  ctaLabel,
  ctaHref,
  ctaBg,
  ctaFg,
  showCta = true,
}: {
  open: boolean;
  onClose: () => void;
  links: MenuLink[];
  live: boolean;
  bg: string;
  fg: string;
  hairline: string;
  ctaLabel: string;
  ctaHref: string;
  ctaBg: string;
  ctaFg: string;
  showCta?: boolean;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 80 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          margin: "8px 14px 14px",
          background: bg,
          border: `1px solid ${hairline}`,
          borderRadius: 16,
          boxShadow: "0 26px 60px rgba(8,10,20,.28)",
          padding: "14px 20px 20px",
          position: "relative",
          maxHeight: "min(420px, 70vh)",
          overflowY: "auto",
        }}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: "none",
            background: hairline,
            color: fg,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={15} />
        </button>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {links.map((l, i) => (
            <a
              key={`${l.label}-${i}`}
              {...anchor(l.href, live)}
              style={{
                color: fg,
                fontSize: 14.5,
                fontWeight: 700,
                padding: "11px 2px",
                borderBottom: i < links.length - 1 ? `1px solid ${hairline}` : undefined,
                textDecoration: "none",
              }}
            >
              {l.label}
            </a>
          ))}
        </div>
        {showCta && ctaLabel ? (
          <a
            {...anchor(ctaHref, live)}
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: ctaBg,
              color: ctaFg,
              fontSize: 13,
              fontWeight: 800,
              padding: "12px 18px",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            {ctaLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ctaOf(h: ReturnType<typeof hydrateHeader>): { label: string; href: string } {
  return {
    label: sstr(h.settings, "ctaText") || h.cta || "Book a Site Visit",
    href: sstr(h.settings, "ctaHref") || h.ctaLink || "#lead-form",
  };
}

// ---------------------------------------------------------------------------
// Headers
// ---------------------------------------------------------------------------

function HeaderClassic({ h, shell }: HProps) {
  const { b, d, live, selected, onSelect } = shell;
  const s = h.settings;
  const [open, setOpen] = useState(false);
  const light = h.transparent || h.variant === "dark";
  const autoBg = h.transparent
    ? "linear-gradient(180deg, rgba(8,10,20,.92), rgba(8,10,20,.55))"
    : h.variant === "dark"
      ? "#0b1020"
      : h.variant === "glass"
        ? "rgba(255,255,255,.82)"
        : "#ffffff";
  const customBg = h.style.colors?.bg || "";
  const bg = customBg || autoBg;
  const fg = h.style.colors?.text || (light ? "#ffffff" : "#111827");
  const navFg = h.style.colors?.text ? alpha(h.style.colors.text, 0.85) : light ? "rgba(255,255,255,.85)" : "#334155";
  const upper = sbool(s, "navUppercase");
  const cta = ctaOf(h);
  const logoUrl = sstr(s, "logoUrl") || b.logoUrl;
  const stripText = sstr(s, "topbarText");
  const stripBg = sstr(s, "topbarBgColor") || b.primary;
  const stripFg = sstr(s, "topbarTextColor") || "#ffffff";
  const showStrip = h.showTopbar && (!!b.phone || !!stripText);
  const grad = `linear-gradient(135deg, ${b.accent}, ${b.primary})`;
  const burger = light ? "rgba(148,163,184,.4)" : alpha("#94a3b8", 0.55);

  return (
    <ChromeFrame shell={{ selected, onSelect }}>
      <div style={{ margin: marCss(h.style.spacing?.margin, d), position: "relative", zIndex: open ? 60 : 50 }}>
        {showStrip ? (
          <div
            style={{
              background: stripBg,
              color: stripFg,
              fontSize: fsize(11.5, d),
              fontWeight: 700,
              padding: "6px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            {stripText ? <span>{stripText}</span> : null}
            {b.phone ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Phone size={12} /> {b.phone}
              </span>
            ) : null}
            {b.email ? <span>{b.email}</span> : null}
          </div>
        ) : null}
        <header
          style={{
            ...chromeBox(h.style),
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            padding: padCss(h.style.spacing?.padding, d),
            background: bg,
            color: fg,
            borderBottom: h.transparent ? "none" : undefined,
            backdropFilter: !customBg && (h.transparent || h.variant === "glass") ? "blur(8px)" : undefined,
            WebkitBackdropFilter: (!customBg && (h.transparent || h.variant === "glass") ? "blur(8px)" : undefined) as never,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <BrandMark url={logoUrl} size={snum(s, "logoSize", 34)} radius={9} b={b} />
            {sbool(s, "showBrandName", true) ? (
              <div style={{ lineHeight: 1.15, minWidth: 0 }}>
                <div style={{ fontSize: fsize(snum(s, "brandFontSize", 15), d), fontWeight: 800, letterSpacing: 0.4, whiteSpace: "nowrap" }}>
                  {sstr(s, "logoText") || b.name}
                </div>
                {sbool(s, "showTaglineRow") && sstr(s, "taglineText") ? (
                  <div style={{ fontSize: fsize(8.5, d), fontWeight: 600, letterSpacing: 2.2, color: b.accent, marginTop: 2 }}>
                    {sstr(s, "taglineText").toUpperCase()}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {d === "mobile" ? null : (
            <nav
              style={{
                display: "flex",
                alignItems: "center",
                gap: Math.round(snum(s, "navGap", 22) * gscale(d)),
                fontSize: fsize(snum(s, "navFontSize", 12.5), d),
                fontWeight: 600,
                color: navFg,
                textTransform: upper ? "uppercase" : "none",
                letterSpacing: upper ? 0.7 : undefined,
                flexWrap: "wrap",
                minWidth: 0,
              }}
            >
              {(d === "tablet" ? h.links.slice(0, 4) : h.links).map((l) => (
                <a key={`${l.label}-${l.href}`} {...anchor(l.href, live)} style={{ color: "inherit", textDecoration: "none", whiteSpace: "nowrap" }}>
                  {l.label}
                </a>
              ))}
            </nav>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {sbool(s, "showPhone", true) && b.phone && !h.showTopbar && d !== "mobile" ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: fsize(12, d), fontWeight: 700, whiteSpace: "nowrap" }}>
                <Phone size={13} /> {b.phone}
              </span>
            ) : null}
            {sbool(s, "showCta", true) ? (
              <span onClick={(e) => e.stopPropagation()}>
                <CtaButton
                  label={cta.label}
                  href={cta.href}
                  live={live}
                  bg={sstr(s, "ctaBgColor") || grad}
                  fg={sstr(s, "ctaTextColor", "#ffffff")}
                  radius={snum(s, "ctaRadius", 9)}
                  fontSize={fsize(snum(s, "ctaFontSize", 12), d)}
                  paddingX={snum(s, "ctaPaddingX", 16)}
                  shadow={`0 6px 18px ${alpha(b.accent, 0.4)}`}
                />
              </span>
            ) : null}
            {d === "mobile" ? (
              <button
                type="button"
                aria-label="Open menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((v) => !v);
                }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  border: `1px solid ${burger}`,
                  background: "transparent",
                  color: fg,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {open ? <X size={15} /> : <Menu size={15} />}
              </button>
            ) : null}
          </div>
        </header>

        <DropdownPanel
          open={open && d === "mobile"}
          onClose={() => setOpen(false)}
          links={h.links}
          live={live}
          bg={light ? "#101423" : "#ffffff"}
          fg={light ? "#ffffff" : "#111827"}
          hairline={light ? "rgba(255,255,255,.1)" : "#eef0f5"}
          ctaLabel={cta.label}
          ctaHref={cta.href}
          ctaBg={grad}
          ctaFg="#ffffff"
        />
      </div>
    </ChromeFrame>
  );
}

function HeaderCentered({ h, shell }: HProps) {
  const { b, d, live, selected, onSelect } = shell;
  const s = h.settings;
  const bg = h.style.colors?.bg || "#ffffff";
  const fg = h.style.colors?.text || "#111827";
  const divider = sstr(s, "dividerColor") || alpha("#94a3b8", 0.35);
  const dots = sbool(s, "navSeparatorDot", true);
  const cta = ctaOf(h);
  const stripText = sstr(s, "topbarText");
  const showStrip = !!stripText || (h.showTopbar && !!b.phone);
  const serif = b.headingFont ? `${b.headingFont}, Georgia, serif` : undefined;

  return (
    <ChromeFrame shell={{ selected, onSelect }}>
      <div style={{ margin: marCss(h.style.spacing?.margin, d), position: "relative", zIndex: 50 }}>
        {showStrip ? (
          <div
            style={{
              background: sstr(s, "topbarBgColor") || b.primary,
              color: sstr(s, "topbarTextColor") || "#ffffff",
              fontSize: fsize(11.5, d),
              fontWeight: 700,
              padding: "6px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            {stripText ? <span>{stripText}</span> : null}
            {h.showTopbar && b.phone ? <span>{b.phone}</span> : null}
          </div>
        ) : null}
        <header
          style={{
            ...chromeBox(h.style),
            background: bg,
            color: fg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: padCss(h.style.spacing?.padding, d),
            gap: gapCss(h.style, d, 12),
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <BrandMark url={sstr(s, "logoUrl") || b.logoUrl} size={snum(s, "logoSize", 44)} radius={12} b={b} />
            <div style={{ fontFamily: serif, fontSize: fsize(snum(s, "brandFontSize", 20), d), fontWeight: 800, letterSpacing: 0.3, lineHeight: 1.15 }}>
              {sstr(s, "logoText") || b.name}
            </div>
            {sstr(s, "taglineText") ? (
              <div style={{ fontSize: fsize(9.5, d), fontWeight: 700, letterSpacing: 2.4, textTransform: "uppercase", color: b.accent }}>
                {sstr(s, "taglineText")}
              </div>
            ) : null}
          </div>

          <div aria-hidden style={{ width: "min(520px, 78%)", height: 1, background: divider }} />

          {sbool(s, "showNavRow", true) ? (
            <nav
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
                rowGap: 6,
                columnGap: 4,
                fontSize: fsize(snum(s, "navFontSize", 12), d),
                fontWeight: 700,
                color: alpha("#334155", 0.95),
                textTransform: sbool(s, "navUppercase", true) ? "uppercase" : "none",
                letterSpacing: 1.1,
              }}
            >
              {h.links.map((l, i) => (
                <span key={`${l.label}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: snum(s, "navGap", 18) }}>
                  {dots && i > 0 ? <span aria-hidden style={{ opacity: 0.4 }}>•</span> : null}
                  <a {...anchor(l.href, live)} style={{ color: "inherit", textDecoration: "none", whiteSpace: "nowrap" }}>
                    {l.label}
                  </a>
                </span>
              ))}
            </nav>
          ) : null}

          {sbool(s, "showCta", true) ? (
            <CtaButton
              label={cta.label}
              href={cta.href}
              live={live}
              bg={sstr(s, "ctaBgColor") || `linear-gradient(135deg, ${b.accent}, ${b.primary})`}
              fg={sstr(s, "ctaTextColor", "#ffffff")}
              radius={snum(s, "ctaRadius", 999)}
              fontSize={fsize(snum(s, "ctaFontSize", 11.5), d)}
              paddingX={22}
              paddingY={10}
              shadow={`0 8px 22px ${alpha(b.accent, 0.35)}`}
            />
          ) : null}
        </header>
      </div>
    </ChromeFrame>
  );
}

function HeaderSplit({ h, shell }: HProps) {
  const { b, d, live, selected, onSelect } = shell;
  const s = h.settings;
  const mobile = d === "mobile";
  const sideLeft = sstr(s, "side", "left") !== "right";
  const panelW = Math.min(50, Math.max(24, snum(s, "brandPanelWidth", 34)));
  const panelBg = sstr(s, "brandPanelBg") || b.primary;
  const panelFg = sstr(s, "brandPanelText", "#ffffff");
  const mainBg = h.style.colors?.bg || "#f6f7fb";
  const mainFg = h.style.colors?.text || "#111827";
  const cols = d === "desktop" ? Math.min(Math.max(1, snum(s, "navColumns", 2)), 3) : 1;
  const accentBar = sstr(s, "accentBarColor") || b.accent;
  const iconBg = sstr(s, "iconCircleBg") || "#ffffff";
  const cta = ctaOf(h);
  const logoUrl = sstr(s, "logoUrl") || b.logoUrl;
  const markSize = snum(s, "logoSize", 40);

  const iconBtn = (icon: ReactNode, title: string, href: string) => (
    <a
      {...anchor(href, live)}
      title={title}
      aria-label={title}
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: iconBg,
        border: "1px solid rgba(15,23,42,.1)",
        color: b.primary,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
        flexShrink: 0,
      }}
    >
      {icon}
    </a>
  );

  return (
    <ChromeFrame shell={{ selected, onSelect }}>
      <div style={{ margin: marCss(h.style.spacing?.margin, d), position: "relative", zIndex: 50 }}>
        <div
          style={{
            ...chromeBox(h.style),
            display: "flex",
            flexDirection: mobile ? "column" : sideLeft ? "row" : "row-reverse",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              background: panelBg,
              color: panelFg,
              flex: mobile ? "1 1 auto" : `0 0 ${panelW}%`,
              minWidth: 0,
              boxSizing: "border-box",
              padding: mobile ? "18px 20px" : "26px 30px",
              display: "flex",
              flexDirection: mobile ? "row" : "column",
              alignItems: mobile ? "center" : "flex-start",
              justifyContent: mobile ? "center" : "flex-start",
              gap: mobile ? 12 : 14,
              textAlign: mobile ? "center" : "left",
            }}
          >
            {logoUrl && isMediaSrc(logoUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" style={{ width: markSize, height: markSize, borderRadius: 11, objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <span
                style={{
                  width: markSize,
                  height: markSize,
                  borderRadius: 11,
                  background: "rgba(255,255,255,.16)",
                  border: "1px solid rgba(255,255,255,.3)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: Math.round(markSize * 0.42),
                  flexShrink: 0,
                }}
              >
                {b.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: b.headingFont ? `${b.headingFont}, Georgia, serif` : undefined,
                  fontSize: fsize(snum(s, "brandFontSize", 17), d),
                  fontWeight: 800,
                  letterSpacing: 0.4,
                }}
              >
                {sstr(s, "logoText") || b.name}
              </div>
              {!mobile ? (
                <div style={{ fontSize: fsize(10.5, d), fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: alpha(panelFg.startsWith("#") ? panelFg : "#ffffff", 0.75), marginTop: 4 }}>
                  {sstr(s, "taglineText") || b.tagline}
                </div>
              ) : null}
            </div>
          </div>

          <div
            style={{
              background: mainBg,
              color: mainFg,
              flex: 1,
              minWidth: 0,
              padding: mobile ? "16px 18px 18px" : "20px 30px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              justifyContent: "center",
            }}
          >
            <nav
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gap: `${snum(s, "navGap", 16) * 0.7}px 22px`,
                maxWidth: 560,
                width: "100%",
              }}
            >
              {h.links.map((l) => (
                <a
                  key={`${l.label}-${l.href}`}
                  {...anchor(l.href, live)}
                  style={{
                    color: alpha(mainFg.startsWith("#") ? mainFg : "#111827", 0.78),
                    fontSize: fsize(snum(s, "navFontSize", 12.5), d),
                    fontWeight: 700,
                    textTransform: sbool(s, "navUppercase", true) ? "uppercase" : "none",
                    letterSpacing: 0.8,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {sbool(s, "showPhoneIcon", true) && b.phone ? iconBtn(<Phone size={15} />, "Call", `tel:${digits(b.phone)}`) : null}
              {sbool(s, "showEmailIcon", true) && b.email ? iconBtn(<Mail size={15} />, "Email", `mailto:${b.email}`) : null}
              {sbool(s, "showCta", true) ? (
                <span onClick={(e) => e.stopPropagation()}>
                  <CtaButton
                    label={cta.label}
                    href={cta.href}
                    live={live}
                    bg={sstr(s, "ctaBgColor") || b.accent}
                    fg={sstr(s, "ctaTextColor", "#0a0c10")}
                    radius={snum(s, "ctaRadius", 8)}
                    fontSize={fsize(12, d)}
                    paddingX={20}
                    shadow={`0 8px 20px ${alpha(b.accent, 0.45)}`}
                  />
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div aria-hidden style={{ height: 4, background: accentBar }} />
      </div>
    </ChromeFrame>
  );
}

function HeaderMinimal({ h, shell }: HProps) {
  const { b, d, live, selected, onSelect } = shell;
  const s = h.settings;
  const [open, setOpen] = useState(sbool(s, "autoOpen"));
  const bg = h.style.colors?.bg || "#ffffff";
  const fg = h.style.colors?.text || "#111827";
  const toggleBorder = sstr(s, "toggleBorderColor") || alpha("#94a3b8", 0.6);
  const cta = ctaOf(h);

  return (
    <ChromeFrame shell={{ selected, onSelect }}>
      <div style={{ margin: marCss(h.style.spacing?.margin, d), position: "relative", zIndex: open ? 70 : 50 }}>
        <header
          style={{
            ...chromeBox(h.style),
            background: bg,
            color: fg,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            padding: padCss(h.style.spacing?.padding, d),
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <BrandMark url={sstr(s, "logoUrl") || b.logoUrl} size={snum(s, "logoSize", 26)} radius={8} b={b} />
            <span
              style={{
                fontSize: fsize(snum(s, "brandFontSize", 14), d),
                fontWeight: 700,
                letterSpacing: 0.3,
                textTransform: "lowercase",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {sstr(s, "logoText") || b.name}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            {d === "desktop" && sbool(s, "showTaglineBar", true) && (sstr(s, "taglineText") || b.tagline) ? (
              <span
                style={{
                  fontSize: fsize(11.5, d),
                  fontWeight: 600,
                  color: alpha(fg.startsWith("#") ? fg : "#111827", 0.55),
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 300,
                }}
              >
                {sstr(s, "taglineText") || b.tagline}
              </span>
            ) : null}
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={(e) => {
                e.stopPropagation();
                setOpen((v) => !v);
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                border: `1px solid ${toggleBorder}`,
                background: "transparent",
                color: fg,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </header>

        {open ? (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "calc(100% - 2px)",
              background: sstr(s, "panelBgColor") || "#ffffff",
              color: "#111827",
              borderRadius: 16,
              border: "1px solid rgba(17,24,39,.08)",
              boxShadow: "0 26px 60px rgba(17,24,39,.2)",
              padding: "16px 22px 20px",
              zIndex: 80,
              maxHeight: "min(460px, 72vh)",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              {h.links.map((l, i) => (
                <a
                  key={`${l.label}-${i}`}
                  {...anchor(l.href, live)}
                  style={{
                    color: "#111827",
                    fontSize: fsize(snum(s, "panelLinkSize", 15), d),
                    fontWeight: 700,
                    padding: "10px 2px",
                    borderTop: i ? "1px solid #eef0f5" : undefined,
                    textDecoration: "none",
                  }}
                >
                  {l.label}
                </a>
              ))}
            </div>
            {sbool(s, "showPanelSocials", true) ? <SocialRow items={b.socials} live={live} size={32} dark marginTop={12} /> : null}
            {sbool(s, "showCta", true) ? (
              <a
                {...anchor(cta.href, live)}
                style={{
                  marginTop: 14,
                  display: sbool(s, "ctaFullWidth", true) ? "flex" : "inline-flex",
                  justifyContent: "center",
                  alignItems: "center",
                  background: sstr(s, "ctaBgColor") || `linear-gradient(135deg, ${b.accent}, ${b.primary})`,
                  color: sstr(s, "ctaTextColor", "#ffffff"),
                  fontSize: 13.5,
                  fontWeight: 800,
                  padding: "13px 20px",
                  borderRadius: snum(s, "ctaRadius", 10),
                  textDecoration: "none",
                }}
              >
                {cta.label}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </ChromeFrame>
  );
}

function HeaderOverlay({ h, shell }: HProps) {
  const { b, d, live, selected, onSelect } = shell;
  const s = h.settings;
  const [open, setOpen] = useState(false);
  const pillBg = sstr(s, "pillBg", "rgba(10,12,20,.42)");
  const pillBorder = sstr(s, "pillBorderColor", "rgba(255,255,255,.22)");
  const activePill = sstr(s, "activePillBg", "rgba(255,255,255,.16)");
  const pillRadius = snum(s, "pillRadius", 999);
  const circleCta = sstr(s, "ctaShape", "circle") !== "pill";
  const ctaSize = snum(s, "ctaSize", 42);
  const cta = ctaOf(h);
  const desktopNav = d === "desktop";
  const upper = sbool(s, "navUppercase", true);
  const ls = snum(s, "navLetterSpacing", 1.4);
  const grad = `linear-gradient(135deg, ${b.accent}, ${b.primary})`;
  const ghost = { width: 36, height: 36, borderRadius: "50%", border: `1px solid ${pillBorder}`, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 } as CSSProperties;

  return (
    <ChromeFrame shell={{ selected, onSelect }}>
      <div style={{ margin: marCss(h.style.spacing?.margin, d), position: "relative", zIndex: 60 }}>
        <header
          style={{
            ...chromeBox(h.style),
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            padding: padCss(h.style.spacing?.padding, d),
            borderRadius: pillRadius,
            background: pillBg,
            border: `1px solid ${pillBorder}`,
            color: "#ffffff",
            backdropFilter: "blur(14px) saturate(1.4)",
            WebkitBackdropFilter: "blur(14px) saturate(1.4)" as never,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <BrandMark url={sstr(s, "logoUrl") || b.logoUrl} size={snum(s, "logoSize", 32)} radius={pillRadius >= 99 ? 999 : 10} b={b} />
            <span style={{ fontSize: fsize(snum(s, "brandFontSize", 14), d), fontWeight: 800, letterSpacing: 0.4, whiteSpace: "nowrap" }}>
              {sstr(s, "logoText") || b.name}
            </span>
          </div>

          {desktopNav ? (
            <nav style={{ display: "flex", alignItems: "center", gap: Math.round(snum(s, "navGap", 18) / 3), flexWrap: "wrap", minWidth: 0 }}>
              {h.links.map((l, i) => (
                <a
                  key={`${l.label}-${i}`}
                  {...anchor(l.href, live)}
                  style={{
                    color: "#ffffff",
                    fontSize: fsize(snum(s, "navFontSize", 11.5), d),
                    fontWeight: 700,
                    textTransform: upper ? "uppercase" : "none",
                    letterSpacing: ls,
                    textDecoration: "none",
                    padding: "8px 13px",
                    borderRadius: 999,
                    background: i === 0 ? activePill : "transparent",
                    whiteSpace: "nowrap",
                  }}
                >
                  {l.label}
                </a>
              ))}
            </nav>
          ) : null}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: desktopNav ? 0 : "auto" }}>
            {sbool(s, "showSearchIcon", true) ? (
              <span title="Search" aria-hidden style={ghost}>
                <Search size={15} />
              </span>
            ) : null}
            {sbool(s, "showPhoneIcon") && b.phone ? (
              <a {...anchor(`tel:${digits(b.phone)}`, live)} title="Call" aria-label="Call" style={{ ...ghost, background: "rgba(255,255,255,.08)", textDecoration: "none" }}>
                <Phone size={15} />
              </a>
            ) : null}
            {!desktopNav ? (
              <button
                type="button"
                aria-label="Toggle menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((v) => !v);
                }}
                style={{ ...ghost, background: "rgba(255,255,255,.08)", border: `1px solid ${pillBorder}`, cursor: "pointer" }}
              >
                {open ? <X size={15} /> : <Menu size={15} />}
              </button>
            ) : null}
            {sbool(s, "showCta", true) ? (
              circleCta ? (
                <a
                  {...anchor(cta.href, live)}
                  title={cta.label}
                  aria-label={cta.label}
                  style={{
                    width: ctaSize,
                    height: ctaSize,
                    borderRadius: "50%",
                    background: sstr(s, "ctaBgColor") || grad,
                    color: sstr(s, "ctaTextColor", "#ffffff"),
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                    boxShadow: `0 10px 26px ${alpha(b.primary, 0.5)}`,
                    flexShrink: 0,
                  }}
                >
                  <ArrowRight size={Math.round(ctaSize * 0.44)} />
                </a>
              ) : (
                <span onClick={(e) => e.stopPropagation()}>
                  <CtaButton
                    label={cta.label}
                    href={cta.href}
                    live={live}
                    bg={sstr(s, "ctaBgColor") || grad}
                    fg={sstr(s, "ctaTextColor", "#ffffff")}
                    radius={999}
                    fontSize={12}
                    paddingX={18}
                    shadow={`0 10px 26px ${alpha(b.primary, 0.5)}`}
                  />
                </span>
              )
            ) : null}
          </div>
        </header>

        {open && !desktopNav ? (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: "min(320px, 92%)",
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 26px 60px rgba(8,10,20,.35)",
              padding: "12px 18px 16px",
              zIndex: 90,
              maxHeight: "min(380px, 66vh)",
              overflowY: "auto",
            }}
          >
            {h.links.map((l, i) => (
              <a
                key={`${l.label}-${i}`}
                {...anchor(l.href, live)}
                style={{
                  display: "block",
                  color: "#111827",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "10px 2px",
                  borderBottom: "1px solid #eef0f5",
                  textDecoration: "none",
                }}
              >
                {l.label}
              </a>
            ))}
            <a
              {...anchor(cta.href, live)}
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 12,
                background: grad,
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 13,
                padding: "11px 16px",
                borderRadius: 999,
                textDecoration: "none",
              }}
            >
              {cta.label}
            </a>
          </div>
        ) : null}
      </div>
    </ChromeFrame>
  );
}

export function ChromeHeader({ header, device, brand, live, selected, onSelect }: { header: SiteConfig["header"] } & ChromeShellProps) {
  const h = hydrateHeader(header);
  if (chromeHidden(h.style, device)) return null;
  const shell = shellOf({ device, brand, live, selected, onSelect });
  switch (h.design) {
    case "centered":
      return <HeaderCentered h={h} shell={shell} />;
    case "split":
      return <HeaderSplit h={h} shell={shell} />;
    case "minimal":
      return <HeaderMinimal h={h} shell={shell} />;
    case "overlay":
      return <HeaderOverlay h={h} shell={shell} />;
    case "classic":
    default:
      return <HeaderClassic h={h} shell={shell} />;
  }
}

// ---------------------------------------------------------------------------
// Footers
// ---------------------------------------------------------------------------

function copyrightOf(f: ReturnType<typeof hydrateFooter>, b: BrandBits): string {
  return sstr(f.settings, "copyrightText") || f.copyright || `© ${new Date().getFullYear()} ${b.name}. All rights reserved.`;
}

function reraOf(f: ReturnType<typeof hydrateFooter>): string {
  return sstr(f.settings, "reraText") || f.rera || "";
}

function listOfLinks(items: unknown): MenuLink[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => ({ label: String((it as { label?: unknown })?.label ?? ""), href: String((it as { href?: unknown })?.href ?? "") }))
    .filter((l) => l.label.trim().length > 0);
}

function footerLinksOf(f: ReturnType<typeof hydrateFooter>, fallback: MenuLink[]): MenuLink[] {
  const custom = listOfLinks(f.settings.links);
  return custom.length ? custom : fallback;
}

function footerLogoOf(f: ReturnType<typeof hydrateFooter>, b: BrandBits): string {
  return sstr(f.settings, "logoUrl") || b.logoUrl;
}

function socialsFor(f: ReturnType<typeof hydrateFooter>): SocialItem[] {
  const list = cleanSocials(f.settings.socials);
  return list;
}

function FooterColumns({ f, links, shell }: FProps) {
  const { b, d, live, selected, onSelect } = shell;
  const s = f.settings;
  const bg = f.style.colors?.bg || "#0d1220";
  const txt = sstr(s, "textColor") || f.style.colors?.text || "#a9b0c2";
  const head = sstr(s, "headingColor") || "#ffffff";
  const colGap = Math.round(snum(s, "colGap", 32) * gscale(d));
  const cols = d === "desktop" ? "2fr 1fr 1fr" : d === "tablet" ? "1fr 1fr" : "1fr";
  const rera = reraOf(f);
  const fLinks = footerLinksOf(f, links);
  return (
    <ChromeFrame shell={{ selected, onSelect }}>
      <footer
        style={{
          ...chromeBox(f.style),
          background: bg,
          color: txt,
          padding: padCss(f.style.spacing?.padding, d),
          margin: marCss(f.style.spacing?.margin, d),
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: cols, gap: colGap }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <BrandMark url={footerLogoOf(f, b)} size={34} radius={9} b={b} />
              <span style={{ fontSize: 14.5, fontWeight: 800, color: head }}>{b.name}</span>
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.7, maxWidth: 320, margin: 0 }}>{sstr(s, "aboutText") || b.tagline}</p>
            {sbool(s, "showSocial", true) ? <SocialRow items={socialsFor(f).length ? socialsFor(f) : b.socials} live={live} size={30} marginTop={14} /> : null}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: head, marginBottom: 12, letterSpacing: 0.5 }}>{(sstr(s, "linksTitle", "LINKS") || "LINKS").toUpperCase()}</div>
            {fLinks.map((l) => (
              <a key={`${l.label}-${l.href}`} {...anchor(l.href, live)} style={{ display: "block", fontSize: 12.5, marginBottom: 9, color: "inherit", textDecoration: "none" }}>
                {l.label}
              </a>
            ))}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: head, marginBottom: 12, letterSpacing: 0.5 }}>{(sstr(s, "contactTitle", "CONTACT") || "CONTACT").toUpperCase()}</div>
            {b.phone ? <div style={{ fontSize: 12.5, marginBottom: 9 }}>{b.phone}</div> : null}
            {b.email ? <div style={{ fontSize: 12.5, marginBottom: 9, wordBreak: "break-all" }}>{b.email}</div> : null}
            {sstr(s, "addressText") ? <div style={{ fontSize: 12.5, marginBottom: 9 }}>{sstr(s, "addressText")}</div> : null}
          </div>
        </div>
        <div
          style={{
            maxWidth: 1200,
            margin: "30px auto 0",
            borderTop: "1px solid rgba(255,255,255,.08)",
            paddingTop: 16,
            fontSize: 11,
            lineHeight: 1.6,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>{copyrightOf(f, b)}</span>
          {sbool(s, "showRera", true) && rera ? <span>RERA: {rera}</span> : null}
        </div>
      </footer>
    </ChromeFrame>
  );
}

function FooterCentered({ f, links, shell }: FProps) {
  const { b, d, live, selected, onSelect } = shell;
  const s = f.settings;
  const bg = f.style.colors?.bg || "#101423";
  const txt = sstr(s, "textColor") || f.style.colors?.text || "#b6bccb";
  const ring = sstr(s, "ringColor") || b.accent;
  const rera = reraOf(f);
  const dots = sbool(s, "navSeparatorDot", true);
  const fLinks = footerLinksOf(f, links);
  return (
    <ChromeFrame shell={{ selected, onSelect }}>
      <footer
        style={{
          ...chromeBox(f.style),
          background: bg,
          color: txt,
          padding: padCss(f.style.spacing?.padding, d),
          margin: marCss(f.style.spacing?.margin, d),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: gapCss(f.style, d, 14),
        }}
      >
        {sbool(s, "emblemRing", true) ? (
          <span
            style={{
              width: 66,
              height: 66,
              borderRadius: "50%",
              border: `2px solid ${ring}`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 5,
            }}
          >
            <BrandMark url={footerLogoOf(f, b)} size={52} radius="50%" b={b} />
          </span>
        ) : (
          <BrandMark url={footerLogoOf(f, b)} size={48} radius={12} b={b} />
        )}
        <div style={{ fontFamily: b.headingFont ? `${b.headingFont}, Georgia, serif` : undefined, fontSize: fsize(18, d), fontWeight: 800, color: "#ffffff", letterSpacing: 0.4 }}>
          {b.name}
        </div>
        {sstr(s, "aboutText") || b.tagline ? (
          <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 440, margin: 0 }}>{sstr(s, "aboutText") || b.tagline}</p>
        ) : null}
        {sbool(s, "showSocial", true) ? <SocialRow items={socialsFor(f)} live={live} size={32} /> : null}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            rowGap: 6,
            columnGap: 4,
            fontSize: fsize(12.5, d),
            fontWeight: 600,
          }}
        >
          {fLinks.map((l, i) => (
            <span key={`${l.label}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
              {dots && i > 0 ? <span aria-hidden style={{ opacity: 0.4 }}>•</span> : null}
              <a {...anchor(l.href, live)} style={{ color: "inherit", textDecoration: "none" }}>
                {l.label}
              </a>
            </span>
          ))}
        </nav>
        <div aria-hidden style={{ width: "min(420px, 70%)", height: 1, background: "rgba(255,255,255,.14)" }} />
        <div style={{ fontSize: 11.5, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <span>{copyrightOf(f, b)}</span>
          {sbool(s, "showRera", true) && rera ? <span>RERA: {rera}</span> : null}
        </div>
      </footer>
    </ChromeFrame>
  );
}

function FooterNewsletter({ f, links, shell }: FProps) {
  const { b, d, live, selected, onSelect } = shell;
  const s = f.settings;
  const bg = f.style.colors?.bg || "#ffffff";
  const txt = f.style.colors?.text || "#475569";
  const bandBg = sstr(s, "bandBgColor") || alpha(b.primary, 0.07);
  const inputRadius = snum(s, "inputRadius", 10);
  const buttonRadius = snum(s, "buttonRadius", 10);
  const rera = reraOf(f);
  const fLinks = footerLinksOf(f, links);
  const cols = d === "mobile" ? "1fr" : "repeat(3, minmax(0, 1fr))";
  const headingStyle = { fontSize: 12, fontWeight: 800, color: "#0f172a", marginBottom: 10, letterSpacing: 0.6, textTransform: "uppercase" as const };
  return (
    <ChromeFrame shell={{ selected, onSelect }}>
      <footer
        style={{
          ...chromeBox(f.style),
          background: bg,
          color: txt,
          padding: padCss(f.style.spacing?.padding, d),
          margin: marCss(f.style.spacing?.margin, d),
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              background: bandBg,
              borderRadius: 18,
              padding: d === "mobile" ? "20px 18px" : "24px 28px",
              display: "grid",
              gridTemplateColumns: d === "mobile" ? "1fr" : "1fr auto",
              gap: 18,
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: b.headingFont ? `${b.headingFont}, Georgia, serif` : undefined, fontSize: fsize(19, d), fontWeight: 800, color: "#111827", letterSpacing: -0.3 }}>
                {sstr(s, "newsHeading", "Get project updates")}
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.6, margin: "6px 0 0", color: "#4b5563" }}>{sstr(s, "newsText")}</p>
            </div>
            <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                aria-label={sstr(s, "emailPlaceholder", "Email address")}
                placeholder={sstr(s, "emailPlaceholder", "Your email address")}
                style={{
                  border: "1px solid #dbe1ea",
                  borderRadius: inputRadius,
                  padding: "11px 14px",
                  minWidth: d === "mobile" ? 0 : 220,
                  flex: d === "mobile" ? "1 1 140px" : "0 1 auto",
                  fontSize: 13,
                  outline: "none",
                  font: "inherit",
                }}
              />
              <button
                type="submit"
                style={{
                  background: `linear-gradient(135deg, ${b.accent}, ${b.primary})`,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: buttonRadius,
                  padding: "11px 18px",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {sstr(s, "subscribeLabel", "Subscribe")}
              </button>
            </form>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 26 }}>
            <div style={{ minWidth: 0 }}>
              <div style={headingStyle}>About</div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                <BrandMark url={footerLogoOf(f, b)} size={28} radius={8} b={b} />
                <span style={{ fontSize: 13.5, fontWeight: 800, color: "#111827" }}>{b.name}</span>
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.65, margin: 0 }}>{sstr(s, "aboutText") || b.tagline}</p>
              {sbool(s, "showSocial", true) ? <SocialRow items={socialsFor(f)} live={live} size={28} dark marginTop={12} /> : null}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={headingStyle}>{sstr(s, "linksTitle", "Explore")}</div>
              {fLinks.map((l) => (
                <a key={`${l.label}-${l.href}`} {...anchor(l.href, live)} style={{ display: "block", fontSize: 12.5, marginBottom: 8, color: "inherit", textDecoration: "none" }}>
                  {l.label}
                </a>
              ))}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={headingStyle}>{sstr(s, "contactTitle", "Contact")}</div>
              {b.phone ? <div style={{ fontSize: 12.5, marginBottom: 8 }}>{b.phone}</div> : null}
              {b.email ? <div style={{ fontSize: 12.5, marginBottom: 8, wordBreak: "break-all" }}>{b.email}</div> : null}
              {sstr(s, "addressText") ? <div style={{ fontSize: 12.5 }}>{sstr(s, "addressText")}</div> : null}
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid #e8eaf1",
              paddingTop: 14,
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              fontSize: 11.5,
              color: "#64748b",
            }}
          >
            <span>{copyrightOf(f, b)}</span>
            {sbool(s, "showRera", true) && rera ? <span>RERA: {rera}</span> : null}
          </div>
        </div>
      </footer>
    </ChromeFrame>
  );
}

function FooterSlimbar({ f, links, shell }: FProps) {
  const { b, d, live, selected, onSelect } = shell;
  const s = f.settings;
  const bg = f.style.colors?.bg || "#f6f7fb";
  const txt = sstr(s, "textColor") || f.style.colors?.text || "#475569";
  const mobile = d === "mobile";
  const minH = mobile ? undefined : snum(s, "minHeight", 64);
  const rera = reraOf(f);
  const fLinks = footerLinksOf(f, links);
  const showRera = sbool(s, "showRera", true) && rera;
  return (
    <ChromeFrame shell={{ selected, onSelect }}>
      <footer
        style={{
          ...chromeBox(f.style),
          background: bg,
          color: txt,
          minHeight: minH,
          padding: padCss(f.style.spacing?.padding, d),
          margin: marCss(f.style.spacing?.margin, d),
          display: "flex",
          flexDirection: mobile ? "column" : "row",
          alignItems: "center",
          justifyContent: mobile ? "center" : "space-between",
          textAlign: "center",
          gap: mobile ? 10 : 18,
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <BrandMark url={footerLogoOf(f, b)} size={24} radius={7} b={b} />
          <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{b.name}</span>
        </span>
        {sbool(s, "showNav", true) ? (
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              rowGap: 4,
              columnGap: 4,
              fontSize: fsize(12, d),
              fontWeight: 600,
            }}
          >
            {fLinks.map((l, i) => (
              <span key={`${l.label}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: sbool(s, "navSeparatorDot", true) ? 14 : 8 }}>
                {sbool(s, "navSeparatorDot", true) && i > 0 ? <span aria-hidden style={{ opacity: 0.35 }}>•</span> : null}
                <a {...anchor(l.href, live)} style={{ color: "inherit", textDecoration: "none" }}>
                  {l.label}
                </a>
              </span>
            ))}
          </nav>
        ) : null}
        <span style={{ fontSize: 11.5, color: "#64748b" }}>
          {copyrightOf(f, b)}
          {showRera ? ` · RERA: ${rera}` : ""}
        </span>
      </footer>
    </ChromeFrame>
  );
}

function FooterCards({ f, shell }: FProps) {
  const { b, d, live, selected, onSelect } = shell;
  const s = f.settings;
  const cardBg = sstr(s, "cardBg", "rgba(255,255,255,.12)");
  const address = sstr(s, "addressText");
  const tiles = [
    { icon: <Phone size={17} />, label: sstr(s, "callLabel", "Call sales"), value: b.phone, href: b.phone ? `tel:${digits(b.phone)}` : "" },
    { icon: <MessageCircle size={17} />, label: sstr(s, "whatsappLabel", "WhatsApp"), value: b.phone, href: b.phone ? `https://wa.me/${digits(b.phone)}` : "" },
    { icon: <Mail size={17} />, label: sstr(s, "emailLabel", "Email us"), value: b.email, href: b.email ? `mailto:${b.email}` : "" },
    { icon: <MapPin size={17} />, label: "Visit us", value: address, href: "" },
  ].filter((t) => t.value);
  const rera = reraOf(f);
  return (
    <ChromeFrame shell={{ selected, onSelect }}>
      <footer
        style={{
          ...chromeBox(f.style),
          padding: padCss(f.style.spacing?.padding, d),
          margin: marCss(f.style.spacing?.margin, d),
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: d === "desktop" ? "1.15fr 1fr" : "1fr",
            gap: d === "mobile" ? 26 : 34,
            alignItems: "center",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: b.headingFont ? `${b.headingFont}, Georgia, serif` : undefined,
                fontSize: fsize(d === "mobile" ? 23 : 27, d),
                fontWeight: 800,
                lineHeight: 1.18,
                letterSpacing: -0.4,
                color: "#ffffff",
                maxWidth: 480,
              }}
            >
              {sstr(s, "ctaHeading", "Looking for your dream home?")}
            </div>
            <p style={{ fontSize: fsize(13.5, d), lineHeight: 1.65, color: "rgba(255,255,255,.82)", maxWidth: 460, margin: "12px 0 20px" }}>
              {sstr(s, "ctaText")}
            </p>
            <CtaButton
              label={sstr(s, "ctaButtonLabel", "Book a Site Visit")}
              href={sstr(s, "ctaButtonHref", "#lead-form")}
              live={live}
              bg={sstr(s, "ctaButtonBg") || "#ffffff"}
              fg={sstr(s, "ctaButtonTextColor", "#111827")}
              radius={12}
              fontSize={13.5}
              paddingX={24}
              paddingY={12}
              shadow="0 14px 34px rgba(8,10,20,.35)"
            />
          </div>
          {sbool(s, "showContactCards", true) && tiles.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
              {tiles.map((t) => {
                const inner = (
                  <>
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,.16)",
                        color: "#ffffff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {t.icon}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", opacity: 0.7 }}>{t.label}</span>
                      <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "#ffffff", overflowWrap: "anywhere" }}>{t.value}</span>
                    </span>
                  </>
                );
                return t.href ? (
                  <a
                    key={t.label}
                    {...anchor(t.href, live)}
                    target={t.href.startsWith("http") && live ? "_blank" : undefined}
                    rel={t.href.startsWith("http") && live ? "noopener noreferrer" : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: cardBg,
                      borderRadius: 14,
                      padding: "13px 16px",
                      textDecoration: "none",
                      backdropFilter: "blur(6px)",
                      WebkitBackdropFilter: "blur(6px)" as never,
                    }}
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 12, background: cardBg, borderRadius: 14, padding: "13px 16px", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" as never }}>
                    {inner}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
        <div
          style={{
            maxWidth: 1200,
            margin: "22px auto 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            borderTop: "1px solid rgba(255,255,255,.18)",
            paddingTop: 14,
          }}
        >
          {sbool(s, "showSocial", true) ? <SocialRow items={socialsFor(f)} live={live} size={30} /> : <span aria-hidden />}
          <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.78)" }}>
            {copyrightOf(f, b)}
            {sbool(s, "showRera", true) && rera ? ` · RERA: ${rera}` : ""}
          </span>
        </div>
      </footer>
    </ChromeFrame>
  );
}

export function ChromeFooter({
  footer,
  header,
  device,
  brand,
  live,
  selected,
  onSelect,
}: {
  footer: SiteConfig["footer"];
  header: SiteConfig["header"];
} & ChromeShellProps) {
  const f = hydrateFooter(footer);
  if (chromeHidden(f.style, device)) return null;
  const shell = shellOf({ device, brand, live, selected, onSelect });
  const links = hydrateHeader(header).links;
  switch (f.design) {
    case "centered":
      return <FooterCentered f={f} links={links} shell={shell} />;
    case "newsletter":
      return <FooterNewsletter f={f} links={links} shell={shell} />;
    case "slimbar":
      return <FooterSlimbar f={f} links={links} shell={shell} />;
    case "cards":
      return <FooterCards f={f} links={links} shell={shell} />;
    case "columns":
    default:
      return <FooterColumns f={f} links={links} shell={shell} />;
  }
}

export function headerOverlayMode(header: SiteConfig["header"]): boolean {
  const h = hydrateHeader(header);
  return h.design === "overlay" || Boolean(h.transparent);
}
