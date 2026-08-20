import type { LucideIcon } from "lucide-react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Award,
  Code2,
  Minus,
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
  category: "Layout" | "Basic" | "Real Estate" | "Media" | "Forms" | "Marketing" | "Header & Footer" | "SEO" | "Advanced";
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

// Structural layout helpers — containers/rows/columns are built as nested trees.
const col = (width: number): SectionInstance =>
  sec(
    "column",
    "Column",
    "Columns",
    { width },
    { spacing: { padding: { top: 24, right: 16, bottom: 24, left: 16 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 24 } },
  );
const rowWith = (widths: number[]): SectionInstance => ({
  ...sec("row", "Row", "Rows", { gap: 24 }, { spacing: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 24 } }),
  children: widths.map(col),
});
const containerWith = (children: SectionInstance[]): SectionInstance => ({
  ...sec("container", "Container", "Box", { width: "1200px", align: "center" }),
  children,
});

export const WIDGETS: WidgetDef[] = [
  // LAYOUT
  { id: "section", label: "Section", category: "Layout", group: "Layout", icon: SquareStack, desc: "Blank content section", make: () => sec("section", "Section", "SquareStack", { title: "Section Title", text: "Add your content here.", layout: "full" }) },
  { id: "container", label: "Container", category: "Layout", group: "Layout", icon: Box, desc: "Nestable layout wrapper", make: () => containerWith([rowWith([50, 50])]) },
  { id: "grid", label: "Grid", category: "Layout", group: "Layout", icon: LayoutGrid, desc: "Multi-column grid", make: () => ({ ...sec("grid", "Grid", "LayoutGrid", { columns: 3, gap: 20 }, { spacing: { padding: { top: 40, right: 24, bottom: 40, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 20 } }), children: [col(100), col(100), col(100)] }) },
  { id: "row", label: "Row", category: "Layout", group: "Layout", icon: Rows, desc: "Horizontal flex row of columns", make: () => rowWith([50, 50]) },
  { id: "column", label: "Column", category: "Layout", group: "Layout", icon: Columns, desc: "Vertical stack inside a row", make: () => col(100) },
  { id: "tabs", label: "Tabs", category: "Layout", group: "Layout", icon: PanelsTopLeft, desc: "Tabbed content", make: () => sec("tabs", "Tabs", "PanelsTopLeft", { tabs: ["Overview", "Details", "Pricing"] }) },
  { id: "accordion", label: "Accordion", category: "Layout", group: "Layout", icon: Layers, desc: "Collapsible list", make: () => sec("accordion", "Accordion", "Layers", { items: [{ title: "Item 1", body: "Content" }] }) },
  { id: "carousel", label: "Carousel", category: "Layout", group: "Layout", icon: Images, desc: "Auto-rotating slides", make: () => sec("carousel", "Carousel", "Images", { slides: 3 }) },
  { id: "slider", label: "Slider", category: "Layout", group: "Layout", icon: SlidersHorizontal, desc: "Content slider", make: () => sec("slider", "Slider", "SlidersHorizontal", { slides: 3 }) },
  { id: "spacer", label: "Spacer", category: "Layout", group: "Layout", icon: Rows, desc: "Vertical whitespace", make: () => sec("spacer", "Spacer", "Rows", { height: 80 }, { spacing: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }) },
  { id: "divider", label: "Divider", category: "Layout", group: "Layout", icon: Minus, desc: "Horizontal separator line", make: () => sec("divider", "Divider", "Minus", { color: "#e8eaf1", thickness: 1, width: "100%" }, { spacing: { padding: { top: 24, right: 24, bottom: 24, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }) },

  // BASIC
  { id: "heading", label: "Heading", category: "Basic", group: "Basic", icon: Type, desc: "Section title text", make: () => sec("heading", "Heading", "Type", { text: "Add Your Headline", tag: "h2", size: 34, align: "center" }) },
  { id: "text", label: "Text Editor", category: "Basic", group: "Basic", icon: AlignLeft, desc: "Paragraph content", make: () => sec("text", "Text Editor", "AlignLeft", { text: "Add your text content here." }) },
  { id: "button", label: "Button", category: "Basic", group: "Basic", icon: MousePointerClick, desc: "CTA button", make: () => sec("button", "Button", "MousePointerClick", { text: "Click Here", link: "#", style: "solid" }) },
  { id: "image", label: "Image", category: "Basic", group: "Basic", icon: Images, desc: "Single image", make: () => sec("image", "Image", "Images", { src: "", alt: "Image", radius: 12 }) },
  { id: "icon", label: "Icon", category: "Basic", group: "Basic", icon: Sparkles, desc: "Standalone icon", make: () => sec("icon", "Icon", "Sparkles", { name: "Sparkles", size: 48, color: "#6D5DFC" }) },
  { id: "icon-box", label: "Icon Box", category: "Basic", group: "Basic", icon: Sparkles, desc: "Icon with title & text", make: () => sec("icon-box", "Icon Box", "Sparkles", { icon: "Dumbbell", title: "Feature Title", text: "Short description" }) },
  { id: "map", label: "Google Map", category: "Basic", group: "Basic", icon: MapPin, desc: "Embedded map", make: () => sec("map", "Google Map", "MapPin", { address: "Sarjapur Road, Bangalore", zoom: 14, eyebrow: "Find us", heading: "On the map", text: "Visit the site at a time that suits you.", items: [{ icon: "MapPin", title: "Site", meta: "Sarjapur Road" }, { icon: "TrainFront", title: "Metro", meta: "5 min" }] }) },
  { id: "contact", label: "Contact Details", category: "Basic", group: "Basic", icon: Phone, desc: "Contact information", make: () => sec("contact", "Contact Details", "Phone", { heading: "Get in Touch", phone: "+91 90000 00000", email: "sales@builder.com", address: "Bangalore" }) },

  // REAL ESTATE
  { id: "hero", label: "Hero Banner", category: "Real Estate", group: "Real Estate", icon: LayoutPanelTop, desc: "Full-width hero with CTAs", make: () => sec("hero", "Hero Banner", "LayoutPanelTop", { eyebrow: "RERA Approved", heading: "Your New Headline", subheading: "Your subheadline", price: "{{starting_price}}", priceLabel: "STARTING FROM", ctaPrimary: "Book Site Visit", ctaSecondary: "Download Brochure", highlights: ["RERA Approved", "Metro connected", "Ready amenities"], heroStats: [{ value: "2.5 Ac", label: "Campus" }, { value: "2", label: "Towers" }, { value: "1650+", label: "Sq.ft" }, { value: "Dec 2027", label: "Possession" }] }, { colors: { bg: "#111827", overlay: "rgba(17,24,39,0.45)", text: "#ffffff" }, layout: { width: "full", height: "vh", fixedHeight: 720, align: "left", direction: "column", justify: "center", alignItems: "flex-start" } }) },
  { id: "overview", label: "Property Overview", category: "Real Estate", group: "Real Estate", icon: Building2, desc: "Project intro with stats", make: () => sec("overview", "Property Overview", "Building2", { eyebrow: "About the Project", heading: "Project Overview", text: "Describe your project here.", image: "lobby", bullets: ["Prime location", "Clubhouse & amenities", "RERA registered"], stats: [{ value: "2.5 Ac", label: "Land" }, { value: "450+", label: "Homes" }, { value: "70%", label: "Open" }] }) },
  { id: "highlights", label: "Property Highlights", category: "Real Estate", group: "Real Estate", icon: Award, desc: "Key selling points strip", make: () => sec("highlights", "Property Highlights", "Award", { items: [{ icon: "Sparkles", value: "RERA", label: "Approved" }, { icon: "TrainFront", value: "5 min", label: "To Metro" }, { icon: "Dumbbell", value: "40+", label: "Amenities" }, { icon: "Leaf", value: "70%", label: "Open space" }] }) },
  { id: "amenities", label: "Amenities", category: "Real Estate", group: "Real Estate", icon: Dumbbell, desc: "Amenity grid", make: () => sec("amenities", "Amenities", "Dumbbell", { eyebrow: "Lifestyle", heading: "Amenities", items: [{ icon: "Dumbbell", title: "Gymnasium", desc: "Fully equipped" }, { icon: "SwimmingPool", title: "Pool", desc: "Temperature controlled" }, { icon: "Leaf", title: "Garden", desc: "Landscaped lawns" }, { icon: "Car", title: "Parking", desc: "Covered slots" }] }) },
  { id: "gallery", label: "Property Gallery", category: "Real Estate", group: "Real Estate", icon: Images, desc: "Image masonry", make: () => sec("gallery", "Property Gallery", "Images", { eyebrow: "Gallery", heading: "Project Gallery", text: "A look inside the development.", images: ["1", "2", "3", "4", "5", "6"], columns: 3 }) },
  { id: "video-gallery", label: "Video Gallery", category: "Real Estate", group: "Real Estate", icon: Video, desc: "Collection of videos", make: () => sec("video-gallery", "Video Gallery", "Video", { heading: "Video Gallery", videos: [{ title: "Walkthrough" }, { title: "Amenities tour" }] }) },
  { id: "floorplans", label: "Floor Plans", category: "Real Estate", group: "Real Estate", icon: Grid, desc: "Plan selector", make: () => sec("floorplans", "Floor Plans", "Grid", { eyebrow: "Layouts", heading: "Floor Plans", text: "Choose a configuration.", plans: [{ name: "3 BHK", beds: "3", area: "1,650 sq.ft", price: "₹1.25 Cr" }, { name: "4 BHK", beds: "4", area: "2,450 sq.ft", price: "₹1.95 Cr" }] }) },
  { id: "master-plan", label: "Master Plan", category: "Real Estate", group: "Real Estate", icon: Map, desc: "Campus master plan", make: () => sec("master-plan", "Master Plan", "Map", { heading: "Master Plan", image: "", text: "Towers, clubhouse and landscape across the campus." }) },
  { id: "pricing", label: "Pricing Table", category: "Real Estate", group: "Real Estate", icon: Wallet, desc: "Configurations & price", make: () => sec("pricing", "Pricing Table", "Wallet", { eyebrow: "Investment", heading: "Pricing", text: "Transparent configurations.", plans: [{ name: "3 BHK", area: "1,650 sq.ft", price: "₹1.25 Cr", per: "onwards", features: ["2 baths", "2 parkings", "Club access"], cta: "Enquire", featured: false }, { name: "4 BHK", area: "2,450 sq.ft", price: "₹1.95 Cr", per: "onwards", features: ["3 baths", "2 parkings", "Corner unit"], cta: "Enquire", featured: true }] }) },
  { id: "features", label: "Property Features", category: "Real Estate", group: "Real Estate", icon: BadgeCheck, desc: "Feature checklist", make: () => sec("features", "Property Features", "BadgeCheck", { heading: "Property Features", items: [{ title: "Vastu compliant", text: "All units" }, { title: "VRV air-conditioning", text: "Premium finishes" }, { title: "Italian marble", text: "Living & foyer" }] }) },
  { id: "specifications", label: "Property Specifications", category: "Real Estate", group: "Real Estate", icon: Gauge, desc: "Technical specs table", make: () => sec("specifications", "Property Specifications", "Gauge", { heading: "Specifications", rows: [{ label: "Structure", value: "RCC framed" }, { label: "Flooring", value: "Vitrified tiles" }, { label: "Kitchen", value: "Modular" }] }) },
  { id: "timeline", label: "Property Timeline", category: "Real Estate", group: "Real Estate", icon: CalendarClock, desc: "Project milestones", make: () => sec("timeline", "Property Timeline", "CalendarClock", { heading: "Project Timeline", items: [{ title: "Launch", text: "Q1 2025" }, { title: "Structure", text: "Q4 2026" }, { title: "Possession", text: "{{possession_date}}" }] }) },
  { id: "construction", label: "Construction Updates", category: "Real Estate", group: "Real Estate", icon: Hammer, desc: "Progress updates", make: () => sec("construction", "Construction Updates", "Hammer", { heading: "Construction Updates", items: [{ title: "April 2026", text: "Tower A — 12th slab completed" }, { title: "March 2026", text: "Clubhouse finishing underway" }] }) },
  { id: "property-details", label: "Property Details", category: "Real Estate", group: "Real Estate", icon: Gauge, desc: "RERA, possession & specs grid", make: () => sec("property-details", "Property Details", "Gauge", { items: [{ label: "RERA", value: "{{rera_number}}" }, { label: "Possession", value: "{{possession_date}}" }, { label: "Carpet Area", value: "{{carpet_area}}" }] }) },
  { id: "unit-types", label: "Unit Types", category: "Real Estate", group: "Real Estate", icon: Grid, desc: "Configuration cards", make: () => sec("unit-types", "Unit Types", "Grid", { items: [{ name: "3 BHK", beds: "3", area: "1,650 sq.ft", price: "₹1.25 Cr" }, { name: "4 BHK", beds: "4", area: "2,450 sq.ft", price: "₹1.95 Cr" }] }) },
  { id: "payment-plans", label: "Payment Plans", category: "Real Estate", group: "Real Estate", icon: Wallet, desc: "Payment schedule", make: () => sec("payment-plans", "Payment Plans", "Wallet", { heading: "Payment Plans", items: [{ plan: "Booking Amount", amount: "10%", details: "On booking" }, { plan: "Construction Linked", amount: "70%", details: "Till handover" }, { plan: "On Possession", amount: "20%", details: "At registration" }] }) },
  { id: "location-advantages", label: "Location Advantages", category: "Real Estate", group: "Real Estate", icon: Navigation, desc: "Connectivity points", make: () => sec("location-advantages", "Location Advantages", "Navigation", { eyebrow: "Connectivity", heading: "Location Advantages", text: "Minutes from work, school and transit.", items: [{ icon: "TrainFront", title: "Metro", meta: "5 min" }, { icon: "School", title: "Schools", meta: "2 km" }, { icon: "Hospital", title: "Hospital", meta: "3 km" }, { icon: "Store", title: "Mall", meta: "4 km" }] }) },
  { id: "nearby", label: "Nearby Places", category: "Real Estate", group: "Real Estate", icon: Map, desc: "Nearby landmarks", make: () => sec("nearby", "Nearby Places", "Map", { heading: "Nearby Places", items: [{ title: "IT Park", text: "8 min" }, { title: "Airport", text: "40 min" }, { title: "ORR", text: "12 min" }] }) },
  { id: "builder-profile", label: "Builder Profile", category: "Real Estate", group: "Real Estate", icon: Building2, desc: "Builder credibility", make: () => sec("builder-profile", "Builder Profile", "Building2", { heading: "About the Builder", name: "{{builder_name}}", text: "Delivering landmark communities across the city." }) },
  { id: "brochure", label: "Brochure Download", category: "Real Estate", group: "Real Estate", icon: FileText, desc: "Brochure CTA", make: () => sec("brochure", "Brochure Download", "FileText", { heading: "Download Brochure", title: "Download Brochure", file: "", text: "Get the full project kit — plans, specs and pricing." }) },
  { id: "downloads", label: "Downloads", category: "Real Estate", group: "Real Estate", icon: Download, desc: "Document downloads", make: () => sec("downloads", "Downloads", "Download", { heading: "Downloads", files: [{ name: "Brochure.pdf" }, { name: "Floor plans.pdf" }] }) },
  { id: "testimonials", label: "Testimonials", category: "Real Estate", group: "Real Estate", icon: Quote, desc: "Customer reviews", make: () => sec("testimonials", "Testimonials", "Quote", { eyebrow: "Reviews", heading: "What buyers say", items: [{ name: "Anita Rao", role: "Homeowner", quote: "The team was transparent from day one.", rating: 5 }, { name: "Vikram Shah", role: "Investor", quote: "Best launch we booked this year.", rating: 5 }] }) },
  { id: "faq", label: "FAQ", category: "Real Estate", group: "Real Estate", icon: PanelsTopLeft, desc: "Questions & answers", make: () => sec("faq", "FAQ", "Tabs", { eyebrow: "Help", heading: "Frequently asked questions", items: [{ q: "Is the project RERA registered?", a: "Yes — {{rera_number}}." }, { q: "When is possession?", a: "{{possession_date}}" }] }) },

  // MEDIA
  { id: "virtual-tour", label: "Virtual Tour", category: "Media", group: "Media", icon: Play, desc: "360° tour embed", make: () => sec("virtual-tour", "Virtual Tour", "Play", { eyebrow: "Experience", heading: "Virtual Tour", text: "Walk the residences from anywhere.", title: "Virtual Tour", url: "", videoTitle: "360° walkthrough", duration: "2:14" }) },
  { id: "youtube", label: "YouTube Video", category: "Media", group: "Media", icon: Clapperboard, desc: "Video embed", make: () => sec("youtube", "YouTube Video", "Clapperboard", { eyebrow: "Watch", heading: "Project film", text: "A cinematic look at the campus.", title: "Project Video", url: "", thumbnail: "", videoTitle: "Project film", duration: "1:48" }) },

  // FORMS
  { id: "lead-form", label: "Lead Form", category: "Forms", group: "Forms", icon: Send, desc: "Single-step form", make: () => sec("lead-form", "Lead Form", "Send", { heading: "Request a Callback", fields: ["name", "phone"], button: "Submit" }) },
  { id: "multistep-form", label: "Multi Step Form", category: "Forms", group: "Forms", icon: Table2, desc: "Step-by-step form", make: () => sec("multistep-form", "Multi Step Form", "Table2", { heading: "Book a Site Visit", steps: 3, button: "Book My Visit" }) },
  { id: "whatsapp-form", label: "WhatsApp Form", category: "Forms", group: "Forms", icon: MessageCircle, desc: "WhatsApp lead form", make: () => sec("whatsapp-form", "WhatsApp Form", "MessageCircle", { heading: "Chat on WhatsApp", number: "+91 90000 00000" }) },
  { id: "enquiry-form", label: "Enquiry Form", category: "Forms", group: "Forms", icon: Send, desc: "General enquiry form", make: () => sec("enquiry-form", "Enquiry Form", "Send", { heading: "Get Detailed Pricing", fields: ["name", "phone", "email"], button: "Submit Enquiry" }) },

  // MARKETING
  { id: "cta-banner", label: "CTA Banner", category: "Marketing", group: "Marketing", icon: MousePointerClick, desc: "Conversion banner", make: () => sec("cta-banner", "CTA Banner", "MousePointerClick", { eyebrow: "Next step", heading: "Ready to Start?", sub: "Book a site visit with our team.", cta: "Book Now", ctaPrimary: "Book Now", ctaSecondary: "Call sales" }, { colors: { bg: "#111827", text: "#ffffff" } }) },
  { id: "sticky-cta", label: "Sticky CTA", category: "Marketing", group: "Marketing", icon: Compass, desc: "Always-visible CTA", make: () => sec("sticky-cta", "Sticky CTA", "Compass", { text: "Book a private tour of {{property_name}}", ctaLabel: "Book Now", phone: "{{starting_price}}" }) },
  { id: "popup-cta", label: "Popup CTA", category: "Marketing", group: "Marketing", icon: Gift, desc: "Triggered popup", make: () => sec("popup-cta", "Popup CTA", "Gift", { heading: "Limited Offer", text: "Lock founder pricing this month.", cta: "Claim Offer" }) },
  { id: "countdown", label: "Countdown Timer", category: "Marketing", group: "Marketing", icon: Timer, desc: "Launch countdown", make: () => sec("countdown", "Countdown Timer", "Timer", { date: "2026-12-31", heading: "Launching Soon", items: [{ value: "12", label: "Days" }, { value: "08", label: "Hours" }, { value: "24", label: "Mins" }, { value: "11", label: "Secs" }] }, { colors: { bg: "#111827", text: "#ffffff" } }) },
  { id: "offer-banner", label: "Offer Banner", category: "Marketing", group: "Marketing", icon: Gift, desc: "Special offer", make: () => sec("offer-banner", "Offer Banner", "Gift", { heading: "Founders' offer", text: "5% Launch Discount", cta: "Claim Now" }, { colors: { bg: "#6D5DFC", text: "#ffffff" } }) },
  { id: "popup", label: "Popup", category: "Marketing", group: "Marketing", icon: PartyPopper, desc: "Modal promotion", make: () => sec("popup", "Popup", "PartyPopper", { heading: "Get Brochure", text: "Share your details to download the kit.", cta: "Download" }) },
  { id: "call-cta", label: "Call CTA", category: "Marketing", group: "Marketing", icon: PhoneCall, desc: "Click-to-call banner", make: () => sec("call-cta", "Call CTA", "PhoneCall", { text: "Talk to our sales team", phone: "+91 90000 00000", ctaLabel: "Call Now" }) },
  { id: "whatsapp-cta", label: "WhatsApp CTA", category: "Marketing", group: "Marketing", icon: MessageCircle, desc: "Chat on WhatsApp banner", make: () => sec("whatsapp-cta", "WhatsApp CTA", "MessageCircle", { text: "Chat with us on WhatsApp", number: "+91 90000 00000", ctaLabel: "Chat Now" }) },
  { id: "floating-icons", label: "Floating Icons", category: "Marketing", group: "Marketing", icon: PhoneCall, desc: "WhatsApp, call, enquire & email on the side", make: () => sec("floating-icons", "Floating Icons", "PhoneCall", { side: "right", whatsapp: true, call: true, enquire: true, email: true, phone: "+91 90000 00000", number: "+91 90000 00000" }) },

  // HEADER & FOOTER
  { id: "announcement", label: "Announcement Bar", category: "Header & Footer", group: "Header & Footer", icon: Megaphone, desc: "Top promo strip", make: () => sec("announcement", "Announcement Bar", "Megaphone", { text: "Limited time offer", linkLabel: "Learn more", link: "#" }, { colors: { bg: "#111827", text: "#ffffff" }, spacing: { padding: { top: 10, right: 24, bottom: 10, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }) },
  { id: "sticky-footer-bar", label: "Sticky Footer Bar", category: "Header & Footer", group: "Header & Footer", icon: PanelBottom, desc: "Bottom bar", make: () => sec("sticky-footer-bar", "Sticky Footer Bar", "PanelBottom", { text: "", ctaLabel: "Enquire Now" }) },

  // ADVANCED
  { id: "html", label: "Custom HTML", category: "Advanced", group: "Advanced", icon: Code2, desc: "Raw HTML embed", make: () => sec("html", "Custom HTML", "Code2", { code: "<div>Your custom HTML here</div>" }) },
];

export const WIDGET_CATEGORY_META: { key: WidgetDef["category"]; label: string }[] = [
  { key: "Layout", label: "Layout" },
  { key: "Basic", label: "Basic" },
  { key: "Real Estate", label: "Real Estate" },
  { key: "Media", label: "Media" },
  { key: "Forms", label: "Forms" },
  { key: "Marketing", label: "Marketing" },
  { key: "Header & Footer", label: "Header & Footer" },
  { key: "Advanced", label: "Advanced" },
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
  Code2,
  Minus,
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