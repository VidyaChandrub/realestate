// Widget registry for the drag-and-drop builder.
// Each widget declares defaults + a declarative settings schema that drives
// the right-hand settings panel generically.

import { ICON_OPTIONS } from "./lp-icon";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "slider"
  | "select"
  | "color"
  | "toggle"
  | "image"
  | "icon"
  | "list"
  | "object-list"
  | "code";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  rows?: number;
  help?: string;
  itemFields?: FieldDef[];
  itemLabelKey?: string;
  section?: string;
}

export interface WidgetDef {
  type: string;
  label: string;
  icon: string;
  category: string;
  description: string;
  defaults: Record<string, unknown>;
  fields: FieldDef[];
}

export const WIDGET_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: "basics", label: "Basics", icon: "layout-template" },
  { key: "conversion", label: "Conversion & CTA", icon: "target" },
  { key: "real-estate", label: "Real Estate", icon: "home" },
  { key: "media", label: "Media & Content", icon: "image" },
  { key: "layout", label: "Layout", icon: "ruler" },
];

const alignOptions = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const btnStyleOptions = [
  { value: "solid", label: "Solid" },
  { value: "outline", label: "Outline" },
  { value: "ghost", label: "Ghost" },
];

const sizeOptions = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

function color(key: string, label: string): FieldDef {
  return { key, label, type: "color" };
}

function text(key: string, label: string, placeholder?: string): FieldDef {
  return { key, label, type: "text", placeholder };
}

function slider(key: string, label: string, min: number, max: number, step = 1): FieldDef {
  return { key, label, type: "slider", min, max, step };
}

function spacing(label: string): FieldDef[] {
  return [
    slider("marginTop", `${label} · Top`, 0, 200),
    slider("marginRight", `${label} · Right`, 0, 200),
    slider("marginBottom", `${label} · Bottom`, 0, 200),
    slider("marginLeft", `${label} · Left`, 0, 200),
  ];
}

