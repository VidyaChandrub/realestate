import type {
  FooterDesignId,
  HeaderDesignId,
  MenuLink,
  SectionStyle,
  SiteConfig,
} from "./types";

// ---------------------------------------------------------------------------
// Reusable header / footer design registry
//
// Five structurally different header layouts and five structurally different
// footer layouts. Any template (landing page) picks one of each and then
// customizes its own copy — configs live on the page itself, so editing one
// template never touches another.
// ---------------------------------------------------------------------------

export interface ChromeDesignMeta {
  id: string;
  name: string;
  desc: string;
}

export const HEADER_DESIGNS: ChromeDesignMeta[] = [
  { id: "classic", name: "Classic Bar", desc: "Top strip + logo left, nav right, CTA button" },
  { id: "centered", name: "Centered Stack", desc: "Centered brand over a centered link row" },
  { id: "split", name: "Split Contrast", desc: "Colored brand panel beside a nav column" },
  { id: "minimal", name: "Minimal Toggle", desc: "Slim bar with an expandable menu panel" },
  { id: "overlay", name: "Overlay Pill", desc: "Floating glass pill for hero sections" },
];

export const FOOTER_DESIGNS: ChromeDesignMeta[] = [
  { id: "columns", name: "Column Grid", desc: "Dark multi-column footer with bottom bar" },
  { id: "centered", name: "Centered Emblem", desc: "Symmetric stack with social icons row" },
  { id: "newsletter", name: "Newsletter First", desc: "Subscribe band above light columns" },
  { id: "slimbar", name: "Slim Bar", desc: "Single-row strip: logo, links, copyright" },
  { id: "cards", name: "CTA Cards", desc: "Bold gradient with contact tiles" },
];

export const DEFAULT_HEADER_DESIGN: HeaderDesignId = "classic";
export const DEFAULT_FOOTER_DESIGN: FooterDesignId = "columns";

/** Pseudo-section ids used by the builder inspector to edit page chrome. */
export const CHROME_HEADER_ID = "__chrome_header";
export const CHROME_FOOTER_ID = "__chrome_footer";

export function isHeaderDesign(id: unknown): id is HeaderDesignId {
  return typeof id === "string" && HEADER_DESIGNS.some((d) => d.id === id);
}

export function isFooterDesign(id: unknown): id is FooterDesignId {
  return typeof id === "string" && FOOTER_DESIGNS.some((d) => d.id === id);
}

// ---------------------------------------------------------------------------
// Settings readers (defensive — stored settings may predate any key)
// ---------------------------------------------------------------------------

type Settings = Record<string, unknown>;

export const sstr = (o: Settings | undefined, k: string, fb = ""): string =>
  o && typeof o[k] === "string" ? (o[k] as string) : fb;

export const sbool = (o: Settings | undefined, k: string, fb = false): boolean =>
  o && typeof o[k] === "boolean" ? (o[k] as boolean) : fb;

export const snum = (o: Settings | undefined, k: string, fb = 0): number =>
  o && typeof o[k] === "number" ? (o[k] as number) : fb;

export function slugifyHref(label: string): string {
  return `#${label.toLowerCase().replace(/\s+/g, "-")}`;
}

/** Editable nav links: prefers menuLinks, falls back to the legacy string menu. */
export function linksOf(header: SiteConfig["header"]): MenuLink[] {
  const links = header.menuLinks;
  if (Array.isArray(links) && links.length > 0) {
    return links.map((l) => ({ label: String(l?.label ?? ""), href: String(l?.href ?? "") })).filter((l) => l.label.trim());
  }
  const menu = Array.isArray(header.menu) ? header.menu.filter(Boolean) : [];
  if (menu.length === 0) {
    return ["Overview", "Amenities", "Floor Plans", "Gallery", "Contact"].map((label) => ({
      label,
      href: slugifyHref(label),
    }));
  }
  return menu.map((label) => ({ label, href: slugifyHref(label) }));
}

/** Keep the legacy string menu in sync so older previews stay correct. */
export function labelsFromLinks(links: MenuLink[]): string[] {
  return links.map((l) => l.label);
}

// ---------------------------------------------------------------------------
// Base style factories
// ---------------------------------------------------------------------------

