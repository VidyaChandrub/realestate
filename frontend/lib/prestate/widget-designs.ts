export interface WidgetDesignMeta {
  id: string;
  name: string;
  desc: string;
}

export interface WidgetDesignMeta {
  id: string;
  name: string;
  desc: string;
}

export const REAL_ESTATE_DESIGNS: Record<string, WidgetDesignMeta[]> = {
  hero: [
    { id: "split", name: "Form + Split Showcase", desc: "One side lead capture form, other side text, bullet points & CTA" },
    { id: "slider", name: "Creative Slider", desc: "Dynamic interactive slides with rotating visuals, copy & CTAs" },
    { id: "classic", name: "Simple Image + Text", desc: "Clean modern layout with strong typography, bullet points & dual CTA" },
  ],
  overview: [
    { id: "classic", name: "Side-by-Side", desc: "Image left, rich content right with RERA badge" },
    { id: "stacked", name: "Stacked Hero", desc: "Centered title, expansive visual, feature cards below" },
    { id: "cards", name: "Card Lift", desc: "Image with floating glass stats cards" },
  ],
  highlights: [
    { id: "strip", name: "Horizontal Strip", desc: "Modern metric strip with dividers" },
    { id: "cards", name: "Elevated Cards", desc: "Rounded cards with soft glow and gold icon badges" },
    { id: "glass-tiles", name: "Glass Tiles", desc: "Modern dark glass tiles with radiant backdrop glow" },
  ],
  stats: [
    { id: "cards", name: "Luxury Cards", desc: "Grid cards with gradient icon badge" },
    { id: "minimal", name: "Clean Numbers", desc: "Large typography numbers without borders" },
    { id: "strip", name: "Inline Strip", desc: "Compact horizontal counter strip" },
  ],
  amenities: [
    { id: "grid", name: "Grid Premium", desc: "4-col luxury icon cards with hover lift" },
    { id: "list", name: "List Elegant", desc: "2-col structured list with dividers" },
    { id: "compact", name: "Compact Chips", desc: "Modern floating pill chips with icons" },
  ],
  gallery: [
    { id: "masonry", name: "Masonry Grid", desc: "Dynamic staggered masonry with lightbox zoom" },
    { id: "slider", name: "Cinematic Slider", desc: "Full-width interactive image carousel with controls" },
    { id: "grid", name: "Geometric Grid", desc: "Uniform luxury 3-column grid with hover caption reveal" },
  ],
  "video-gallery": [
    { id: "grid", name: "Video Grid", desc: "2-col luxury video cards with play overlay" },
    { id: "feature", name: "Featured Showcase", desc: "Large cinematic video + side playlist reel" },
    { id: "cinema-lightbox", name: "Cinema Banner", desc: "Full-width banner with glowing play trigger" },
  ],
  video: [
    { id: "feature", name: "Cinematic Feature", desc: "Expansive video with play overlay & duration badge" },
    { id: "split", name: "Split Video & Copy", desc: "Video player on one side, project story on the other" },
    { id: "lightbox", name: "Glowing Banner", desc: "High-impact video banner with centered play trigger" },
  ],
  "virtual-tour": [
    { id: "feature", name: "Interactive 360", desc: "Expansive virtual tour view with navigation hotkeys" },
    { id: "split", name: "Split Tour & Specs", desc: "360 view alongside floor level & room selector" },
    { id: "lightbox", name: "Fullscreen VR", desc: "Immersive VR preview with fullscreen launcher" },
  ],
  floorplans: [
    { id: "cards", name: "Card Grid", desc: "2-3 col cards with floor preview, specs & CTA" },
    { id: "tabs", name: "Segmented Tabs", desc: "BHK/configuration tabs with floor details" },
    { id: "split-showcase", name: "Split Showcase", desc: "Left interactive floor visual, right spec breakdown" },
  ],
  "floor-plan-gallery": [
    { id: "cards", name: "Gated Card Grid", desc: "Grid cards with locked blur and instant unlock form" },
    { id: "tabs", name: "Tabbed Unlocker", desc: "Segmented BHK tabs with preview and enquiry modal" },
    { id: "split-showcase", name: "Side Showcase", desc: "Large floor plan viewer with gated lead panel" },
  ],
  "master-plan": [
    { id: "image", name: "Master Layout", desc: "Full-width interactive master plan visual" },
    { id: "split", name: "Split Legend", desc: "Project tower list on left, master plan on right" },
    { id: "cards", name: "Phase Cards", desc: "Tower & phase cards with layout highlights" },
  ],
  pricing: [
    { id: "cards", name: "Featured Tier", desc: "3-col luxury pricing cards with featured accent" },
    { id: "table", name: "Clean Table", desc: "Detailed breakdown table with transparent rows" },
    { id: "toggle", name: "Configuration Toggle", desc: "Interactive toggle between BHK types" },
  ],
  features: [
    { id: "checklist", name: "Checklist", desc: "2-col luxury checklist with verified badges" },
    { id: "cards", name: "Feature Cards", desc: "3-col icon cards with gold accents" },
    { id: "glass-tiles", name: "Glass Tiles", desc: "Dark glassmorphic feature tiles" },
  ],
  specifications: [
    { id: "table", name: "Spec Table", desc: "Striped luxury specification rows" },
    { id: "cards", name: "Category Cards", desc: "Categorized specification cards with icons" },
    { id: "two-column", name: "Two-Column Matrix", desc: "Left categories with right detailed specifications" },
  ],
  timeline: [
    { id: "vertical", name: "Vertical Timeline", desc: "Chronological milestone line with status badges" },
    { id: "horizontal", name: "Horizontal Steps", desc: "Step-by-step progress roadmap" },
    { id: "milestone-cards", name: "Milestone Cards", desc: "Elevated cards for each development phase" },
  ],
  construction: [
    { id: "timeline", name: "Dated Timeline", desc: "Chronological on-site construction updates" },
    { id: "cards", name: "Photo Cards", desc: "Site photo update cards with completion progress" },
    { id: "split-status", name: "Split Status", desc: "Overall completion gauge on left, photo log on right" },
  ],
  "property-details": [
    { id: "grid", name: "Spec Grid", desc: "3-col luxury metric cards with icons" },
    { id: "table", name: "Compact Table", desc: "Clean structured property data table" },
    { id: "split-highlight", name: "Highlight Matrix", desc: "Key highlights hero on left, full matrix on right" },
  ],
  "unit-types": [
    { id: "cards", name: "Unit Cards", desc: "3-col configuration cards with starting price & CTA" },
    { id: "table", name: "Comparison Table", desc: "Structured BHK, carpet area & pricing table" },
    { id: "tabs", name: "Segmented Tabs", desc: "Tab switcher by unit type with instant spec sheet" },
  ],
  "payment-plans": [
    { id: "steps", name: "Milestone Steps", desc: "Horizontal timeline of booking, construction & possession" },
    { id: "cards", name: "Plan Cards", desc: "Comparative cards for CLP, PLP & Flexi payment plans" },
    { id: "schedule-table", name: "Payment Schedule", desc: "Structured milestone percentage & timeline table" },
  ],
  "location-advantages": [
    { id: "split", name: "Split Map", desc: "Interactive map on one side, connectivity points on other" },
    { id: "cards", name: "Overlay Cards", desc: "Commute distance cards over map visual" },
    { id: "list", name: "Categorized Timeline", desc: "Transit, schools, hospitals & tech parks" },
  ],
  brochure: [
    { id: "centered", name: "Centered Luxury Card", desc: "Download badge, copy and gated CTA button" },
    { id: "split", name: "3D Book Split", desc: "3D brochure mockup on left, instant download form on right" },
    { id: "floating-banner", name: "Floating Strip", desc: "Compact high-converting download banner" },
  ],
  downloads: [
    { id: "list", name: "Document List", desc: "Clean row per project document with download CTA" },
    { id: "cards", name: "Document Cards", desc: "3-col cards with file type badge and preview" },
    { id: "hub", name: "Document Hub", desc: "Categorized legal, floor plan & brochure resource center" },
  ],
  testimonials: [
    { id: "cards", name: "Review Cards", desc: "3-col quote cards with star ratings & buyer tags" },
    { id: "slider", name: "Featured Slider", desc: "Expansive buyer review with photo & quote" },
    { id: "compact", name: "Compact Quotes", desc: "Horizontal testimonial badges" },
  ],
  faq: [
    { id: "accordion", name: "Collapsible Accordion", desc: "Smooth expandable Q&A items" },
    { id: "grid", name: "Open Grid", desc: "2-col open Q&A cards with category tags" },
    { id: "split-search", name: "Category Split", desc: "Topic navigation on left, FAQ answers on right" },
  ],
  "emi-calculator": [
    { id: "cards", name: "Interactive Card", desc: "Visual sliders, monthly breakdown & amortization gauge" },
    { id: "split", name: "Split Calculator", desc: "Sliders on left, monthly EMI & chart on right" },
    { id: "compact", name: "Compact Estimator", desc: "Quick property price & EMI pill" },
  ],
  contact: [
    { id: "split", name: "Split Office & Map", desc: "Contact info & office hours on left, map on right" },
    { id: "cards", name: "Info Cards", desc: "3-col sales office, site address & phone cards" },
    { id: "compact", name: "Direct Strip", desc: "Quick phone, WhatsApp and address strip" },
  ],
  "builder-profile": [
    { id: "cards", name: "Credibility Card", desc: "Builder track record, delivered sq.ft & history" },
    { id: "split", name: "Split Legacy", desc: "Builder portrait/logo on left, stats & vision on right" },
    { id: "minimal", name: "Minimal Trust", desc: "Clean trust badges & key achievements strip" },
  ],
  "cta-banner": [
    { id: "banner", name: "Full Banner", desc: "Expansive conversion banner with dual CTA buttons & dark overlay" },
    { id: "strip", name: "Slim Strip", desc: "Compact horizontal conversion offer bar" },
    { id: "card", name: "Floating Luxury Card", desc: "High-impact floating card with radiant accent glow & features" },
  ],
  cta: [
    { id: "banner", name: "Full Banner", desc: "Expansive conversion banner with dual CTA buttons & dark overlay" },
    { id: "strip", name: "Slim Strip", desc: "Compact horizontal conversion offer bar" },
    { id: "card", name: "Floating Luxury Card", desc: "High-impact floating card with radiant accent glow & features" },
  ],
  "sticky-cta": [
    { id: "floating", name: "Floating Pill Bar", desc: "Glassmorphic floating pill centered at the bottom" },
    { id: "docked", name: "Full-Width Dock", desc: "Edge-to-edge docked bottom action bar with property summary" },
    { id: "corner-badge", name: "Corner Action Badge", desc: "Discreet floating action badge in bottom-right corner" },
  ],
  "sticky-bar": [
    { id: "floating", name: "Floating Pill Bar", desc: "Glassmorphic floating pill centered at the bottom" },
    { id: "docked", name: "Full-Width Dock", desc: "Edge-to-edge docked bottom action bar with property summary" },
    { id: "corner-badge", name: "Corner Action Badge", desc: "Discreet floating action badge in bottom-right corner" },
  ],
  popup: [
    { id: "modal", name: "Centered Modal", desc: "High-conversion centered lead modal with backdrop blur" },
    { id: "slide-in", name: "Corner Slide-In", desc: "Bottom-right floating notification popup with quick form" },
    { id: "takeover", name: "Split Takeover", desc: "Split visual takeover with property image & lead capture" },
  ],
  // Generic fallback for any other widget
  default: [
    { id: "classic", name: "Classic", desc: "Premium default" },
    { id: "cards", name: "Cards", desc: "Card layout" },
    { id: "minimal", name: "Minimal", desc: "Clean minimal" },
  ],
};

export function designsForWidget(type: string): WidgetDesignMeta[] {
  return REAL_ESTATE_DESIGNS[type] ?? REAL_ESTATE_DESIGNS.default;
}

export function defaultDesignFor(type: string): string {
  const list = designsForWidget(type);
  return list[0]?.id ?? "classic";
}
