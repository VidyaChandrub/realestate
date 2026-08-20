import type { CSSProperties } from "react";
import type { FormLeadField, LandingPageData, SiteConfig } from "./types";

const DEFAULT_FIELDS: FormLeadField[] = [
  { id: "f1", type: "text", label: "Full name", placeholder: "e.g. Rohan Kapoor", required: true },
  { id: "f2", type: "phone", label: "Phone number", placeholder: "+91 98765 43210", required: true },
  { id: "f3", type: "email", label: "Email address", placeholder: "you@email.com", required: false },
  { id: "f4", type: "select", label: "Interested in", placeholder: "Choose an option", required: true, options: ["3 BHK", "4 BHK", "Penthouse"] },
  { id: "f5", type: "checkbox", label: "I agree to receive updates", placeholder: "", required: true },
];

export function defaultSiteConfig(input: {
  name: string;
  slug: string;
  domain?: string;
  primary?: string;
  accent?: string;
}): SiteConfig {
  const host = input.domain?.trim() || "";
  const title = `${input.name} | Real Estate`;
  return {
    page: { language: "en", password: "", favicon: "/favicon.ico" },
    seo: {
      metaTitle: title.slice(0, 60),
      metaDescription: `Explore ${input.name}. Book a site visit and get pricing, floor plans and offers.`,
      keywords: "real estate, apartments, site visit",
      canonical: host ? `https://${host}` : `https://localhost${input.slug ? `/p/${input.slug}` : ""}`,
      index: true,
      sitemap: true,
      ogTitle: input.name,
      ogDescription: `Explore ${input.name}. Book a site visit today.`,
      ogImage: "/og-default.jpg",
    },
    brand: {
      name: input.name,
      tagline: "Luxury living, thoughtfully built.",
      email: "hello@example.com",
      phone: "+91 98765 43210",
      primary: input.primary || "#6D5DFC",
      accent: input.accent || "#CDA45E",
      headingFont: "Playfair Display",
      bodyFont: "Inter",
      logo: "",
      facebook: "",
      instagram: "",
      twitter: "",
      youtube: "",
      linkedin: "",
      accentButtons: true,
    },
    header: {
      sticky: true,
      transparent: false,
      showTopbar: true,
      variant: "light",
      cta: "Book a Site Visit",
      ctaLink: "#contact",
      menu: ["Amenities", "Floor Plans", "Gallery", "Pricing", "Contact"],
      floatEnabled: true,
      floatSide: "right",
      floatWhatsapp: true,
      floatCall: true,
      floatEnquire: true,
      floatEmail: true,
    },
    footer: {
      rera: "",
      copyright: `© ${new Date().getFullYear()} ${input.name}. All rights reserved.`,
    },
    tracking: {
      gaId: "",
      gtmId: "",
      metaPixel: "",
      customScripts: "",
      utmSource: "facebook",
      utmMedium: "cpc",
      utmCampaign: "launch",
      goalForm: true,
      goalWhatsapp: true,
      goalCall: true,
      goalBrochure: false,
    },
    form: {
      notifyEmail: "",
      whatsapp: "",
      thankYou: "Thanks — our team will call you shortly.",
      multiStep: false,
      templateId: "f1",
      saveToCrm: true,
      sendEmail: true,
      sendWhatsapp: true,
      redirectThankYou: false,
      submitLabel: "Submit",
      fields: DEFAULT_FIELDS.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })),
    },
    media: { notes: "" },
  };
}

