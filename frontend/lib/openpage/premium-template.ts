import type { BlockConfig, SiteConfig } from "@/components/openpage/blocks/types";
import { themePresets } from "@/lib/openpage/theme-presets";
import { newFormDefinition } from "@/lib/openpage/forms-store";

const IMG = {
  hero: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80",
  about: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80",
  living: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
  kitchen: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
  pool: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80",
  gym: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
  garden: "https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=1200&q=80",
  lobby: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
  night: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
  terrace: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdbc?auto=format&fit=crop&w=1200&q=80",
  plan: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80",
  brochure: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80",
  avatar1: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
  avatar2: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  avatar3: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
};

const BROCHURE_PDF = "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf";
const MAP_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.079!2d77.7499!3d12.9698!2m3!1f0!2d0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae0e0!2sWhitefield%2C%20Bengaluru!5e0!3m2!1sen!2sin!4v1710000000000";

function bid(prefix: string) {
  return `block-${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function seedPremiumForm() {
  const form = newFormDefinition(undefined, "Project enquiry");
  form.submitLabel = "Submit enquiry";
  form.thankYou = "Thank you. Our team will call you within 15 minutes.";
  form.successAction = "message";
  form.fields = [
    { id: "fld_name", type: "text", label: "Full name", placeholder: "Your name", required: true },
    { id: "fld_phone", type: "phone", label: "Mobile number", placeholder: "+91 98765 43210", required: true },
    { id: "fld_email", type: "email", label: "Email", placeholder: "you@email.com", required: true },
    {
      id: "fld_pref",
      type: "select",
      label: "Property / unit preference",
      placeholder: "Select a configuration",
      required: true,
      options: ["2 BHK", "3 BHK", "4 BHK", "Penthouse"],
    },
    { id: "fld_msg", type: "textarea", label: "Message", placeholder: "Tell us what you are looking for", required: false },
    { id: "fld_consent", type: "checkbox", label: "I agree to be contacted and accept the privacy policy", placeholder: "", required: true },
  ];
  return form;
}

export function buildPremiumRealEstateTemplate(name: string): SiteConfig {
  const form = seedPremiumForm();
  const popupId = "popup-brochure";
  const theme = themePresets.find((t) => t.id === "estate")?.theme;
  const blocks: BlockConfig[] = [
    {
      id: bid("nav"),
      type: "navbar",
      variant: "default",
      props: {
        logo: name,
        ctaText: "Enquire Now",
        ctaId: "enquire",
        menuItems: [
          { label: "Overview", id: "overview" },
          { label: "Units", id: "units" },
          { label: "Amenities", id: "amenities" },
          { label: "Gallery", id: "gallery" },
          { label: "Location", id: "location" },
          { label: "Plans", id: "plans" },
          { label: "Pricing", id: "pricing" },
        ],
        links: ["Overview", "Units", "Amenities", "Gallery", "Location", "Plans", "Pricing"],
      },
    },
    {
      id: bid("hero"),
      type: "project-banner",
      variant: "split-form",
      props: {
        badge: "RERA registered · New launch",
        headline: name,
        location: "Whitefield, Bengaluru",
        description: "A 12-acre landscaped community of residences designed around light, privacy and resort living — minutes from ITPL and the metro.",
        price: "Starting ₹ 1.42 Cr*",
        image: IMG.hero,
        primaryCta: "Book a Site Visit",
        secondaryCta: "Download Brochure",
        formTitle: "Book a private tour",
        formSubtitle: "Share your details. A relationship manager will confirm your slot.",
        formId: form.id,
        popupId,
        pdfUrl: BROCHURE_PDF,
      },
    },
    {
      id: bid("stats"),
      type: "property-details",
      variant: "grid",
      props: {
        title: "Project Highlights",
        subtitle: "Everything you need to know at a glance.",
        items: [
          { label: "Project Area", value: "12.4 Ac" },
          { label: "Total Units", value: "428" },
          { label: "Starting Price", value: "₹ 1.42 Cr*" },
          { label: "Location", value: "Whitefield" },
          { label: "Possession", value: "Dec 2027" },
        ],
      },
    },
    {
      id: bid("about"),
      type: "project-overview",
      variant: "split",
      props: {
        subtitle: "About the project",
        title: "An address that feels like a private resort",
        body: `${name} rises over a 12.4-acre campus with 70% open space, double-height lobbies and residences that open onto landscaped courtyards. Every home is planned for generous light, cross-ventilation and a quiet sense of arrival.`,
        image: IMG.about,
        ctaText: "Schedule a visit",
        highlights: [
          { title: "RERA registered", description: "PRM/KA/RERA/1251/446/PR/041024" },
          { title: "70% open space", description: "Courtyards, water gardens and tree-lined walks" },
          { title: "Metro-ready", description: "12 minutes to Whitefield metro" },
        ],
      },
    },
    {
      id: bid("units"),
      type: "unit-config",
      variant: "cards",
      props: {
        title: "Residences",
        subtitle: "Thoughtful layouts with premium finishes and expansive decks.",
        ctaText: "Enquire",
        items: [
          { type: "Apartment", config: "2 BHK", area: "1,145 – 1,210 sq.ft", price: "From ₹ 1.42 Cr*", image: IMG.living, cta: "Enquire" },
          { type: "Apartment", config: "3 BHK", area: "1,540 – 1,680 sq.ft", price: "From ₹ 1.98 Cr*", image: IMG.kitchen, cta: "Enquire" },
          { type: "Penthouse", config: "4 BHK Sky Villa", area: "2,480 sq.ft", price: "From ₹ 3.65 Cr*", image: IMG.night, cta: "Enquire" },
        ],
      },
    },
    {
      id: bid("am"),
      type: "amenities",
      variant: "grid",
      props: {
        title: "Amenities",
        subtitle: "A 40,000 sq.ft clubhouse and outdoor amenities across four levels.",
        items: [
          { title: "Grand Clubhouse", description: "Lounge, café, co-working and banquet for 200 guests.", image: IMG.lobby },
          { title: "Infinity Pool", description: "Temperature-controlled pool with a sun deck and cabanas.", image: IMG.pool },
          { title: "Fitness Studio", description: "Strength, cardio and yoga studios with park views.", image: IMG.gym },
          { title: "Landscaped Gardens", description: "Native planting, water courts and evening lighting.", image: IMG.garden },
          { title: "Sky Terrace", description: "Open-air lounge for sundowners and community events.", image: IMG.terrace },
          { title: "Kids’ Play & Creche", description: "Indoor play studio and supervised outdoor courts.", image: IMG.living },
        ],
      },
    },
    {
      id: bid("gal"),
      type: "gallery",
      variant: "masonry",
      props: {
        title: "Gallery",
        images: [
          { src: IMG.hero, alt: "Tower facade", caption: "Arrival boulevard", category: "Exteriors" },
          { src: IMG.lobby, alt: "Lobby", caption: "Double-height lobby", category: "Interiors" },
          { src: IMG.living, alt: "Living room", caption: "Sample residence", category: "Interiors" },
          { src: IMG.pool, alt: "Pool", caption: "Club pool", category: "Amenities" },
          { src: IMG.garden, alt: "Gardens", caption: "Central courtyard", category: "Amenities" },
          { src: IMG.night, alt: "Night view", caption: "Evening skyline", category: "Exteriors" },
        ],
      },
    },
    {
      id: bid("loc"),
      type: "location",
      variant: "split-map",
      props: {
        title: "Location & Connectivity",
        address: "Plot 18, Whitefield Main Road, Bengaluru 560066",
        embedUrl: MAP_EMBED,
        items: [
          { title: "ITPL", meta: "8 min" },
          { title: "Whitefield Metro", meta: "12 min" },
          { title: "ORR / Hope Farm", meta: "10 min" },
          { title: "International Airport", meta: "45 min" },
          { title: "Phoenix Marketcity", meta: "18 min" },
          { title: "Manipal Hospital", meta: "9 min" },
        ],
      },
    },
    {
      id: bid("fp"),
      type: "floor-plans",
      variant: "cards",
      props: {
        title: "Floor Plans",
        subtitle: "Efficient, well-zoned plans with large decks.",
        items: [
          { name: "2 BHK Classic", beds: "2 Beds + 2 Baths", area: "1,145 sq.ft", price: "₹ 1.42 Cr*", image: IMG.plan, downloadUrl: BROCHURE_PDF },
          { name: "3 BHK Grand", beds: "3 Beds + 3 Baths", area: "1,540 sq.ft", price: "₹ 1.98 Cr*", image: IMG.plan, downloadUrl: BROCHURE_PDF },
          { name: "4 BHK Sky Villa", beds: "4 Beds + 4 Baths", area: "2,480 sq.ft", price: "₹ 3.65 Cr*", image: IMG.plan, downloadUrl: BROCHURE_PDF },
        ],
      },
    },
    {
      id: bid("pr"),
      type: "re-pricing",
      variant: "cards",
      props: {
        title: "Pricing",
        subtitle: "Transparent starting prices. GST extra as applicable.",
        disclaimer: "*Prices are indicative and subject to availability. T&C apply.",
        ctaText: "Enquire",
        items: [
          { name: "2 BHK", price: "₹ 1.42 Cr*", meta: "1,145 sq.ft onwards", cta: "Enquire" },
          { name: "3 BHK", price: "₹ 1.98 Cr*", meta: "1,540 sq.ft onwards", cta: "Enquire" },
          { name: "4 BHK", price: "₹ 3.65 Cr*", meta: "Sky villas · limited inventory", cta: "Enquire" },
        ],
      },
    },
    {
      id: bid("why"),
      type: "features",
      variant: "grid",
      props: {
        label: "Why choose us",
        title: "Advantages that compound over time",
        subtitle: "A developer-backed community with lifestyle, location and lasting value.",
        items: [
          { icon: "Award", title: "Award-winning developer", description: "Two decades of on-time deliveries across Bengaluru and Hyderabad." },
          { icon: "Trees", title: "70% open campus", description: "Landscaped courtyards, water gardens and a 1 km jogging loop." },
          { icon: "MapPin", title: "Whitefield convenience", description: "IT parks, metro, schools and healthcare within a short drive." },
          { icon: "Home", title: "Future-ready homes", description: "VRV cooling-ready, EV charging and high-speed fibre to every unit." },
          { icon: "Shield", title: "RERA transparency", description: "Registered project with published timelines and escrow." },
          { icon: "Heart", title: "Community living", description: "Club events, resident app and 24×7 concierge." },
        ],
      },
    },
    {
      id: bid("rev"),
      type: "testimonials",
      variant: "carousel",
      props: {
        title: "What residents say",
        subtitle: "Early homeowners and site visitors.",
        items: [
          { name: "Ananya Rao", role: "3 BHK homeowner", quote: "The sample apartment felt like a boutique hotel. Light, storage and the deck sold us in one visit.", rating: 5, avatar: IMG.avatar1 },
          { name: "Vikram Shah", role: "Investor, 2 BHK", quote: "Clear RERA paperwork, a credible payment plan and a location that will only get denser. Easy decision.", rating: 5, avatar: IMG.avatar2 },
          { name: "Meera Iyer", role: "Site visitor", quote: "The clubhouse and greens are already taking shape. The team was patient with every question.", rating: 5, avatar: IMG.avatar3 },
        ],
      },
    },
    {
      id: bid("faq"),
      type: "faq",
      variant: "accordion",
      props: {
        title: "Frequently asked questions",
        items: [
          { question: "Is the project RERA registered?", answer: "Yes. The RERA number is PRM/KA/RERA/1251/446/PR/041024 and is published in project documents." },
          { question: "What configurations are available?", answer: "2 BHK, 3 BHK and limited 4 BHK sky villas. Carpet areas start at 1,145 sq.ft." },
          { question: "When is possession?", answer: "Committed possession is December 2027, subject to RERA timelines." },
          { question: "Can I download the brochure?", answer: "Yes. Use Download Brochure, complete the enquiry form, and the PDF will open automatically." },
          { question: "How do I book a site visit?", answer: "Use Book a Site Visit or the enquiry form. Our team confirms a slot by phone or WhatsApp." },
        ],
      },
    },
    {
      id: bid("form"),
      type: "lead-form",
      variant: "card",
      props: {
        title: "Enquire now",
        subtitle: "Prefer a call-back? Share your details and we will reach you shortly.",
        formId: form.id,
      },
    },
    {
      id: bid("dl"),
      type: "download-brochure",
      variant: "split",
      props: {
        title: "Download the brochure",
        subtitle: "Plans, specifications, amenities and location map in one PDF. Complete a short form to download.",
        buttonText: "Download Brochure",
        image: IMG.brochure,
        pdfUrl: BROCHURE_PDF,
        popupId,
      },
    },
    {
      id: bid("cta"),
      type: "cta",
      variant: "simple",
      props: {
        headline: "Ready to walk the campus?",
        subheadline: "Book a private site visit this weekend. Limited preview slots each Saturday.",
        buttonText: "Book a Site Visit",
        buttonUrl: "#enquire",
      },
    },
    {
      id: bid("foot"),
      type: "footer",
      variant: "multi-column",
      props: {
        logo: name,
        tagline: `${name} by Horizon Developers — residences in Whitefield, Bengaluru.`,
        address: "Plot 18, Whitefield Main Road, Bengaluru 560066",
        phone: "+91 80 4567 8900",
        email: "sales@meridianresidences.in",
        socials: ["Instagram", "LinkedIn", "YouTube"],
        copyright: `© ${new Date().getFullYear()} ${name}. All rights reserved.`,
        links: ["Privacy Policy", "Terms", "RERA"],
        columns: [
          { title: "Explore", links: ["Overview", "Amenities", "Gallery", "Pricing"] },
          { title: "Plans", links: ["2 BHK", "3 BHK", "Sky villas", "Brochure"] },
          { title: "Visit", links: ["Book a visit", "Get directions", "Contact"] },
          { title: "Legal", links: ["Privacy Policy", "Terms", "RERA", "Disclaimer"] },
        ],
      },
    },
  ];

  return {
    engine: "openpage",
    name,
    theme,
    forms: [form],
    popups: [
      {
        id: popupId,
        name: "Brochure download",
        title: "Get the brochure",
        description: "Share your details and we will unlock the project PDF instantly.",
        formId: form.id,
        closeOnOverlay: true,
        trigger: "click",
        brochureUrl: BROCHURE_PDF,
        image: IMG.brochure,
      },
    ],
    pages: [{ id: "page-home", name: "Home", path: "/", blocks }],
    blocks,
  };
}