export interface ChromeStyleOverride {
  colors?: Partial<NonNullable<SectionStyle["colors"]>>;
  typography?: Partial<NonNullable<SectionStyle["typography"]>>;
  spacing?: {
    padding?: Partial<{ top: number; right: number; bottom: number; left: number }>;
    margin?: Partial<{ top: number; right: number; bottom: number; left: number }>;
    gap?: number;
  };
  border?: Partial<NonNullable<SectionStyle["border"]>>;
  effects?: Partial<NonNullable<SectionStyle["effects"]>>;
  layout?: Partial<NonNullable<SectionStyle["layout"]>>;
  responsive?: Partial<NonNullable<SectionStyle["responsive"]>>;
  advanced?: Partial<NonNullable<SectionStyle["advanced"]>>;
}

function styleOver(over: ChromeStyleOverride): SectionStyle {
  return {
    colors: { bg: "", overlay: "", gradient: "", text: "", ...over.colors },
    typography: { fontFamily: "", fontSize: 16, fontWeight: 400, lineHeight: 1.5, letterSpacing: 0, ...over.typography },
    spacing: {
      padding: { top: 0, right: 0, bottom: 0, left: 0, ...over.spacing?.padding },
      margin: { top: 0, right: 0, bottom: 0, left: 0, ...over.spacing?.margin },
      gap: over.spacing?.gap ?? 0,
    },
    border: { width: 0, style: "solid", radius: 0, color: "#e8eaf1", ...over.border },
    effects: { shadow: "none", blur: 0, glass: false, ...over.effects },
    layout: { width: "full", height: "auto", align: "left", direction: "row", wrap: true, ...over.layout },
    responsive: { hideDesktop: false, hideTablet: false, hideMobile: false, ...over.responsive },
    ...(over.advanced ? { advanced: { classes: "", elementId: "", zIndex: 0, position: "", customCss: "", attributes: "", ...over.advanced } } : {}),
  };
}

const pad = (top: number, right: number, bottom: number, left: number) => ({
  top,
  right,
  bottom,
  left,
});
const margin0 = pad(0, 0, 0, 0);

// ---------------------------------------------------------------------------
// Header design defaults — every knob is editable from the builder
// ---------------------------------------------------------------------------

export function defaultHeaderSettings(design: HeaderDesignId): Settings {
  switch (design) {
    case "classic":
      return {
        logoUrl: "",
        logoText: "",
        ctaText: "",
        ctaHref: "",
        logoSize: 34,
        showBrandName: true,
        brandFontSize: 15,
        showTaglineRow: false,
        taglineText: "",
        navFontSize: 12.5,
        navGap: 22,
        navUppercase: false,
        showPhone: true,
        showCta: true,
        ctaBgColor: "",
        ctaTextColor: "#ffffff",
        ctaRadius: 9,
        ctaFontSize: 12,
        ctaPaddingX: 16,
        topbarText: "",
        topbarBgColor: "",
        topbarTextColor: "#ffffff",
        hamburgerLabel: "",
      };
    case "centered":
      return {
        logoSize: 44,
        logoText: "",
        logoUrl: "",
        brandFontSize: 20,
        taglineText: "",
        navFontSize: 12,
        navGap: 18,
        navSeparatorDot: true,
        navUppercase: true,
        showNavRow: true,
        showCta: true,
        ctaBgColor: "",
        ctaTextColor: "#ffffff",
        ctaRadius: 999,
        ctaFontSize: 11.5,
        topbarText: "",
        topbarBgColor: "",
        topbarTextColor: "#ffffff",
        dividerColor: "",
        centerAlign: true,
      };
    case "split":
      return {
        brandPanelWidth: 34,
        logoText: "",
        logoUrl: "",
        ctaText: "",
        ctaHref: "",
        brandPanelBg: "",
        brandPanelText: "#ffffff",
        logoSize: 40,
        brandFontSize: 17,
        taglineText: "",
        navFontSize: 12.5,
        navGap: 16,
        navUppercase: true,
        navColumns: 2,
        showPhoneIcon: true,
        showEmailIcon: true,
        iconCircleBg: "",
        showCta: true,
        ctaBgColor: "",
        ctaTextColor: "#0a0c10",
        ctaRadius: 8,
        accentBarColor: "",
        side: "left",
      };
    case "minimal":
      return {
        logoSize: 26,
        logoText: "",
        logoUrl: "",
        brandFontSize: 14,
        taglineText: "",
        showTaglineBar: true,
        panelBgColor: "#ffffff",
        panelLinkSize: 15,
        panelGap: 14,
        showPanelSocials: true,
        showCta: true,
        ctaBgColor: "",
        ctaTextColor: "#ffffff",
        ctaRadius: 10,
        ctaFullWidth: true,
        toggleBorderColor: "",
        autoOpen: false,
      };
    case "overlay":
      return {
        logoSize: 32,
        logoText: "",
        logoUrl: "",
        ctaText: "",
        ctaHref: "",
        brandFontSize: 14,
        pillInset: 14,
        pillRadius: 999,
        pillBg: "rgba(10,12,20,.42)",
        pillBorderColor: "rgba(255,255,255,.22)",
        navFontSize: 11.5,
        navGap: 18,
        navUppercase: true,
        navLetterSpacing: 1.4,
        activePillBg: "rgba(255,255,255,.16)",
        showSearchIcon: true,
        showPhoneIcon: false,
        ctaShape: "circle",
        ctaBgColor: "",
        ctaTextColor: "#ffffff",
        ctaSize: 42,
      };
  }
}

