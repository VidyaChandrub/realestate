import type { FormLeadField, SiteConfig } from "./types";

export type FormDefinition = SiteConfig["form"] & {
  id: string;
  pageId?: string;
  createdAt: string;
  updatedAt: string;
};

const FORMS_KEY = "prestate.forms.v1";

function uid(prefix = "frm"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function embedId(): string {
  return `emb_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newFormDefinition(pageId?: string, name = "Untitled Form"): FormDefinition {
  const now = new Date().toISOString();
  return {
    id: uid("form"),
    pageId,
    createdAt: now,
    updatedAt: now,
    name,
    description: "Configure fields, validation and success behavior for this form.",
    embed: { id: embedId(), allowExternal: true },
    pdf: { enabled: false, url: "", filename: "brochure.pdf", autoDownload: true },
    thankYouPage: {
      enabled: true,
      heading: "Thank You — You're All Set!",
      description: "Your enquiry has been received. A relationship manager will call you within 15 minutes.",
      text: "Meanwhile, explore the brochure or book a priority site visit.",
      image: "",
      icon: "CheckCircle2",
      buttons: [
        { label: "Download Brochure", href: "", variant: "primary" },
        { label: "Back to Website", href: "/", variant: "outline" },
      ],
      html: "",
      successMessage: "Thanks — our team will call you shortly.",
      showPdfConfirmation: true,
      typography: { fontFamily: "Inter", fontSize: 16, fontWeight: 400, lineHeight: 1.6, textColor: "#111827" },
      colors: { bg: "#ffffff", text: "#111827", accent: "#6D5DFC" },
      background: "#ffffff",
      spacing: { padding: 32, margin: 0, gap: 16 },
      alignment: "center",
      responsive: {},
    },
    notifyEmail: "",
    whatsapp: "",
    thankYou: "Thanks — our team will call you shortly.",
    multiStep: false,
    templateId: "custom",
    saveToCrm: true,
    sendEmail: true,
    sendWhatsapp: false,
    redirectThankYou: false,
    submitLabel: "Submit",
    deliverableUrl: "",
    deliverableLabel: "Download brochure",
    fields: [
      { id: uid("fld"), type: "text", label: "Full name", placeholder: "e.g. Rohan Kapoor", required: true },
      { id: uid("fld"), type: "phone", label: "Phone number", placeholder: "+91 98765 43210", required: true },
      { id: uid("fld"), type: "email", label: "Email address", placeholder: "you@email.com", required: false },
    ],
    successAction: "message",
    successUrl: "",
    successTitle: "",
    errorMessage: "Please fill in the highlighted required fields.",
    openPopupId: "",
    customActions: [],
  };
}

export function loadFormLibrary(): FormDefinition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FORMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FormDefinition[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFormLibrary(forms: FormDefinition[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FORMS_KEY, JSON.stringify(forms.slice(0, 100)));
  } catch {
    /* quota */
  }
}

export function upsertForm(form: FormDefinition) {
  const all = loadFormLibrary();
  const idx = all.findIndex((f) => f.id === form.id);
  const next = idx >= 0 ? all.map((f) => (f.id === form.id ? { ...form, updatedAt: new Date().toISOString() } : f)) : [...all, { ...form, updatedAt: new Date().toISOString() }];
  saveFormLibrary(next);
  return next;
}

export function findFormByEmbedId(embedIdStr: string, forms?: FormDefinition[]): FormDefinition | undefined {
  const list = forms ?? loadFormLibrary();
  return list.find((f) => f.embed?.id === embedIdStr || f.id === embedIdStr);
}

export function findFormById(id: string, forms?: FormDefinition[]): FormDefinition | undefined {
  const list = forms ?? loadFormLibrary();
  return list.find((f) => f.id === id);
}

export function embedSnippet(embed: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  // Universal embed — works on website pages, landing pages, external sites, Custom HTML widgets and templates.
  // Loads the latest saved version of the form via the embed route.
  return `<div data-prestate-form="${embed}"></div>\n<script src="${base}/embed.js" data-form="${embed}" async><\/script>\n<!-- Fallback iframe (works even with JS disabled) -->\n<!-- <iframe src="${base}/embed/form/${embed}" title="Form ${embed}" style="width:100%;min-height:720px;border:0"></iframe> -->`;
}

export function iframeSnippet(slug: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `<iframe src="${base}/p/${slug}#lead-form" title="Lead form" style="width:100%;min-height:720px;border:0"></iframe>`;
}
