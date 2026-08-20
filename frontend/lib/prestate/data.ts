import type { LucideIcon } from "lucide-react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Award,
  BadgeCheck,
  Bath,
  BedDouble,
  BookOpen,
  Building2,
  CalendarClock,
  Car,
  Columns,
  Compass,
  ConciergeBell,
  Crown,
  Download,
  Dumbbell,
  FileText,
  Gauge,
  Gift,
  GitBranch,
  Grid,
  Hammer,
  HeartHandshake,
  Hospital,
  Images,
  LandPlot,
  LayoutGrid,
  LayoutPanelTop,
  Layers,
  Leaf,
  Map,
  MapPin,
  Megaphone,
  MessageCircle,
  MousePointerClick,
  Music,
  Navigation,
  PanelBottom,
  PartyPopper,
  Phone,
  PhoneCall,
  Play,
  Plug,
  Quote,
  Radio,
  Rocket,
  Rows,
  School,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  SquareStack,
  Star,
  Store,
  Sun,
  Waves,
  Table2,
  PanelsTopLeft,
  Timer,
  TrainFront,
  Trophy,
  Type,
  UtensilsCrossed,
  Video,
  Wallet,
  Webhook,
  Wifi,
  Wind,
  Clapperboard,
  Box,
} from "lucide-react";
import type { DomainRow, FormTemplateData, LandingPageData, PropertyData, SectionInstance, SectionStyle } from "./types";
import { buildTemplateSections } from "./page-templates";
export { buildTemplateSections };
export { PAGE_TEMPLATES as TEMPLATES, BLANK_TEMPLATE } from "./page-templates";

export const BRAND = {
  name: "Prestate Builder",
  tagline: "High-converting real estate landing pages, in minutes.",
  primary: "#6D5DFC",
  secondary: "#CDA45E",
  accent: "#CDA45E",
  email: "support@prestate.io",
  phone: "+91 98765 43210",
};

