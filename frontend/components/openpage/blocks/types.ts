import type { FormDefinition } from "@/lib/prestate/forms-store";

export type GenericBlockType =
  | "navbar"
  | "hero"
  | "features"
  | "pricing"
  | "cta"
  | "footer"
  | "testimonials"
  | "stats"
  | "faq"
  | "team"
  | "contact"
  | "newsletter"
  | "logocloud"
  | "divider"
  | "banner"
  | "content"
  | "image"
  | "video"
  | "gallery"
  | "slider"
  | "tabs"
  | "countdown"
  | "social-icons"
  | "icon"
  | "spacer"
  | "html-code"
  | "anchor"
  | "columns"
  | "heading"
  | "text"
  | "button"
  | "icon-box"
  | "image-box"
  | "property-search"
  | "property-filters"
  | "emi-calculator"
  | "payment-plan";

export type RealEstateBlockType =
  | "project-banner"
  | "project-overview"
  | "property-details"
  | "project-highlights"
  | "amenities"
  | "floor-plans"
  | "unit-config"
  | "re-pricing"
  | "offers"
  | "location"
  | "google-maps"
  | "construction-status"
  | "developer"
  | "lead-form"
  | "download-brochure"
  | "site-visit"
  | "custom-section";

export type BlockType = GenericBlockType | RealEstateBlockType;

export type BlockVariant = string;

export interface BlockTypography {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: string;
  textDecoration?: string;
  color?: string;
  textAlign?: string;
}

export interface BlockStyle {
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  width?: string;
  maxWidth?: string;
  minHeight?: string;
  alignment?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  borderWidth?: string;
  borderStyle?: string;
  borderColor?: string;
  borderRadius?: string;
  boxShadow?: string;
  opacity?: string;
  overflow?: string;
  zIndex?: string;
  hideOnDesktop?: boolean;
  hideOnTablet?: boolean;
  hideOnMobile?: boolean;
  customCss?: string;
  sectionPadding?: string;
  sectionMaxWidth?: string;
  sectionAlignment?: string;
  sectionBackground?: string;
  sectionBorderWidth?: string;
  sectionBorderColor?: string;
  sectionBorderRadius?: string;
  typography?: BlockTypography;
}

export interface ColumnConfig {
  id: string;
  width: number;
  blocks: BlockConfig[];
  style?: BlockStyle;
}

export interface SectionConfig {
  id: string;
  columns: ColumnConfig[];
  style?: BlockStyle;
}

export interface BlockConfig {
  id: string;
  type: BlockType;
  variant: BlockVariant;
  props: Record<string, unknown>;
  style?: BlockStyle;
  children?: BlockConfig[];
  columnId?: string;
  sectionId?: string;
  globalWidgetId?: string;
  animation?: string;
  animationDuration?: string;
  animationDelay?: string;
}

export interface GlobalWidget {
  id: string;
  name: string;
  block: BlockConfig;
  createdAt: number;
}

export interface ThemeConfig {
  bg0: string;
  bg1: string;
  bg2: string;
  bg3: string;
  bg4: string;
  bg5: string;
  text0: string;
  text1: string;
  text2: string;
  text3: string;
  accent: string;
  accentDim: string;
  borderDefault: string;
  borderSubtle: string;
  borderHover: string;
  fontSans: string;
  fontDisplay: string;
  fontMono: string;
  radius: number;
  radiusLg: number;
}

export interface PageConfig {
  id: string;
  name: string;
  path: string;
  blocks: BlockConfig[];
}

export interface PopupConfig {
  id: string;
  name: string;
  title: string;
  description: string;
  image?: string;
  videoUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  formId?: string;
  customHtml?: string;
  closeOnOverlay: boolean;
  trigger: "manual" | "exit" | "delay" | "scroll" | "click";
  triggerValue?: string;
  brochureUrl?: string;
}

export interface SiteSeo {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  canonical?: string;
  index?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface SiteTracking {
  gaId?: string;
  gtmId?: string;
  metaPixel?: string;
  customScripts?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface SiteProperty {
  name?: string;
  builder?: string;
  type?: string;
  status?: string;
  description?: string;
  startingPrice?: string;
  carpetArea?: string;
  reraNumber?: string;
  location?: string;
  possession?: string;
  amenities?: string[];
  features?: string[];
  gallery?: string[];
  landArea?: string;
  towers?: string;
  units?: string;
}

export interface SiteConfig {
  engine?: "openpage";
  name: string;
  pages?: PageConfig[];
  blocks: BlockConfig[];
  theme?: Partial<ThemeConfig>;
  forms?: FormDefinition[];
  popups?: PopupConfig[];
  seo?: SiteSeo;
  tracking?: SiteTracking;
  property?: SiteProperty;
  globalWidgets?: GlobalWidget[];
}