export function defaultHeaderStyle(design: HeaderDesignId): SectionStyle {
  switch (design) {
    case "classic":
      // Empty bg/text = derive from the legacy variant/sticky flags so older
      // templates keep their exact look until someone edits a color.
      return styleOver({
        spacing: { padding: pad(14, 44, 14, 44), margin: margin0, gap: 14 },
        colors: { bg: "", text: "" },
        border: { width: 1, style: "solid", radius: 0, color: "rgba(15,23,42,.08)" },
      });
    case "centered":
      return styleOver({
        spacing: { padding: pad(18, 32, 16, 32), margin: margin0, gap: 12 },
        colors: { bg: "#ffffff", text: "#111827" },
        border: { width: 1, style: "solid", radius: 0, color: "rgba(15,23,42,.08)" },
        layout: { align: "center", direction: "column" },
      });
    case "split":
      return styleOver({
        spacing: { padding: pad(0, 0, 0, 0), margin: margin0, gap: 24 },
        colors: { bg: "#f6f7fb", text: "#111827" },
        border: { width: 0, style: "solid", radius: 0, color: "#e8eaf1" },
      });
    case "minimal":
      return styleOver({
        spacing: { padding: pad(12, 28, 12, 28), margin: margin0, gap: 12 },
        colors: { bg: "#ffffff", text: "#111827" },
        border: { width: 0, style: "solid", radius: 0, color: "#e8eaf1" },
      });
    case "overlay":
      return styleOver({
        spacing: { padding: pad(12, 18, 12, 22), margin: { top: 12, right: 14, bottom: 0, left: 14 }, gap: 14 },
        colors: { bg: "transparent", text: "#ffffff", overlay: "" },
        border: { width: 1, style: "solid", radius: 999, color: "rgba(255,255,255,.22)" },
        effects: { shadow: "0 12px 34px rgba(8,10,20,.25)", glass: true },
      });
  }
}

// ---------------------------------------------------------------------------
// Footer design defaults
// ---------------------------------------------------------------------------

export function defaultFooterSettings(design: FooterDesignId): Settings {
  switch (design) {
    case "columns":
      return {
        copyrightText: "",
        reraText: "",
        logoUrl: "",
        links: [],
        aboutText: "",
        showSocial: true,
        socials: [
          { label: "Facebook", href: "" },
          { label: "Instagram", href: "" },
          { label: "X", href: "" },
        ],
        linksTitle: "LINKS",
        contactTitle: "CONTACT",
        addressText: "",
        showRera: true,
        colGap: 32,
        headingColor: "",
        textColor: "",
      };
    case "centered":
      return {
        copyrightText: "",
        reraText: "",
        logoUrl: "",
        links: [],
        aboutText: "",
        showSocial: true,
        socials: [
          { label: "Facebook", href: "" },
          { label: "Instagram", href: "" },
          { label: "YouTube", href: "" },
        ],
        navSeparatorDot: true,
        showRera: true,
        emblemRing: true,
        ringColor: "",
        textColor: "",
      };
    case "newsletter":
      return {
        copyrightText: "",
        reraText: "",
        logoUrl: "",
        links: [],
        newsHeading: "Get project updates",
        newsText: "Pricing sheets, floor plans and launch offers — straight to your inbox.",
        emailPlaceholder: "Your email address",
        subscribeLabel: "Subscribe",
        inputRadius: 10,
        buttonRadius: 10,
        bandBgColor: "",
        aboutText: "",
        linksTitle: "Explore",
        contactTitle: "Contact",
        showSocial: true,
        socials: [
          { label: "Facebook", href: "" },
          { label: "LinkedIn", href: "" },
        ],
        showRera: true,
      };
    case "slimbar":
      return {
        copyrightText: "",
        reraText: "",
        logoUrl: "",
        links: [],
        showNav: true,
        navSeparatorDot: true,
        showRera: true,
        minHeight: 64,
        textColor: "",
      };
    case "cards":
      return {
        copyrightText: "",
        reraText: "",
        logoUrl: "",
        links: [],
        ctaHeading: "Looking for your dream home?",
        ctaText: "Book a private site visit with our property experts this weekend.",
        ctaButtonLabel: "Book a Site Visit",
        ctaButtonHref: "#lead-form",
        ctaButtonBg: "#ffffff",
        ctaButtonTextColor: "#111827",
        showContactCards: true,
        callLabel: "Call sales",
        whatsappLabel: "WhatsApp",
        emailLabel: "Email us",
        addressText: "",
        showSocial: true,
        socials: [
          { label: "Facebook", href: "" },
          { label: "Instagram", href: "" },
          { label: "YouTube", href: "" },
        ],
        showRera: true,
        cardBg: "rgba(255,255,255,.12)",
      };
  }
}

