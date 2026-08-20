// Pre-built real-estate section templates for the landing page builder.
// Each template returns a fully-configured RowNode ready to insert.

import type { ColumnNode, ElementNode, RowNode } from "./lp-types";

let _id = 0;
function uid() {
  return `tpl-${++_id}-${Math.random().toString(36).slice(2, 7)}`;
}

function el(type: string, settings: Record<string, unknown> = {}): ElementNode {
  return { id: uid(), type, settings };
}

function col(elements: ElementNode[], widthPct = 100): ColumnNode {
  return {
    id: uid(),
    settings: { width: widthPct },
    elements,
  };
}

function row(
  columns: ColumnNode[],
  settings: RowNode["settings"] = {},
): RowNode {
  return {
    id: uid(),
    settings: {
      layout: "full_width",
      padding: { top: 80, right: 24, bottom: 80, left: 24 },
      ...settings,
    },
    columns,
  };
}

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

export interface SectionDef {
  id: string;
  label: string;
  icon: string;
  category: "real-estate" | "generic";
  description: string;
  create: () => RowNode;
}

export const SECTION_TEMPLATES: SectionDef[] = [
  // ── Real Estate ──────────────────────────────────────────────────────────
  {
    id: "re-hero",
    label: "Hero Banner",
    icon: "home",
    category: "real-estate",
    description: "Full-width hero with headline, price, and lead CTA",
    create: () =>
      row(
        [
          col(
            [
              el("heading", { text: "Premium Residences — Now Open", tag: "h1", size: 48, color: "#ffffff", weight: 800 }),
              el("text", { text: "RERA Approved · Sea-facing · Limited Units", color: "#e0e7ff" }),
              el("button", { label: "Book a Site Visit →", style: "solid", url: "#enquire", size: "lg" }),
            ],
            60,
          ),
          col(
            [
              el("lead-form", {
                title: "Get Best Price",
                subtitle: "Book your free site visit today",
                ctaText: "Enquire Now",
              }),
            ],
            40,
          ),
        ],
        {
          background: { color: "#1e3a8a", image: "", gradient: "linear-gradient(135deg,#1e3a8a,#4f46e5)" },
          padding: { top: 100, right: 24, bottom: 100, left: 24 },
          minHeight: 600,
        },
      ),
  },

  {
    id: "re-highlights",
    label: "Project Highlights",
    icon: "sparkles",
    category: "real-estate",
    description: "Key project stats and USPs in icon-boxes",
    create: () =>
      row([
        col([
          el("heading", { text: "Why Choose Marina Heights?", tag: "h2", align: "center", size: 34 }),
          el("text", { text: "Award-winning architecture, world-class amenities, and a prime sea-facing location.", align: "center", color: "#475569" }),
        ]),
        col([el("icon-box", { icon: "hard-hat", title: "RERA Approved", description: "Registered & fully compliant", align: "center" })], 25),
        col([el("icon-box", { icon: "waves", title: "Sea-Facing", description: "180° panoramic ocean views", align: "center" })], 25),
        col([el("icon-box", { icon: "dumbbell", title: "Premium Amenities", description: "50+ world-class facilities", align: "center" })], 25),
        col([el("icon-box", { icon: "key-round", title: "Ready by Dec 2027", description: "On-time delivery guaranteed", align: "center" })], 25),
      ]),
  },

  {
    id: "re-about",
    label: "About the Project",
    icon: "clipboard-list",
    category: "real-estate",
    description: "Two-column about section with image and text",
    create: () =>
      row([
        col(
          [
            el("image", { src: "https://placehold.co/600x400/e2e8f0/64748b?text=Project+Image", alt: "Project exterior", radius: 16 }),
          ],
          50,
        ),
        col(
          [
            el("heading", { text: "About Marina Heights", tag: "h2", size: 32 }),
            el("text", {
              text: "Marina Heights redefines luxury coastal living in Mumbai's most sought-after neighbourhood. Designed by award-winning architects, each residence offers an unparalleled blend of comfort and elegance.",
              color: "#475569",
            }),
            el("icon-box", { icon: "map-pin", title: "Location", description: "Bandra-Kurla Complex, Mumbai" }),
            el("icon-box", { icon: "building-2", title: "Configurations", description: "2 BHK, 3 BHK & Penthouses" }),
            el("icon-box", { icon: "wallet", title: "Price Starting", description: "₹1.42 Cr onwards" }),
          ],
          50,
        ),
      ]),
  },

  {
    id: "re-amenities",
    label: "Amenities",
    icon: "waves",
    category: "real-estate",
    description: "Amenities grid with icons",
    create: () =>
      row(
        [
          col([
            el("heading", { text: "World-Class Amenities", tag: "h2", align: "center", size: 34 }),
            el("text", { text: "Everything you need for a premium lifestyle, right at your doorstep.", align: "center", color: "#475569" }),
          ]),
          ...[
            ["waves", "Infinity Pool"],
            ["dumbbell", "Fitness Centre"],
            ["volleyball", "Tennis Court"],
            ["trees", "Sky Garden"],
            ["sofa", "Clubhouse"],
            ["car", "Smart Parking"],
            ["shield-check", "24/7 Security"],
            ["baby", "Kids Play Area"],
          ].map(([icon, title]) =>
            col([el("amenity-card", { icon, title, description: "" })], 25),
          ),
        ],
        { background: { color: "#f8fafc" } },
      ),
  },

  {
    id: "re-floor-plans",
    label: "Floor Plans",
    icon: "ruler",
    category: "real-estate",
    description: "Tabbed or stacked floor plan images",
    create: () =>
      row([
        col([
          el("heading", { text: "Floor Plans", tag: "h2", align: "center", size: 34 }),
          el("text", { text: "Intelligently designed layouts that maximise space and natural light.", align: "center", color: "#475569" }),
        ]),
        col(
          [
            el("floor-plan", {
              name: "2 BHK — Type A",
              area: "1,150 sq ft",
              bedrooms: 2,
              bathrooms: 2,
              image: "https://placehold.co/480x360/e2e8f0/64748b?text=2BHK+Floor+Plan",
            }),
          ],
          33,
        ),
        col(
          [
            el("floor-plan", {
              name: "3 BHK — Type B",
              area: "1,580 sq ft",
              bedrooms: 3,
              bathrooms: 3,
              image: "https://placehold.co/480x360/e2e8f0/64748b?text=3BHK+Floor+Plan",
            }),
          ],
          33,
        ),
        col(
          [
            el("floor-plan", {
              name: "Penthouse",
              area: "3,200 sq ft",
              bedrooms: 4,
              bathrooms: 4,
              image: "https://placehold.co/480x360/e2e8f0/64748b?text=Penthouse+Plan",
            }),
          ],
          33,
        ),
      ]),
  },

  {
    id: "re-gallery",
    label: "Property Gallery",
    icon: "image",
    category: "real-estate",
    description: "Masonry/grid photo gallery",
    create: () =>
      row([
        col([
          el("heading", { text: "Gallery", tag: "h2", align: "center", size: 34 }),
          el("gallery", {
            columns: 3,
            images: [
              "https://placehold.co/600x400/dbeafe/3b82f6?text=Exterior",
              "https://placehold.co/600x400/dcfce7/16a34a?text=Lobby",
              "https://placehold.co/600x400/fef9c3/d97706?text=Pool",
              "https://placehold.co/600x400/fce7f3/db2777?text=Master+Bedroom",
              "https://placehold.co/600x400/ede9fe/7c3aed?text=Living+Room",
              "https://placehold.co/600x400/fee2e2/ef4444?text=Kitchen",
            ],
          }),
        ]),
      ]),
  },

  {
    id: "re-location",
    label: "Location & Connectivity",
    icon: "map-pin",
    category: "real-estate",
    description: "Map embed and nearby landmarks",
    create: () =>
      row([
        col(
          [
            el("heading", { text: "Prime Location", tag: "h2", size: 32 }),
            el("text", { text: "Strategically located with seamless connectivity to Mumbai's key business and lifestyle hubs.", color: "#475569" }),
            el("icon-box", { icon: "train-front", title: "Metro Station", description: "5 min walk — BKC Metro" }),
            el("icon-box", { icon: "plane", title: "Airport", description: "20 min drive — CSIA" }),
            el("icon-box", { icon: "school", title: "Schools", description: "5 premium schools within 2 km" }),
            el("icon-box", { icon: "stethoscope", title: "Hospitals", description: "Lilavati & Kokilaben within 3 km" }),
          ],
          45,
        ),
        col(
          [
            el("map", {
              lat: 19.0596,
              lng: 72.8295,
              zoom: 14,
              address: "Bandra Kurla Complex, Mumbai, Maharashtra",
              height: 400,
            }),
          ],
          55,
        ),
      ]),
  },

  {
    id: "re-pricing",
    label: "Pricing & Payment",
    icon: "wallet",
    category: "real-estate",
    description: "Configuration and pricing cards",
    create: () =>
      row(
        [
          col([
            el("heading", { text: "Pricing & Payment Plans", tag: "h2", align: "center", size: 34 }),
            el("text", { text: "Flexible payment options designed to suit your financial planning.", align: "center", color: "#475569" }),
          ]),
          col(
            [
              el("pricing", {
                name: "2 BHK",
                price: "₹1.42 Cr",
                unit: "onwards",
                features: ["1,150 sq ft carpet", "2 Bed / 2 Bath", "Sea-facing available", "RERA registered"],
                highlighted: false,
                ctaText: "Enquire Now",
              }),
            ],
            33,
          ),
          col(
            [
              el("pricing", {
                name: "3 BHK",
                price: "₹2.10 Cr",
                unit: "onwards",
                features: ["1,580 sq ft carpet", "3 Bed / 3 Bath", "Corner unit available", "Zero pre-EMI"],
                highlighted: true,
                ctaText: "Book Now",
              }),
            ],
            33,
          ),
          col(
            [
              el("pricing", {
                name: "Penthouse",
                price: "₹5.80 Cr",
                unit: "onwards",
                features: ["3,200 sq ft carpet", "4 Bed / 4 Bath", "Private terrace", "Bespoke interiors"],
                highlighted: false,
                ctaText: "Schedule Visit",
              }),
            ],
            33,
          ),
        ],
        { background: { color: "#f8fafc" } },
      ),
  },

  {
    id: "re-offers",
    label: "Offers & Promotions",
    icon: "gift",
    category: "real-estate",
    description: "Limited-time offer banner",
    create: () =>
      row(
        [
          col([
            el("heading", { text: "Launch Offer — Limited Time!", tag: "h2", align: "center", size: 32, color: "#ffffff" }),
            el("text", {
              text: "Book before 31 August 2026 and enjoy Zero Pre-EMI till possession, free modular kitchen, and gold membership to the club.",
              align: "center",
              color: "#e0e7ff",
            }),
            el("countdown", { targetDate: "2026-08-31T23:59:00", label: "Offer ends in", align: "center" }),
            el("button", { label: "Claim Your Offer →", style: "solid", size: "lg", align: "center", url: "#enquire" }),
          ]),
        ],
        {
          background: { gradient: "linear-gradient(135deg,#7c3aed,#4f46e5 55%,#0ea5e9)" },
          padding: { top: 80, right: 24, bottom: 80, left: 24 },
        },
      ),
  },

  {
    id: "re-lead-form",
    label: "Lead Capture Form",
    icon: "form-input",
    category: "real-estate",
    description: "Centred full-width enquiry form",
    create: () =>
      row(
        [
          col(
            [
              el("heading", { text: "Book Your Free Site Visit", tag: "h2", align: "center", size: 34, color: "#ffffff" }),
              el("text", {
                text: "Fill in your details and our property consultant will get in touch within 2 hours.",
                align: "center",
                color: "#c7d2fe",
              }),
              el("lead-form", {
                title: "",
                subtitle: "",
                ctaText: "Request a Callback",
                showName: true,
                showEmail: true,
                showPhone: true,
                showConfig: true,
                showMessage: false,
              }),
              el("whatsapp", { number: "+919876543210", message: "I'm interested in Marina Heights", label: "WhatsApp Us", size: "md" }),
            ],
            60,
          ),
        ],
        {
          background: { gradient: "linear-gradient(135deg,#0f172a,#1e3a8a)" },
          padding: { top: 100, right: 24, bottom: 100, left: 24 },
        },
      ),
  },

  {
    id: "re-testimonials",
    label: "Testimonials",
    icon: "quote",
    category: "real-estate",
    description: "Customer reviews and star ratings",
    create: () =>
      row(
        [
          col([
            el("heading", { text: "What Our Buyers Say", tag: "h2", align: "center", size: 34 }),
            el("text", { text: "Over 400 happy families have chosen Marina Heights as their forever home.", align: "center", color: "#475569" }),
            el("testimonial", {
              items: [
                { name: "Priya Sharma", role: "2 BHK Owner", quote: "The sea view from our living room is absolutely breathtaking. Best investment of our lives!", rating: 5 },
                { name: "Rohit Mehta", role: "3 BHK Owner", quote: "Smooth buying process and outstanding quality. The team was transparent throughout.", rating: 5 },
                { name: "Anita Patel", role: "Penthouse Owner", quote: "World-class amenities and a truly premium lifestyle. Worth every rupee.", rating: 5 },
              ],
            }),
          ]),
        ],
        { background: { color: "#f8fafc" } },
      ),
  },

  {
    id: "re-faq",
    label: "FAQ",
    icon: "help-circle",
    category: "real-estate",
    description: "Frequently asked questions accordion",
    create: () =>
      row([
        col([
          el("heading", { text: "Frequently Asked Questions", tag: "h2", align: "center", size: 34 }),
          el("faq", {
            items: [
              { question: "Is this project RERA registered?", answer: "Yes, Marina Heights is registered under MahaRERA with registration number P51900047821." },
              { question: "What is the possession date?", answer: "The expected possession date is December 2027. We guarantee on-time delivery." },
              { question: "Are there any pre-launch offers?", answer: "Yes, we have exclusive pre-launch pricing and zero pre-EMI schemes available for a limited time." },
              { question: "What are the available configurations?", answer: "We offer 2 BHK (1,150 sq ft), 3 BHK (1,580 sq ft), and Penthouse (3,200 sq ft) units." },
              { question: "Is NRI investment allowed?", answer: "Yes, NRI investment is fully permitted as per RBI guidelines. We have a dedicated NRI desk." },
            ],
          }),
        ]),
      ]),
  },

  {
    id: "re-final-cta",
    label: "Final CTA",
    icon: "rocket",
    category: "real-estate",
    description: "Bold closing call-to-action section",
    create: () =>
      row(
        [
          col([
            el("heading", { text: "Your Dream Home Awaits", tag: "h2", align: "center", size: 40, color: "#ffffff", weight: 800 }),
            el("text", { text: "Limited units available. Don't miss the pre-launch pricing. Schedule your visit today.", align: "center", color: "#c7d2fe" }),
            el("button", { label: "Book a Site Visit →", style: "solid", size: "lg", align: "center", url: "#enquire" }),
            el("call", { phoneNumber: "+919876543210", label: "Or call us: +91 98765 43210", size: "md", align: "center" }),
          ]),
        ],
        {
          background: { gradient: "linear-gradient(135deg,#4f46e5,#7c3aed 55%,#0ea5e9)" },
          padding: { top: 100, right: 24, bottom: 100, left: 24 },
          minHeight: 420,
        },
      ),
  },

  // ── Generic ──────────────────────────────────────────────────────────────
  {
    id: "gen-two-col",
    label: "Two Column Content",
    icon: "columns-2",
    category: "generic",
    description: "Two equal columns — image + text or text + text",
    create: () =>
      row([
        col([el("image", { src: "https://placehold.co/600x400/e2e8f0/64748b?text=Image", radius: 12 })], 50),
        col([
          el("heading", { text: "Section Title", tag: "h2", size: 30 }),
          el("text", { text: "Add your content here. Describe your project, features, or any other key information.", color: "#475569" }),
          el("button", { label: "Learn More", style: "solid", size: "md" }),
        ], 50),
      ]),
  },

  {
    id: "gen-features-grid",
    label: "Features Grid",
    icon: "grid-3x3",
    category: "generic",
    description: "3-column features / stats grid",
    create: () =>
      row(
        [
          col([el("heading", { text: "Key Features", tag: "h2", align: "center", size: 32 })]),
          col([el("icon-box", { icon: "star", title: "Feature One", description: "Brief description of this feature.", align: "center" })], 33),
          col([el("icon-box", { icon: "lightbulb", title: "Feature Two", description: "Brief description of this feature.", align: "center" })], 33),
          col([el("icon-box", { icon: "flame", title: "Feature Three", description: "Brief description of this feature.", align: "center" })], 33),
        ],
        { background: { color: "#f8fafc" } },
      ),
  },

  {
    id: "gen-gallery",
    label: "Gallery",
    icon: "camera",
    category: "generic",
    description: "Photo gallery grid",
    create: () =>
      row([
        col([
          el("heading", { text: "Gallery", tag: "h2", align: "center", size: 32 }),
          el("gallery", {
            columns: 3,
            images: [
              "https://placehold.co/600x400/e2e8f0/64748b?text=Photo+1",
              "https://placehold.co/600x400/e2e8f0/64748b?text=Photo+2",
              "https://placehold.co/600x400/e2e8f0/64748b?text=Photo+3",
              "https://placehold.co/600x400/e2e8f0/64748b?text=Photo+4",
              "https://placehold.co/600x400/e2e8f0/64748b?text=Photo+5",
              "https://placehold.co/600x400/e2e8f0/64748b?text=Photo+6",
            ],
          }),
        ]),
      ]),
  },

  {
    id: "gen-stats",
    label: "Statistics / Counters",
    icon: "bar-chart-3",
    category: "generic",
    description: "Animated number counters",
    create: () =>
      row(
        [
          col([el("heading", { text: "By the Numbers", tag: "h2", align: "center", size: 32 })]),
          col([el("icon-box", { icon: "hard-hat", title: "500+", description: "Units Delivered", align: "center" })], 25),
          col([el("icon-box", { icon: "smile", title: "1,200+", description: "Happy Families", align: "center" })], 25),
          col([el("icon-box", { icon: "trophy", title: "15+", description: "Awards Won", align: "center" })], 25),
          col([el("icon-box", { icon: "calendar", title: "25 Years", description: "Experience", align: "center" })], 25),
        ],
        { background: { gradient: "linear-gradient(135deg,#1e3a8a,#4f46e5)" } },
      ),
  },

  {
    id: "gen-cta",
    label: "Call to Action",
    icon: "target",
    category: "generic",
    description: "Centred CTA with headline and button",
    create: () =>
      row(
        [
          col([
            el("heading", { text: "Ready to Get Started?", tag: "h2", align: "center", size: 36, color: "#ffffff" }),
            el("text", { text: "Take the first step towards your dream property. Our experts are ready to help.", align: "center", color: "#c7d2fe" }),
            el("button", { label: "Contact Us Today", style: "solid", size: "lg", align: "center" }),
          ]),
        ],
        { background: { color: "#4f46e5" }, padding: { top: 80, right: 24, bottom: 80, left: 24 } },
      ),
  },

  {
    id: "gen-contact",
    label: "Contact",
    icon: "phone",
    category: "generic",
    description: "Contact info and lead form side by side",
    create: () =>
      row([
        col(
          [
            el("heading", { text: "Get in Touch", tag: "h2", size: 32 }),
            el("contact-info", {
              items: [
                { icon: "phone", label: "Phone", value: "+91 98765 43210" },
                { icon: "mail", label: "Email", value: "info@project.com" },
                { icon: "map-pin", label: "Office", value: "BKC, Mumbai — Mon–Sat 10am–7pm" },
              ],
            }),
            el("whatsapp", { number: "+919876543210", message: "Hi, I'd like to know more.", label: "Chat on WhatsApp", size: "md" }),
          ],
          45,
        ),
        col([el("lead-form", { title: "Send Us a Message", ctaText: "Send Message" })], 55),
      ]),
  },

  {
    id: "gen-text",
    label: "Text / Rich Content",
    icon: "type",
    category: "generic",
    description: "Heading and paragraph text block",
    create: () =>
      row([
        col([
          el("heading", { text: "Section Heading", tag: "h2", size: 32, align: "center" }),
          el("text", {
            text: "Add your text content here. This is a rich content section where you can write detailed information about your project, team, or any other topic.",
            align: "center",
            color: "#475569",
          }),
        ], 70),
      ]),
  },
];

export const RE_SECTIONS = SECTION_TEMPLATES.filter((s) => s.category === "real-estate");
export const GENERIC_SECTIONS = SECTION_TEMPLATES.filter((s) => s.category === "generic");
