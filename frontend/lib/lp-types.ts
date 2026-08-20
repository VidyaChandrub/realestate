// Shared types for the landing-page builder + renderer.
// The shape mirrors the backend `document` column (Elementor-style tree).

export type Device = "desktop" | "tablet" | "mobile";

export type Responsive<T> = {
  desktop?: T;
  tablet?: T;
  mobile?: T;
};

export interface BoxValue {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export type BackgroundSettings = {
  color?: string;
  image?: string;
  gradient?: string;
  overlayColor?: string;
  position?: string;
  size?: string;
};

export interface RowSettings {
  name?: string;
  enabled?: boolean;
  layout?: "full_width" | "boxed";
  contentWidth?: "boxed" | "full";
  background?: BackgroundSettings;
  padding?: BoxValue;
  margin?: BoxValue;
  minHeight?: number;
  gap?: number;
  align?: "left" | "center" | "right";
  border?: { radius?: number; width?: number; color?: string };
  shadow?: string;
  hidden?: Responsive<boolean>;
}

export interface ColumnSettings {
  width?: number;
  padding?: BoxValue;
  verticalAlign?: "top" | "middle" | "bottom";
  align?: "left" | "center" | "right";
  background?: BackgroundSettings;
  border?: { radius?: number; width?: number; color?: string };
  hidden?: Responsive<boolean>;
}

export interface ElementSettings {
  [key: string]: unknown;
}

export interface ElementNode {
  id: string;
  type: string;
  settings: ElementSettings;
  elements?: ElementNode[];
}

export interface ColumnNode {
  id: string;
  settings: ColumnSettings;
  elements: ElementNode[];
}

export interface RowNode {
  id: string;
  type?: string;
  settings: RowSettings;
  columns: ColumnNode[];
}

export interface HeaderSettings {
  enabled?: boolean;
  sticky?: boolean;
  transparent?: boolean;
  background?: string;
  textColor?: string;
  logo?: {
    type: "text" | "image";
    text?: string;
    image?: string;
    height?: number;
  };
  menu?: { label: string; href: string }[];
  cta?: { label?: string; href?: string };
  phone?: { number?: string; enabled?: boolean };
  whatsapp?: { number?: string; message?: string; enabled?: boolean };
}

export interface FooterSettings {
  enabled?: boolean;
  background?: string;
  textColor?: string;
  columns?: { title?: string; text?: string; links?: { label: string; href: string }[] }[];
  contact?: { phone?: string; email?: string; address?: string };
  social?: { platform: string; url: string }[];
  disclaimer?: string;
  copyright?: string;
}

export interface DocumentSettings {
  pageBackground?: string;
  containerWidth?: number;
  contentColor?: string;
  fonts?: { body?: string; heading?: string; mono?: string };
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    text?: string;
    background?: string;
  };
  buttons?: {
    radius?: number;
    paddingX?: number;
    paddingY?: number;
    fontWeight?: number;
  };
  sectionSpacing?: number;
}

export interface LpDocument {
  settings?: DocumentSettings;
  header?: HeaderSettings;
  footer?: FooterSettings;
  rows: RowNode[];
}

export interface LpSeo {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  favicon?: string;
  schema?: string;
  sitemapIncluded?: boolean;
}

export interface LpTracking {
  gtm?: string;
  ga4?: string;
  gadsConversion?: string;
  gadsLabel?: string;
  metaPixel?: string;
  customScripts?: string;
  customEvents?: { name: string; trigger: string; params?: string }[];
}

export interface LpDomain {
  customDomain?: string;
  subdomain?: string;
  sslEnabled?: boolean;
  requestedDomain?: string;
  requestStatus?: "pending" | "approved" | "rejected";
  requestNote?: string;
  requestedAt?: string;
}

export type LpPageCategory =
  | "property_project"
  | "residential"
  | "luxury"
  | "commercial"
  | "apartments"
  | "villas"
  | "plots"
  | "campaign";

export type LpPageStatus = "draft" | "published" | "archived";

export interface LpPage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  thumbnail: string | null;
  status: LpPageStatus;
  document: LpDocument;
  seo: LpSeo | null;
  tracking: LpTracking | null;
  domain: LpDomain | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LpListRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  thumbnail: string | null;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  leadCount: number;
}

export interface LpListResponse {
  data: LpListRow[];
  total: number;
  page: number;
  limit: number;
}

export interface LpSectionTemplate {
  id: string;
  name: string;
  category: string | null;
  thumbnail: string | null;
  document: unknown;
  createdAt: string;
}

export interface LpLead {
  id: string;
  landingPageId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  budget: string | null;
  propertyType: string | null;
  message: string | null;
  intent: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: string;
}

export interface LpLeadsResponse {
  data: LpLead[];
  total: number;
  page: number;
  limit: number;
}

export const LP_CATEGORIES: { value: string; label: string }[] = [
  { value: "property_project", label: "Property Project" },
  { value: "residential", label: "Residential Projects" },
  { value: "luxury", label: "Luxury Projects" },
  { value: "commercial", label: "Commercial Projects" },
  { value: "apartments", label: "Apartments" },
  { value: "villas", label: "Villas" },
  { value: "plots", label: "Plots / Land" },
  { value: "campaign", label: "Campaign / Offer" },
];

export const LP_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  LP_CATEGORIES.map((c) => [c.value, c.label]),
);

export function categoryLabel(value: string): string {
  return LP_CATEGORY_LABEL[value] ?? value;
}