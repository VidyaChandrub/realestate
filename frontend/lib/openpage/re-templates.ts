import type { BlockConfig, SiteConfig } from "@/components/openpage/blocks/types";
import { themePresets } from "@/lib/openpage/theme-presets";
import { newFormDefinition } from "@/lib/openpage/forms-store";
import { buildPremiumRealEstateTemplate } from "@/lib/openpage/premium-template";

function theme(id: string) {
  return themePresets.find((t) => t.id === id)?.theme;
}

function seedEnquiryForm() {
  const form = newFormDefinition(undefined, "Project enquiry");
  form.fields = [
    { id: "fld_name", type: "text", label: "Full name", placeholder: "Your name", required: true },
    { id: "fld_phone", type: "phone", label: "Phone", placeholder: "+91", required: true },
    { id: "fld_email", type: "email", label: "Email", placeholder: "you@email.com", required: false },
    {
      id: "fld_ptype",
      type: "select",
      label: "Property Type",
      placeholder: "Select",
      required: true,
      options: ["Residential", "Commercial"],
    },
    {
      id: "fld_config",
      type: "select",
      label: "Configuration",
      placeholder: "Select",
      required: true,
      options: ["2 BHK", "3 BHK", "4 BHK"],
      logic: {
        enabled: true,
        match: "all",
        rules: [{ field: "fld_ptype", op: "eq", value: "Residential" }],
      },
    },
    {
      id: "fld_budget",
      type: "select",
      label: "Budget",
      placeholder: "Select",
      required: false,
      options: ["1–1.5 Cr", "1.5–2 Cr", "2 Cr+"],
      logic: {
        enabled: true,
        match: "all",
        rules: [{ field: "fld_config", op: "eq", value: "3 BHK" }],
      },
    },
  ];
  return form;
}

