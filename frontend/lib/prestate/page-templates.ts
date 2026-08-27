import type { SectionInstance, SectionStyle, TemplateData } from "./types";

function uid(prefix = "sec"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const defaultStyle = (over?: Partial<SectionStyle>): SectionStyle => ({
  colors: { bg: "transparent", overlay: "", gradient: "", text: "" },
  typography: {},
  // Premium spacing: generous vertical whitespace, readable container padding
  spacing: { padding: { top: 80, right: 24, bottom: 80, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 24 },
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

// ---------------------------------------------------------------------------
// Template catalog — four conversion-focused advertising layouts
// ---------------------------------------------------------------------------

export const PAGE_TEMPLATES: TemplateData[] = [
  {
    id: "tpl-estatepro",
    name: "EstatePro Premium",
    category: "Premium",
    icon: "Building2",
    pages: 24,
    conversions: "14.6%",
    accent: "#c99a45",
    accent2: "#0b1220",
    thumbnail: "hero",
    description:
      "Conversion-focused luxury real-estate ads page — hero with inline enquiry, live EMI calculator, amenities, gallery, location, floor plans, trust and FAQ sections.",
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

/** Map any legacy/template name onto the current catalog. */
export function inferDesignId(template: string): string {
  const key = template.trim().toLowerCase();
  if (key === "tpl-blank" || key.includes("scratch") || key === "blank" || key === "custom") return "tpl-blank";
  return "tpl-estatepro";
}

export function buildTemplateSections(idOrName: string): SectionInstance[] {
  const key = idOrName.trim().toLowerCase();
  if (key === "tpl-blank" || key.includes("scratch") || key === "blank") return [];
  return estateProSections();
}

// ---------------------------------------------------------------------------
// Template 1 — Premium Property
// Hero → Overview → Highlights → Gallery → Amenities → Pricing → Location →
// Testimonials → Enquiry → Brochure CTA
// ---------------------------------------------------------------------------

function premiumSections(): SectionInstance[] {
  return [
    sec(
      "hero",
      "Hero Banner",
      "LayoutPanelTop",
      {
        eyebrow: "RERA APPROVED • SARJAPUR ROAD",
        heading: "Premium 3 & 4 BHK Residences in Bangalore",
        subheading: "Two sculpted towers on a 2.5-acre landscaped campus",
        price: "{{starting_price}}",
        priceLabel: "STARTING FROM",
        heroArt: "hero",
        accent: "#cda45e",
        priceNote: "All-inclusive · Possession Dec 2027",
        primaryAction: "link",
        primaryLink: "#enquiry",
        ctaPrimary: "Book Site Visit",
        secondaryAction: "brochure",
        ctaSecondary: "Download Brochure",
        highlights: ["25+ Amenities", "RERA Approved", "Metro Connectivity"],
        heroStats: [
          { value: "3 & 4 BHK", label: "Configurations" },
          { value: "312", label: "Residences" },
          { value: "2.5 Ac", label: "Campus" },
          { value: "Dec 2027", label: "Possession" },
        ],
        gateHeading: "Get the Aurora brochure",
        gateText: "Share your details — the PDF downloads instantly.",
      },
      {
        colors: { bg: "#101322", overlay: "rgba(10,13,28,0.52)", text: "#ffffff" },
        layout: { width: "full", height: "vh", fixedHeight: 760, align: "center", direction: "column", justify: "center", alignItems: "center" },
        spacing: { padding: { top: 150, right: 0, bottom: 110, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 16 },
      },
    ),
    sec("overview", "Property Overview", "Building2", {
      eyebrow: "About the Project",
      heading: "A New Address for Elevated Living",
      text: "Two sculpted towers rising over a 2.5-acre landscaped campus on Sarjapur Road. Every residence is designed around light, space and privacy — with 3 & 4 BHK homes up to 2,450 sq.ft.",
      bullets: ["Dual-height lobby with concierge", "Vastu-compliant layouts", "Smart home automation in every residence"],
      stats: [
        { value: "312", label: "Residences" },
        { value: "28", label: "Floors" },
        { value: "70%", label: "Open Space" },
      ],
      image: "overview",
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("highlights", "Key Highlights", "Award", {
      items: [
        { icon: "SwimmingPool", value: "25+", label: "Resort Amenities" },
        { icon: "ShieldCheck", value: "RERA", label: "Approved Project" },
        { icon: "TrainFront", value: "500 m", label: "To Metro" },
        { icon: "LandPlot", value: "2.5 Ac", label: "Green Campus" },
        { icon: "CalendarClock", value: "2027", label: "Possession" },
      ],
    }, { colors: { bg: "#f8fafc", text: "#111827" }, spacing: { padding: { top: 26, right: 24, bottom: 26, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 24 } }),
    sec("gallery", "Project Gallery", "Images", {
      eyebrow: "Gallery",
      heading: "Step Inside the Residences",
      text: "Towers, amenity deck and landscaped campus — captured in natural light.",
      images: ["skyline", "lobby", "pool", "tower", "garden", "interior"],
      columns: 3,
      lightbox: true,
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("amenities", "Amenities", "Dumbbell", {
      eyebrow: "Lifestyle",
      heading: "25+ Resort-Grade Amenities",
      text: "Four levels of leisure, wellness and recreation — curated for every generation.",
      items: [
        { icon: "SwimmingPool", title: "Infinity Pool", desc: "Temperature-controlled lap pool" },
        { icon: "Dumbbell", title: "Gymnasium", desc: "Strength & cardio equipment" },
        { icon: "Music", title: "Sky Lounge", desc: "Panoramic city views" },
        { icon: "Leaf", title: "Yoga Deck", desc: "Morning wellness sessions" },
        { icon: "Trophy", title: "Clubhouse", desc: "6,000 sq.ft member clubhouse" },
        { icon: "Sun", title: "Spa & Steam", desc: "Rejuvenation suites" },
        { icon: "BookOpen", title: "Reading Lounge", desc: "Quiet curated library" },
        { icon: "Car", title: "EV Charging", desc: "Every parking bay ready" },
      ],
    }, { colors: { bg: "#f8fafc", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("pricing", "Pricing Table", "Wallet", {
      eyebrow: "Investment",
      heading: "Transparent Pricing",
      text: "Flexible payment plans from all major banks. Prices all-inclusive.",
      plans: [
        { name: "3 BHK", area: "1,650 sq.ft", price: "₹1.25 Cr", per: "onwards", features: ["3 Bedrooms", "3 Bathrooms", "2 Parking", "Clubhouse Access"], cta: "Enquire Now", featured: false },
        { name: "4 BHK", area: "2,450 sq.ft", price: "₹1.95 Cr", per: "onwards", features: ["4 Bedrooms", "Large Balcony", "2 Parking", "Smart Home"], cta: "Enquire Now", featured: true },
        { name: "Penthouse", area: "3,100 sq.ft", price: "₹3.20 Cr", per: "onwards", features: ["Private Elevator", "Sky Deck", "3 Parking", "Private Pool"], cta: "Request Callback", featured: false },
      ],
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("location-advantages", "Location & Map", "Navigation", {
      address: "Sarjapur Road, Bangalore",
      zoom: 14,
      eyebrow: "Location",
      heading: "Everything Within Reach",
      text: "Schools, hospitals, malls and the metro — minutes from your door.",
      items: [
        { icon: "School", title: "Greenwood High", meta: "2.4 km" },
        { icon: "Hospital", title: "Columbia Asia", meta: "2.8 km" },
        { icon: "TrainFront", title: "Metro Station", meta: "500 m" },
        { icon: "Store", title: "Signature Mall", meta: "3.1 km" },
      ],
    }, { colors: { bg: "#f8fafc", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("testimonials", "Testimonials", "Quote", {
      eyebrow: "What Homebuyers Say",
      heading: "Loved by Families Like Yours",
      items: [
        { name: "Rahul & Ananya Sharma", role: "Booked 4 BHK · Tower B", quote: "The transparency on pricing and construction quality sold us instantly.", rating: 5 },
        { name: "Kavitha Reddy", role: "Booked 3 BHK · Tower A", quote: "The amenity deck and 500m metro access made the decision easy.", rating: 5 },
        { name: "Amit & Neha Joshi", role: "Booked 3 BHK + Study", quote: "From virtual tour to booking, every step was seamless.", rating: 5 },
      ],
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("lead-form", "Form", "Send", {}, { colors: { bg: "#f4f2ff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("brochure", "Brochure Download", "FileText", {
      heading: "Download Project Brochure",
      title: "Download Brochure",
      file: "/brochure/aurora.pdf",
      text: "Floor plans, specifications, pricing sheet and payment plans — one PDF.",
      gateEnabled: true,
      gateHeading: "Get the Aurora brochure",
      gateText: "Share your details — the download starts instantly.",
      gateButton: "Submit & Download",
      gateSuccessMessage: "Verified — your brochure is downloading.",
    }, { colors: { bg: "#ffffff", text: "#111827" }, spacing: { padding: { top: 40, right: 24, bottom: 64, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("sticky-cta", "Sticky CTA", "Compass", { text: "3 & 4 BHK FROM ₹1.25 CR · SARJAPUR ROAD", ctaLabel: "Book Site Visit", phone: "+91 90000 12345" }, { colors: { bg: "#ffffff", text: "#111827" } }),
  ];
}

// ---------------------------------------------------------------------------
// Template 2 — Lead Generation
// Hero + Lead Form → Key Benefits → Pricing → Property Features → Gallery →
// Location → Offer/Countdown → FAQ → Final CTA
// ---------------------------------------------------------------------------

function leadGenSections(): SectionInstance[] {
  return [
    // Split hero: nested container > row > two columns (copy | inline form)
    {
      ...sec(
        "container",
        "Split Hero Container",
        "Box",
        { width: "1200px", align: "center" },
        {
          colors: { bg: "#0b1220", overlay: "", gradient: "", text: "#eef2ff", image: "/prestate/hero-aurora.jpg" },
          spacing: { padding: { top: 120, right: 32, bottom: 90, left: 32 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 20 },
          layout: { width: "full", height: "fixed", fixedHeight: 720, align: "center", direction: "column" },
        },
      ),
      children: [
        sec("heading", "Hero Heading", "Type", { text: "Northstar Residences — Founders' Preview", tag: "h1", size: 44, align: "left" }, { colors: { bg: "transparent", text: "#ffffff" }, spacing: { padding: { top: 0, right: 0, bottom: 8, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }),
        sec("text", "Hero Subtext", "AlignLeft", { text: "2.5 & 3 BHK homes in Hebbal from ₹89 L*. First 40 bookings lock today's price — join the founders' list." }, { colors: { bg: "transparent", text: "rgba(238,242,255,.85)" }, spacing: { padding: { top: 0, right: 0, bottom: 18, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }),
        {
          ...sec("row", "Hero Row", "Rows", { gap: 28, columns: 2 }, {
            colors: { bg: "transparent", text: "#eef2ff" },
            spacing: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 28 },
            layout: { width: "full", height: "auto", align: "left", direction: "row" },
          }),
          children: [
            {
              ...sec("column", "Copy Column", "Columns", { width: 55 }, {
                colors: { bg: "transparent", text: "#eef2ff" },
                spacing: { padding: { top: 8, right: 8, bottom: 8, left: 8 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 12 },
              }),
              children: [
                sec("highlights", "Trust Chips", "Award", { items: [
                  { icon: "Wallet", value: "₹89 L", label: "Founders' Price" },
                  { icon: "Gift", value: "PLC", label: "Waived" },
                  { icon: "ShieldCheck", value: "RERA", label: "Filed" },
                ] }, { colors: { bg: "transparent", text: "#eef2ff" }, spacing: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 12 } }),
                sec("text", "Proof Line", "AlignLeft", { text: "★ Rated 4.8 by 1,240+ buyers who booked through this page." }, { colors: { bg: "transparent", text: "rgba(238,242,255,.7)" }, spacing: { padding: { top: 10, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }),
              ],
            },
            {
              ...sec("column", "Form Column", "Columns", { width: 45 }, {
                colors: { bg: "transparent", text: "#eef2ff" },
                spacing: { padding: { top: 8, right: 8, bottom: 8, left: 8 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 12 },
              }),
              children: [
                sec("lead-form", "Form", "Send", {}, { colors: { bg: "#ffffff", text: "#111827" }, border: { radius: 16 }, effects: { shadow: "0 24px 60px rgba(2,6,23,.5)" }, spacing: { padding: { top: 22, right: 22, bottom: 22, left: 22 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 12 } }),
              ],
            },
          ],
        },
      ],
    },
    sec("features", "Key Benefits", "BadgeCheck", {
      heading: "Why Buyers Convert With Northstar",
      items: [
        { title: "Price lock-in", text: "Founders' pricing frozen for 72 hours after you enquire." },
        { title: "Zero PLC weekend", text: "No preferential-location charge on the first release." },
        { title: "Assured parking", text: "Every founders' home comes with a bundled bay." },
        { title: "Direct flyover access", text: "Hebbal interchange 4 minutes from the gate." },
        { title: "Bank-approved", text: "SBI, HDFC & ICICI pre-approved projects." },
        { title: "Refundable token", text: "₹1 L token fully refundable for 7 days." },
      ],
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("pricing", "Founders' Pricing", "Wallet", {
      eyebrow: "This weekend only",
      heading: "Lock These Tickets Before Public Launch",
      text: "Public list moves ₹6–9 L higher once the founders' tranche fills.",
      plans: [
        { name: "2.5 BHK", area: "1,120 sq.ft", price: "₹89 L", per: "founders'", features: ["2.5 Bed", "2 Bath", "Balcony", "1 Parking"], cta: "Hold Unit", featured: false },
        { name: "3 BHK", area: "1,410 sq.ft", price: "₹1.12 Cr", per: "founders'", features: ["3 Bed", "3 Bath", "Utility", "1 Parking"], cta: "Hold Unit", featured: true },
        { name: "Corner 3 BHK", area: "1,520 sq.ft", price: "₹1.24 Cr", per: "founders'", features: ["Corner unit", "Dual balcony", "2 Parking"], cta: "Hold Unit", featured: false },
      ],
    }, { colors: { bg: "#eff6ff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("gallery", "Lookbook Gallery", "Images", {
      eyebrow: "Gallery",
      heading: "Renders From the Launch Deck",
      text: "Lobby, typical living and the Hebbal skyline.",
      images: ["tour", "interior", "lobby", "tower", "skyline", "pool"],
      columns: 3,
      lightbox: true,
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("location-advantages", "Location & Map", "Navigation", {
      address: "Hebbal, Bangalore",
      zoom: 13,
      eyebrow: "Location",
      heading: "4 Minutes From the Flyover",
      text: "Hebbal's next landmark address — airport in 35 minutes, ORR in 12.",
      items: [
        { icon: "Car", title: "Hebbal Flyover", meta: "1.2 km" },
        { icon: "Hospital", title: "Aster CMI", meta: "3.0 km" },
        { icon: "Store", title: "Elements Mall", meta: "4.1 km" },
        { icon: "School", title: "Kendriya Vidyalaya", meta: "2.6 km" },
      ],
    }, { colors: { bg: "#f8fafc", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("countdown", "Offer Countdown", "Timer", {
      heading: "Founders' Window Closes In",
      // Live ticking target — falls back to the static items below only when
      // the date is cleared or already past.
      date: "2026-12-31T23:59:00",
      items: [
        { value: "02", label: "Days" },
        { value: "14", label: "Hours" },
        { value: "37", label: "Mins" },
        { value: "08", label: "Secs" },
      ],
    }, { colors: { bg: "#1d4ed8", overlay: "", gradient: "linear-gradient(120deg,#1d4ed8 0%,#2563eb 45%,#0ea5e9 100%)", text: "#ffffff" }, spacing: { padding: { top: 34, right: 24, bottom: 34, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 16 } }),
    sec("faq", "FAQ", "Tabs", {
      eyebrow: "Before you join",
      heading: "Frequently Asked Questions",
      items: [
        { q: "Is the ₹89 L price real?", a: "Yes — it applies to the first 40 expressions of interest that complete token." },
        { q: "What happens after I submit the form?", a: "Our team calls within 15 minutes during working hours and WhatsApps the price sheet." },
        { q: "Can I cancel the token?", a: "The ₹1 L token is refundable within 7 days if no unit is selected." },
        { q: "Is the project RERA registered?", a: "Yes — registration details are printed on every page of the brochure." },
      ],
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("cta-banner", "Final CTA Wall", "MousePointerClick", {
      eyebrow: "40 homes · one list",
      heading: "Don't Watch This List Fill From the Sidelines",
      sub: "Submit the form now — if the tranche is gone we'll tell you honestly on the same call.",
      ctaPrimary: "Get Instant Pricing",
      ctaSecondary: "Call Launch Desk",
      phone: "+91 90000 88990",
    }, { colors: { bg: "#0b1220", overlay: "", gradient: "linear-gradient(120deg,#1d4ed8 0%,#2563eb 50%,#0b1220 100%)", text: "#ffffff" }, layout: { width: "full", height: "auto", align: "center", direction: "column" } }),
    sec("popup", "Exit Popup", "PartyPopper", { popupId: "exit-offer", heading: "Wait — grab the price sheet", text: "Enter your details and we'll WhatsApp the founders' price list before you go.", cta: "", link: "", showForm: true, trigger: "exit", delaySeconds: 0, scrollPercent: 40, urlParam: "offer", oncePerSession: true }),
    sec("sticky-cta", "Sticky CTA", "Compass", { text: "Founders' price from ₹89 L — ends this weekend", ctaLabel: "Get Pricing", link: "#lead-form" }),
  ];
}

// ---------------------------------------------------------------------------
// Template 3 — Luxury Property
// Large Visual Hero → Luxury Highlights → Property Details → Amenities →
// Gallery + Lightbox → Floor Plans → Location → Developer → Testimonials → Enquiry
// ---------------------------------------------------------------------------

function luxeSections(): SectionInstance[] {
  return [
    sec(
      "hero",
      "Cinematic Hero",
      "LayoutPanelTop",
      {
        eyebrow: "THE RESIDENCES AT INDUS",
        heading: "Where the Skyline Becomes Your Address",
        subheading: "Limited-edition sky residences · Whitefield",
        price: "₹4.80 Cr",
        priceLabel: "RESIDENCES FROM",
        heroArt: "skyline",
        accent: "#d4af6a",
        priceNote: "By invitation · Private previews open",
        primaryAction: "link",
        primaryLink: "#enquiry",
        ctaPrimary: "Request Private Preview",
        secondaryAction: "link",
        secondaryLink: "#gallery",
        ctaSecondary: "View the Gallery",
        highlights: ["Sky villas", "Private elevators", "Concierge"],
        heroStats: [
          { value: "4 & 5 BHK", label: "Residences" },
          { value: "86", label: "Homes Only" },
          { value: "G+32", label: "Tower" },
          { value: "2028", label: "Completion" },
        ],
        gateHeading: "Receive the private collection",
        gateText: "Share your details to receive the digital brochure.",
      },
      {
        colors: { bg: "#171310", overlay: "rgba(23,19,16,0.42)", text: "#fdfbf7" },
        layout: { width: "full", height: "vh", fixedHeight: 860, align: "center", direction: "column", justify: "center", alignItems: "center" },
        spacing: { padding: { top: 170, right: 0, bottom: 130, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 16 },
      },
    ),
    sec("stats", "Luxury Highlights", "Gauge", {
      heading: "",
      items: [
        { icon: "Crown", value: "86", label: "Signature Residences" },
        { icon: "ConciergeBell", value: "24×7", label: "White-Glove Concierge" },
        { icon: "Waves", value: "38 M", label: "Sky Deck Pool" },
        { icon: "Leaf", value: "1 Ac", label: "Private Forest Court" },
      ],
      style: "minimal",
    }, { colors: { bg: "#faf7f1", text: "#171310" }, spacing: { padding: { top: 44, right: 24, bottom: 44, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 24 } }),
    sec("property-details", "Property Details", "Gauge", {
      items: [
        { label: "Configuration", value: "4 & 5 BHK Sky Residences" },
        { label: "Super Built-Up", value: "3,400 – 5,200 sq.ft" },
        { label: "Price Range", value: "₹4.80 – ₹8.60 Cr" },
        { label: "Possession", value: "December 2028" },
        { label: "RERA", value: "PRM/KA/RERA/1251/446" },
        { label: "Ownership", value: "Freehold" },
      ],
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("amenities", "Amenities", "Dumbbell", {
      eyebrow: "Curated Living",
      heading: "Amenities Composed Like a Private Club",
      text: "Every space is sized generously and finished by award-winning studios.",
      items: [
        { icon: "Waves", title: "Sky Pool", desc: "38-metre lap pool on level 32" },
        { icon: "ConciergeBell", title: "Concierge", desc: "Curated by a five-star partner" },
        { icon: "Music", title: "Listening Room", desc: "Acoustic lounge & vinyl bar" },
        { icon: "UtensilsCrossed", title: "Chef's Table", desc: "Private dining for twelve" },
        { icon: "Leaf", title: "Forest Court", desc: "Acre-scale native planting" },
        { icon: "Sparkles", title: "Spa Suites", desc: "Treatment rooms & hammam" },
      ],
    }, { colors: { bg: "#faf7f1", text: "#171310" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("gallery", "Gallery + Lightbox", "Images", {
      eyebrow: "Gallery",
      heading: "A Study in Light and Material",
      text: "Click any frame for the full-resolution view.",
      images: ["lobby", "interior", "pool", "garden", "tower", "skyline"],
      columns: 3,
      lightbox: true,
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("floorplans", "Floor Plans", "Grid", {
      eyebrow: "Layouts",
      heading: "Residence Plans",
      text: "Four plan families, each with a private elevator lobby.",
      plans: [
        { name: "4 BHK Grand", beds: "4", area: "3,400 sq.ft", price: "₹4.80 Cr" },
        { name: "4 BHK Wing", beds: "4", area: "4,050 sq.ft", price: "₹5.95 Cr" },
        { name: "5 BHK Signature", beds: "5", area: "5,200 sq.ft", price: "₹8.60 Cr" },
      ],
      note: "Plans are indicative. Detailed CAD sets shared during private previews.",
    }, { colors: { bg: "#faf7f1", text: "#171310" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("location-advantages", "Location", "Navigation", {
      eyebrow: "Whitefield",
      heading: "An Address That Precedes You",
      text: "Set along the palm avenue of Whitefield's quiet quarter — minutes from the city's best schools, clubs and the tech corridor.",
      items: [
        { icon: "School", title: "Inventure Academy", meta: "3.5 km" },
        { icon: "Store", title: "VR Bengaluru", meta: "6.0 km" },
        { icon: "Hospital", title: "Manipal Hospital", meta: "5.2 km" },
        { icon: "TrainFront", title: "Metro Purple Line", meta: "4.8 km" },
        { icon: "Building2", title: "ITPL Tech Park", meta: "7.4 km" },
        { icon: "Car", title: "Airport Expressway", meta: "18 km" },
      ],
      mapAddress: "Whitefield, Bangalore",
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("builder-profile", "Developer", "Building2", {
      heading: "Indus Estates",
      text: "Three decades of landmark residences across Bengaluru, Mumbai and Goa. Indus builds fewer than 300 homes a year — each finished to a private-collection standard.",
      items: [
        { title: "30 yr", text: "Legacy" },
        { title: "4.6 Mn", text: "Sq.ft delivered" },
        { title: "96%", text: "On-time handover" },
      ],
    }, { colors: { bg: "#171310", text: "#faf7f1" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("testimonials", "Testimonials", "Quote", {
      eyebrow: "Residents",
      heading: "Words From Our First Homeowners",
      items: [
        { name: "Meera Alva", role: "4 BHK Grand · Level 24", quote: "The privacy planning is exceptional — you never hear a neighbour.", rating: 5 },
        { name: "Arjun Khanna", role: "5 BHK Signature · Penthouse", quote: "Materials you'd expect in Europe, delivered here on schedule.", rating: 5 },
      ],
    }, { colors: { bg: "#faf7f1", text: "#171310" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("lead-form", "Form", "Send", {}, { colors: { bg: "#171310", overlay: "", gradient: "linear-gradient(140deg,#171310 0%,#33261a 100%)", text: "#fdfbf7" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("call-cta", "WhatsApp Concierge", "MessageCircle", { mode: "whatsapp",  text: "Prefer to chat? Message the concierge desk", number: "+91 90000 55555", ctaLabel: "Chat on WhatsApp" }, { spacing: { padding: { top: 0, right: 24, bottom: 56, left: 24 }, margin: { top: -36, right: 0, bottom: 0, left: 0 }, gap: 12 }, layout: { width: "full", height: "auto", align: "center", direction: "column" }, colors: { bg: "#171310", text: "#fdfbf7" } }),
    sec("popup", "Preview Popup", "PartyPopper", { popupId: "preview-invite", heading: "Private previews are filling", text: "Leave your number and the concierge will confirm a slot this week.", cta: "", link: "", showForm: true, trigger: "delay", delaySeconds: 12, scrollPercent: 55, urlParam: "invite", oncePerSession: true }),
    sec("sticky-cta", "Sticky CTA", "Compass", { text: "SKY RESIDENCES FROM ₹4.80 CR · WHITEFIELD", ctaLabel: "Request Preview", phone: "+91 90000 55555" }, { colors: { bg: "#171310", text: "#fdfbf7" } }),
  ];
}

// ---------------------------------------------------------------------------
// Template 4 — Ad Campaign Landing Page
// Ad-focused Hero → Offer/Urgency → Property Statistics → Configuration →
// Lifestyle Benefits → Gallery → Connectivity → FAQ → Lead Form →
// Brochure Download → Final CTA
// ---------------------------------------------------------------------------

function adCampaignSections(): SectionInstance[] {
  return [
    sec("announcement", "Announcement Bar", "Megaphone", { text: "⚡ AD CAMPAIGN SPECIAL — Flat ₹7.77 L launch discount + free modular kitchen this week only", linkLabel: "", link: "" }, { colors: { bg: "#e11d48", text: "#fff1f2" }, spacing: { padding: { top: 10, right: 24, bottom: 10, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }),
    sec(
      "hero",
      "Ad Hero",
      "LayoutPanelTop",
      {
        eyebrow: "NEW LAUNCH · ELECTRONIC CITY",
        heading: "Skyline Greens — 2 & 3 BHK Starting ₹62 L",
        subheading: "Ad-exclusive pricing · 42 homes released for this campaign",
        price: "₹62 L",
        priceLabel: "CAMPAIGN PRICE FROM",
        heroArt: "commercial",
        accent: "#f97316",
        priceNote: "Regular price ₹69 L — discount auto-applied this week",
        primaryAction: "link",
        primaryLink: "#lead-form",
        ctaPrimary: "Claim the Discount",
        secondaryAction: "brochure",
        ctaSecondary: "Download Offer PDF",
        highlights: ["₹7.77 L off", "Free kitchen", "No floor-rise", "RERA approved"],
        heroStats: [
          { value: "42", label: "Campaign Homes" },
          { value: "2 & 3", label: "BHK" },
          { value: "₹62 L", label: "Entry Price" },
          { value: "Mar 2029", label: "Possession" },
        ],
        gateHeading: "Download the offer PDF",
        gateText: "Verified leads get the full campaign kit instantly.",
      },
      {
        colors: { bg: "#1f0a12", overlay: "rgba(31,10,18,0.5)", text: "#fff1f2" },
        layout: { width: "full", height: "vh", fixedHeight: 700, align: "center", direction: "column", justify: "center", alignItems: "center" },
        spacing: { padding: { top: 140, right: 0, bottom: 90, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 16 },
      },
    ),
    sec("cta-banner", "Urgency Offer Banner", "Gift", { layout: "strip", 
      heading: "Campaign stack worth ₹11.4 L",
      text: "Launch discount + free modular kitchen + waived floor rise + stamp duty support. Ends Sunday or when 42 homes are claimed.",
      cta: "Claim My Slot",
    }, { colors: { bg: "#e11d48", text: "#ffffff" }, spacing: { padding: { top: 20, right: 24, bottom: 20, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 12 } }),
    sec("stats", "Property Statistics", "Gauge", {
      heading: "The Project In Numbers",
      items: [
        { icon: "Building2", value: "4", label: "Towers" },
        { icon: "LandPlot", value: "6 Ac", label: "Campus" },
        { icon: "Grid", value: "620", label: "Total Homes" },
        { icon: "Dumbbell", value: "35+", label: "Amenities" },
        { icon: "CalendarClock", value: "2029", label: "Possession" },
      ],
      style: "cards",
    }, { colors: { bg: "#fff7ed", text: "#111827" }, spacing: { padding: { top: 40, right: 24, bottom: 40, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 24 } }),
    sec("unit-types", "Configurations", "Grid", {
      items: [
        { name: "2 BHK Classic", beds: "2", area: "905 sq.ft", price: "₹62 L*" },
        { name: "2 BHK Optima", beds: "2", area: "1,040 sq.ft", price: "₹71 L*" },
        { name: "3 BHK Prime", beds: "3", area: "1,310 sq.ft", price: "₹92 L*" },
        { name: "3 BHK Max", beds: "3", area: "1,545 sq.ft", price: "₹1.08 Cr*" },
      ],
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("features", "Lifestyle Benefits", "BadgeCheck", {
      heading: "Built For How Ad Buyers Actually Live",
      items: [
        { title: "Zero maintenance for 2 yrs", text: "Builder-funded society corpus on campaign bookings." },
        { title: "Rooftop cinema", text: "Screening lawn with projector nights every Friday." },
        { title: "Work-from-roof pods", text: "Bookable cabins with fibre + meeting screens." },
        { title: "Pet park & play zone", text: "Separate zones so kids and pets never share turf." },
        { title: "EV bays standard", text: "Charger conduits in every second parking." },
        { title: "5-min metro shuttle", text: "Free shuttle to Bommasandra station." },
      ],
    }, { colors: { bg: "#fff7ed", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("gallery", "Gallery", "Images", {
      eyebrow: "See it yourself",
      heading: "Campaign Renders & Site Progress",
      text: "Updated monthly from the actual site camera.",
      images: ["tower", "pool", "garden", "lobby", "interior", "skyline"],
      columns: 3,
      lightbox: true,
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("location-advantages", "Connectivity", "Navigation", {
      eyebrow: "Electronic City",
      heading: "Connected To Everything That Pays Your Bills",
      text: "IT campuses, the metro and the elevated expressway — all inside a 10-minute ring.",
      items: [
        { icon: "TrainFront", title: "Bommasandra Metro", meta: "2.1 km" },
        { icon: "Building2", title: "Infosys EC Campus", meta: "3.4 km" },
        { icon: "Car", title: "Elevated Expressway", meta: "1.8 km" },
        { icon: "School", title: "TISB School", meta: "4.0 km" },
        { icon: "Hospital", title: "Narayana Health", meta: "5.2 km" },
        { icon: "Store", title: "Neo Mall", meta: "2.9 km" },
      ],
      mapAddress: "Electronic City, Bangalore",
    }, { colors: { bg: "#fff7ed", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("faq", "FAQ", "Tabs", {
      eyebrow: "Campaign questions",
      heading: "Everything About This Offer, Answered",
      items: [
        { q: "Is the ₹7.77 L discount genuine?", a: "Yes — it is funded by the marketing budget and applies to bookings made during this campaign window." },
        { q: "How do I claim the free kitchen?", a: "Complete token within 7 days of your form submission. The kitchen credit reflects in your cost sheet." },
        { q: "Are these prices negotiable?", a: "Campaign pricing is fixed — that is how the discount stays real. No hidden PLC either." },
        { q: "Is the project RERA registered?", a: "Yes — RERA details are on the brochure cover page." },
      ],
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("lead-form", "Form", "Send", {}, { colors: { bg: "#fff1f2", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("downloads", "Brochure Downloads", "Download", {
      heading: "Campaign Kit",
      text: "Brochure, cost sheets and floor plans — gated so we know where to send updates.",
      files: [{ name: "Skyline Greens Brochure.pdf", url: "/brochure/skyline.pdf" }],
    }, { colors: { bg: "#fff7ed", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    sec("cta-banner", "Final CTA", "MousePointerClick", {
      eyebrow: "Last call",
      heading: "42 Homes. One Week. One Price.",
      sub: "When the counter hits zero, the regular ₹69 L price returns — no exceptions.",
      ctaPrimary: "Claim My Discount",
      ctaSecondary: "Call Campaign Desk",
      phone: "+91 90000 42042",
    }, { colors: { bg: "#88101f", overlay: "", gradient: "linear-gradient(120deg,#e11d48 0%,#be123c 55%,#4c0519 100%)", text: "#ffffff" }, layout: { width: "full", height: "auto", align: "center", direction: "column" } }),
    sec("popup", "Campaign Popup", "PartyPopper", { popupId: "campaign-offer", heading: "₹7.77 L discount expires soon", text: "Drop your number and lock this week's campaign price before it resets.", cta: "", link: "", showForm: true, trigger: "scroll", delaySeconds: 0, scrollPercent: 45, urlParam: "promo", oncePerSession: true }),
    sec("floating-icons", "Floating Icons", "PhoneCall", { side: "right", whatsapp: true, call: true, enquire: true, email: false, phone: "+91 90000 42042", number: "+91 90000 42042" }),
    sec("sticky-cta", "Sticky CTA", "Compass", { text: "⚡ Campaign price ₹62 L — resets to ₹69 L when the timer ends", ctaLabel: "Claim Discount", link: "#lead-form" }),
  ];
}

function estateProSections(): SectionInstance[] {
  const sstyle = (bg: string, text: string) => ({
    colors: { bg, overlay: "", gradient: "", text },
    layout: { width: "boxed" as const, height: "auto" as const, align: "center" as const },
  });
  const nstyle = (bg: string, text: string) => ({
    colors: { bg, overlay: "", gradient: "", text },
    layout: { width: "full" as const, height: "auto" as const, align: "left" as const },
    spacing: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 12 },
  });
  const col = (width: number, children: SectionInstance[]): SectionInstance => ({
    ...sec("column", "Column", "Columns", { width }, { colors: { bg: "transparent", overlay: "", gradient: "", text: "" }, spacing: { padding: { top: 0, right: 8, bottom: 0, left: 8 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 12 }, layout: { width: "full", height: "auto", align: "left", direction: "column" } }),
    children,
  });
  const row = (widths: number[], children: SectionInstance[]): SectionInstance => ({
    ...sec("row", "Row", "Rows", { gap: 20, columns: widths.length }, { colors: { bg: "transparent", overlay: "", gradient: "", text: "" }, spacing: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 20 }, layout: { width: "full", height: "auto", align: "left", direction: "row" } }),
    children,
  });
  const container = (children: SectionInstance[]): SectionInstance => ({
    ...sec("container", "Container", "Box", { width: "1180px", align: "center" }, { spacing: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 24 } }),
    children,
  });

  return [
    sec("announcement", "Announcement Bar", "Megaphone", { text: "Premium Residential Project • RERA Registered • Call: +91 98765 43210" }, { colors: { bg: "#0b1219", text: "#dce2e7" }, spacing: { padding: { top: 10, right: 24, bottom: 10, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }),

    sec("hero", "Hero Banner", "LayoutPanelTop", {
      eyebrow: "EARLY-BIRD LAUNCH OFFER",
      heading: "Luxury Living. Prime Location. Smarter Investment.",
      subheading: "Premium 2, 3 & 4 BHK residences designed for modern families, with world-class amenities and excellent connectivity.",
      price: "{{starting_price}}",
      priceLabel: "STARTING FROM",
      heroArt: "hero",
      accent: "#c99a45",
      priceNote: "",
      primaryAction: "link",
      primaryLink: "#contact",
      ctaPrimary: "Get Price List",
      secondaryAction: "link",
      secondaryLink: "#video",
      ctaSecondary: "Watch Walkthrough",
      highlights: ["RERA Registered", "Metro Connected", "World-Class Amenities"],
      heroStats: [{ value: "2–4 BHK", label: "Premium Residences" }, { value: "₹89L*", label: "Starting Price" }, { value: "2027", label: "Possession" }],
      gateHeading: "",
      gateText: "",
    }, { colors: { bg: "#0b1220", overlay: "rgba(4,9,16,.55)", text: "#ffffff" },     layout: { width: "full", height: "vh", fixedHeight: 760, align: "center", direction: "column", justify: "center", alignItems: "center" }, spacing: { padding: { top: 120, right: 0, bottom: 90, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 16 } }),

    sec("lead-form", "Enquiry Form", "Send", { fields: ["name", "phone", "email"] }, sstyle("#f7f8fa", "#111827")),

    sec("pricing", "Pricing Table", "Wallet", {
      design: "cards",
      eyebrow: "Explore Homes",
      heading: "Choose Your Perfect Residence",
      text: "Flexible configurations with thoughtful layouts, premium finishes and strong investment potential.",
      plans: [
        { name: "2 BHK Premium", area: "1,250 sq.ft.", price: "₹89 Lakh*", per: "", features: ["1,250 sq.ft.", "2 Bath", "Balcony"], cta: "View Details", featured: false },
        { name: "3 BHK Luxury", area: "1,750 sq.ft.", price: "₹1.25 Cr*", per: "", features: ["1,750 sq.ft.", "3 Bath", "Study"], cta: "View Details", featured: true },
        { name: "4 BHK Signature", area: "2,450 sq.ft.", price: "₹1.85 Cr*", per: "", features: ["2,450 sq.ft.", "4 Bath", "Private Terrace"], cta: "View Details", featured: false },
      ],
    }, sstyle("#ffffff", "#111827")),

    sec("stats", "Property Statistics", "Gauge", {
      design: "cards",
      heading: "",
      items: [
        { icon: "Building2", value: "500+", label: "Homes Delivered" },
        { icon: "LandPlot", value: "25+", label: "Prime Locations" },
        { icon: "CalendarClock", value: "12+", label: "Years Experience" },
        { icon: "Star", value: "4.9/5", label: "Customer Rating" },
      ],
      style: "cards",
    }, sstyle("#111b24", "#ffffff")),

    sec("amenities", "Amenities", "Dumbbell", {
      design: "grid",
      eyebrow: "World-Class Lifestyle",
      heading: "Everything You Need, Right Here",
      items: [
        { icon: "Waves", title: "Infinity Pool", desc: "Resort-style swimming and relaxation zone." },
        { icon: "Dumbbell", title: "Fitness Centre", desc: "Fully equipped gym and wellness studio." },
        { icon: "Leaf", title: "Landscaped Greens", desc: "Beautiful gardens and walking paths." },
        { icon: "Trophy", title: "Sports Arena", desc: "Indoor and outdoor sports facilities." },
        { icon: "HeartHandshake", title: "Kids Zone", desc: "Safe, engaging spaces for children." },
        { icon: "ShieldCheck", title: "24×7 Security", desc: "Controlled access and modern surveillance." },
        { icon: "Plug", title: "Power Backup", desc: "Reliable essential-services backup." },
        { icon: "Car", title: "Smart Parking", desc: "Convenient resident and visitor parking." },
      ],
    }, sstyle("#f5f2ea", "#111827")),

    sec("gallery", "Property Gallery", "Images", {
      design: "masonry",
      eyebrow: "Project Gallery",
      heading: "See the Lifestyle Before You Visit",
      text: "A look inside the development.",
      images: ["skyline", "lobby", "pool", "tower", "garden", "interior"],
      columns: 3,
      lightbox: true,
      captions: [],
    }, sstyle("#ffffff", "#111827")),

    sec("location-advantages", "Location & Map", "Navigation", {
      design: "split",
      address: "Premium Project Location",
      zoom: 14,
      eyebrow: "Prime Connectivity",
      heading: "Everything Close. Everything Connected.",
      text: "Replace the sample landmarks below with your actual project location and travel times.",
      items: [
        { icon: "School", title: "International School", meta: "5 min" },
        { icon: "TrainFront", title: "Metro Station", meta: "8 min" },
        { icon: "Building2", title: "Business District", meta: "12 min" },
        { icon: "Navigation", title: "International Airport", meta: "15 min" },
      ],
    }, sstyle("#f5f2ea", "#111827")),

    sec("emi-calculator", "EMI Calculator", "Gauge", {
      heading: "Estimate Your Monthly EMI",
      price: 125,
      downPayment: 25,
      rate: 8.5,
      tenure: 20,
      currency: "₹",
      note: "Indicative calculation only. Final EMI depends on lender terms, tenure and eligibility.",
    }, sstyle("#ffffff", "#111827")),

    sec("floorplans", "Floor Plans", "Grid", {
      design: "tabs",
      eyebrow: "Floor Plans",
      heading: "Layouts Designed Around You",
      text: "Choose a configuration.",
      plans: [
        { name: "2 BHK Premium", beds: "2", area: "1,250 sq.ft.", price: "₹89 Lakh*" },
        { name: "3 BHK Luxury", beds: "3", area: "1,750 sq.ft.", price: "₹1.25 Cr*" },
        { name: "4 BHK Signature", beds: "4", area: "2,450 sq.ft.", price: "₹1.85 Cr*" },
      ],
    }, sstyle("#f5f2ea", "#111827")),

    sec("video", "Video", "Play", {
      eyebrow: "Project Walkthrough",
      heading: "Experience the Project",
      text: "A cinematic look at the campus.",
      url: "",
      videoTitle: "Project walkthrough",
      duration: "2:14",
    }, sstyle("#ffffff", "#111827")),

    sec("testimonials", "Testimonials", "Quote", {
      design: "cards",
      eyebrow: "Happy Homeowners",
      heading: "What Our Buyers Say",
      items: [
        { name: "Rahul & Priya", role: "Homeowner", quote: "The location, amenities and overall planning were exactly what our family wanted. The buying process was smooth.", rating: 5 },
        { name: "Amit S.", role: "Investor", quote: "We shortlisted several projects and chose this one because of the connectivity and quality of construction.", rating: 5 },
        { name: "Neha K.", role: "Buyer", quote: "The team explained everything clearly and helped us compare the floor plans and payment options.", rating: 5 },
      ],
    }, sstyle("#f5f2ea", "#111827")),

    container([
      row([50, 50], [
        col(50, [sec("text", "Why Choose EstatePro", "BadgeCheck", { text: "Why Choose EstatePro?", html: "<h3>Why Choose EstatePro?</h3><ul><li>✓ Transparent pricing and documentation</li><li>✓ Verified project information</li><li>✓ Dedicated property advisor</li><li>✓ Site visit assistance</li><li>✓ Home-loan assistance through partners</li></ul>" }, nstyle("#ffffff", "#111827"))]),
        col(50, [sec("text", "Developer Promise", "Building2", { text: "Developer Promise", html: "<h3>Developer Promise</h3><p>Use this section for developer credentials, completed projects, awards, RERA information and delivery track record.</p><p><b>10+ Projects Delivered</b><br><b>15+ Years of Experience</b><br><b>Customer-First Approach</b></p>" }, nstyle("#ffffff", "#111827"))]),
      ]),
    ]),

    sec("countdown", "Countdown Timer", "Timer", {
      date: "2026-12-31",
      heading: "Early-Bird Benefits End Soon",
      items: [{ value: "03", label: "Days" }, { value: "12", label: "Hours" }, { value: "45", label: "Min" }, { value: "20", label: "Sec" }],
    }, { colors: { bg: "#111b24", text: "#ffffff" }, spacing: { padding: { top: 40, right: 24, bottom: 40, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }),

    container([
      row([50, 25, 25], [
        col(50, [
          sec("image", "Image", "Images", { src: "skyline", alt: "4 BHK", title: "", link: "", width: 800, align: "center", radius: 14 }, { colors: { bg: "transparent", overlay: "", gradient: "", text: "" }, spacing: { padding: { top: 0, right: 0, bottom: 8, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 12 }, layout: { width: "full", height: "auto", align: "center" } }),
          sec("text", "Card Text", "Type", { text: "The Grand 4 BHK Residence", html: "<div style=\"display:inline-block;background:#f1eadc;color:#72531c;padding:5px 9px;border-radius:4px;font-size:11px;font-weight:800;margin-bottom:8px\">SIGNATURE COLLECTION</div><h3 style=\"font-size:20px;margin:6px 0\">The Grand 4 BHK Residence</h3><div style=\"color:#667085;font-size:13px;margin-bottom:6px\">Spacious interiors, private terrace and panoramic views.</div><b style=\"font-size:16px\">From ₹1.85 Cr*</b>" }, nstyle("#ffffff", "#111827")),
        ]),
        col(25, [
          sec("image", "Image", "Images", { src: "tower", alt: "3 BHK", title: "", link: "", width: 800, align: "center", radius: 14 }, { colors: { bg: "transparent", overlay: "", gradient: "", text: "" }, spacing: { padding: { top: 0, right: 0, bottom: 8, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 12 }, layout: { width: "full", height: "auto", align: "center" } }),
          sec("text", "Card Text", "Type", { text: "3 BHK Luxury", html: "<div style=\"display:inline-block;background:#f1eadc;color:#72531c;padding:5px 9px;border-radius:4px;font-size:11px;font-weight:800;margin-bottom:8px\">FAMILY CHOICE</div><h3 style=\"font-size:18px;margin:6px 0\">3 BHK Luxury</h3><div style=\"color:#667085;font-size:13px;margin-bottom:6px\">1,750 sq.ft. • Balcony • Study</div><b style=\"font-size:15px\">₹1.25 Cr*</b>" }, nstyle("#ffffff", "#111827")),
        ]),
        col(25, [
          sec("image", "Image", "Images", { src: "interior", alt: "2 BHK", title: "", link: "", width: 800, align: "center", radius: 14 }, { colors: { bg: "transparent", overlay: "", gradient: "", text: "" }, spacing: { padding: { top: 0, right: 0, bottom: 8, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 12 }, layout: { width: "full", height: "auto", align: "center" } }),
          sec("text", "Card Text", "Type", { text: "2 BHK Premium", html: "<div style=\"display:inline-block;background:#f1eadc;color:#72531c;padding:5px 9px;border-radius:4px;font-size:11px;font-weight:800;margin-bottom:8px\">SMART VALUE</div><h3 style=\"font-size:18px;margin:6px 0\">2 BHK Premium</h3><div style=\"color:#667085;font-size:13px;margin-bottom:6px\">1,250 sq.ft. • Balcony • 2 Bath</div><b style=\"font-size:15px\">₹89 Lakh*</b>" }, nstyle("#ffffff", "#111827")),
        ]),
      ]),
    ]),

    sec("features", "Property Features", "BadgeCheck", {
      design: "checklist",
      heading: "From First Enquiry to New Home",
      items: [
        { title: "01 / Enquire — Share Your Requirement", text: "Tell us your preferred configuration, budget and location." },
        { title: "02 / Discover — Get Project Details", text: "Receive pricing, floor plans, availability and brochure." },
        { title: "03 / Visit — Experience It", text: "Schedule a guided site visit at your convenience." },
        { title: "04 / Book — Reserve Your Home", text: "Complete documentation and booking with expert support." },
      ],
    }, sstyle("#ffffff", "#111827")),

    sec("timeline", "Property Timeline", "CalendarClock", {
      design: "vertical",
      heading: "Designed for Better Everyday Living",
      items: [
        { title: "Morning", text: "Wake up to green views — landscaped spaces, natural light and peaceful surroundings." },
        { title: "Evening", text: "Relax & reconnect — pool, clubhouse, fitness and social spaces within the community." },
        { title: "Weekend", text: "Everything within reach — easy access to schools, retail, offices and entertainment." },
      ],
    }, sstyle("#f5f2ea", "#111827")),

    sec("features", "Property Features", "BadgeCheck", {
      design: "checklist",
      heading: "Modern Details That Make a Difference",
      items: [
        { title: "☀️ Natural Light", text: "Thoughtful orientation and large windows." },
        { title: "🌬️ Ventilated Homes", text: "Layouts planned for airflow and comfort." },
        { title: "🔋 Energy Conscious", text: "Efficient lighting and sustainable design options." },
        { title: "📱 Smart Living", text: "Add smart-home features and app controls here." },
        { title: "🛗 High-Speed Lifts", text: "Convenient access for residents and guests." },
        { title: "🛡️ Secure Community", text: "Controlled entry and security infrastructure." },
      ],
    }, sstyle("#ffffff", "#111827")),

    sec("text", "Social Proof", "Star", { text: "★★★★★ 4.9/5 Customer Rating", html: "<div style='text-align:center;font-size:20px'><b>★★★★★ 4.9/5</b> Customer Rating &nbsp;•&nbsp; <b>500+</b> Families &nbsp;•&nbsp; <b>25+</b> Locations &nbsp;•&nbsp; <b>12+</b> Years Experience</div>" }, { colors: { bg: "#f5f2ea", text: "#111827" }, spacing: { padding: { top: 24, right: 24, bottom: 24, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }),

    container([
      row([60, 40], [
        col(60, [sec("text", "Exclusive Lead Offer", "Sparkles", { text: "Get the Complete Property Kit", html: "<div style=\"color:#c99a45;font-weight:900;font-size:12px;letter-spacing:1.3px;text-transform:uppercase\">EXCLUSIVE LEAD OFFER</div><h2 style=\"font-size:34px;margin:8px 0\">Get the Complete Property Kit</h2><div style=\"color:#667085;font-size:14px\">Receive brochure, floor plans, price list, payment plan and current availability in one conversation.</div><div style=\"display:flex;flex-wrap:wrap;gap:8px;margin-top:14px\"><span style=\"background:#f1f4f8;border-radius:999px;font-size:11px;font-weight:800;color:#475467;padding:7px 11px\">✓ Price List</span><span style=\"background:#f1f4f8;border-radius:999px;font-size:11px;font-weight:800;color:#475467;padding:7px 11px\">✓ Floor Plans</span><span style=\"background:#f1f4f8;border-radius:999px;font-size:11px;font-weight:800;color:#475467;padding:7px 11px\">✓ Brochure</span><span style=\"background:#f1f4f8;border-radius:999px;font-size:11px;font-weight:800;color:#475467;padding:7px 11px\">✓ Site Visit</span></div>" }, nstyle("#ffffff", "#111827"))]),
        col(40, [sec("lead-form", "Request Details", "Send", { fields: ["name", "phone"] }, { colors: { bg: "#ffffff", overlay: "", gradient: "", text: "#111827" }, spacing: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 }, layout: { width: "full", height: "auto", align: "left" } })]),
      ]),
    ]),

    sec("faq", "FAQ", "Tabs", {
      design: "accordion",
      eyebrow: "FAQ",
      heading: "Frequently Asked Questions",
      items: [
        { q: "What is the starting price?", a: "Sample pricing starts from ₹89 Lakh*. Replace this with your current official pricing." },
        { q: "Can I schedule a site visit?", a: "Yes. Submit the enquiry form and a property advisor can coordinate your preferred date and time." },
        { q: "Is home-loan assistance available?", a: "You can add your preferred banks and financing partners here." },
        { q: "What configurations are available?", a: "Sample configurations include 2, 3 and 4 BHK residences." },
        { q: "Where can I get the brochure?", a: "Use the brochure CTA below to collect the lead and provide the brochure link after submission." },
      ],
    }, sstyle("#ffffff", "#111827")),

    container([
      row([50, 50], [
        col(50, [sec("contact", "Contact Details", "Phone", { heading: "Take the Next Step", phone: "+91 98765 43210", email: "sales@estatepro.example", address: "Premium Project Location" }, nstyle("#ffffff", "#111827"))]),
        col(50, [sec("lead-form", "Request a Callback", "Send", { fields: ["name", "phone", "email"] }, nstyle("#ffffff", "#111827"))]),
      ]),
    ]),

    sec("floating-icons", "Floating Icons", "PhoneCall", { side: "right", whatsapp: true, call: true, enquire: true, email: false, phone: "+91 98765 43210", number: "+91 98765 43210" }, { colors: { bg: "transparent", overlay: "", gradient: "", text: "" }, spacing: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 }, layout: { width: "full", height: "auto", align: "left" } }),
  ];
}

// ---------------------------------------------------------------------------
// Thank You Page sections — composed entirely from builder widgets
// ---------------------------------------------------------------------------

export function buildThankYouSections(): SectionInstance[] {
  return [
    sec("heading", "Thank You Heading", "Type", { text: "Thank You — You're All Set!", tag: "h1", size: 44, align: "center" }, { colors: { bg: "#ffffff", text: "#111827" }, spacing: { padding: { top: 84, right: 24, bottom: 8, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }),
    sec("text", "Confirmation Message", "AlignLeft", { text: "Your enquiry has been received successfully. A relationship manager will call you within 15 minutes during working hours. Meanwhile, here's everything you need next." }, { colors: { bg: "#ffffff", text: "var(--ps-slate)" }, spacing: { padding: { top: 0, right: 24, bottom: 20, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 }, typography: { fontFamily: "Inter", fontSize: 17, fontWeight: 400, lineHeight: 1.75, letterSpacing: 0 } }),
    sec("brochure", "Brochure Download", "FileText", {
      heading: "Your Brochure Is Ready",
      title: "Download Brochure",
      file: "/brochure/project.pdf",
      text: "No forms needed — your download unlocks instantly on this page.",
      gateEnabled: false,
    }, { colors: { bg: "#ffffff", text: "#111827" }, layout: { width: "boxed", height: "auto", align: "center" } }),
    {
      ...sec("row", "Next Actions Row", "Rows", { gap: 16, columns: 2 }, {
        colors: { bg: "#ffffff", text: "#111827" },
        spacing: { padding: { top: 8, right: 24, bottom: 24, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 16 },
        layout: { width: "full", height: "auto", align: "center", direction: "row" },
      }),
      children: [
        {
          ...sec("column", "Call Column", "Columns", { width: 50 }, {
            colors: { bg: "transparent", text: "#111827" },
            spacing: { padding: { top: 8, right: 8, bottom: 8, left: 8 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 8 },
          }),
          children: [
            sec("call-cta", "Call Now CTA", "PhoneCall", { text: "Want answers right now?", phone: "+91 90000 12345", ctaLabel: "Call Now" }),
          ],
        },
        {
          ...sec("column", "WhatsApp Column", "Columns", { width: 50 }, {
            colors: { bg: "transparent", text: "#111827" },
            spacing: { padding: { top: 8, right: 8, bottom: 8, left: 8 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 8 },
          }),
          children: [
            sec("call-cta", "WhatsApp CTA", "MessageCircle", { mode: "whatsapp",  text: "Continue the chat on WhatsApp", number: "+91 90000 12345", ctaLabel: "Chat Now" }),
          ],
        },
      ],
    },
    sec("image", "Property Image", "Images", { src: "interior", alt: "Project view", title: "", link: "", width: 900, align: "center", radius: 18 }, { colors: { bg: "#ffffff", text: "#111827" }, spacing: { padding: { top: 16, right: 24, bottom: 16, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }),
    sec("cta-banner", "Recommended Next Step", "MousePointerClick", {
      eyebrow: "While you wait",
      heading: "Book a Priority Site Visit",
      sub: "Thank-you customers skip the queue — pick a slot before public calendars fill.",
      ctaPrimary: "Schedule Visit",
      ctaSecondary: "Browse Floor Plans",
    }, { colors: { bg: "#111827", overlay: "", gradient: "linear-gradient(120deg,#6D5DFC 0%,#8a7bff 55%,#111827 100%)", text: "#ffffff" }, layout: { width: "full", height: "auto", align: "center", direction: "column" } }),
    sec("button", "Back to Website", "MousePointerClick", { text: "← Back to Website", action: "url", link: "/", style: "outline", size: "md", popupId: "" }, { colors: { bg: "#ffffff", text: "#111827" }, spacing: { padding: { top: 28, right: 24, bottom: 20, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 } }),
    sec("social-share", "Social Sharing", "Share2", { heading: "Know someone house-hunting? Share:", channels: ["whatsapp", "facebook", "x", "linkedin", "copy"] }, { colors: { bg: "#f8fafc", text: "#111827" }, spacing: { padding: { top: 28, right: 24, bottom: 40, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 12 } }),
  ];
}
