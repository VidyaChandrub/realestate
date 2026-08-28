export interface WidgetDesignMeta {
  id: string;
  name: string;
  desc: string;
}

export const REAL_ESTATE_DESIGNS: Record<string, WidgetDesignMeta[]> = {
  hero: [
    { id: "classic", name: "Classic Full", desc: "Full-bleed premium hero with copy and quick facts" },
    { id: "split", name: "Split Premium", desc: "Left copy with a right-side facts card" },
    { id: "centered", name: "Centered Minimal", desc: "Centered headline with a clean stat strip" },
  ],
  overview: [
    { id: "classic", name: "Side-by-Side", desc: "Image left, content right, RERA badge" },
    { id: "stacked", name: "Stacked Premium", desc: "Centered header, image top, stats below" },
    { id: "cards", name: "Card Lift", desc: "Image with floating stats cards" },
  ],
  highlights: [
    { id: "strip", name: "Strip", desc: "Horizontal equal columns, icon + value" },
    { id: "cards", name: "Cards", desc: "Rounded cards with soft shadow" },
  ],
  stats: [
    { id: "cards", name: "Cards", desc: "Grid cards with gradient icon" },
    { id: "minimal", name: "Minimal", desc: "Clean numbers, centered, no cards" },
    { id: "strip", name: "Strip", desc: "Inline strip with dividers" },
  ],
  amenities: [
    { id: "grid", name: "Grid Premium", desc: "4-col icon cards, 16px radius" },
    { id: "list", name: "List Elegant", desc: "2-col list with dividers" },
    { id: "compact", name: "Compact Chips", desc: "Pills with icon, tight" },
  ],
  gallery: [
    { id: "masonry", name: "Masonry", desc: "3-col masonry, lightbox, 16px radius" },
    { id: "slider", name: "Slider", desc: "Horizontal slider with arrows" },
    { id: "grid", name: "Grid Clean", desc: "Equal grid, generous gap" },
  ],
  "video-gallery": [
    { id: "grid", name: "Grid", desc: "2-col video cards" },
    { id: "feature", name: "Feature + List", desc: "Large feature + side list" },
  ],
  floorplans: [
    { id: "cards", name: "Card Grid", desc: "2-3 col cards · image top, specs & CTA" },
    { id: "tabs", name: "Tabs Premium", desc: "Pill tabs + side details + image" },
  ],
  "master-plan": [
    { id: "image", name: "Image Focus", desc: "Large image, text overlay subtle" },
    { id: "split", name: "Split", desc: "Text left, image right" },
  ],
  pricing: [
    { id: "cards", name: "Cards Featured", desc: "3 cards, middle featured gradient" },
    { id: "table", name: "Table Minimal", desc: "Clean table with CTAs" },
    { id: "toggle", name: "Toggle Premium", desc: "Billing toggle + cards" },
  ],
  features: [
    { id: "checklist", name: "Checklist", desc: "Check icons, 2-col" },
    { id: "cards", name: "Cards", desc: "Icon cards, 3-col" },
  ],
  specifications: [
    { id: "table", name: "Table", desc: "Striped rows, label/value" },
    { id: "cards", name: "Cards", desc: "Spec cards with icon" },
  ],
  timeline: [
    { id: "vertical", name: "Vertical", desc: "Left line, steps vertical" },
    { id: "horizontal", name: "Horizontal", desc: "Top line, steps horizontal" },
  ],
  construction: [
    { id: "timeline", name: "Timeline", desc: "Dated updates, left border" },
    { id: "cards", name: "Cards", desc: "Card per update, image" },
  ],
  "property-details": [
    { id: "grid", name: "Grid", desc: "3-col label/value cards" },
    { id: "table", name: "Table", desc: "Compact table" },
  ],
  "unit-types": [
    { id: "cards", name: "Cards", desc: "Configuration cards" },
    { id: "table", name: "Table Premium", desc: "Row with price + CTA" },
  ],
  "payment-plans": [
    { id: "steps", name: "Steps", desc: "Horizontal steps with amount" },
    { id: "cards", name: "Cards", desc: "Card per plan" },
  ],
  "location-advantages": [
    { id: "split", name: "Split Map", desc: "Text left + map right (default)" },
    { id: "cards", name: "Cards Overlay", desc: "Map under, cards over" },
    { id: "list", name: "List Premium", desc: "Vertical list + small map" },
  ],
  brochure: [
    { id: "centered", name: "Centered CTA", desc: "Icon, text, gated button centered" },
    { id: "split", name: "Split Premium", desc: "Text left, download card right" },
  ],
  downloads: [
    { id: "list", name: "List", desc: "Row per file with download CTA" },
    { id: "cards", name: "Cards", desc: "File cards grid" },
  ],
  testimonials: [
    { id: "cards", name: "Cards", desc: "3-col quote cards" },
    { id: "slider", name: "Slider", desc: "Single large slider" },
    { id: "compact", name: "Compact", desc: "Avatar left, quote right" },
  ],
  faq: [
    { id: "accordion", name: "Accordion", desc: "Collapsible Q&A (default)" },
    { id: "grid", name: "Grid Cards", desc: "2-col Q&A cards" },
  ],
  // Generic fallback for any other real-estate widget
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