const SEED: Record<string, Partial<{ primary: string; accent: string; brand: string; tagline: string; keywords: string; rera: string; ga: string }>> = {
  p1: {
    primary: "#6D5DFC",
    accent: "#CDA45E",
    brand: "Aurora Residences",
    tagline: "Where every morning feels like a holiday.",
    keywords: "luxury apartments, sarjapur, bangalore, rera",
    rera: "PRM/KA/RERA/1251/446/PR/2026/1",
    ga: "G-AURORA01",
  },
  p2: {
    primary: "#0F766E",
    accent: "#D4A017",
    brand: "Palm Grove Villas",
    tagline: "Gated villas with private gardens.",
    keywords: "villas, gated community, palm grove",
    rera: "PRM/KA/RERA/1251/447/PR/2026/2",
    ga: "G-PALM02",
  },
  p3: {
    primary: "#B45309",
    accent: "#1E3A5F",
    brand: "Aether Business Park",
    tagline: "Grade-A workspace on the growth corridor.",
    keywords: "commercial, office leasing, aether park",
    rera: "",
    ga: "G-AETHER03",
  },
  p4: {
    primary: "#C026D3",
    accent: "#111827",
    brand: "Northstar Founders",
    tagline: "Limited inventory. Founders' pricing.",
    keywords: "new launch, founders offer, northstar",
    rera: "PRM/KA/RERA/1251/448/PR/2026/4",
    ga: "G-NORTH04",
  },
};

export function seedConfigFor(page: LandingPageData): SiteConfig {
  const extra = SEED[page.id];
  const base = defaultSiteConfig({
    name: extra?.brand || page.name,
    slug: page.slug,
    domain: page.domain,
    primary: extra?.primary,
    accent: extra?.accent,
  });
  if (!extra) return base;
  return {
    ...base,
    seo: {
      ...base.seo,
      metaTitle: `${extra.brand} | ${page.template}`.slice(0, 60),
      metaDescription: extra.tagline || base.seo.metaDescription,
      keywords: extra.keywords || base.seo.keywords,
      ogTitle: extra.brand || page.name,
      ogDescription: extra.tagline || base.seo.ogDescription,
    },
    brand: {
      ...base.brand,
      name: extra.brand || page.name,
      tagline: extra.tagline || base.brand.tagline,
      email: `hello@${page.domain || "example.com"}`,
    },
    footer: { ...base.footer, rera: extra.rera || "" },
    tracking: { ...base.tracking, gaId: extra.ga || "" },
  };
}

export function ensureConfig(page: LandingPageData): SiteConfig {
  return page.config ? hydrateConfig(page.config, page) : seedConfigFor(page);
}

function hydrateConfig(raw: SiteConfig, page: LandingPageData): SiteConfig {
  const fallback = seedConfigFor(page);
  return {
    page: { ...fallback.page, ...raw.page },
    seo: { ...fallback.seo, ...raw.seo },
    brand: { ...fallback.brand, ...raw.brand },
    header: { ...fallback.header, ...raw.header, menu: raw.header?.menu?.length ? raw.header.menu : fallback.header.menu },
    footer: { ...fallback.footer, ...raw.footer },
    tracking: { ...fallback.tracking, ...raw.tracking },
    form: {
      ...fallback.form,
      ...raw.form,
      fields: raw.form?.fields?.length ? raw.form.fields : fallback.form.fields,
    },
    media: { ...fallback.media, ...raw.media },
  };
}

export function cloneConfig(config: SiteConfig): SiteConfig {
  return JSON.parse(JSON.stringify(config)) as SiteConfig;
}

function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace("#", "").trim();
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (full.length !== 6) return `rgba(109, 93, 252, ${alpha})`;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(109, 93, 252, ${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function googleFontsHref(...names: string[]): string {
  const families = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (families.length === 0) return "";
  const q = families.map((n) => `family=${n.replace(/ /g, "+")}:wght@400;500;600;700;800`).join("&");
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

export function siteThemeStyle(brand: SiteConfig["brand"]): CSSProperties {
  const primary = brand.primary || "#6D5DFC";
  const accent = brand.accent || "#CDA45E";
  return {
    ["--ps-site-primary" as string]: primary,
    ["--ps-site-accent" as string]: accent,
    ["--ps-primary" as string]: primary,
    ["--ps-primary-dark" as string]: primary,
    ["--ps-primary-soft" as string]: withAlpha(primary, 0.14),
    ["--ps-primary-mist" as string]: withAlpha(primary, 0.08),
    ["--ps-primary-glow" as string]: withAlpha(primary, 0.32),
    ["--ps-grad-primary" as string]: `linear-gradient(135deg, ${primary}, ${accent})`,
    ["--ps-heading-font" as string]: `${brand.headingFont}, Georgia, serif`,
    fontFamily: `${brand.bodyFont}, Inter, system-ui, sans-serif`,
  };
}