export const WIDGETS: WidgetDef[] = [
  {
    type: "heading",
    label: "Heading",
    icon: "heading",
    category: "basics",
    description: "Section or content heading (H1–H6).",
    defaults: {
      text: "Your headline here",
      tag: "h2",
      size: 36,
      weight: 700,
      color: "#1a2744",
      align: "left",
      lineHeight: 1.2,
    },
    fields: [
      { key: "text", label: "Heading Text", type: "textarea", rows: 2 },
      {
        key: "tag",
        label: "HTML Tag",
        type: "select",
        options: [
          { value: "h1", label: "H1" },
          { value: "h2", label: "H2" },
          { value: "h3", label: "H3" },
          { value: "h4", label: "H4" },
        ],
      },
      { key: "align", label: "Alignment", type: "select", options: alignOptions },
      slider("size", "Font Size", 12, 96),
      slider("weight", "Font Weight", 300, 900, 100),
      slider("lineHeight", "Line Height", 0.8, 2.2, 0.05),
      slider("letterSpacing", "Letter Spacing", -2, 20),
      color("color", "Text Color"),
      {
        key: "textTransform",
        label: "Transform",
        type: "select",
        options: [
          { value: "", label: "None" },
          { value: "uppercase", label: "UPPERCASE" },
          { value: "capitalize", label: "Capitalize" },
        ],
      },
      ...spacing("Margin"),
    ],
  },
  {
    type: "text",
    label: "Text Editor",
    icon: "type",
    category: "basics",
    description: "Paragraph of text / rich content.",
    defaults: { text: "Write your paragraph here…", size: 16, color: "#5b6478" },
    fields: [
      { key: "text", label: "Content", type: "textarea", rows: 6, help: "Basic HTML is allowed." },
      { key: "align", label: "Alignment", type: "select", options: alignOptions },
      slider("size", "Font Size", 10, 48),
      slider("lineHeight", "Line Height", 0.8, 3, 0.05),
      slider("letterSpacing", "Letter Spacing", -2, 20),
      color("color", "Text Color"),
      ...spacing("Margin"),
    ],
  },
  {
    type: "image",
    label: "Image",
    icon: "image",
    category: "basics",
    description: "Image with optional link and caption.",
    defaults: { src: "", alt: "", width: 100, radius: 12 },
    fields: [
      { key: "src", label: "Image", type: "image" },
      text("alt", "Alt Text"),
      slider("width", "Width (%)", 10, 100),
      slider("radius", "Border Radius", 0, 60),
      { key: "shadow", label: "Box Shadow", type: "text", placeholder: "0 10px 30px rgba(0,0,0,.15)" },
      text("link", "Link URL"),
      text("caption", "Caption"),
      { key: "align", label: "Alignment", type: "select", options: alignOptions },
      ...spacing("Margin"),
    ],
  },
  {
    type: "button",
    label: "Button",
    icon: "mouse-pointer-click",
    category: "basics",
    description: "Primary CTA button with link.",
    defaults: {
      text: "Enquire Now",
      link: "#contact",
      style: "solid",
      bgColor: "#1a2744",
      textColor: "#ffffff",
      radius: 8,
      size: "md",
    },
    fields: [
      text("text", "Button Text"),
      text("link", "Link URL", "#contact"),
      { key: "style", label: "Style", type: "select", options: btnStyleOptions },
      color("bgColor", "Background Color"),
      color("textColor", "Text Color"),
      slider("radius", "Border Radius", 0, 40),
      slider("fontWeight", "Font Weight", 400, 900, 100),
      { key: "size", label: "Size", type: "select", options: sizeOptions },
      { key: "fullWidth", label: "Full Width", type: "toggle" },
      { key: "align", label: "Alignment", type: "select", options: alignOptions },
      ...spacing("Margin"),
    ],
  },
  {
    type: "icon",
    label: "Icon",
    icon: "star",
    category: "basics",
    description: "Standalone icon.",
    defaults: { icon: "star", size: 40, color: "#c9a227" },
    fields: [
      { key: "icon", label: "Icon", type: "icon", options: ICON_OPTIONS },
      slider("size", "Size", 10, 120),
      color("color", "Icon Color"),
      { key: "align", label: "Alignment", type: "select", options: alignOptions },
      ...spacing("Margin"),
    ],
  },
  {
    type: "divider",
    label: "Divider",
    icon: "minus",
    category: "basics",
    description: "Horizontal line separator.",
    defaults: { height: 1, width: 100, color: "#e2e6ee", style: "solid" },
    fields: [
      slider("height", "Thickness", 1, 12),
      slider("width", "Width (%)", 10, 100),
      color("color", "Color"),
      {
        key: "style",
        label: "Style",
        type: "select",
        options: [
          { value: "solid", label: "Solid" },
          { value: "dashed", label: "Dashed" },
          { value: "dotted", label: "Dotted" },
        ],
      },
      ...spacing("Margin"),
    ],
  },
  {
    type: "spacer",
    label: "Spacer",
    icon: "move-vertical",
    category: "basics",
    description: "Empty vertical space.",
    defaults: { height: 40 },
    fields: [slider("height", "Height", 4, 300)],
  },
  {
    type: "html",
    label: "HTML / Custom Code",
    icon: "code",
    category: "basics",
    description: "Raw HTML or custom snippet.",
    defaults: { content: "<!-- paste custom HTML -->" },
    fields: [{ key: "content", label: "HTML Code", type: "code", rows: 10 }],
  },
  {
    type: "video",
    label: "Video",
    icon: "clapperboard",
    category: "basics",
    description: "YouTube embed.",
    defaults: { src: "", height: 400 },
    fields: [
      text("src", "YouTube URL"),
      slider("height", "Height", 200, 800),
      ...spacing("Margin"),
    ],
  },
  {
    type: "lead-form",
    label: "Lead Form",
    icon: "clipboard-list",
    category: "conversion",
    description: "Real-estate enquiry form that captures leads with UTM attribution.",
    defaults: {
      title: "Get a Call Back",
      subtitle: "Fill in your details — our team responds within 30 minutes.",
      buttonText: "Submit Enquiry",
      successMessage: "Thank you! Our team will contact you shortly.",
      fields: ["name", "phone", "email", "city", "budget", "propertyType"],
      accentColor: "#1a2744",
      radius: 10,
    },
    fields: [
      text("title", "Form Title"),
      { key: "subtitle", label: "Subtitle", type: "textarea", rows: 2 },
      text("buttonText", "Button Text"),
      text("successMessage", "Success Message"),
      color("accentColor", "Button Color"),
      slider("radius", "Form Border Radius", 0, 24),
      {
        key: "fields",
        label: "Form Fields",
        type: "object-list",
        itemLabelKey: "label",
        itemFields: [
          { key: "value", label: "Field", type: "text" },
          { key: "enabled", label: "Enabled", type: "toggle" },
        ],
      },
      ...spacing("Margin"),
    ],
  },
  {
    type: "whatsapp",
    label: "WhatsApp CTA",
    icon: "message-circle",
    category: "conversion",
    description: "Click-to-chat WhatsApp button.",
    defaults: { number: "919876543210", message: "Hello, I am interested.", text: "Chat on WhatsApp", size: "md" },
    fields: [
      text("number", "WhatsApp Number", "919876543210"),
      text("message", "Prefilled Message"),
      text("text", "Button Text"),
      { key: "size", label: "Size", type: "select", options: sizeOptions },
      slider("radius", "Border Radius", 0, 40),
      ...spacing("Margin"),
    ],
  },
  {
    type: "call",
    label: "Call CTA",
    icon: "phone",
    category: "conversion",
    description: "Click-to-call button.",
    defaults: { number: "+91 98765 43210", text: "Call Now", size: "md", bgColor: "#1a2744" },
    fields: [
      text("number", "Phone Number"),
      text("text", "Button Text"),
      { key: "style", label: "Style", type: "select", options: btnStyleOptions },
      color("bgColor", "Button Color"),
      { key: "size", label: "Size", type: "select", options: sizeOptions },
      slider("radius", "Border Radius", 0, 40),
      ...spacing("Margin"),
    ],
  },
  {
    type: "brochure",
    label: "Brochure Download",
    icon: "download",
    category: "conversion",
    description: "Download brochure CTA.",
    defaults: { link: "", text: "Download Brochure", size: "md", bgColor: "#1a2744" },
    fields: [
      text("link", "Brochure URL (PDF)"),
      text("text", "Button Text"),
      { key: "style", label: "Style", type: "select", options: btnStyleOptions },
      color("bgColor", "Button Color"),
      { key: "size", label: "Size", type: "select", options: sizeOptions },
      slider("radius", "Border Radius", 0, 40),
      ...spacing("Margin"),
    ],
  },
  {
    type: "site-visit",
    label: "Site Visit CTA",
    icon: "calendar",
    category: "conversion",
    description: "Schedule a site visit CTA.",
    defaults: { title: "Book a private tour", text: "Schedule a Site Visit", link: "#contact", bgColor: "#1a2744" },
    fields: [
      text("title", "Title"),
      text("text", "Button Text"),
      text("link", "Link / Form Anchor"),
      color("bgColor", "Button Color"),
      { key: "size", label: "Size", type: "select", options: sizeOptions },
      slider("radius", "Border Radius", 0, 40),
      ...spacing("Margin"),
    ],
  },
  {
    type: "countdown",
    label: "Countdown",
    icon: "hourglass",
    category: "conversion",
    description: "Offer countdown timer.",
    defaults: { targetDate: new Date(Date.now() + 7 * 86400000).toISOString(), title: "Offer ends in" },
    fields: [
      text("title", "Title"),
      text("targetDate", "Target Date (ISO)"),
      color("boxColor", "Box Color"),
      color("boxTextColor", "Box Text Color"),
      slider("radius", "Box Radius", 0, 24),
    ],
  },
  {
    type: "property-card",
    label: "Property Card",
    icon: "building-2",
    category: "real-estate",
    description: "Featured property with price and details.",
    defaults: {
      title: "Skyline Residences",
      location: "Whitefield, Bengaluru",
      price: "₹1.25 Cr",
      beds: "3",
      baths: "3",
      area: "1,650 sq.ft",
      cta: "Enquire Now",
      ctaLink: "#contact",
      image: "",
    },
    fields: [
      { key: "image", label: "Image", type: "image" },
      text("title", "Property Name"),
      text("location", "Location"),
      text("price", "Price"),
      text("beds", "Bedrooms"),
      text("baths", "Bathrooms"),
      text("area", "Area"),
      text("cta", "CTA Text"),
      text("ctaLink", "CTA Link"),
      color("ctaBg", "CTA Color"),
      slider("radius", "Card Radius", 0, 40),
      ...spacing("Margin"),
    ],
  },
  {
    type: "amenity-card",
    label: "Amenity Card",
    icon: "trees",
    category: "real-estate",
    description: "Icon + title + description card.",
    defaults: {
      icon: "trees",
      title: "Amenity",
      description: "Short description of the amenity.",
      iconColor: "#1a2744",
      radius: 14,
    },
    fields: [
      { key: "icon", label: "Icon", type: "icon", options: ICON_OPTIONS },
      text("title", "Title"),
      { key: "description", label: "Description", type: "textarea", rows: 3 },
      color("titleColor", "Title Color"),
      color("textColor", "Text Color"),
      slider("iconSize", "Icon Size", 16, 72),
      slider("radius", "Card Radius", 0, 40),
      slider("paddingX", "Padding X", 8, 60),
      slider("paddingY", "Padding Y", 8, 60),
      ...spacing("Margin"),
    ],
  },
  {
    type: "icon-box",
    label: "Icon Box",
    icon: "box",
    category: "media",
    description: "Feature block with icon, title and text.",
    defaults: {
      icon: "star",
      title: "Feature Title",
      description: "Feature description goes here.",
      iconColor: "#c9a227",
      titleColor: "#1a2744",
      radius: 14,
    },
    fields: [
      { key: "icon", label: "Icon", type: "icon", options: ICON_OPTIONS },
      text("title", "Title"),
      { key: "description", label: "Description", type: "textarea", rows: 3 },
      color("iconColor", "Icon Color"),
      color("titleColor", "Title Color"),
      color("textColor", "Text Color"),
      slider("iconSize", "Icon Size", 16, 72),
      slider("titleSize", "Title Size", 14, 40),
      slider("radius", "Box Radius", 0, 40),
      { key: "align", label: "Alignment", type: "select", options: alignOptions },
      ...spacing("Margin"),
    ],
  },
  {
    type: "image-text",
    label: "Image + Text",
    icon: "columns-2",
    category: "media",
    description: "Split media + copy layout.",
    defaults: {
      image: "",
      title: "Section Title",
      text: "Supporting copy for this section.",
      layout: "image-left",
      titleColor: "#1a2744",
      radius: 14,
    },
    fields: [
      { key: "image", label: "Image", type: "image" },
      text("kicker", "Kicker / Eyebrow"),
      text("title", "Title"),
      { key: "text", label: "Body Text", type: "textarea", rows: 5 },
      text("buttonText", "Button Text"),
      text("buttonLink", "Button Link"),
      color("buttonBg", "Button Color"),
      color("titleColor", "Title Color"),
      color("textColor", "Text Color"),
      color("kickerColor", "Kicker Color"),
      {
        key: "layout",
        label: "Layout",
        type: "select",
        options: [
          { value: "image-left", label: "Image Left" },
          { value: "image-right", label: "Image Right" },
        ],
      },
      slider("radius", "Image Radius", 0, 40),
      ...spacing("Margin"),
    ],
  },
  {
    type: "gallery",
    label: "Gallery",
    icon: "images",
    category: "real-estate",
    description: "Grid of project images with optional lightbox.",
    defaults: { images: [], captions: [], columns: 3, gap: 12, height: 220, radius: 10, lightbox: true },
    fields: [
      { key: "images", label: "Image URLs", type: "list" },
      { key: "captions", label: "Captions (one per line)", type: "textarea", rows: 4, help: "Optional: one caption per image, matching order" },
      slider("columns", "Columns", 1, 6),
      slider("gap", "Gap", 0, 40),
      slider("height", "Image Height", 100, 500),
      slider("radius", "Radius", 0, 40),
      { key: "lightbox", label: "Enable Lightbox", type: "toggle", help: "Click images to open in fullscreen lightbox" },
    ],
  },
  {
    type: "floor-plan",
    label: "Floor Plan",
    icon: "ruler",
    category: "real-estate",
    description: "Floor plan image with specs.",
    defaults: { title: "3 BHK Floor Plan", area: "1,650 sq.ft", beds: "3", baths: "3", price: "₹1.85 Cr", layout: "side", image: "" },
    fields: [
      { key: "image", label: "Floor Plan Image", type: "image" },
      text("title", "Title"),
      text("area", "Area"),
      text("beds", "Beds"),
      text("baths", "Baths"),
      text("price", "Price"),
      {
        key: "layout",
        label: "Layout",
        type: "select",
        options: [
          { value: "side", label: "Image + Info" },
          { value: "stack", label: "Stacked" },
        ],
      },
    ],
  },
  {
    type: "pricing",
    label: "Pricing Plan",
    icon: "wallet",
    category: "real-estate",
    description: "Payment plan card.",
    defaults: {
      name: "3 BHK",
      price: "₹1.85 Cr",
      area: "1,650 sq.ft",
      features: ["Clubhouse access", "3 parking slots"],
      highlighted: false,
      cta: "Enquire Now",
      ctaLink: "#contact",
    },
    fields: [
      text("name", "Plan Name"),
      text("price", "Price"),
      text("area", "Area"),
      { key: "features", label: "Features", type: "list" },
      { key: "highlighted", label: "Highlighted Plan", type: "toggle" },
      text("cta", "CTA Text"),
      text("ctaLink", "CTA Link"),
      color("ctaBg", "CTA Color"),
      slider("radius", "Card Radius", 0, 40),
    ],
  },
  {
    type: "map",
    label: "Location Map",
    icon: "map",
    category: "real-estate",
    description: "Google Maps embed.",
    defaults: { embedUrl: "", height: 420, radius: 14 },
    fields: [
      text("embedUrl", "Google Maps Embed URL"),
      slider("height", "Height", 200, 800),
      slider("radius", "Radius", 0, 40),
    ],
  },
  {
    type: "testimonial",
    label: "Testimonials",
    icon: "quote",
    category: "real-estate",
    description: "Customer reviews grid.",
    defaults: {
      columns: 3,
      gap: 20,
      items: [
        { quote: "Great experience, the team was very professional.", name: "Rahul Sharma", role: "3 BHK Owner", rating: 5 },
        { quote: "Loved the amenities and the location.", name: "Priya Menon", role: "2 BHK Owner", rating: 5 },
      ],
    },
    fields: [
      slider("columns", "Columns", 1, 4),
      slider("gap", "Gap", 0, 40),
      {
        key: "items",
        label: "Testimonials",
        type: "object-list",
        itemLabelKey: "name",
        itemFields: [
          { key: "quote", label: "Quote", type: "textarea", rows: 2 },
          { key: "name", label: "Name", type: "text" },
          { key: "role", label: "Role", type: "text" },
          { key: "rating", label: "Rating (1-5)", type: "number" },
        ],
      },
    ],
  },
  {
    type: "faq",
    label: "FAQ",
    icon: "help-circle",
    category: "real-estate",
    description: "Accordion FAQ list.",
    defaults: {
      items: [
        { question: "When is the possession date?", answer: "Possession is expected by Q3 2027." },
        { question: "Is this RERA registered?", answer: "Yes, RERA registration number is available on request." },
      ],
    },
    fields: [
      slider("radius", "Border Radius", 0, 24),
      {
        key: "items",
        label: "Questions",
        type: "object-list",
        itemLabelKey: "question",
        itemFields: [
          { key: "question", label: "Question", type: "textarea", rows: 1 },
          { key: "answer", label: "Answer", type: "textarea", rows: 3 },
        ],
      },
    ],
  },
  {
    type: "contact-info",
    label: "Contact Info",
    icon: "contact",
    category: "media",
    description: "Phone, email, address block.",
    defaults: { phone: "+91 98765 43210", email: "sales@bigestate.io", address: "Whitefield, Bengaluru", hours: "Mon–Sun, 9am–8pm" },
    fields: [
      text("phone", "Phone"),
      text("email", "Email"),
      text("address", "Address"),
      text("hours", "Hours"),
      { key: "align", label: "Alignment", type: "select", options: alignOptions },
    ],
  },
  {
    type: "row",
    label: "Inline Row",
    icon: "rows-3",
    category: "layout",
    description: "Horizontal group of elements (CTAs, badges).",
    defaults: { gap: 12, align: "left" },
    fields: [
      slider("gap", "Gap", 0, 60),
      { key: "align", label: "Alignment", type: "select", options: alignOptions },
      ...spacing("Margin"),
    ],
  },
  {
    type: "grid",
    label: "Grid",
    icon: "grid-3x3",
    category: "layout",
    description: "Responsive grid of cards.",
    defaults: { columns: 3, gap: 20 },
    fields: [
      slider("columns", "Columns", 1, 6),
      slider("gap", "Gap", 0, 60),
      ...spacing("Margin"),
    ],
  },
];

export const WIDGET_MAP: Record<string, WidgetDef> = Object.fromEntries(
  WIDGETS.map((w) => [w.type, w]),
);

export function findWidget(type: string): WidgetDef | undefined {
  return WIDGET_MAP[type];
}

export function widgetLabel(type: string): string {
  return findWidget(type)?.label ?? type;
}

export function makeElement(type: string): ElementNodeLike {
  const def = findWidget(type);
  return {
    id: crypto.randomUUID(),
    type,
    settings: def ? { ...def.defaults } : {},
    elements: type === "row" || type === "grid" ? [] : undefined,
  };
}

export interface ElementNodeLike {
  id: string;
  type: string;
  settings: Record<string, unknown>;
  elements?: ElementNodeLike[];
}

// Utility used by the right panel to clone an element (nested children too).
export function cloneElement(node: ElementNodeLike): ElementNodeLike {
  return {
    ...node,
    id: crypto.randomUUID(),
    settings: { ...node.settings },
    elements: node.elements ? node.elements.map(cloneElement) : undefined,
  };
}