function bid(prefix: string) {
  return `block-${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function page(name: string, blocks: BlockConfig[]): SiteConfig {
  const form = seedEnquiryForm();
  const popupId = "popup-brochure";
  const withForm = blocks.map((b) =>
    b.type === "lead-form" || b.type === "site-visit" || b.type === "project-banner" || b.type === "contact" || b.type === "newsletter"
      ? { ...b, props: { ...b.props, formId: form.id, popupId: b.props.popupId || popupId } }
      : b.type === "download-brochure" || b.type === "cta"
        ? { ...b, props: { ...b.props, popupId, formId: form.id } }
        : b,
  );
  return {
    engine: "openpage",
    name,
    theme: theme("ivory"),
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
  };
}

const chrome = (name: string): BlockConfig[] => [
  { id: bid("nav"), type: "navbar", variant: "default", props: {
    logo: name,
    ctaText: "Enquire",
    ctaId: "enquire",
    menuItems: [
      { label: "Overview", id: "overview" },
      { label: "Amenities", id: "amenities" },
      { label: "Plans", id: "plans" },
      { label: "Contact", id: "enquire" },
    ],
    links: ["Overview", "Amenities", "Plans", "Contact"],
  } },
];

const footer = (name: string): BlockConfig => ({
  id: bid("foot"),
  type: "footer",
  variant: "simple",
  props: { logo: name, copyright: `© ${new Date().getFullYear()} ${name}. All rights reserved.`, links: ["Privacy", "RERA"] },
});

export const realEstateTemplateMeta = [
  { id: "blank", name: "Blank canvas", description: "Empty page — add sections from the Templates library" },
  { id: "premium", name: "Meridian Residences", description: "Premium launch page with hero form, gallery, brochure popup and full lead capture" },
  { id: "residential", name: "Residential Project", description: "Apartments with amenities, plans and enquiry" },
  { id: "commercial", name: "Commercial Project", description: "Office / retail project landing page" },
  { id: "luxury", name: "Luxury Apartment", description: "Premium presentation with gallery and offers" },
  { id: "villa", name: "Villa Project", description: "Villa community with plots and lifestyle" },
  { id: "plot", name: "Plot Project", description: "Plotted development with location focus" },
  { id: "launch", name: "New Project Launch", description: "Launch campaign with offers and CTA" },
  { id: "enquiry", name: "Project Enquiry", description: "Form-first enquiry landing page" },
  { id: "site-visit", name: "Site Visit Landing Page", description: "Book a visit conversion page" },
  { id: "brochure", name: "Brochure Download Landing Page", description: "Brochure gate with popup form" },
  { id: "lead", name: "Lead Generation", description: "All lead-capture sections — hero form, enquiry, site visit, brochure, contact, newsletter & CTA" },
] as const;

export type RealEstateTemplateId = (typeof realEstateTemplateMeta)[number]["id"];

/** Map Super Admin design ids → OpenPage seed templates. */
export function openPageTemplateIdForDesign(designId: string): RealEstateTemplateId {
  const key = designId.trim().toLowerCase();
  if (
    !key ||
    key === "tpl-blank" ||
    key === "blank" ||
    key.includes("scratch") ||
    key === "custom" ||
    key === "none"
  ) {
    return "blank";
  }
  if (key === "tpl-lead" || key.includes("lead")) return "lead";
  if (key === "tpl-meridian" || key.includes("premium") || key.includes("meridian")) return "premium";
  if (key.includes("enquiry")) return "enquiry";
  if (key.includes("site-visit") || key.includes("sitevisit")) return "site-visit";
  if (key.includes("brochure")) return "brochure";
  if (key.includes("commercial")) return "commercial";
  if (key.includes("luxury") || key.includes("luxe")) return "luxury";
  if (key.includes("villa")) return "villa";
  if (key.includes("plot")) return "plot";
  if (key.includes("launch")) return "launch";
  if (key.includes("residential") || key === "tpl-estatepro") return "residential";
  return "premium";
}

function leadCaptureBlocks(name: string): BlockConfig[] {
  return [
    {
      id: bid("nav"),
      type: "navbar",
      variant: "default",
      props: {
        logo: name,
        ctaText: "Enquire",
        ctaId: "enquire",
        menuItems: [
          { label: "Overview", id: "overview" },
          { label: "Pricing", id: "pricing" },
          { label: "Brochure", id: "brochure" },
          { label: "Enquire", id: "enquire" },
          { label: "Visit", id: "site-visit" },
        ],
        links: ["Overview", "Pricing", "Brochure", "Enquire", "Visit"],
      },
    },
    {
      id: bid("hero"),
      type: "project-banner",
      variant: "split-form",
      props: {
        badge: "Lead campaign",
        headline: name,
        location: "{{location}}",
        description: "Share your details — a relationship manager will call you shortly.",
        price: "{{starting_price}}",
        primaryCta: "Book a Site Visit",
        secondaryCta: "Download Brochure",
        formTitle: "Enquire now",
        formSubtitle: "We'll call you within 15 minutes.",
        formId: "",
        anchor: "hero",
      },
    },
    {
      id: bid("ov"),
      type: "project-overview",
      variant: "cards",
      props: {
        title: `Why ${name}`,
        subtitle: "Built for conversions",
        body: "{{description}}",
        highlights: [
          { title: "Fast response", description: "Sales team replies within minutes" },
          { title: "Transparent pricing", description: "{{starting_price}}" },
          { title: "Site visits", description: "Weekend slots available" },
        ],
        anchor: "overview",
      },
    },
    {
      id: bid("pr"),
      type: "re-pricing",
      variant: "banner",
      props: {
        title: "Founders' pricing this weekend",
        subtitle: "Starting from",
        startingPrice: "{{starting_price}}",
        ctaText: "Lock my price",
        disclaimer: "*T&C apply.",
        anchor: "pricing",
      },
    },
    {
      id: bid("off"),
      type: "offers",
      variant: "cards",
      props: {
        title: "Limited offers",
        items: [
          { title: "Zero PLC weekend", description: "No preferential location charge on first release." },
          { title: "Assured parking", description: "Bundled bay with every founders' booking." },
        ],
      },
    },
    {
      id: bid("bro"),
      type: "download-brochure",
      variant: "split",
      props: {
        title: "Download Brochure",
        subtitle: "Plans, pricing and specifications in one PDF.",
        buttonText: "Get PDF",
        formId: "",
        anchor: "brochure",
      },
    },
    {
      id: bid("lead-card"),
      type: "lead-form",
      variant: "card",
      props: {
        title: "Enquire now",
        subtitle: "Our team responds within 15 minutes.",
        formId: "",
        anchor: "enquire",
      },
    },
    {
      id: bid("lead-split"),
      type: "lead-form",
      variant: "split",
      props: {
        title: "Talk to sales",
        subtitle: "Site visits, pricing and inventory — answered personally.",
        benefits: ["Priority site-visit slots", "Transparent price sheet", "WhatsApp updates"],
        formId: "",
        anchor: "talk",
      },
    },
    {
      id: bid("sv"),
      type: "site-visit",
      variant: "default",
      props: {
        title: "Book a site visit",
        subtitle: "Pick a slot that works for you.",
        formId: "",
        anchor: "site-visit",
      },
    },
    {
      id: bid("contact"),
      type: "contact",
      variant: "default",
      props: {
        title: "Get in touch",
        subtitle: "Prefer email? Leave a message below.",
        formId: "",
        anchor: "contact",
      },
    },
    {
      id: bid("news"),
      type: "newsletter",
      variant: "default",
      props: {
        title: "Project updates",
        subtitle: "Launch alerts and offer reminders — no spam.",
        formId: "",
        anchor: "newsletter",
      },
    },
    {
      id: bid("cta"),
      type: "cta",
      variant: "simple",
      props: {
        headline: "Ready to take the next step?",
        subheadline: "Book a call or visit this weekend.",
        buttonText: "Enquire Now",
        buttonUrl: "#enquire",
      },
    },
    {
      id: bid("tes"),
      type: "testimonials",
      variant: "cards",
      props: {
        title: "What buyers say",
        items: [
          { name: "Anita Rao", role: "Homeowner", quote: "The team was transparent from day one.", rating: 5 },
          { name: "Vikram Shah", role: "Investor", quote: "Best launch we booked this year.", rating: 5 },
        ],
      },
    },
    footer(name),
  ];
}

export function buildRealEstateTemplate(id: RealEstateTemplateId | string, name: string): SiteConfig {
  switch (id) {
    case "blank":
      return {
        engine: "openpage",
        name,
        pages: [{ id: "page-home", name: "Home", path: "/", blocks: [] }],
        blocks: [],
        forms: [],
        globalWidgets: [],
      };
    case "premium":
      return buildPremiumRealEstateTemplate(name);
    case "lead":
      return page(name, leadCaptureBlocks(name));
    case "commercial":
      return page(name, [
        ...chrome(name),
        { id: bid("hero"), type: "project-banner", variant: "overlay", props: { badge: "Commercial", headline: name, location: "CBD", price: "Offices from ₹ 85 L*", primaryCta: "Get floor plate" } },
        { id: bid("ov"), type: "project-overview", variant: "prose", props: { title: "Workspace designed for growth", body: "Grade-A floor plates, high-speed connectivity and abundant parking." } },
        { id: bid("det"), type: "property-details", variant: "grid", props: { type: "Commercial", status: "Ready to occupy" } },
        { id: bid("loc"), type: "location", variant: "list", props: { title: "Location", items: [{ title: "Metro", meta: "4 mins" }, { title: "Airport", meta: "35 mins" }] } },
        { id: bid("form"), type: "lead-form", variant: "card", props: { title: "Request a floor plate" } },
        footer(name),
      ]);
    case "luxury":
      return page(name, [
        ...chrome(name),
        { id: bid("hero"), type: "hero", variant: "minimal", props: { headline: name, subheadline: "Limited residences. Uncompromising craft.", primaryCta: "Private tour" } },
        { id: bid("gal"), type: "gallery", variant: "masonry", props: { title: "Residences" } },
        { id: bid("am"), type: "amenities", variant: "chips", props: { title: "Lifestyle", items: ["Spa", "Concierge", "Sky lounge", "Private theatre"] } },
        { id: bid("off"), type: "offers", variant: "cards", props: { items: [{ title: "Interior package", description: "Complimentary designer interiors." }] } },
        { id: bid("form"), type: "lead-form", variant: "card", props: { title: "Request a private preview" } },
        footer(name),
      ]);
    case "villa":
      return page(name, [
        ...chrome(name),
        { id: bid("hero"), type: "project-banner", variant: "overlay", props: { badge: "Villas", headline: name, location: "Sarjapur Road", price: "From ₹ 4.5 Cr*", primaryCta: "Book a visit" } },
        { id: bid("hi"), type: "project-highlights", variant: "grid", props: { items: [{ title: "Gated community", description: "Private roads and 24/7 security." }, { title: "Large plots", description: "Generous setbacks and gardens." }] } },
        { id: bid("unit"), type: "unit-config", variant: "table", props: { items: [{ config: "3 BHK Villa", area: "2,400 sq.ft", price: "₹ 4.5 Cr" }, { config: "4 BHK Villa", area: "3,200 sq.ft", price: "₹ 6.2 Cr" }] } },
        { id: bid("sv"), type: "site-visit", variant: "form", props: { title: "Schedule a villa tour" } },
        footer(name),
      ]);
    case "plot":
      return page(name, [
        ...chrome(name),
        { id: bid("hero"), type: "project-banner", variant: "overlay", props: { badge: "Plotted", headline: name, location: "Hosur Road", price: "Plots from ₹ 45 L*", primaryCta: "Check availability" } },
        { id: bid("loc"), type: "location", variant: "list", props: { items: [{ title: "ORR", meta: "10 mins" }, { title: "Electronic City", meta: "18 mins" }] } },
        { id: bid("map"), type: "google-maps", variant: "embed", props: { embedUrl: "" } },
        { id: bid("form"), type: "lead-form", variant: "card", props: { title: "Request plot availability" } },
        footer(name),
      ]);
    case "launch":
      return page(name, [
        ...chrome(name),
        { id: bid("ban"), type: "banner", variant: "ribbon", props: { text: "Pre-launch prices close this weekend" } },
        { id: bid("hero"), type: "hero", variant: "gradient", props: { badge: "New launch", headline: `${name} is now open`, subheadline: "Register for priority allocation.", primaryCta: "Register now" } },
        { id: bid("off"), type: "offers", variant: "cards", props: { items: [{ title: "Early bird", description: "Launch discount on first 50 units." }] } },
        { id: bid("form"), type: "lead-form", variant: "card", props: { title: "Priority registration" } },
        footer(name),
      ]);
    case "enquiry":
      return page(name, [
        ...chrome(name),
        { id: bid("hero"), type: "hero", variant: "centered", props: { headline: `Enquire about ${name}`, subheadline: "Share your details. A relationship manager will call you.", primaryCta: "Submit enquiry" } },
        { id: bid("form"), type: "lead-form", variant: "card", props: { title: "Project enquiry" } },
        footer(name),
      ]);
    case "site-visit":
      return page(name, [
        ...chrome(name),
        { id: bid("hero"), type: "hero", variant: "split", props: { headline: "Visit the site this weekend", subheadline: "Pick a slot. We’ll confirm by WhatsApp.", primaryCta: "Book visit" } },
        { id: bid("sv"), type: "site-visit", variant: "form", props: { title: "Book a site visit" } },
        footer(name),
      ]);
    case "brochure":
      return page(name, [
        ...chrome(name),
        { id: bid("hero"), type: "hero", variant: "centered", props: { headline: `Download the ${name} brochure`, subheadline: "Plans, pricing and specifications in one PDF.", primaryCta: "Get brochure" } },
        { id: bid("dl"), type: "download-brochure", variant: "card", props: { title: "Project brochure", buttonText: "Download PDF" } },
        footer(name),
      ]);
    case "residential":
      return page(name, [
        ...chrome(name),
        { id: bid("hero"), type: "project-banner", variant: "overlay", props: { badge: "New Launch", headline: name, location: "Whitefield, Bengaluru", price: "Starting ₹ 1.2 Cr*", primaryCta: "Enquire now", secondaryCta: "Download brochure" } },
        { id: bid("ov"), type: "project-overview", variant: "prose", props: { title: "Project Overview", body: "Thoughtfully planned residences with landscaped greens, club amenities and strong connectivity." } },
        { id: bid("det"), type: "property-details", variant: "grid", props: { title: "Property Details", type: "Apartment", status: "Under Construction", possession: "Dec 2027", rera: "PRM/KA/RERA/0000" } },
        { id: bid("hi"), type: "project-highlights", variant: "grid", props: { title: "Highlights", items: [{ title: "RERA registered", description: "Fully compliant development." }, { title: "Prime location", description: "IT parks and metro nearby." }, { title: "Lifestyle", description: "Clubhouse, pool and gardens." }] } },
        { id: bid("am"), type: "amenities", variant: "chips", props: { title: "Amenities", items: ["Clubhouse", "Pool", "Gym", "Kids Play", "Security"] } },
        { id: bid("fp"), type: "floor-plans", variant: "cards", props: { title: "Floor Plans", items: [{ name: "2 BHK", beds: "2 Beds", area: "1,120 sq.ft", price: "₹ 1.2 Cr" }, { name: "3 BHK", beds: "3 Beds", area: "1,540 sq.ft", price: "₹ 1.8 Cr" }] } },
        { id: bid("pr"), type: "re-pricing", variant: "simple", props: { title: "Pricing", startingPrice: "₹ 1.2 Cr*" } },
        { id: bid("loc"), type: "location", variant: "list", props: { title: "Location", address: "Whitefield, Bengaluru", items: [{ title: "ITPL", meta: "8 mins" }, { title: "Metro", meta: "12 mins" }] } },
        { id: bid("gal"), type: "gallery", variant: "grid", props: { title: "Gallery" } },
        { id: bid("faq"), type: "faq", variant: "accordion", props: { title: "FAQs", items: [{ question: "Is the project RERA registered?", answer: "Yes. The RERA number is listed in Property Details." }, { question: "What configurations are available?", answer: "2, 3 and 4 BHK residences." }] } },
        { id: bid("form"), type: "lead-form", variant: "card", props: { title: "Enquire now" } },
        { id: bid("dl"), type: "download-brochure", variant: "card", props: { title: "Download Brochure", buttonText: "Get PDF" } },
        footer(name),
      ]);
    default:
      return buildPremiumRealEstateTemplate(name);
  }
}
