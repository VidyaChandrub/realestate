import type { FormLeadField } from "./types";

function f(partial: FormLeadField): FormLeadField {
  return partial;
}

/**
 * Generic starter templates for the universal Dynamic Form Builder.
 * These are NOT fixed business types — they are simply pre-filled field
 * sets the user can load, then freely rename, add/remove fields, and
 * reconfigure as any form (contact, booking, brochure gate, etc.).
 * The builder does NOT hard-code business-specific widgets.
 */
export const FORM_PRESETS: Record<
  string,
  { multiStep: boolean; submitLabel: string; fields: FormLeadField[]; name: string; description: string }
> = {
  f1: {
    name: "Starter — Simple capture",
    description: "Name + phone + email + message (customize freely)",
    multiStep: false,
    submitLabel: "Send enquiry",
    fields: [
      f({ id: "f1", type: "text", label: "Full name", placeholder: "e.g. Rohan Kapoor", required: true }),
      f({ id: "f2", type: "phone", label: "Phone number", placeholder: "+91 98765 43210", required: true }),
      f({ id: "f3", type: "email", label: "Email address", placeholder: "you@email.com", required: false }),
      f({ id: "f4", type: "textarea", label: "Message", placeholder: "How can we help?", required: false }),
    ],
  },
  f2: {
    name: "Starter — Multi-step",
    description: "Multi-step with date & choices (split into steps automatically)",
    multiStep: true,
    submitLabel: "Continue",
    fields: [
      f({ id: "f1", type: "text", label: "Full name", placeholder: "e.g. Rohan Kapoor", required: true }),
      f({ id: "f2", type: "phone", label: "Phone number", placeholder: "+91 98765 43210", required: true }),
      f({ id: "f3", type: "email", label: "Email address", placeholder: "you@email.com", required: true }),
      f({ id: "f4", type: "date", label: "Preferred date", placeholder: "", required: true }),
      f({ id: "f5", type: "select", label: "Configuration", placeholder: "Choose", required: true, options: ["Option A", "Option B", "Option C"] }),
      f({ id: "f6", type: "checkbox", label: "I agree to be contacted", placeholder: "", required: true }),
    ],
  },
  f3: {
    name: "Starter — Minimal gate",
    description: "3-field gate (name + email + phone) — enable PDF download for brochure use",
    multiStep: false,
    submitLabel: "Submit & Continue",
    fields: [
      f({ id: "f1", type: "text", label: "Full name", placeholder: "Your name", required: true }),
      f({ id: "f2", type: "email", label: "Email address", placeholder: "you@email.com", required: true }),
      f({ id: "f3", type: "phone", label: "Phone number", placeholder: "+91 98765 43210", required: true }),
    ],
  },
  f4: {
    name: "Starter — With choices & number",
    description: "Includes dropdown + number — adapt for any enquiry",
    multiStep: false,
    submitLabel: "Submit",
    fields: [
      f({ id: "f1", type: "text", label: "Full name", placeholder: "e.g. Rohan Kapoor", required: true }),
      f({ id: "f2", type: "phone", label: "Phone number", placeholder: "+91 98765 43210", required: true }),
      f({ id: "f3", type: "email", label: "Email address", placeholder: "you@email.com", required: false }),
      f({ id: "f4", type: "select", label: "Budget", placeholder: "Select", required: true, options: ["Option 1", "Option 2", "Option 3"] }),
      f({ id: "f5", type: "number", label: "Quantity", placeholder: "1", required: false }),
    ],
  },
  f5: {
    name: "Starter — Time & selection",
    description: "Time + dropdown — customize for scheduling or callback",
    multiStep: false,
    submitLabel: "Request",
    fields: [
      f({ id: "f1", type: "text", label: "Full name", placeholder: "Your name", required: true }),
      f({ id: "f2", type: "phone", label: "Phone number", placeholder: "+91 98765 43210", required: true }),
      f({ id: "f3", type: "time", label: "Preferred time", placeholder: "", required: true }),
      f({ id: "f4", type: "select", label: "Best slot", placeholder: "Choose a slot", required: true, options: ["Morning", "Afternoon", "Evening"] }),
    ],
  },
};
