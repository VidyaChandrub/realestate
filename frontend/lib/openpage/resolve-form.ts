import type { SiteConfig } from "./types";
import { findFormById, loadFormLibrary, type FormDefinition } from "./forms-store";
import { sampleBuilderForms } from "./sample-forms";

export function mergeFormLibraries(...lists: Array<FormDefinition[] | undefined>): FormDefinition[] {
  const map = new Map<string, FormDefinition>();
  for (const list of lists) {
    for (const form of list ?? []) {
      if (form?.id) map.set(form.id, form);
    }
  }
  return [...map.values()];
}

export function resolveEffectiveForm(opts: {
  formId?: string | null;
  pageForm?: SiteConfig["form"];
  pageForms?: FormDefinition[];
}): SiteConfig["form"] | undefined {
  const id = String(opts.formId ?? "").trim();
  const pageForms = opts.pageForms ?? [];
  const library = typeof window !== "undefined" ? loadFormLibrary() : [];
  const samples = sampleBuilderForms();
  if (id) {
    return (
      pageForms.find((f) => f.id === id) ??
      findFormById(id, library) ??
      samples.find((f) => f.id === id) ??
      opts.pageForm
    );
  }
  return opts.pageForm;
}

export function packDynamicLeadFields(
  fields: Array<{ id?: string; type?: string; label: string }>,
  values: Record<string, string>,
): Record<string, string> {
  const leadFields: Record<string, string> = {};
  for (const f of fields) {
    const key = f.id || f.label;
    const value = String(values[key] ?? "").trim();
    leadFields[f.label] = value;
    const type = String(f.type ?? "").toLowerCase();
    const label = f.label.toLowerCase();
    if (type === "phone" || /phone|mobile|whatsapp/.test(label)) {
      leadFields.phone = value;
      leadFields.phoneNumber = value;
    } else if (type === "email" || /email/.test(label)) {
      leadFields.email = value;
    } else if ((type === "text" || type === "name") && /name/.test(label) && !leadFields.fullName) {
      leadFields.fullName = value;
      leadFields.name = value;
    } else if (type === "select" || type === "radio" || /interest|config|bhk/.test(label)) {
      if (value) leadFields.interestedIn = value;
    }
  }
  return leadFields;
}
