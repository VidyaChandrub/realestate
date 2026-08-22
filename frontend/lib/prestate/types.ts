export type Device = "desktop" | "tablet" | "mobile";

export type ModuleKey =
  | "builder"
  | "pages"
  | "templates"
  | "forms"
  | "brand"
  | "headerfooter"
  | "seo"
  | "tracking"
  | "domains";

export type WidgetCategory =
  | "Layout"
  | "Basic"
  | "Real Estate"
  | "Media"
  | "Forms"
  | "Marketing"
  | "Header & Footer"
  | "SEO"
  | "Advanced";

export interface MenuLink {
  label: string;
  href: string;
}

export type HeaderDesignId = "classic" | "centered" | "split" | "minimal" | "overlay";
export type FooterDesignId = "columns" | "centered" | "newsletter" | "slimbar" | "cards";

export interface SectionStyle {
  colors?: {
    bg?: string;
    overlay?: string;
    gradient?: string;
    text?: string;
    image?: string;
  };
  typography?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    lineHeight?: number;
    letterSpacing?: number;
  };
  border?: {
    width?: number;
    style?: string;
    radius?: number;
    color?: string;
  };
  effects?: {
    shadow?: string;
    blur?: number;
    glass?: boolean;
    hover?: string;
    animation?: string;
  };
  spacing?: {
    padding?: { top: number; right: number; bottom: number; left: number };
    margin?: { top: number; right: number; bottom: number; left: number };
    gap?: number;
  };
  layout?: {
    width?: "boxed" | "full" | "custom";
    customWidth?: number;
    height?: "auto" | "fixed" | "vh";
    fixedHeight?: number;
    align?: "left" | "center" | "right";
    direction?: "row" | "column";
    wrap?: boolean;
    justify?: string;
    alignItems?: string;
  };
  responsive?: {
    hideDesktop?: boolean;
    hideTablet?: boolean;
    hideMobile?: boolean;
  };
  advanced?: {
    classes?: string;
    elementId?: string;
    zIndex?: number;
    position?: string;
    customCss?: string;
    attributes?: string;
  };
}

export interface SectionInstance {
  id: string;
  type: string;
  label: string;
  icon: string;
  global?: boolean;
  hidden?: boolean;
  locked?: boolean;
  settings: Record<string, unknown>;
  style: SectionStyle;
  children?: SectionInstance[];
}

export interface PropertyData {
  id: string;
  name: string;
  builder: string;
  type: string;
  status: string;
  description: string;
  startingPrice: string;
  carpetArea: string;
  reraNumber: string;
  location: string;
  possession: string;
  amenities: string[];
  features: string[];
  gallery: string[];
  videos: { title: string; url: string }[];
  floorPlans: { name: string; beds: string; area: string; image: string; price?: string }[];
  brochureUrl: string;
  mapUrl: string;
  towers: string;
  landArea: string;
  metro: string;
  units: string;
}

export interface FormLeadField {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[];
}

export interface SiteConfig {
  page: {
    language: string;
    password: string;
    favicon: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string;
    canonical: string;
    index: boolean;
    sitemap: boolean;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
  };
  brand: {
    name: string;
    tagline: string;
    email: string;
    phone: string;
    primary: string;
    accent: string;
    headingFont: string;
    bodyFont: string;
    logo: string;
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
    linkedin: string;
    accentButtons: boolean;
  };
  header: {
    sticky: boolean;
    transparent: boolean;
    showTopbar: boolean;
    variant: "light" | "dark" | "glass";
    cta: string;
    ctaLink: string;
    menu: string[];
    floatEnabled: boolean;
    floatSide: "left" | "right";
    floatWhatsapp: boolean;
    floatCall: boolean;
    floatEnquire: boolean;
    floatEmail: boolean;
    /** Which of the 5 reusable header layouts this template uses. */
    design?: HeaderDesignId;
    /** Editable nav links (label + href). Preferred over the legacy string menu. */
    menuLinks?: MenuLink[];
    /** Design-specific content settings — every text, button, icon and link. */
    settings?: Record<string, unknown>;
    /** Full style customization (colors, typography, spacing, border, layout, responsive). */
    style?: SectionStyle;
  };
  footer: {
    rera: string;
    copyright: string;
    /** Which of the 5 reusable footer layouts this template uses. */
    design?: FooterDesignId;
    /** Design-specific content settings — every text, button, icon and link. */
    settings?: Record<string, unknown>;
    /** Full style customization (colors, typography, spacing, border, layout, responsive). */
    style?: SectionStyle;
  };
  tracking: {
    gaId: string;
    gtmId: string;
    metaPixel: string;
    customScripts: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    goalForm: boolean;
    goalWhatsapp: boolean;
    goalCall: boolean;
    goalBrochure: boolean;
  };
  form: {
    notifyEmail: string;
    whatsapp: string;
    thankYou: string;
    multiStep: boolean;
    templateId: string;
    saveToCrm: boolean;
    sendEmail: boolean;
    sendWhatsapp: boolean;
    redirectThankYou: boolean;
    submitLabel: string;
    deliverableUrl: string;
    deliverableLabel: string;
    fields: FormLeadField[];
  };
  media: {
    notes: string;
  };
}

export interface LandingPageData {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "published" | "scheduled" | "password" | "unpublished";
  template: string;
  domain: string;
  views: string;
  conversions: string;
  updated: string;
  thumbnail: string;
  sections: SectionInstance[];
  config?: SiteConfig;
  kind?: "preset" | "custom";
  designId?: string;
}

export interface FormTemplateData {
  id: string;
  name: string;
  icon: string;
  steps: number;
  fields: number;
  description: string;
}

export interface TemplateData {
  id: string;
  name: string;
  category: string;
  icon: string;
  pages: number;
  conversions: string;
  accent: string;
  accent2: string;
  description: string;
  thumbnail: string;
}

export interface DomainRow {
  id: string;
  domain: string;
  favicon: string;
  plan: string;
  created: string;
  pages: number;
  ssl: string;
  status: "live" | "draft" | "password" | "unpublished" | "pending";
  expiry: string;
}