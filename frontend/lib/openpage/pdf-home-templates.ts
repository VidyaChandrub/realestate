import type { BlockConfig, SiteConfig } from "@/components/openpage/blocks/types";
import { themePresets } from "@/lib/openpage/theme-presets";
import { newFormDefinition } from "@/lib/openpage/forms-store";

const IMG = {
  heroTower: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1920&q=80",
  heroNight: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80",
  heroCity: "https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=1920&q=80",
  heroAerial: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1920&q=80",
  facade: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  lobby: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80",
  kitchen: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
  bath: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80",
  pool: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80",
  lounge: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
  wine: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
  terrace: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdbc?auto=format&fit=crop&w=1200&q=80",
  master: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=80",
  location: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1200&q=80",
  plan: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80",
  towers: "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1400&q=80",
};

function theme(id: string) {
  return themePresets.find((t) => t.id === id)?.theme;
}

function bid(prefix: string) {
  return `block-${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function seedForm(name: string) {
  const form = newFormDefinition(undefined, `${name} enquiry`);
  form.submitLabel = "Submit";
  form.thankYou = "Thank you. Our team will call you shortly.";
  form.fields = [
    { id: "fld_name", type: "text", label: "Name", placeholder: "Your name", required: true },
    { id: "fld_email", type: "email", label: "Email", placeholder: "you@email.com", required: true },
    { id: "fld_phone", type: "phone", label: "Phone", placeholder: "+91", required: true },
    {
      id: "fld_config",
      type: "select",
      label: "Configuration",
      placeholder: "Select",
      required: false,
      options: ["2 BHK", "3 BHK", "4 BHK", "5 BHK"],
    },
    { id: "fld_msg", type: "textarea", label: "Message", placeholder: "Tell us what you are looking for", required: false },
  ];
  return form;
}

function page(name: string, themeId: string, blocks: BlockConfig[], presetRevision?: string): SiteConfig {
  const form = seedForm(name);
  const popupId = "popup-brochure";
  const withForm = blocks.map((b) => {
    if (["lead-form", "site-visit", "contact", "newsletter", "project-banner"].includes(b.type)) {
      return { ...b, props: { ...b.props, formId: form.id, popupId: b.props.popupId || popupId } };
    }
    if (["download-brochure", "cta", "floor-plans"].includes(b.type)) {
      return { ...b, props: { ...b.props, popupId, formId: form.id } };
    }
    return b;
  });
  return {
    engine: "openpage",
    name,
    theme: theme(themeId),
    forms: [form],
    popups: [
      {
        id: popupId,
        name: "Brochure download",
        title: "Get the brochure",
        description: "Share your details and we will send the PDF instantly.",
        formId: form.id,
        closeOnOverlay: true,
        trigger: "click",
        brochureUrl: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
      },
    ],
    pages: [{ id: "page-home", name: "Home", path: "/", blocks: withForm }],
    blocks: withForm,
    vars: presetRevision ? { presetRevision } : undefined,
  };
}

/** PDF 8 — Aurelia Reserve luxury editorial home */
export function buildAureliaReserveTemplate(name = "Aurelia Reserve"): SiteConfig {
  return page(name, "aurelia", [
    {
      id: bid("nav"),
      type: "navbar",
      variant: "default",
      props: {
        logo: "AURELIA RESERVE",
        ctaText: "Book Private Preview",
        ctaId: "enquire",
        menuItems: [
          { label: "Residences", id: "overview" },
          { label: "Amenities", id: "amenities" },
          { label: "Architecture", id: "architecture" },
          { label: "Location", id: "location" },
          { label: "Enquire", id: "enquire" },
        ],
      },
    },
    {
      id: bid("hero"),
      type: "project-banner",
      variant: "editorial",
      props: {
        badge: "Luxury Residences",
        headline: "Architecture Crafted For Generations.",
        description:
          "Aurelia Reserve is an exclusive collection of residences designed for those who appreciate timeless architecture, handcrafted interiors, and extraordinary experiences.",
        primaryCta: "Schedule Private Tour",
        secondaryCta: "Download Brochure",
        primaryAnchor: "enquire",
        image: IMG.heroNight,
        stats: [
          { label: "Location", value: "South Mumbai" },
          { label: "Starting Price", value: "₹8.5 Cr" },
          { label: "Configuration", value: "3 | 4 | 5 Residences" },
          { label: "Possession", value: "2029" },
        ],
        anchor: "hero",
      },
    },
    {
      id: bid("ov"),
      type: "project-overview",
      variant: "split",
      props: {
        subtitle: "The Project",
        title: "Not Just A Residence.\nA New Family Legacy.",
        body: "Luxury isn't measured by square feet.\nIt's measured by the memories your home creates.\n\nAurelia Reserve blends timeless architecture with contemporary craftsmanship to create residences designed for generations.",
        image: IMG.facade,
        imagePosition: "right",
        stats: [
          { value: "40", label: "Floors" },
          { value: "220", label: "Residences" },
          { value: "7", label: "Acres" },
          { value: "65", label: "Luxury Amenities" },
        ],
        anchor: "overview",
      },
    },
    {
      id: bid("phil"),
      type: "project-highlights",
      variant: "quote",
      props: {
        subtitle: "Philosophy",
        title: "We don't build apartments.",
        accentLine: "We design heirlooms.",
        author: "Rustom Mehta",
        authorRole: "Founder · Solvia Estates",
        anchor: "philosophy",
      },
    },
    {
      id: bid("sig"),
      type: "project-highlights",
      variant: "signature",
      props: {
        title: "Signature Highlights",
        subtitle: "Five defining details carried through every residence, without exception.",
        items: [
          { title: "Floor-to-Ceiling Windows", description: "Uninterrupted glazing that dissolves the boundary between interior and horizon." },
          { title: "Private Sky Decks", description: "Elevated open-air rooms with landscaped edges, reserved for a single residence." },
          { title: "Italian Marble Interiors", description: "Book-matched slabs hand-selected from quarries in Carrara and Verona." },
          { title: "Smart Living Automation", description: "Light, climate, shading and security composed into one quiet interface." },
          { title: "Private Elevator Access", description: "A discreet arrival that opens directly into your own entrance foyer." },
        ],
        anchor: "highlights",
      },
    },
    {
      id: bid("life"),
      type: "gallery",
      variant: "lifestyle",
      props: {
        label: "Lifestyle",
        title: "A Day Composed Of Rare Moments.",
        images: [
          { src: IMG.pool, caption: "Infinity Pool", meta: "Level 38" },
          { src: IMG.lounge, caption: "Sky Lounge", meta: "Level 40" },
          { src: IMG.terrace, caption: "Floating Deck", meta: "Forest Walk" },
          { src: IMG.wine, caption: "Wine Library", meta: "Private Cellar" },
        ],
        anchor: "amenities",
      },
    },
    {
      id: bid("plans"),
      type: "floor-plans",
      variant: "showcase",
      props: {
        title: "Choose Your Proportion.",
        items: [
          { name: "3 BHK", beds: "3 Bedrooms", area: "3,420 sq.ft", price: "Private Lift", image: IMG.plan },
          { name: "4 BHK", beds: "4 Bedrooms", area: "4,610 sq.ft", price: "Sea & Skyline", image: IMG.plan },
          { name: "5 BHK", beds: "5 Bedrooms", area: "5,880 sq.ft", price: "3 Deep Balconies", image: IMG.plan },
        ],
        gateEnabled: true,
        anchor: "plans",
      },
    },
    {
      id: bid("arch"),
      type: "features",
      variant: "alternating",
      props: {
        label: "Architecture",
        title: "Designed Around Light.",
        subtitle: "Every residence welcomes natural light from sunrise to sunset through expansive glazing.",
        items: [
          {
            icon: "Home",
            title: "Italian Kitchens",
            description: "Bespoke cabinetry in walnut with honed marble islands and integrated appliances.",
            image: IMG.kitchen,
            label: "Interior Experience",
            tags: ["Imported Stone", "Acoustic Comfort"],
          },
          {
            icon: "Award",
            title: "Designer Bathrooms",
            description: "Book-matched slabs, stone tubs and brushed fittings composed with quiet restraint.",
            image: IMG.bath,
            label: "Interior Experience",
            tags: ["Luxury Wardrobes", "Climate Technology"],
          },
        ],
        anchor: "architecture",
      },
    },
    {
      id: bid("loc"),
      type: "location",
      variant: "editorial",
      props: {
        subtitle: "Location",
        title: "South Mumbai, Quietly Central.",
        image: IMG.location,
        items: [
          { title: "International Airport", meta: "18 km · 24 min" },
          { title: "Business District", meta: "4 km · 9 min" },
          { title: "Luxury Hotels", meta: "2 km · 6 min" },
          { title: "Hospitals", meta: "3 km · 8 min" },
          { title: "International Schools", meta: "5 km · 11 min" },
          { title: "Metro", meta: "900 m · 3 min" },
          { title: "Fine Dining", meta: "1.2 km · 4 min" },
          { title: "Golf Club", meta: "9 km · 16 min" },
        ],
        anchor: "location",
      },
    },
    {
      id: bid("prog"),
      type: "construction-status",
      variant: "timeline",
      props: {
        subtitle: "Construction Progress",
        title: "Built Slowly. On Purpose.",
        items: [
          { year: "2026", title: "Foundation", description: "Excavation and raft complete" },
          { year: "2027", title: "Structure", description: "Core rises to level 40" },
          { year: "2028", title: "Facade", description: "Stone and glazing installation" },
          { year: "2029", title: "Completion", description: "Handover of residences" },
        ],
        anchor: "progress",
      },
    },
    {
      id: bid("tes"),
      type: "testimonials",
      variant: "cards",
      props: {
        title: "In Their Words.",
        items: [
          { name: "Aditi Raheja", role: "Collector, Mumbai", quote: "Owning a home here feels like owning a piece of architectural history.", rating: 5 },
          { name: "Vikram Sethna", role: "Principal Architect", quote: "The restraint is what convinced us. Nothing shouts, everything endures.", rating: 5 },
          { name: "Meher Contractor", role: "Private Investor", quote: "It is the first home we have bought for our grandchildren, not ourselves.", rating: 5 },
        ],
      },
    },
    {
      id: bid("form"),
      type: "lead-form",
      variant: "card",
      props: {
        title: "Arrive By Appointment.",
        subtitle: "Our residence directors host a limited number of previews each week at the Aurelia Reserve experience gallery.",
        formId: "",
        anchor: "enquire",
      },
    },
    {
      id: bid("foot"),
      type: "footer",
      variant: "multi-column",
      props: {
        logo: "AURELIA RESERVE",
        copyright: "© 2026 Solvia Estates",
        links: ["Privacy", "RERA P51900XXXXX", "Legal"],
      },
    },
  ]);
}

/** PDF 3 — Framed navy/red hero with glass stats */
export function buildVistaFramedTemplate(name = "Abc Vista"): SiteConfig {
  return page(name, "vista-red", [
    {
      id: bid("nav"),
      type: "navbar",
      variant: "default",
      props: {
        logo: name,
        ctaText: "Contact Us",
        ctaId: "enquire",
        menuItems: [
          { label: "Overview", id: "overview" },
          { label: "Highlights", id: "highlights" },
          { label: "Plans", id: "plans" },
          { label: "Gallery", id: "gallery" },
          { label: "Amenities", id: "amenities" },
          { label: "Location", id: "location" },
        ],
      },
    },
    {
      id: bid("hero"),
      type: "project-banner",
      variant: "framed",
      props: {
        headline: "4 BHK Luxury Flat starting at ₹2.75 cr with a private lift",
        primaryCta: "Know More",
        primaryAnchor: "overview",
        image: IMG.heroTower,
        stats: [
          { value: "356", label: "High-Privacy Homes in 6.80 Acres" },
          { value: "88%", label: "Open-to-Sky Spaces" },
          { value: "17,700", label: "Sq. Ft. Clubhouse" },
          { value: "45+", label: "Curated Amenities" },
        ],
        anchor: "hero",
      },
    },
    {
      id: bid("ov"),
      type: "project-overview",
      variant: "centered",
      props: {
        title: "OVERVIEW",
        body: "Abc Vista, a premium new launch in Hebbagodi, offers thoughtfully designed apartments in Electronic City for those who want harmony between ambition and everyday comfort. Set in Bengaluru's thriving tech corridor, this is an address created for people who value both progress and peace.\n\nSpread across 6.99 acres and envisioned by Hafeez Contractor, the community brings together contemporary architecture, open green spaces, and wellness-focused amenities. With just 356 exclusive homes, it offers the rare advantage of low-density living, privacy, and breathing space.",
        image: IMG.lobby,
        anchor: "overview",
      },
    },
    {
      id: bid("am"),
      type: "amenities",
      variant: "icon-grid",
      props: {
        title: "AMENITIES",
        subtitle:
          "Stepping into the realm of architecture feels like entering a dialogue between luxury and nature — crafting spaces where residents feel truly at home.",
        items: [
          { title: "Futsal Court", description: "" },
          { title: "Basketball Court", description: "" },
          { title: "Tennis Court", description: "" },
          { title: "Swimming Pool", description: "" },
          { title: "Kids' Play Area", description: "" },
          { title: "Party Lawn", description: "" },
          { title: "Amphitheatre", description: "" },
          { title: "Outdoor Gym", description: "" },
          { title: "Squash Court", description: "" },
          { title: "Badminton Court", description: "" },
          { title: "Yoga Deck", description: "" },
          { title: "Salon & Spa", description: "" },
        ],
        anchor: "amenities",
      },
    },
    {
      id: bid("gal"),
      type: "gallery",
      variant: "masonry",
      props: {
        title: "PROJECT GALLERY",
        images: [
          { src: IMG.facade, caption: "Elevation", category: "Architecture" },
          { src: IMG.lobby, caption: "Lobby", category: "Interiors" },
          { src: IMG.pool, caption: "Pool", category: "Amenities" },
          { src: IMG.towers, caption: "Campus", category: "Architecture" },
          { src: IMG.kitchen, caption: "Kitchen", category: "Interiors" },
          { src: IMG.terrace, caption: "Terrace", category: "Lifestyle" },
        ],
        anchor: "gallery",
      },
    },
    {
      id: bid("plans"),
      type: "floor-plans",
      variant: "cards",
      props: {
        title: "MASTER PLAN & FLOOR PLANS",
        items: [
          { name: "2 BHK", beds: "2 Beds", area: "1,120 sq.ft", price: "On request", image: IMG.plan },
          { name: "3 BHK", beds: "3 Beds", area: "1,540 sq.ft", price: "On request", image: IMG.plan },
          { name: "4 BHK", beds: "4 Beds", area: "2,180 sq.ft", price: "₹2.75 Cr*", image: IMG.plan },
        ],
        gateEnabled: true,
        anchor: "plans",
      },
    },
    {
      id: bid("loc"),
      type: "location",
      variant: "cards",
      props: {
        title: "LOCATION HIGHLIGHTS",
        address: "Hebbagodi, Electronic City, Bengaluru",
        items: [
          { title: "Canadian International School", meta: "2.1 Km" },
          { title: "Mallya Aditi International School", meta: "4.0 Km" },
          { title: "Work Hubs & Tech Parks", meta: "Nearby" },
          { title: "Healthcare", meta: "Minutes away" },
          { title: "Entertainment & Lifestyle", meta: "Close by" },
          { title: "Universities", meta: "5–8 Km" },
        ],
        anchor: "location",
      },
    },
    {
      id: bid("form"),
      type: "lead-form",
      variant: "card",
      props: {
        title: "Get access to a Luxury Home Experience",
        subtitle: "Share your details and our team will connect shortly.",
        formId: "",
        anchor: "enquire",
      },
    },
    {
      id: bid("foot"),
      type: "footer",
      variant: "simple",
      props: {
        logo: name,
        copyright: "RERA NO.- PRM/KA/RERA/1251/308/PR/070325/007558 · Privacy Policy | Terms & Condition",
        links: ["Overview", "Amenities", "Gallery", "Floor Plans", "Location"],
      },
    },
  ]);
}

/** PDF 5 — Future Home asymmetric cream layout */
export function buildFutureHomeTemplate(name = "Future Home"): SiteConfig {
  return page(name, "future-home", [
    {
      id: bid("nav"),
      type: "navbar",
      variant: "default",
      props: {
        logo: name,
        ctaText: "93245 00132",
        ctaHref: "tel:9324500132",
        menuItems: [
          { label: "Overview", id: "overview" },
          { label: "Project Highlights", id: "highlights" },
          { label: "Floor Plans", id: "plans" },
          { label: "Amenities", id: "amenities" },
          { label: "Gallery", id: "gallery" },
          { label: "Location", id: "location" },
        ],
      },
    },
    {
      id: bid("hero"),
      type: "project-banner",
      variant: "asymmetric",
      props: {
        headline: "Your Future Home Starts Here",
        description: "Find spaces that match your lifestyle and aspirations. Beautifully designed homes in prime locations.",
        image: IMG.heroCity,
        rera: "RERA NO. PRM/KA/RERA/1251/308/PR/070325/007558",
        stats: [
          { value: "410", label: "Units" },
          { value: "3", label: "Towers" },
          { value: "4.65", label: "Acres" },
          { value: "25+", label: "Amenities" },
        ],
        primaryCta: "Enquire Now",
        secondaryCta: "Download Brochure",
        primaryAnchor: "enquire",
        anchor: "hero",
      },
    },
    {
      id: bid("hi"),
      type: "project-overview",
      variant: "split",
      props: {
        subtitle: "Project Highlights",
        title: "Crafted for Modern Families",
        body: "Welcome to a thoughtfully designed residential development created for those who value comfort, elegance, and convenience. Every space is carefully planned to deliver a perfect balance of aesthetics and functionality, offering a peaceful environment for modern living.",
        image: IMG.towers,
        imagePosition: "right",
        ctaText: "Download Brochure",
        ctaAnchor: "brochure",
        anchor: "highlights",
      },
    },
    {
      id: bid("am"),
      type: "amenities",
      variant: "icon-grid",
      props: {
        title: "Everything You Need for a Balanced Life",
        subtitle: "Amenities",
        items: [
          { title: "Infinity Swimming Pool", description: "" },
          { title: "Fully Equipped Gymnasium", description: "" },
          { title: "Landscaped Gardens", description: "" },
          { title: "Children's Play Area", description: "" },
          { title: "Clubhouse & Lounge", description: "" },
          { title: "Jogging & Cycling", description: "" },
          { title: "24/7 Security", description: "" },
          { title: "Indoor Games Room", description: "" },
        ],
        anchor: "amenities",
      },
    },
    {
      id: bid("master"),
      type: "gallery",
      variant: "grid",
      props: {
        title: "MASTERPLAN",
        images: [{ src: IMG.master, caption: "Intelligently Designed Living Spaces", category: "Masterplan" }],
        anchor: "masterplan",
      },
    },
    {
      id: bid("plans"),
      type: "floor-plans",
      variant: "showcase",
      props: {
        title: "Find the Perfect Layout for Your Lifestyle",
        subtitle: "Floor Plans",
        items: [
          { name: "4 BHK", beds: "Facing: North", area: "3245 Sq.Ft", price: "First Floor Plan", image: IMG.plan },
        ],
        gateEnabled: true,
        anchor: "plans",
      },
    },
    {
      id: bid("gal"),
      type: "gallery",
      variant: "masonry",
      props: {
        title: "A Glimpse of Elevated Living",
        images: [
          { src: IMG.facade, caption: "Elevation" },
          { src: IMG.lobby, caption: "Lobby" },
          { src: IMG.pool, caption: "Pool" },
          { src: IMG.kitchen, caption: "Kitchen" },
        ],
        anchor: "gallery",
      },
    },
    {
      id: bid("loc"),
      type: "location",
      variant: "list",
      props: {
        title: "Live Close to Everything That Matters",
        address: "Plot No. 27, Outer Ring Road, Marathahalli, Bangalore",
        items: [
          { title: "IT Hubs", meta: "12 minutes" },
          { title: "Hospitals", meta: "Under 10 minutes" },
          { title: "Schools & Colleges", meta: "20 minutes" },
          { title: "Entertainment hubs", meta: "Close proximity" },
          { title: "Kadugodi Metro Station", meta: "6 Km" },
          { title: "Whitefield", meta: "44.8 Km" },
        ],
        anchor: "location",
      },
    },
    {
      id: bid("form"),
      type: "lead-form",
      variant: "card",
      props: {
        title: "Get In Touch With Us",
        subtitle: "Bill Robertson Real Estate · 4.5 (30 Ratings)",
        formId: "",
        anchor: "enquire",
      },
    },
    {
      id: bid("foot"),
      type: "footer",
      variant: "multi-column",
      props: {
        logo: "Bill Robertson Real Estate",
        copyright: "Copyright 2026 - Bill Robertson Real Estate. All Rights Reserved",
        links: ["Home", "About Us", "Projects", "Contact Us", "Privacy Policy", "Terms & Conditions"],
      },
    },
  ]);
}

/** PDF 6 — Modern Living centered hero + info bar */
export function buildModernLivingTemplate(name = "Modern Living"): SiteConfig {
  return page(name, "modern-living", [
    {
      id: bid("nav"),
      type: "navbar",
      variant: "glass",
      props: {
        logo: name,
        ctaText: "93245 00132",
        ctaHref: "tel:9324500132",
        menuItems: [
          { label: "Overview", id: "overview" },
          { label: "Project Highlights", id: "highlights" },
          { label: "Floor Plans", id: "plans" },
          { label: "Amenities", id: "amenities" },
          { label: "Gallery", id: "gallery" },
          { label: "Location", id: "location" },
        ],
      },
    },
    {
      id: bid("hero"),
      type: "project-banner",
      variant: "info-bar",
      props: {
        headline: "Discover Modern Living in the Perfect Location",
        description:
          "Discover thoughtfully designed residences with modern amenities, excellent connectivity, and vibrant surroundings.",
        image: IMG.heroAerial,
        stats: [
          { label: "Configuration", value: "3 & 4 BHK Residences" },
          { label: "Price", value: "Rs.1.68 Cr Onwards*" },
          { label: "Location", value: "Sarjapur Road, Bengaluru" },
          { label: "RERA No:", value: "PRM/KA/RERA/1251/446/PR/091123/006409" },
        ],
        anchor: "hero",
      },
    },
    {
      id: bid("hi"),
      type: "project-overview",
      variant: "split",
      props: {
        subtitle: "Project Highlights",
        title: "Crafted for Modern Families",
        body: "Welcome to a thoughtfully designed residential development created for those who value comfort, elegance, and convenience. Every space is carefully planned to deliver a perfect balance of aesthetics and functionality, offering a peaceful environment for modern living.",
        image: IMG.towers,
        imagePosition: "left",
        ctaText: "Download Brochure",
        ctaAnchor: "brochure",
        stats: [
          { value: "4.65", label: "Acres" },
          { value: "410", label: "Units" },
          { value: "3", label: "Towers" },
          { value: "25+", label: "Amenities" },
        ],
        anchor: "highlights",
      },
    },
    {
      id: bid("am"),
      type: "amenities",
      variant: "featured",
      props: {
        title: "Amenities That Redefine Comfort",
        items: [
          { title: "Infinity Swimming Pool", description: "Resort-style leisure at home.", image: IMG.pool },
          { title: "Fully Equipped Gymnasium", description: "" },
          { title: "Landscaped Gardens", description: "" },
          { title: "Children's Play Area", description: "" },
          { title: "Clubhouse & Lounge", description: "" },
          { title: "Jogging & Cycling", description: "" },
          { title: "24/7 Security", description: "" },
          { title: "Indoor Games Room", description: "" },
        ],
        anchor: "amenities",
      },
    },
    {
      id: bid("plans"),
      type: "floor-plans",
      variant: "cards",
      props: {
        title: "Spaces Designed for Modern Living",
        subtitle: "Architectural Plans",
        items: [
          { name: "Master Plan", beds: "Campus", area: "4.65 Acres", image: IMG.master },
          { name: "Floor Plan", beds: "3 & 4 BHK", area: "Layouts", image: IMG.plan },
        ],
        gateEnabled: true,
        anchor: "plans",
      },
    },
    {
      id: bid("gal"),
      type: "gallery",
      variant: "grid",
      props: {
        title: "A Glimpse into Your Future Home",
        images: [
          { src: IMG.facade, caption: "Elevation" },
          { src: IMG.lobby, caption: "Lobby" },
          { src: IMG.kitchen, caption: "Kitchen" },
          { src: IMG.pool, caption: "Amenities" },
        ],
        anchor: "gallery",
      },
    },
    {
      id: bid("loc"),
      type: "location",
      variant: "cards",
      props: {
        title: "Live Close to Everything That Matters",
        address: "Sarjapur Road, Bengaluru",
        items: [
          { title: "Narsapura Industrial Area", meta: "6.8 Km" },
          { title: "Mahindra Aerospace", meta: "7.6 Km" },
          { title: "Kolar City", meta: "15.2 Km" },
          { title: "RL Jalappa Hospital", meta: "17.4 Km" },
          { title: "MVJ Medical College", meta: "30.6 Km" },
          { title: "Whitefield", meta: "44.8 Km" },
        ],
        anchor: "location",
      },
    },
    {
      id: bid("form"),
      type: "lead-form",
      variant: "split",
      props: {
        title: "Get In Touch With Us",
        subtitle: "Bill Robertson Real Estate · Plot No. 27, Outer Ring Road, Marathahalli",
        benefits: ["Priority callbacks", "Site visit slots", "Price sheet on request"],
        formId: "",
        anchor: "enquire",
      },
    },
    {
      id: bid("foot"),
      type: "footer",
      variant: "multi-column",
      props: {
        logo: "Bill Robertson Real Estate",
        copyright: "Copyright 2026 - Bill Robertson Real Estate. All Rights Reserved",
        links: ["Home", "About Us", "Projects", "Contact Us", "Privacy Policy", "Terms and Conditions"],
      },
    },
  ]);
}

/** PDF 1 — Investment marketplace hub */
export function buildInvestmentHubTemplate(name = "Investment Hub"): SiteConfig {
  return page(name, "investment-hub", [
    {
      id: bid("nav"),
      type: "navbar",
      variant: "marketing",
      props: {
        logo: "Logoipsum",
        ctaText: "Contact Us",
        ctaId: "booking",
        menuItems: [
          { label: "About us", id: "about" },
          { label: "Upcoming Projects", id: "listings" },
          { label: "Cities", id: "location", dropdown: true },
          { label: "New Launch", id: "listings", dropdown: true },
          { label: "Luxury Homes", id: "amenities", dropdown: true },
          { label: "All Properties", id: "listings", dropdown: true },
        ],
      },
    },
    {
      id: bid("hero"),
      type: "project-banner",
      variant: "framed-center",
      props: {
        headline: "Find your perfect investment properties",
        description:
          "Explore a selection of high-value real estate opportunities designed for financial growth and stability",
        primaryCta: "Know More",
        primaryAnchor: "types",
        image: IMG.heroNight,
        anchor: "hero",
      },
    },
    {
      id: bid("types"),
      type: "amenities",
      variant: "mosaic",
      props: {
        subtitle: "Explore by",
        title: "Property Type",
        ctaText: "View All",
        ctaAnchor: "listings",
        items: [
          { title: "Villas", description: "240+ listings", image: IMG.pool },
          { title: "Apartments", description: "7,400+ listings", image: IMG.towers },
          { title: "Plots", description: "1,100+ listings", image: IMG.heroAerial },
          { title: "Commercial", description: "380+ listings", image: IMG.lobby },
          { title: "Penthouse", description: "60+ listings", image: IMG.terrace },
        ],
        anchor: "types",
      },
    },
    {
      id: bid("filters"),
      type: "property-filters",
      variant: "tabs",
      props: {
        activeIndex: 0,
        items: [
          { label: "New Launch" },
          { label: "Apartments" },
          { label: "Plots" },
          { label: "Villas" },
          { label: "Luxury Homes" },
        ],
      },
    },
    {
      id: bid("list"),
      type: "unit-config",
      variant: "listings",
      props: {
        title: "New Properties",
        items: [
          {
            type: "New Launch",
            config: "Poulomi Florique in Thanisandra, North Bangalore",
            description:
              "Poulomi Florique is a new luxury residential Apartment project launched just off Thanisandra Road near Bhartiya City, North Bangalore",
            area: "Thanisandra",
            image: IMG.facade,
          },
          {
            type: "New Launch",
            config: "Abhee Codename New Dimension in Varthur Sarjapur Road, Bangalore",
            description:
              "Abhee Codename New Dimension is the new ultra-premium residential apartment project near Gunjur Road, Varthur…",
            area: "Sarjapur, East Bangalore",
            meta: "Varthur Sarjapur Road",
            image: IMG.towers,
          },
          {
            type: "New Launch",
            config: "Sattva Songbird Phase 2 in Budigere Main Road, Bangalore",
            description:
              "Sattva Songbird Phase 2 is the brand new ultra-premium residential Apartment project launched near Budigere…",
            area: "Main Road, Old Madras Road, East Bangalore",
            meta: "Budigere Main Road",
            image: IMG.heroCity,
          },
          {
            type: "New Launch",
            config: "Purva Codename Hennur in Hennur Road, Bangalore",
            description:
              "Purva Codename Hennur is the new luxury residential Apartment project launching bang on Hennur Main Road…",
            area: "Hennur Road",
            image: IMG.facade,
          },
          {
            type: "New Launch",
            config: "Brigade Lumina Apartments in Tumkur Road, Bangalore",
            description:
              "Brigade Lumina is the new luxury residential Apartment project being launched right on Tumkur Road, West…",
            area: "Tumkur Road",
            image: IMG.towers,
          },
          {
            type: "New Launch",
            config: "Ramky Fortuna in Whitefield, Bangalore",
            description:
              "Ramky Fortuna is the new premium residential apartment project launched in Seegehalli, Whitefield, near KR Puram…",
            area: "Whitefield",
            image: IMG.lobby,
          },
          {
            type: "New Launch",
            config: "Eaton Park at Prestige City in Sarjapur, Bangalore",
            description:
              "Prestige Eaton Park at Prestige City is the new Phase premium residential Apartment project launched on Sarjapur…",
            area: "Sarjapur",
            image: IMG.terrace,
          },
        ],
        anchor: "listings",
      },
    },
    {
      id: bid("about"),
      type: "project-overview",
      variant: "split",
      props: {
        title: "Engineering Nature into Every Home",
        body: "We don't just build near nature; we weave it into your living spaces. Our precision-led designs ensure every home is a green sanctuary, blending sustainable innovation with lush, life-elevating landscapes.",
        image: IMG.master,
        imagePosition: "left",
        stats: [
          { value: "26+", label: "Years of Excellence" },
          { value: "38 MN+", label: "Sq. ft. of Developments" },
          { value: "15 K+", label: "Happy Families" },
          { value: "30+", label: "Cities" },
        ],
        anchor: "about",
      },
    },
    {
      id: bid("impact"),
      type: "project-highlights",
      variant: "split-impact",
      props: {
        title: "Do good.",
        accentLine: "Do well.",
        body: "Logoipsum is committed to elevating the living experience while emphasising the importance of creating a positive impact on the environment and society.",
        author: "Our Story",
        authorRole: "Our Impact",
        image: IMG.towers,
        ctaAnchor: "about",
        anchor: "impact",
      },
    },
    {
      id: bid("tes"),
      type: "testimonials",
      variant: "cards",
      props: {
        title: "What Our Customers Say",
        subtitle: "Trusted by thousands of families across India.",
        viewAllText: "View All",
        viewAllUrl: "#listings",
        items: [
          {
            name: "Rahul Sharma",
            role: "Bangalore · Bought 3 BHK",
            quote:
              "Aevum helped us find our dream home in Whitefield within budget. The advisor was incredibly knowledgeable and the process was completely transparent.",
            rating: 5,
          },
          {
            name: "Priya Anand",
            role: "Pune · Bought 2 BHK Apartment",
            quote:
              "From shortlisting to loan approval to registration — they handled everything. I didn't visit a single government office myself. Absolutely seamless experience.",
            rating: 5,
          },
          {
            name: "Manish Kumar",
            role: "Hyderabad · Investment Buyer",
            quote:
              "The locality insights are a game changer. I compared neighbourhoods with real price trend data before deciding. No other platform offers this level of detail.",
            rating: 5,
          },
        ],
      },
    },
    {
      id: bid("booking"),
      type: "cta",
      variant: "booking",
      props: {
        headline: "Want to Book a Call?",
        subheadline: "Ready to make your step in real estate? Book Now",
        buttonText: "Book Now",
        buttonUrl: "#enquire",
        secondaryButtonText: "View Properties",
        secondaryButtonUrl: "#listings",
        image: IMG.heroCity,
        anchor: "booking",
      },
    },
    {
      id: bid("form"),
      type: "lead-form",
      variant: "card",
      props: {
        title: "Contact Us",
        subtitle: "India's most transparent real estate platform, connecting home buyers with verified properties and expert advisors since 2021.",
        formId: "",
        anchor: "enquire",
      },
    },
    {
      id: bid("foot"),
      type: "footer",
      variant: "multi-column",
      props: {
        logo: "Logoipsum",
        tagline: "India's most transparent real estate platform, connecting home buyers with verified properties and expert advisors since 2021.",
        copyright: "© 2025 Aevum Realty Pvt. Ltd. All rights reserved. RERA Registered.",
        links: ["Privacy Policy", "Terms of Service"],
        columns: [
          { title: "Company", links: ["About Us", "Careers", "Press", "Blog", "Contact"] },
          { title: "Explore", links: ["Bangalore", "Mumbai", "Hyderabad", "Pune", "New Launches"] },
          { title: "Services", links: ["Buy Property", "Home Loans", "Legal Help", "Investment", "List Property"] },
        ],
      },
    },
  ], "2");
}

/** PDF 2 — Vista curve split hero with radial highlights */
export function buildVistaCurveTemplate(name = "Vista Curve"): SiteConfig {
  return page(name, "vista-curve", [
    {
      id: bid("nav"),
      type: "navbar",
      variant: "default",
      props: {
        logo: name,
        ctaText: "Contact Us",
        ctaId: "enquire",
        menuItems: [
          { label: "Overview", id: "overview" },
          { label: "Highlights", id: "highlights" },
          { label: "Plans", id: "plans" },
          { label: "Gallery", id: "gallery" },
          { label: "Amenities", id: "amenities" },
          { label: "Sustainability", id: "location" },
        ],
      },
    },
    {
      id: bid("hero"),
      type: "project-banner",
      variant: "split-curve",
      props: {
        headline: "4 BHK Luxury Flat starting at ₹2.75 cr with a private lift",
        primaryCta: "Know More",
        primaryAnchor: "overview",
        image: IMG.heroCity,
        stats: [
          { value: "356", label: "High-Privacy Homes in 6.80 Acres" },
          { value: "88%", label: "Open-to-Sky Spaces" },
          { value: "17,700 Sq. Ft.", label: "Clubhouse" },
          { value: "45+", label: "Curated Amenities" },
        ],
        anchor: "hero",
      },
    },
    {
      id: bid("ov"),
      type: "project-overview",
      variant: "split",
      props: {
        title: "An Address Where Life Finds Its Balance",
        body: "Abc Vista, a premium new launch in Hebbagodi, offers thoughtfully designed apartments in Electronic City for those who want harmony between ambition and everyday comfort.\n\nSpread across 6.99 acres and envisioned by Hafeez Contractor, the community brings together contemporary architecture, open green spaces, and wellness-focused amenities. With just 356 exclusive homes, it offers low-density living and breathing space.",
        image: IMG.towers,
        imagePosition: "right",
        ctaText: "Read All",
        ctaAnchor: "highlights",
        anchor: "overview",
      },
    },
    {
      id: bid("hi"),
      type: "project-highlights",
      variant: "radial",
      props: {
        title: "Project Highlights",
        image: IMG.master,
        items: [
          { title: "Bengaluru's fastest-growing tech hub — Hebbagodi, Electronic City." },
          { title: "6.99-acre enclave with just 356 exclusive residences." },
          { title: "Premium 3 and 4-BHK flats, Duplexes & Penthouses." },
          { title: "Low-density community with no facing units." },
          { title: "Architecture designed by renowned Hafeez Contractor." },
          { title: "17,700 sq ft clubhouse with gym, spa & wellness clinic." },
        ],
        anchor: "highlights",
      },
    },
    {
      id: bid("am"),
      type: "amenities",
      variant: "icon-grid",
      props: {
        title: "Amenities",
        subtitle:
          "From entertainment to sports and leisure — terraced lawns, sky gardens, lounges and more.",
        items: [
          { title: "Heritage Tree Plaza", description: "" },
          { title: "Multi Game Court", description: "" },
          { title: "Multipurpose Hall", description: "" },
          { title: "Open Lawn", description: "" },
          { title: "Swimming Pool", description: "" },
          { title: "Gym & Spa", description: "" },
          { title: "Sky Gardens", description: "" },
          { title: "Lounge", description: "" },
        ],
        anchor: "amenities",
      },
    },
    {
      id: bid("plans"),
      type: "floor-plans",
      variant: "list",
      props: {
        title: "Configuration",
        subtitle: "Floor plan & price",
        items: [
          { name: "3 BHK", beds: "SBUA", area: "1,864 - 2,042 Sqft", price: "Download", image: IMG.plan },
          { name: "3 BHK + M", beds: "SBUA", area: "2,300 - 2,302 Sqft", price: "Download", image: IMG.plan },
          { name: "4 BHK + M", beds: "SBUA", area: "2,824 - 4,272 Sqft", price: "Download", image: IMG.plan },
        ],
        gateEnabled: true,
        anchor: "plans",
      },
    },
    {
      id: bid("master"),
      type: "gallery",
      variant: "grid",
      props: {
        title: "Explore the Vision",
        images: [
          { src: IMG.master, caption: "Master Plan", category: "Master Plan" },
          { src: IMG.facade, caption: "Elevation", category: "Architecture" },
          { src: IMG.lobby, caption: "Lobby", category: "Interiors" },
          { src: IMG.pool, caption: "Amenities", category: "Lifestyle" },
        ],
        anchor: "gallery",
      },
    },
    {
      id: bid("loc"),
      type: "location",
      variant: "cards",
      props: {
        title: "Know Your Neighbourhood",
        address: "Hebbagodi, Electronic City, Bengaluru",
        items: [
          { title: "Canadian International School", meta: "2.1 km" },
          { title: "Mallya Aditi International School", meta: "4.0 km" },
          { title: "Vidyashilp Academy", meta: "5.0 km" },
          { title: "Nagarjuna Vidyaniketan", meta: "7.8 km" },
          { title: "Hospitals", meta: "Nearby" },
          { title: "Tech Parks", meta: "Minutes away" },
        ],
        anchor: "location",
      },
    },
    {
      id: bid("form"),
      type: "lead-form",
      variant: "card",
      props: {
        title: "Contact Us",
        subtitle: "info@lifebythegreens.com · +91 966 33 33 889",
        formId: "",
        anchor: "enquire",
      },
    },
    {
      id: bid("foot"),
      type: "footer",
      variant: "simple",
      props: {
        logo: name,
        copyright: "RERA NO.- PRM/KA/RERA/1251/308/PR/070325/007558 · Privacy Policy | Terms & Condition",
        links: ["Overview", "Amenities", "Gallery", "Floor Plans", "Location"],
      },
    },
  ]);
}

export const pdfHomeTemplateMeta = [
  {
    id: "aurelia-reserve",
    name: "Aurelia Reserve",
    description: "Luxury editorial home — hero info bar, philosophy, signature highlights, lifestyle gallery, timeline",
  },
  {
    id: "vista-framed",
    name: "Vista Framed",
    description: "Rounded framed hero with glass stats, centered overview, amenity grid and gallery",
  },
  {
    id: "future-home",
    name: "Future Home",
    description: "Cream asymmetric hero with floating stats card, highlights split and contact form",
  },
  {
    id: "modern-living",
    name: "Modern Living",
    description: "Centered aerial hero with overlapping info bar, featured amenities and location cards",
  },
  {
    id: "investment-hub",
    name: "Investment Hub",
    description: "Marketplace home — framed night hero, property-type mosaic, listings and testimonials",
  },
  {
    id: "vista-curve",
    name: "Vista Curve",
    description: "Split curve hero with stats panel, radial highlights, configs and neighbourhood",
  },
] as const;

export type PdfHomeTemplateId = (typeof pdfHomeTemplateMeta)[number]["id"];

export function buildPdfHomeTemplate(id: PdfHomeTemplateId | string, name: string): SiteConfig | null {
  switch (id) {
    case "aurelia-reserve":
      return buildAureliaReserveTemplate(name);
    case "vista-framed":
      return buildVistaFramedTemplate(name);
    case "future-home":
      return buildFutureHomeTemplate(name);
    case "modern-living":
      return buildModernLivingTemplate(name);
    case "investment-hub":
      return buildInvestmentHubTemplate(name);
    case "vista-curve":
      return buildVistaCurveTemplate(name);
    default:
      return null;
  }
}