export function uid(prefix = "sec"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const defaultStyle = (over?: Partial<SectionStyle>): SectionStyle => ({
  colors: { bg: "#ffffff", overlay: "", gradient: "", text: "#111827" },
  typography: { fontFamily: "Inter", fontSize: 16, fontWeight: 400, lineHeight: 1.6, letterSpacing: 0 },
  spacing: { padding: { top: 72, right: 24, bottom: 72, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 24 },
  layout: { width: "full", height: "auto", align: "center", direction: "row", wrap: true, justify: "center", alignItems: "center" },
  responsive: {},
  ...over,
});

// ---------------------------------------------------------------------------
// Widget Library
// ---------------------------------------------------------------------------

export interface WidgetDef {
  id: string;
  label: string;
  category: "Layout" | "Property" | "Trust" | "Location" | "Conversion" | "Media" | "Marketing";
  group: string;
  icon: LucideIcon;
  desc: string;
  make: () => SectionInstance;
}

const sec = (
  type: string,
  label: string,
  icon: string,
  settings: Record<string, unknown>,
  style?: Partial<SectionStyle>,
  id?: string,
): SectionInstance => ({
  id: id ?? uid(),
  type,
  label,
  icon,
  settings,
  style: defaultStyle(style),
});

export const WIDGETS: WidgetDef[] = [
  // LAYOUT
  { id: "section", label: "Section", category: "Layout", group: "Layout", icon: SquareStack, desc: "Blank content section", make: () => sec("section", "Section", "SquareStack", { title: "Section Title", text: "Add your content here.", layout: "full" }) },
  { id: "container", label: "Container", category: "Layout", group: "Layout", icon: Box, desc: "Boxed content wrapper", make: () => sec("container", "Container", "Box", { width: "1200px", align: "center" }) },
  { id: "grid", label: "Grid", category: "Layout", group: "Layout", icon: LayoutGrid, desc: "Multi-column grid", make: () => sec("grid", "Grid", "LayoutGrid", { columns: 3, gap: 20 }, { spacing: { padding: { top: 40, right: 24, bottom: 40, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 20 } }) },
  { id: "row", label: "Row", category: "Layout", group: "Layout", icon: Rows, desc: "Horizontal flex row", make: () => sec("row", "Row", "Rows", { gap: 12 }, { spacing: { padding: { top: 16, right: 24, bottom: 16, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 12 } }) },
  { id: "column", label: "Column", category: "Layout", group: "Layout", icon: Columns, desc: "Vertical stack", make: () => sec("column", "Column", "Columns", { width: "50%" }) },
  { id: "tabs", label: "Tabs", category: "Layout", group: "Layout", icon: PanelsTopLeft, desc: "Tabbed content", make: () => sec("tabs", "Tabs", "PanelsTopLeft", { tabs: ["Overview", "Details", "Pricing"] }) },
  { id: "accordion", label: "Accordion", category: "Layout", group: "Layout", icon: Layers, desc: "Collapsible list", make: () => sec("accordion", "Accordion", "Layers", { items: [{ title: "Item 1", body: "Content" }] }) },
  { id: "carousel", label: "Carousel", category: "Layout", group: "Layout", icon: Images, desc: "Auto-rotating slides", make: () => sec("carousel", "Carousel", "Images", { slides: 3 }) },
  { id: "slider", label: "Slider", category: "Layout", group: "Layout", icon: SlidersHorizontal, desc: "Content slider", make: () => sec("slider", "Slider", "SlidersHorizontal", { slides: 3 }) },

  // PROPERTY
  { id: "hero", label: "Hero Banner", category: "Property", group: "Property Widgets", icon: LayoutPanelTop, desc: "Full-width hero with CTAs", make: () => sec("hero", "Hero Banner", "LayoutPanelTop", { eyebrow: "RERA Approved", heading: "Your New Headline", subheading: "Your subheadline", price: "Starting From", ctaPrimary: "Book Site Visit", ctaSecondary: "Download Brochure" }, { colors: { bg: "#111827", overlay: "rgba(17,24,39,0.45)", text: "#ffffff" }, layout: { width: "full", height: "vh", fixedHeight: 720, align: "left", direction: "column", justify: "center", alignItems: "flex-start" } }) },
  { id: "overview", label: "Property Overview", category: "Property", group: "Property Widgets", icon: Building2, desc: "Project intro with stats", make: () => sec("overview", "Property Overview", "Building2", { eyebrow: "About the Project", heading: "Project Overview", text: "Describe your project here.", bullets: [], stats: [] }) },
  { id: "highlights", label: "Property Highlights", category: "Property", group: "Property Widgets", icon: Award, desc: "Key selling points strip", make: () => sec("highlights", "Property Highlights", "Award", { items: [] }) },
  { id: "amenities", label: "Amenities", category: "Property", group: "Property Widgets", icon: Dumbbell, desc: "Amenity grid", make: () => sec("amenities", "Amenities", "Dumbbell", { items: [] }) },
  { id: "gallery", label: "Property Gallery", category: "Property", group: "Property Widgets", icon: Images, desc: "Image masonry", make: () => sec("gallery", "Property Gallery", "Images", { images: [], columns: 3 }) },
  { id: "video-gallery", label: "Video Gallery", category: "Property", group: "Property Widgets", icon: Video, desc: "Collection of videos", make: () => sec("video-gallery", "Video Gallery", "Video", { videos: [] }) },
  { id: "floorplans", label: "Floor Plans", category: "Property", group: "Property Widgets", icon: Grid, desc: "Plan selector", make: () => sec("floorplans", "Floor Plans", "Grid", { plans: [] }) },
  { id: "master-plan", label: "Master Plan", category: "Property", group: "Property Widgets", icon: Map, desc: "Campus master plan", make: () => sec("master-plan", "Master Plan", "Map", { image: "", text: "" }) },
  { id: "pricing", label: "Pricing Table", category: "Property", group: "Property Widgets", icon: Wallet, desc: "Configurations & price", make: () => sec("pricing", "Pricing Table", "Wallet", { plans: [] }) },
  { id: "features", label: "Property Features", category: "Property", group: "Property Widgets", icon: BadgeCheck, desc: "Feature checklist", make: () => sec("features", "Property Features", "BadgeCheck", { items: [] }) },
  { id: "specifications", label: "Property Specifications", category: "Property", group: "Property Widgets", icon: Gauge, desc: "Technical specs table", make: () => sec("specifications", "Property Specifications", "Gauge", { rows: [] }) },
  { id: "timeline", label: "Property Timeline", category: "Property", group: "Property Widgets", icon: CalendarClock, desc: "Project milestones", make: () => sec("timeline", "Property Timeline", "CalendarClock", { items: [] }) },
  { id: "construction", label: "Construction Updates", category: "Property", group: "Property Widgets", icon: Hammer, desc: "Progress updates", make: () => sec("construction", "Construction Updates", "Hammer", { items: [] }) },

  // TRUST
  { id: "testimonials", label: "Testimonials", category: "Trust", group: "Trust & Content", icon: Quote, desc: "Customer reviews", make: () => sec("testimonials", "Testimonials", "Quote", { items: [] }) },
  { id: "faq", label: "FAQ", category: "Trust", group: "Trust & Content", icon: PanelsTopLeft, desc: "Questions & answers", make: () => sec("faq", "FAQ", "Tabs", { items: [] }) },
  { id: "downloads", label: "Downloads", category: "Trust", group: "Trust & Content", icon: Download, desc: "Document downloads", make: () => sec("downloads", "Downloads", "Download", { files: [] }) },
  { id: "brochure", label: "Brochure Download", category: "Trust", group: "Trust & Content", icon: FileText, desc: "Brochure CTA", make: () => sec("brochure", "Brochure Download", "FileText", { title: "Download Brochure", file: "" }) },
  { id: "builder-profile", label: "Builder Profile", category: "Trust", group: "Trust & Content", icon: Building2, desc: "Builder credibility", make: () => sec("builder-profile", "Builder Profile", "Building2", { name: "Builder Name", text: "" }) },
  { id: "agent-profile", label: "Agent Profile", category: "Trust", group: "Trust & Content", icon: Star, desc: "Agent card", make: () => sec("agent-profile", "Agent Profile", "Star", { name: "Agent Name", role: "Senior Consultant", phone: "" }) },
  { id: "contact", label: "Contact Details", category: "Trust", group: "Trust & Content", icon: Phone, desc: "Contact information", make: () => sec("contact", "Contact Details", "Phone", { phone: "+91 90000 00000", email: "sales@builder.com", address: "Bangalore" }) },

  // LOCATION
  { id: "map", label: "Google Map", category: "Location", group: "Location", icon: MapPin, desc: "Embedded map", make: () => sec("map", "Google Map", "MapPin", { address: "", zoom: 14 }) },
  { id: "location-advantages", label: "Location Advantages", category: "Location", group: "Location", icon: Navigation, desc: "Connectivity points", make: () => sec("location-advantages", "Location Advantages", "Navigation", { items: [] }) },
  { id: "nearby", label: "Nearby Places", category: "Location", group: "Location", icon: Map, desc: "Nearby landmarks", make: () => sec("nearby", "Nearby Places", "Map", { items: [] }) },

  // CONVERSION
  { id: "lead-form", label: "Lead Form", category: "Conversion", group: "Conversion", icon: Send, desc: "Single-step form", make: () => sec("lead-form", "Lead Form", "Send", { heading: "Request a Callback", fields: ["name", "phone"], button: "Submit" }) },
  { id: "multistep-form", label: "Multi Step Form", category: "Conversion", group: "Conversion", icon: Table2, desc: "Step-by-step form", make: () => sec("multistep-form", "Multi Step Form", "Table2", { heading: "Book a Site Visit", steps: 3, button: "Book My Visit" }) },
  { id: "whatsapp-form", label: "WhatsApp Form", category: "Conversion", group: "Conversion", icon: MessageCircle, desc: "WhatsApp lead form", make: () => sec("whatsapp-form", "WhatsApp Form", "MessageCircle", { heading: "Chat on WhatsApp", number: "+91 90000 00000" }) },
  { id: "cta-banner", label: "CTA Banner", category: "Conversion", group: "Conversion", icon: MousePointerClick, desc: "Conversion banner", make: () => sec("cta-banner", "CTA Banner", "MousePointerClick", { heading: "Ready to Start?", cta: "Book Now" }) },
  { id: "sticky-cta", label: "Sticky CTA", category: "Conversion", group: "Conversion", icon: Compass, desc: "Always-visible CTA", make: () => sec("sticky-cta", "Sticky CTA", "Compass", { text: "", ctaLabel: "Book Now" }) },
  { id: "popup-cta", label: "Popup CTA", category: "Conversion", group: "Conversion", icon: Gift, desc: "Triggered popup", make: () => sec("popup-cta", "Popup CTA", "Gift", { heading: "Limited Offer", cta: "Claim Offer" }) },

  // MEDIA
  { id: "virtual-tour", label: "Virtual Tour", category: "Media", group: "Media", icon: Play, desc: "360° tour embed", make: () => sec("virtual-tour", "Virtual Tour", "Play", { title: "Virtual Tour", url: "" }) },
  { id: "youtube", label: "YouTube Video", category: "Media", group: "Media", icon: Clapperboard, desc: "Video embed", make: () => sec("youtube", "YouTube Video", "Clapperboard", { title: "Project Video", url: "", thumbnail: "" }) },

  // MARKETING
  { id: "announcement", label: "Announcement Bar", category: "Marketing", group: "Marketing", icon: Megaphone, desc: "Top promo strip", make: () => sec("announcement", "Announcement Bar", "Megaphone", { text: "Limited time offer", linkLabel: "Learn more", link: "#" }, { colors: { bg: "#111827", text: "#ffffff" }, spacing: { padding: { top: 10, right: 24, bottom: 10, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }) },
  { id: "countdown", label: "Countdown Timer", category: "Marketing", group: "Marketing", icon: Timer, desc: "Launch countdown", make: () => sec("countdown", "Countdown Timer", "Timer", { date: "2026-12-31", heading: "Launching Soon" }) },
  { id: "offer-banner", label: "Offer Banner", category: "Marketing", group: "Marketing", icon: Gift, desc: "Special offer", make: () => sec("offer-banner", "Offer Banner", "Gift", { text: "5% Launch Discount", cta: "Claim Now" }) },
  { id: "popup", label: "Popup", category: "Marketing", group: "Marketing", icon: PartyPopper, desc: "Modal promotion", make: () => sec("popup", "Popup", "PartyPopper", { heading: "Get Brochure", cta: "Download" }) },
  { id: "sticky-footer-bar", label: "Sticky Footer Bar", category: "Marketing", group: "Marketing", icon: PanelBottom, desc: "Bottom bar", make: () => sec("sticky-footer-bar", "Sticky Footer Bar", "PanelBottom", { text: "", ctaLabel: "Enquire Now" }) },
];

export const WIDGET_CATEGORY_META: { key: WidgetDef["category"]; label: string }[] = [
  { key: "Layout", label: "Layout" },
  { key: "Property", label: "Real Estate Widgets" },
  { key: "Trust", label: "Trust & Content" },
  { key: "Location", label: "Location" },
  { key: "Conversion", label: "Conversion" },
  { key: "Media", label: "Media" },
  { key: "Marketing", label: "Marketing" },
];

// ---------------------------------------------------------------------------
// Mock Property
// ---------------------------------------------------------------------------

export const PROPERTY: PropertyData = {
  id: "aurora-residences",
  name: "Aurora Residences",
  builder: "Prestige Estates Group",
  type: "Luxury Apartments",
  status: "Under Construction",
  description:
    "Aurora Residences is a premium address on Sarjapur Road — two sculpted towers rising over a 2.5-acre landscaped campus. Every residence is designed around light, space and privacy, with resort-grade amenities across four levels and direct metro connectivity.",
  startingPrice: "₹1.25 Cr",
  carpetArea: "1,650 – 2,450 sq.ft",
  reraNumber: "PRM/KA/RERA/1251/446/PR/210812/004231",
  location: "Sarjapur Road, Bangalore",
  possession: "Dec 2027",
  amenities: [
    "Infinity Pool",
    "Sky Lounge",
    "Gymnasium",
    "Yoga Deck",
    "Clubhouse",
    "Kids Play Area",
    "Jogging Track",
    "Theatre Room",
    "Co-working Lounge",
    "Spa & Steam",
    "Pet Park",
    "Squash Court",
    "Cricket Net",
    "Café",
    "Landscaped Gardens",
    "Visitor Lounge",
    "EV Charging",
    "24×7 Security",
    "Smart Home",
    "Gated Access",
    "Party Hall",
    "Multipurpose Court",
    "Reading Lounge",
    "Reflexology Path",
    "Tennis Court",
    "Mini Golf",
  ],
  features: [
    "4-level amenity podium",
    "Sky bridge connecting towers",
    "3 & 4 BHK residences up to 2,450 sq.ft",
    "Dual-height lobby with concierge",
    "Vastu-compliant layouts",
    "Smart home automation",
    "Double-glazed windows",
    "Air-conditioned clubhouse",
  ],
  gallery: ["skyline", "lobby", "pool", "tower", "garden", "interior"],
  videos: [
    { title: "Project Walkthrough", url: "youtube" },
    { title: "Clubhouse Tour", url: "youtube" },
  ],
  floorPlans: [
    { name: "3 BHK", beds: "3", area: "1,650 sq.ft", image: "plan3", price: "₹1.25 Cr" },
    { name: "3 BHK + Study", beds: "3", area: "1,950 sq.ft", image: "plan3s", price: "₹1.55 Cr" },
    { name: "4 BHK", beds: "4", area: "2,450 sq.ft", image: "plan4", price: "₹1.95 Cr" },
    { name: "Penthouse", beds: "4", area: "3,100 sq.ft", image: "planph", price: "₹3.20 Cr" },
  ],
  brochureUrl: "/brochure/aurora.pdf",
  mapUrl: "https://maps.google.com/maps?q=Sarjapur+Road+Bangalore",
  towers: "2",
  landArea: "2.5 Acres",
  metro: "500 m",
  units: "312",
};

export const DYNAMIC_VARS = [
  { token: "{{property_name}}", value: "Aurora Residences" },
  { token: "{{builder_name}}", value: "Prestige Estates Group" },
  { token: "{{starting_price}}", value: "₹1.25 Cr" },
  { token: "{{location}}", value: "Sarjapur Road, Bangalore" },
  { token: "{{rera_number}}", value: "PRM/KA/RERA/1251/446" },
  { token: "{{possession_date}}", value: "Dec 2027" },
  { token: "{{carpet_area}}", value: "1,650 – 2,450 sq.ft" },
  { token: "{{property_type}}", value: "Luxury Apartments" },
];

// ---------------------------------------------------------------------------
// Default landing page sections
// ---------------------------------------------------------------------------

export function defaultPageSections(): SectionInstance[] {
  return buildTemplateSections("tpl-luxury");
}

// ---------------------------------------------------------------------------
// Landing pages, templates, forms, domains
// ---------------------------------------------------------------------------

export const PAGES: LandingPageData[] = [
  {
    id: "p1",
    name: "Luxury Apartments — Aurora Residences",
    slug: "aurora-residences",
    status: "published",
    template: "Luxury Apartments",
    domain: "auroraresidences.com",
    views: "48.2K",
    conversions: "12.4%",
    updated: "2 min ago",
    thumbnail: "hero",
    sections: [],
    kind: "preset",
    designId: "tpl-luxury",
  },
  {
    id: "p2",
    name: "Villa Estates — Palm Grove",
    slug: "palm-grove-villas",
    status: "draft",
    template: "Villa Estates",
    domain: "palmgrovevillas.com",
    views: "—",
    conversions: "—",
    updated: "1 hr ago",
    thumbnail: "villa",
    sections: [],
    kind: "preset",
    designId: "tpl-villas",
  },
  {
    id: "p3",
    name: "Commercial Park — Aether",
    slug: "aether-business-park",
    status: "published",
    template: "Commercial Park",
    domain: "aetherpark.com",
    views: "21.7K",
    conversions: "9.8%",
    updated: "3 hrs ago",
    thumbnail: "commercial",
    sections: [],
    kind: "preset",
    designId: "tpl-commercial",
  },
  {
    id: "p4",
    name: "New Launch — Northstar",
    slug: "northstar-founders",
    status: "unpublished",
    template: "New Launch",
    domain: "northstarlaunch.com",
    views: "1.2K",
    conversions: "—",
    updated: "Yesterday",
    thumbnail: "tour",
    sections: [],
    kind: "preset",
    designId: "tpl-launch",
  },
];

export const FORM_TEMPLATES: FormTemplateData[] = [
  { id: "f1", name: "Contact Form", icon: "Send", steps: 1, fields: 4, description: "Name, email, phone & message" },
  { id: "f2", name: "Book Site Visit", icon: "CalendarClock", steps: 3, fields: 6, description: "Multi-step tour booking" },
  { id: "f3", name: "Download Brochure", icon: "Download", steps: 1, fields: 3, description: "Lead magnet gate" },
  { id: "f4", name: "Price Enquiry", icon: "Wallet", steps: 1, fields: 5, description: "Budget & configuration" },
  { id: "f5", name: "Callback Request", icon: "PhoneCall", steps: 1, fields: 3, description: "Best time to call" },
];

export const DOMAINS: DomainRow[] = [
  { id: "d1", domain: "luxury.clientdomain.com", favicon: "#6D5DFC", plan: "Custom", created: "Jan 2026", pages: 4, ssl: "Auto", status: "live", expiry: "Renews Jan 2027" },
  { id: "d2", domain: "builder.clientdomain.com", favicon: "#0F766E", plan: "Custom", created: "Feb 2026", pages: 2, ssl: "Auto", status: "draft", expiry: "Renews Feb 2027" },
  { id: "d3", domain: "launch.clientdomain.com", favicon: "#B45309", plan: "Standard", created: "Mar 2026", pages: 1, ssl: "Auto", status: "pending", expiry: "—" },
  { id: "d4", domain: "rentals.clientdomain.com", favicon: "#2563EB", plan: "Custom", created: "Apr 2026", pages: 3, ssl: "Pending", status: "unpublished", expiry: "Renews Apr 2027" },
  { id: "d5", domain: "rohan.clientdomain.com", favicon: "#059669", plan: "Custom", created: "May 2026", pages: 2, ssl: "Auto", status: "live", expiry: "Renews May 2027" },
  { id: "d6", domain: "expo.clientdomain.com", favicon: "#DB2777", plan: "Standard", created: "Jun 2026", pages: 1, ssl: "Auto", status: "password", expiry: "Renews Jun 2027" },
];

// helper to map icon slug → lucide component for canvas
export const SLUG_ICONS: Record<string, LucideIcon> = {
  SwimmingPool: Waves,
  ShieldCheck,
  Building2,
  LandPlot,
  TrainFront,
  Dumbbell,
  Music,
  Leaf,
  Trophy,
  Sun,
  BookOpen,
  Car,
  School,
  Store,
  Hospital,
  HeartHandshake,
  Play,
  Clapperboard,
  MapPin,
  Phone,
  Send,
  Star,
  Quote,
  Timer,
  Gift,
  Megaphone,
  Compass,
  PartyPopper,
  PanelBottom,
  Navigation,
  MousePointerClick,
  Sparkles,
  Crown,
  ConciergeBell,
  UtensilsCrossed,
  Wind,
  Wifi,
  Bath,
  BedDouble,
  Grid,
  Layers,
  FileText,
  Download,
  Map,
  Hammer,
  CalendarClock,
  Gauge,
  BadgeCheck,
  Wallet,
  Award,
  Images,
  Video,
  Table2,
  PanelsTopLeft,
  SlidersHorizontal,
  LayoutGrid,
  SquareStack,
  Box,
  Rows,
  Columns,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Webhook,
  Plug,
  Radio,
  GitBranch,
  PhoneCall,
  MessageCircle,
  Type,
  Rocket,
};

// Dynamic variable resolvers for the live canvas preview
export function resolveVars(text: unknown): string {
  if (typeof text !== "string") return "";
  return text
    .replaceAll("{{property_name}}", PROPERTY.name)
    .replaceAll("{{builder_name}}", PROPERTY.builder)
    .replaceAll("{{starting_price}}", PROPERTY.startingPrice)
    .replaceAll("{{location}}", PROPERTY.location)
    .replaceAll("{{rera_number}}", PROPERTY.reraNumber)
    .replaceAll("{{possession_date}}", PROPERTY.possession)
    .replaceAll("{{carpet_area}}", PROPERTY.carpetArea)
    .replaceAll("{{property_type}}", PROPERTY.type);
}

export function cx(...parts: unknown[]): string {
  return parts.filter(Boolean).join(" ");
}