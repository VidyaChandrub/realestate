import type { SectionInstance, SectionStyle, TemplateData } from "./types";

function uid(prefix = "sec"): string {
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

const sec = (
  type: string,
  label: string,
  icon: string,
  settings: Record<string, unknown>,
  style?: Partial<SectionStyle>,
): SectionInstance => ({
  id: uid(),
  type,
  label,
  icon,
  settings,
  style: defaultStyle(style),
});

export const PAGE_TEMPLATES: TemplateData[] = [
  {
    id: "tpl-luxury",
    name: "Luxury Apartments",
    category: "Apartment",
    icon: "Building2",
    pages: 24,
    conversions: "12.4%",
    accent: "#6D5DFC",
    accent2: "#0e1220",
    thumbnail: "hero",
    description: "High-rise residences with a cinematic hero, amenity deck, floor plans, pricing and a sticky booking bar.",
  },
  {
    id: "tpl-villas",
    name: "Villa Estates",
    category: "Villa",
    icon: "Home",
    pages: 18,
    conversions: "11.2%",
    accent: "#0F766E",
    accent2: "#06201e",
    thumbnail: "villa",
    description: "Gated villa community with estate overview, private amenities, plot sizes and a quieter, editorial layout.",
  },
  {
    id: "tpl-commercial",
    name: "Commercial Park",
    category: "Commercial",
    icon: "Store",
    pages: 12,
    conversions: "8.9%",
    accent: "#B45309",
    accent2: "#2a1600",
    thumbnail: "commercial",
    description: "Grade-A office and retail leasing page with specs, floor plates, location connectivity and a tenant enquiry form.",
  },
  {
    id: "tpl-launch",
    name: "New Launch",
    category: "Campaign",
    icon: "Rocket",
    pages: 19,
    conversions: "17.1%",
    accent: "#C026D3",
    accent2: "#24022a",
    thumbnail: "tour",
    description: "Urgency-led launch campaign with countdown, offer banner, limited inventory CTA and a fast lead form.",
  },
];

export const BLANK_TEMPLATE: TemplateData = {
  id: "tpl-blank",
  name: "Start from scratch",
  category: "Custom",
  icon: "LayoutTemplate",
  pages: 0,
  conversions: "—",
  accent: "#6D5DFC",
  accent2: "#111827",
  thumbnail: "hero",
  description: "Empty canvas. Add any layout, hero, form or media widget and build your own section pattern.",
};

export function inferDesignId(template: string): string {
  const key = template.trim().toLowerCase();
  if (key === "tpl-blank" || key.includes("scratch") || key === "blank" || key === "custom") return "tpl-blank";
  if (key.includes("villa") || key === "tpl-villas") return "tpl-villas";
  if (key.includes("commercial") || key === "tpl-commercial") return "tpl-commercial";
  if (key.includes("launch") || key.includes("campaign") || key === "tpl-launch") return "tpl-launch";
  if (key.includes("luxury") || key === "tpl-luxury") return "tpl-luxury";
  return "tpl-luxury";
}

export function buildTemplateSections(idOrName: string): SectionInstance[] {
  const key = idOrName.trim().toLowerCase();
  if (key === "tpl-blank" || key.includes("scratch") || key === "blank") return [];
  if (key.includes("villa") || key === "tpl-villas") return villaSections();
  if (key.includes("commercial") || key === "tpl-commercial") return commercialSections();
  if (key.includes("launch") || key.includes("campaign") || key === "tpl-launch") return launchSections();
  return luxurySections();
}

function luxurySections(): SectionInstance[] {
  return [
    sec("announcement", "Announcement Bar", "Megaphone", { text: "Launch Offer — Flat 5% off on the first 20 bookings.", linkLabel: "", link: "#lead" }, { colors: { bg: "#000000", text: "#f4f1ea" }, spacing: { padding: { top: 10, right: 24, bottom: 10, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }),
    sec(
      "hero",
      "Hero Banner",
      "LayoutPanelTop",
      {
        eyebrow: "RERA APPROVED • SARJAPUR ROAD",
        heading: "Luxury Apartments in Bangalore",
        subheading: "3 & 4 BHK Premium Residences",
        price: "₹1.25 Cr",
        priceLabel: "STARTING FROM",
        heroArt: "hero",
        accent: "#cda45e",
        priceNote: "All-inclusive · Possession Dec 2027",
        ctaPrimary: "Book Site Visit",
        ctaSecondary: "Download Brochure",
        highlights: ["25+ Amenities", "RERA Approved", "2 Towers", "2.5 Acres", "Metro Connectivity"],
        heroStats: [
          { value: "3 & 4 BHK", label: "Configurations" },
          { value: "312", label: "Residences" },
          { value: "2.5 Ac", label: "Campus" },
          { value: "Dec 2027", label: "Possession" },
        ],
      },
      {
        colors: { bg: "#0e1220", overlay: "rgba(8,10,20,0.55)", text: "#ffffff" },
        layout: { width: "full", height: "vh", fixedHeight: 780, align: "left", direction: "column", justify: "center", alignItems: "flex-start" },
        spacing: { padding: { top: 160, right: 0, bottom: 120, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 16 },
      },
    ),
    sec("highlights", "Property Highlights", "Award", {
      items: [
        { icon: "SwimmingPool", value: "25+", label: "Resort Amenities" },
        { icon: "ShieldCheck", value: "RERA", label: "Approved Project" },
        { icon: "Building2", value: "2", label: "Premium Towers" },
        { icon: "LandPlot", value: "2.5 Ac", label: "Landscaped Campus" },
        { icon: "TrainFront", value: "500 m", label: "Metro Connectivity" },
      ],
    }, { colors: { bg: "#ffffff", text: "#111827" }, spacing: { padding: { top: 28, right: 24, bottom: 28, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 24 } }),
    sec("overview", "Property Overview", "Building2", {
      eyebrow: "About the Project",
      heading: "A New Address for Elevated Living",
      text: "Two sculpted towers rising over a 2.5-acre landscaped campus on Sarjapur Road. Every residence is designed around light, space and privacy — with 3 & 4 BHK homes up to 2,450 sq.ft.",
      bullets: ["Dual-height lobby with concierge", "Vastu-compliant layouts", "Smart home automation in every residence"],
      stats: [
        { value: "312", label: "Residences" },
        { value: "28", label: "Floors" },
        { value: "Dec 2027", label: "Possession" },
      ],
      image: "overview",
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("amenities", "Amenities", "Dumbbell", {
      eyebrow: "Lifestyle",
      heading: "25+ Resort-Grade Amenities",
      text: "Four levels of leisure, wellness and recreation — curated for every generation in your family.",
      items: [
        { icon: "SwimmingPool", title: "Infinity Pool", desc: "Temperature-controlled lap pool on the sky deck" },
        { icon: "Dumbbell", title: "Gymnasium", desc: "Imported strength & cardio equipment" },
        { icon: "Music", title: "Sky Lounge", desc: "Private lounge with panoramic city views" },
        { icon: "Leaf", title: "Yoga Deck", desc: "Morning wellness overlooking the gardens" },
        { icon: "Trophy", title: "Clubhouse", desc: "6,000 sq.ft member clubhouse" },
        { icon: "Sun", title: "Spa & Steam", desc: "Rejuvenation suites with spa grade amenities" },
        { icon: "BookOpen", title: "Reading Lounge", desc: "Quiet library with curated collection" },
        { icon: "Car", title: "EV Charging", desc: "Charging for every parking bay" },
      ],
    }, { colors: { bg: "#f8fafc", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("floorplans", "Floor Plans", "Grid", {
      eyebrow: "Configurations",
      heading: "Floor Plans That Breathe",
      text: "Every plan is designed for natural light and cross-ventilation, with generous balconies and Vastu-compliant orientation.",
      plans: [
        { name: "3 BHK", beds: "3", area: "1,650 sq.ft", price: "₹1.25 Cr" },
        { name: "3 BHK + Study", beds: "3", area: "1,950 sq.ft", price: "₹1.55 Cr" },
        { name: "4 BHK", beds: "4", area: "2,450 sq.ft", price: "₹1.95 Cr" },
        { name: "Penthouse", beds: "4", area: "3,100 sq.ft", price: "₹3.20 Cr" },
      ],
      note: "All prices include clubhouse membership.",
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("gallery", "Property Gallery", "Images", {
      eyebrow: "Gallery",
      heading: "Step Inside Aurora",
      text: "Explore the residences, amenity deck and landscaped campus.",
      images: ["skyline", "lobby", "pool", "tower", "garden", "interior"],
      columns: 3,
    }, { colors: { bg: "#f8fafc", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("virtual-tour", "Virtual Tour", "Play", {
      eyebrow: "Experience",
      heading: "Take the Virtual Tour",
      text: "Walk through the model apartment, amenity deck and sky lounge from anywhere.",
      videoTitle: "Aurora Residences — Official Walkthrough",
      duration: "2:14",
      poster: "tour",
    }, { colors: { bg: "#111827", text: "#ffffff", overlay: "rgba(17,24,39,0.5)" }, layout: { width: "boxed", height: "auto", align: "center", direction: "column" } }),
    sec("location-advantages", "Location Advantages", "Navigation", {
      eyebrow: "Location",
      heading: "Everything You Need, Within Reach",
      text: "Positioned on Sarjapur Road, Aurora connects you to the city's best schools, offices and lifestyle districts in minutes.",
      items: [
        { icon: "School", title: "Greenwood High", meta: "2.4 km" },
        { icon: "Store", title: "Gopalan Signature Mall", meta: "3.1 km" },
        { icon: "Hospital", title: "Columbia Asia Hospital", meta: "2.8 km" },
        { icon: "TrainFront", title: "Metro Station", meta: "500 m" },
        { icon: "Building2", title: "ORR Tech Corridor", meta: "4.2 km" },
        { icon: "LandPlot", title: "Silk Board Junction", meta: "5.6 km" },
      ],
      mapAddress: "Sarjapur Road, Bangalore",
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("pricing", "Pricing Table", "Wallet", {
      eyebrow: "Investment",
      heading: "Pricing & Configurations",
      text: "Transparent pricing with flexible payment plans from all major banks.",
      plans: [
        { name: "3 BHK", area: "1,650 sq.ft", price: "₹1.25 Cr", per: "Onwards", features: ["3 Bedrooms", "3 Bathrooms", "Balcony", "2 Parking", "Clubhouse Access"], cta: "Book a Site Visit", featured: false },
        { name: "4 BHK", area: "2,450 sq.ft", price: "₹1.95 Cr", per: "Onwards", features: ["4 Bedrooms", "4 Bathrooms", "Large Balcony", "2 Parking", "Smart Home"], cta: "Book a Site Visit", featured: true },
        { name: "Penthouse", area: "3,100 sq.ft", price: "₹3.20 Cr", per: "Onwards", features: ["Sky Deck Access", "Private Elevator", "3 Parking", "Private Pool"], cta: "Request a Call", featured: false },
      ],
    }, { colors: { bg: "#f8fafc", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("testimonials", "Testimonials", "Quote", {
      eyebrow: "What Homebuyers Say",
      heading: "Loved by Families Like Yours",
      items: [
        { name: "Rahul & Ananya Sharma", role: "Booked 4 BHK · Tower B", quote: "The transparency on pricing and the construction quality sold us instantly.", rating: 5 },
        { name: "Kavitha Reddy", role: "Booked 3 BHK · Tower A", quote: "Aurora's amenity deck and 500m metro access made the decision easy.", rating: 5 },
        { name: "Amit & Neha Joshi", role: "Booked 3 BHK + Study", quote: "From the virtual tour to the final booking, every step was seamless.", rating: 5 },
      ],
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("faq", "FAQ", "Tabs", {
      eyebrow: "Have Questions?",
      heading: "Frequently Asked Questions",
      items: [
        { q: "When is possession?", a: "December 2027. Construction is on track." },
        { q: "What is the 3 BHK price range?", a: "3 BHK homes start from ₹1.25 Cr, all-inclusive." },
        { q: "Is the project RERA approved?", a: "Yes — PRM/KA/RERA/1251/446/PR/210812/004231." },
        { q: "Can I book a virtual site visit?", a: "Yes. Use the form below and we will schedule a guided walkthrough." },
      ],
    }, { colors: { bg: "#f8fafc", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("multistep-form", "Book Site Visit", "Table2", {
      eyebrow: "Private Tour",
      heading: "Book Your Site Visit",
      sub: "Reserve your private tour in under a minute.",
      steps: ["Your Details", "Preferences", "Confirm"],
      button: "Book My Visit",
      fields: [
        { type: "text", label: "Full Name", placeholder: "e.g. Rahul Sharma" },
        { type: "phone", label: "Phone", placeholder: "+91 98XXX XXXXX" },
        { type: "select", label: "Configuration", options: ["3 BHK", "4 BHK", "Penthouse"] },
        { type: "select", label: "Preferred Date", options: ["This Weekend", "Next Week", "Weekend After"] },
      ],
      action: "whatsapp",
      actionLabel: "Confirm on WhatsApp",
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("cta-banner", "CTA Banner", "MousePointerClick", {
      eyebrow: "Limited Inventory",
      heading: "Only 27 Residences Left Across Both Towers",
      sub: "Book a site visit this week and get a flat 5% launch discount plus assured parking.",
      ctaPrimary: "Book Site Visit",
      ctaSecondary: "Call Sales Team",
      phone: "+91 90000 12345",
    }, { colors: { bg: "#111827", overlay: "rgba(17,24,39,0.35)", gradient: "linear-gradient(120deg, #6D5DFC 0%, #5A4BE0 40%, #111827 100%)", text: "#ffffff" }, layout: { width: "full", height: "auto", align: "center", direction: "column" } }),
    sec("sticky-cta", "Sticky CTA", "Compass", { text: "3 & 4 BHK FROM ₹1.25 Cr", ctaLabel: "Book Site Visit", phone: "+91 90000 12345", whatsapp: "+91 90000 12345" }, { colors: { bg: "#ffffff", text: "#111827" } }),
  ];
}

function villaSections(): SectionInstance[] {
  return [
    sec("announcement", "Announcement Bar", "Megaphone", { text: "Private gated community · only 48 villas on 12 acres.", linkLabel: "Enquire", link: "#lead" }, { colors: { bg: "#0f3d38", text: "#ecfdf5" }, spacing: { padding: { top: 10, right: 24, bottom: 10, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }),
    sec(
      "hero",
      "Hero Banner",
      "LayoutPanelTop",
      {
        eyebrow: "WHITEFIELD · GATED ESTATE",
        heading: "Independent Villas with Private Gardens",
        subheading: "4 & 5 BHK residences on 30–45 ft plots",
        price: "₹3.40 Cr",
        priceLabel: "STARTING FROM",
        heroArt: "villa",
        accent: "#34d399",
        priceNote: "Freehold · Possession Mar 2028",
        ctaPrimary: "Schedule Estate Tour",
        ctaSecondary: "View Master Plan",
        highlights: ["Private Pool Options", "12 Acre Campus", "Gated Security", "Clubhouse", "Wide Internal Roads"],
        heroStats: [
          { value: "4 & 5 BHK", label: "Villas" },
          { value: "48", label: "Homes" },
          { value: "12 Ac", label: "Estate" },
          { value: "Mar 2028", label: "Possession" },
        ],
      },
      {
        colors: { bg: "#06201e", overlay: "rgba(6,32,30,0.48)", text: "#ffffff" },
        layout: { width: "full", height: "vh", fixedHeight: 760, align: "left", direction: "column", justify: "center", alignItems: "flex-start" },
        spacing: { padding: { top: 150, right: 0, bottom: 110, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 16 },
      },
    ),
    sec("highlights", "Estate Highlights", "Award", {
      items: [
        { icon: "LandPlot", value: "12 Ac", label: "Gated Campus" },
        { icon: "Leaf", value: "40%", label: "Open Greens" },
        { icon: "Car", value: "40 ft", label: "Internal Roads" },
        { icon: "ShieldCheck", value: "RERA", label: "Approved" },
        { icon: "Sun", value: "E–W", label: "Vastu Plots" },
      ],
    }, { colors: { bg: "#f0fdf4", text: "#111827" }, spacing: { padding: { top: 28, right: 24, bottom: 28, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 24 } }),
    sec("overview", "Estate Overview", "Building2", {
      eyebrow: "The Estate",
      heading: "A Quiet Address, Designed for Family Life",
      text: "Palm Grove is a low-density villa community in Whitefield. Each home sits on its own plot with a garden, optional plunge pool and a clubhouse that feels like a boutique resort rather than a high-rise podium.",
      bullets: ["Independent villas — no shared walls", "Rainwater harvesting on every plot", "Dedicated servant quarters on 5 BHK"],
      stats: [
        { value: "48", label: "Villas" },
        { value: "G+2", label: "Elevation" },
        { value: "Mar 2028", label: "Handover" },
      ],
      image: "villa",
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("amenities", "Estate Amenities", "Dumbbell", {
      eyebrow: "Club & Landscape",
      heading: "Amenities That Belong Outdoors",
      text: "The clubhouse and gardens are sized for a 48-home community — never crowded, always maintained.",
      items: [
        { icon: "SwimmingPool", title: "Resort Pool", desc: "Adult lap pool plus kids’ splash zone" },
        { icon: "Leaf", title: "Orchard Walk", desc: "Fruit trees and a shaded jogging loop" },
        { icon: "Dumbbell", title: "Wellness Barn", desc: "Gym opening onto the lawn" },
        { icon: "Trophy", title: "Club Pavilion", desc: "Dining, library and party lawn" },
        { icon: "Car", title: "EV Ready", desc: "Charger on every driveway" },
        { icon: "ShieldCheck", title: "Manhattan Security", desc: "Single-entry boom with ANPR" },
      ],
    }, { colors: { bg: "#f7f5ef", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("master-plan", "Master Plan", "Map", {
      heading: "Estate Master Plan",
      text: "48 plots arranged around a central green with 40-ft spine roads and 30-ft secondary lanes.",
      image: "garden",
      items: [
        { title: "Central green", text: "2.1 acres of shared landscape" },
        { title: "Club cluster", text: "North edge, away from residences" },
        { title: "Service spine", text: "Hidden utilities along the west edge" },
      ],
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("pricing", "Villa Pricing", "Wallet", {
      eyebrow: "Typologies",
      heading: "Plots & Villa Sizes",
      text: "Choose a 4 BHK garden villa or a 5 BHK pool villa. Land is freehold.",
      plans: [
        { name: "4 BHK Garden", area: "3,200 sq.ft", price: "₹3.40 Cr", per: "Onwards", features: ["30×40 plot", "Garden", "4 Bath", "2 Car"], cta: "Hold This Plot", featured: false },
        { name: "4 BHK Corner", area: "3,450 sq.ft", price: "₹3.85 Cr", per: "Onwards", features: ["30×50 plot", "Side lawn", "Study", "3 Car"], cta: "Hold This Plot", featured: true },
        { name: "5 BHK Pool", area: "4,200 sq.ft", price: "₹4.90 Cr", per: "Onwards", features: ["40×60 plot", "Plunge pool", "Home office", "4 Car"], cta: "Request Brochure", featured: false },
      ],
    }, { colors: { bg: "#ecfdf5", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("gallery", "Estate Gallery", "Images", {
      eyebrow: "Gallery",
      heading: "Villas, Gardens & Club",
      text: "A quieter visual language — timber, limewash and tropical planting.",
      images: ["villa", "garden", "pool", "interior", "lobby", "tower"],
      columns: 3,
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("location-advantages", "Location", "Navigation", {
      eyebrow: "Whitefield",
      heading: "Close to Work. Far from the Rush.",
      text: "Set behind ITPL Main Road, with schools and hospitals within a short drive and no high-rise neighbours.",
      items: [
        { icon: "Building2", title: "ITPL", meta: "4.8 km" },
        { icon: "School", title: "Vydehi School", meta: "3.2 km" },
        { icon: "Hospital", title: "Manipal Whitefield", meta: "5.1 km" },
        { icon: "Store", title: "Phoenix Marketcity", meta: "7.4 km" },
        { icon: "TrainFront", title: "Whitefield Metro", meta: "6.0 km" },
        { icon: "LandPlot", title: "Varthur Lake", meta: "2.1 km" },
      ],
      mapAddress: "Whitefield, Bangalore",
    }, { colors: { bg: "#f7f5ef", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("testimonials", "Testimonials", "Quote", {
      eyebrow: "Residents",
      heading: "Families Who Chose Space Over Height",
      items: [
        { name: "Meera & Vikram Rao", role: "4 BHK Garden Villa", quote: "We wanted a garden our children could actually use. Palm Grove delivered that without leaving the city.", rating: 5 },
        { name: "Sanjay Iyer", role: "5 BHK Pool Villa", quote: "The density is honest — 48 homes, not 480. You feel it the moment you enter the gate.", rating: 5 },
        { name: "Anita Kapoor", role: "Corner 4 BHK", quote: "The estate tour was unhurried. We held a plot the same afternoon.", rating: 5 },
      ],
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("lead-form", "Estate Enquiry", "Send", {
      heading: "Request an Estate Tour",
      text: "A relationship manager will confirm a private walkthrough within one business day.",
      button: "Request Tour",
      fields: ["name", "phone", "email"],
    }, { colors: { bg: "#06201e", text: "#ecfdf5" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("sticky-cta", "Sticky CTA", "Compass", { text: "VILLAS FROM ₹3.40 Cr · 12 ACRE ESTATE", ctaLabel: "Schedule Tour", phone: "+91 90000 33445", whatsapp: "+91 90000 33445" }, { colors: { bg: "#ffffff", text: "#111827" } }),
  ];
}

function commercialSections(): SectionInstance[] {
  return [
    sec("announcement", "Announcement Bar", "Megaphone", { text: "Pre-lease now — 1.2 lakh sq.ft Grade-A office ready Q4 2027.", linkLabel: "", link: "#lead" }, { colors: { bg: "#1c1917", text: "#fde68a" }, spacing: { padding: { top: 10, right: 24, bottom: 10, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }),
    sec(
      "hero",
      "Hero Banner",
      "LayoutPanelTop",
      {
        eyebrow: "ORR · GRADE A CAMPUS",
        heading: "Aether Business Park",
        subheading: "Office, retail and F&B on Outer Ring Road",
        price: "₹125 / sq.ft",
        priceLabel: "LEASE STARTING",
        heroArt: "commercial",
        accent: "#f59e0b",
        priceNote: "Warm shell · 9 ft floor-to-floor · LEED Gold targeted",
        ctaPrimary: "Request Floor Plate",
        ctaSecondary: "Download Specs",
        highlights: ["LEED Gold", "3 Basements", "Dedicated Drop-off", "Retail Podium", "100% Power Backup"],
        heroStats: [
          { value: "1.2 L", label: "Sq.ft" },
          { value: "G+14", label: "Office Tower" },
          { value: "ORR", label: "Frontage" },
          { value: "Q4 2027", label: "Ready" },
        ],
      },
      {
        colors: { bg: "#1c1917", overlay: "rgba(28,25,23,0.5)", text: "#ffffff" },
        layout: { width: "full", height: "vh", fixedHeight: 740, align: "left", direction: "column", justify: "center", alignItems: "flex-start" },
        spacing: { padding: { top: 150, right: 0, bottom: 100, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 16 },
      },
    ),
    sec("highlights", "Park Highlights", "Award", {
      items: [
        { icon: "Building2", value: "1.2 L", label: "Leasable Sq.ft" },
        { icon: "Car", value: "1:500", label: "Parking Ratio" },
        { icon: "Gauge", value: "9 ft", label: "Floor Height" },
        { icon: "ShieldCheck", value: "LEED", label: "Gold Target" },
        { icon: "TrainFront", value: "350 m", label: "Metro" },
      ],
    }, { colors: { bg: "#fffbeb", text: "#111827" }, spacing: { padding: { top: 28, right: 24, bottom: 28, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 24 } }),
    sec("overview", "Campus Overview", "Building2", {
      eyebrow: "The Campus",
      heading: "A Workplace That Signals Intent",
      text: "Aether is a single-tower Grade-A campus with a two-level retail podium, triple-height lobby and column-free typical floors of 18,500 sq.ft. Designed for GCCs, product companies and boutique funds.",
      bullets: ["Column-free typical plates", "Dedicated service core", "Separate F&B service lift"],
      stats: [
        { value: "18.5k", label: "Sq.ft / floor" },
        { value: "3", label: "Basements" },
        { value: "LEED", label: "Gold" },
      ],
      image: "commercial",
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("specifications", "Specifications", "Gauge", {
      heading: "Technical Specifications",
      items: [
        { title: "Structure", text: "RCC with 4.5 kN/sq.m live load" },
        { title: "HVAC", text: "VRV ready, tenant-metered" },
        { title: "Power", text: "8 W/sq.ft + 100% DG backup" },
        { title: "IT", text: "Two fibre entry points" },
        { title: "Façade", text: "Unitised DGU, 6+12+6" },
        { title: "Lifts", text: "6 passenger + 2 service" },
      ],
    }, { colors: { bg: "#fafaf9", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("floorplans", "Floor Plates", "Grid", {
      eyebrow: "Availability",
      heading: "Typical Floor Plates",
      text: "Lease a full floor or a 6,000 sq.ft demi-plate. Warm shell handover.",
      plans: [
        { name: "Full Plate", beds: "1", area: "18,500 sq.ft", price: "₹125 / sq.ft" },
        { name: "Demi A", beds: "1", area: "9,200 sq.ft", price: "₹128 / sq.ft" },
        { name: "Demi B", beds: "1", area: "9,300 sq.ft", price: "₹128 / sq.ft" },
        { name: "Retail Bay", beds: "G", area: "1,800 sq.ft", price: "₹220 / sq.ft" },
      ],
      note: "CAM extra. Lock-in 5 years on office.",
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("gallery", "Campus Gallery", "Images", {
      eyebrow: "Gallery",
      heading: "Lobby, Plates & Podium",
      text: "Stone lobby, unitised façade and a landscaped drop-off.",
      images: ["commercial", "lobby", "tower", "interior", "garden", "skyline"],
      columns: 3,
    }, { colors: { bg: "#fafaf9", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("location-advantages", "Connectivity", "Navigation", {
      eyebrow: "Outer Ring Road",
      heading: "On the Corridor Your Teams Already Use",
      text: "350 m from the metro, with Bellandur, Sarjapur and Marathahalli in a single commute pattern.",
      items: [
        { icon: "TrainFront", title: "Bellandur Metro", meta: "350 m" },
        { icon: "Building2", title: "Embassy Tech Village", meta: "2.2 km" },
        { icon: "Car", title: "Sarjapur Signal", meta: "1.8 km" },
        { icon: "Store", title: "Central Mall", meta: "3.4 km" },
        { icon: "Hospital", title: "Sakra World", meta: "4.1 km" },
        { icon: "LandPlot", title: "Kempfort", meta: "5.0 km" },
      ],
      mapAddress: "Outer Ring Road, Bangalore",
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("builder-profile", "Developer", "Building2", {
      heading: "Aether Estates",
      text: "18 million sq.ft delivered across office and mixed-use in Bengaluru, Hyderabad and Pune.",
      items: [
        { title: "18 Mn", text: "Sq.ft delivered" },
        { title: "42", text: "Institutional tenants" },
        { title: "12 yr", text: "Track record" },
      ],
    }, { colors: { bg: "#1c1917", text: "#fafaf9" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("lead-form", "Tenant Enquiry", "Send", {
      heading: "Request a Floor Plate Pack",
      text: "Share your requirement and a leasing manager will send CAD, rent stack and a site slot.",
      button: "Send Requirement",
      fields: ["name", "phone", "email"],
    }, { colors: { bg: "#fffbeb", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("sticky-cta", "Sticky CTA", "Compass", { text: "GRADE-A OFFICE FROM ₹125 / SQ.FT", ctaLabel: "Enquire", phone: "+91 90000 77881", whatsapp: "+91 90000 77881" }, { colors: { bg: "#ffffff", text: "#111827" } }),
  ];
}

function launchSections(): SectionInstance[] {
  return [
    sec("announcement", "Announcement Bar", "Megaphone", { text: "Founders’ list opens Friday 6 PM — 40 homes only.", linkLabel: "Join list", link: "#lead" }, { colors: { bg: "#4a044e", text: "#fce7f3" }, spacing: { padding: { top: 10, right: 24, bottom: 10, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }),
    sec("countdown", "Countdown Timer", "Timer", {
      heading: "Founders’ List Closes In",
      date: "2026-08-28",
      items: [
        { title: "02", text: "Days" },
        { title: "14", text: "Hours" },
        { title: "37", text: "Minutes" },
        { title: "08", text: "Seconds" },
      ],
    }, { colors: { bg: "#2e1065", text: "#fdf4ff" }, spacing: { padding: { top: 28, right: 24, bottom: 28, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 16 } }),
    sec(
      "hero",
      "Hero Banner",
      "LayoutPanelTop",
      {
        eyebrow: "NEW LAUNCH · HEBBAL",
        heading: "Northstar Residences — Preview Night",
        subheading: "2.5 & 3 BHK. First 40 bookings lock today’s price.",
        price: "₹89 L",
        priceLabel: "FOUNDERS’ PRICE FROM",
        heroArt: "tour",
        accent: "#e879f9",
        priceNote: "Price steps up after the founders’ window",
        ctaPrimary: "Join Founders’ List",
        ctaSecondary: "Get Offer PDF",
        highlights: ["₹89 L lock-in", "No PLC this weekend", "Assured parking", "RERA filed"],
        heroStats: [
          { value: "40", label: "Founders’ homes" },
          { value: "2.5–3 BHK", label: "Plans" },
          { value: "Hebbal", label: "Location" },
          { value: "2029", label: "Possession" },
        ],
      },
      {
        colors: { bg: "#24022a", overlay: "rgba(36,2,42,0.5)", text: "#ffffff" },
        layout: { width: "full", height: "vh", fixedHeight: 720, align: "left", direction: "column", justify: "center", alignItems: "flex-start" },
        spacing: { padding: { top: 140, right: 0, bottom: 90, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 16 },
      },
    ),
    sec("offer-banner", "Offer Banner", "Gift", {
      heading: "Weekend-only founders’ stack",
      text: "Price freeze + waived PLC + 1 year CAM credit. Expires when the 40-home list fills.",
      cta: "Claim my slot",
    }, { colors: { bg: "#c026d3", text: "#ffffff" }, spacing: { padding: { top: 22, right: 24, bottom: 22, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 12 } }),
    sec("highlights", "Launch Highlights", "Award", {
      items: [
        { icon: "Rocket", value: "40", label: "Founders’ Units" },
        { icon: "Wallet", value: "₹89 L", label: "From" },
        { icon: "Gift", value: "PLC", label: "Waived" },
        { icon: "ShieldCheck", value: "RERA", label: "Filed" },
        { icon: "Timer", value: "72 h", label: "Window" },
      ],
    }, { colors: { bg: "#fdf4ff", text: "#111827" }, spacing: { padding: { top: 24, right: 24, bottom: 24, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 24 } }),
    sec("overview", "The Launch", "Building2", {
      eyebrow: "Why this weekend",
      heading: "The First Release Is the Cheapest Release",
      text: "Northstar is a 2-tower launch in Hebbal. The founders’ list is a genuine 40-home tranche at today’s ticket — after Friday the stack moves to public pricing.",
      bullets: ["Token of ₹1 L holds the unit 7 days", "Plans from 1,120 sq.ft", "Direct Hebbal flyover access"],
      stats: [
        { value: "2", label: "Towers" },
        { value: "240", label: "Total homes" },
        { value: "2029", label: "Handover" },
      ],
      image: "tour",
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("pricing", "Founders’ Pricing", "Wallet", {
      eyebrow: "This weekend only",
      heading: "Lock These Tickets",
      text: "Public list will be ₹6–9 L higher per unit.",
      plans: [
        { name: "2.5 BHK", area: "1,120 sq.ft", price: "₹89 L", per: "Founders’", features: ["2.5 Bed", "2 Bath", "Balcony", "1 Parking"], cta: "Hold Unit", featured: false },
        { name: "3 BHK", area: "1,410 sq.ft", price: "₹1.12 Cr", per: "Founders’", features: ["3 Bed", "3 Bath", "Utility", "1 Parking"], cta: "Hold Unit", featured: true },
        { name: "3 BHK Corner", area: "1,520 sq.ft", price: "₹1.24 Cr", per: "Founders’", features: ["Corner", "Dual balcony", "2 Parking"], cta: "Hold Unit", featured: false },
      ],
    }, { colors: { bg: "#faf5ff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("gallery", "Preview Gallery", "Images", {
      eyebrow: "Lookbook",
      heading: "Renders from the launch deck",
      text: "Lobby, typical living and the Hebbal skyline.",
      images: ["tour", "interior", "lobby", "tower", "skyline", "pool"],
      columns: 3,
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("faq", "FAQ", "Tabs", {
      eyebrow: "Before you join",
      heading: "Founders’ List FAQ",
      items: [
        { q: "Is the ₹89 L price real?", a: "Yes. It applies only to the first 40 expressions of interest that complete token." },
        { q: "What if the list fills?", a: "You move to the waitlist at public pricing. We text you either way." },
        { q: "Can I cancel the token?", a: "Token is refundable within 7 days if you do not select a unit." },
      ],
    }, { colors: { bg: "#fdf4ff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("multistep-form", "Join the List", "Table2", {
      eyebrow: "Founders’ list",
      heading: "Reserve Your Slot",
      sub: "Takes under 45 seconds. We WhatsApp the offer PDF immediately.",
      steps: ["You", "Budget", "Confirm"],
      button: "Join Founders’ List",
      fields: [
        { type: "text", label: "Full Name", placeholder: "Your name" },
        { type: "phone", label: "WhatsApp", placeholder: "+91" },
        { type: "select", label: "Plan", options: ["2.5 BHK", "3 BHK", "Corner 3 BHK"] },
      ],
      action: "whatsapp",
      actionLabel: "Send on WhatsApp",
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("cta-banner", "CTA Banner", "MousePointerClick", {
      eyebrow: "40 homes",
      heading: "Don’t Watch This List Fill from the Sidelines",
      sub: "Join now. If the tranche is gone, we’ll say so in the same thread.",
      ctaPrimary: "Join Founders’ List",
      ctaSecondary: "Call Launch Desk",
      phone: "+91 90000 88990",
    }, { colors: { bg: "#4a044e", overlay: "", gradient: "linear-gradient(120deg, #c026d3 0%, #6d28d9 50%, #24022a 100%)", text: "#ffffff" }, layout: { width: "full", height: "auto", align: "center", direction: "column" } }),
    sec("sticky-cta", "Sticky CTA", "Compass", { text: "FOUNDERS’ PRICE FROM ₹89 L · 40 HOMES", ctaLabel: "Join List", phone: "+91 90000 88990", whatsapp: "+91 90000 88990" }, { colors: { bg: "#ffffff", text: "#111827" } }),
  ];
}