export function defaultFooterStyle(design: FooterDesignId): SectionStyle {
  switch (design) {
    case "columns":
      return styleOver({
        spacing: { padding: pad(56, 44, 24, 44), margin: margin0, gap: 32 },
        colors: { bg: "#0d1220", text: "#a9b0c2" },
      });
    case "centered":
      return styleOver({
        spacing: { padding: pad(48, 32, 22, 32), margin: margin0, gap: 14 },
        colors: { bg: "#101423", text: "#b6bccb" },
        layout: { align: "center", direction: "column" },
      });
    case "newsletter":
      return styleOver({
        spacing: { padding: pad(0, 40, 22, 40), margin: margin0, gap: 30 },
        colors: { bg: "#ffffff", text: "#475569" },
        border: { width: 1, style: "solid", radius: 0, color: "#e8eaf1" },
      });
    case "slimbar":
      return styleOver({
        spacing: { padding: pad(14, 36, 14, 36), margin: margin0, gap: 18 },
        colors: { bg: "#f6f7fb", text: "#475569" },
        border: { width: 1, style: "solid", radius: 0, color: "#e8eaf1" },
      });
    case "cards":
      return styleOver({
        spacing: { padding: pad(48, 40, 20, 40), margin: margin0, gap: 26 },
        colors: { bg: "", gradient: "linear-gradient(135deg, #4f46e5, #7c3aed 55%, #a855f7)", text: "#eef0ff" },
        layout: { align: "left", direction: "row" },
      });
  }
}

// ---------------------------------------------------------------------------
// Hydration — merges stored config with defaults without mutating other pages
// ---------------------------------------------------------------------------

export type HydratedHeader = SiteConfig["header"] & {
  design: HeaderDesignId;
  settings: Settings;
  style: SectionStyle;
  links: MenuLink[];
};

export type HydratedFooter = SiteConfig["footer"] & {
  design: FooterDesignId;
  settings: Settings;
  style: SectionStyle;
};

export function hydrateHeader(header: SiteConfig["header"]): HydratedHeader {
  const design = isHeaderDesign(header.design) ? header.design : DEFAULT_HEADER_DESIGN;
  return {
    ...header,
    design,
    settings: { ...defaultHeaderSettings(design), ...(header.settings ?? {}) },
    style: styleOver({ ...(header.style ?? {}) }),
    links: linksOf(header),
  };
}

export function hydrateFooter(footer: SiteConfig["footer"]): HydratedFooter {
  const design = isFooterDesign(footer.design) ? footer.design : DEFAULT_FOOTER_DESIGN;
  return {
    ...footer,
    design,
    settings: { ...defaultFooterSettings(design), ...(footer.settings ?? {}) },
    style: styleOver({ ...(footer.style ?? {}) }),
  };
}

/** When the design changes, seed fresh settings/style but keep user content where sensible. */
export function reseedForDesign<T extends Settings>(kind: "header" | "footer", design: string, previous?: T): T {
  const fresh = kind === "header" ? defaultHeaderSettings(design as HeaderDesignId) : defaultFooterSettings(design as FooterDesignId);
  const merged = { ...fresh, ...(previous ?? {}) } as T;
  return merged;
}
