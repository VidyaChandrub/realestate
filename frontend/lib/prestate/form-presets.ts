import type { FormLeadField } from "./types";

function f(partial: FormLeadField): FormLeadField {
  return partial;
}

export const FORM_PRESETS: Record<
  string,
  { multiStep: boolean; submitLabel: string; fields: FormLeadField[] }
> = {
  f1: {
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
    multiStep: true,
    submitLabel: "Book site visit",
    fields: [
      f({ id: "f1", type: "text", label: "Full name", placeholder: "e.g. Rohan Kapoor", required: true }),
      f({ id: "f2", type: "phone", label: "Phone number", placeholder: "+91 98765 43210", required: true }),
      f({ id: "f3", type: "email", label: "Email address", placeholder: "you@email.com", required: true }),
      f({ id: "f4", type: "date", label: "Preferred visit date", placeholder: "", required: true }),
      f({ id: "f5", type: "select", label: "Configuration", placeholder: "Choose", required: true, options: ["3 BHK", "4 BHK", "Penthouse"] }),
      f({ id: "f6", type: "checkbox", label: "I agree to be contacted about this visit", placeholder: "", required: true }),
    ],
  },
  f3: {
    multiStep: false,
    submitLabel: "Download brochure",
    fields: [
      f({ id: "f1", type: "text", label: "Full name", placeholder: "Your name", required: true }),
      f({ id: "f2", type: "email", label: "Email address", placeholder: "you@email.com", required: true }),
      f({ id: "f3", type: "phone", label: "Phone number", placeholder: "+91 98765 43210", required: true }),
    ],
  },
  f4: {
    multiStep: false,
    submitLabel: "Get pricing",
    fields: [
      f({ id: "f1", type: "text", label: "Full name", placeholder: "e.g. Rohan Kapoor", required: true }),
      f({ id: "f2", type: "phone", label: "Phone number", placeholder: "+91 98765 43210", required: true }),
      f({ id: "f3", type: "email", label: "Email address", placeholder: "you@email.com", required: false }),
      f({ id: "f4", type: "select", label: "Budget", placeholder: "Select budget", required: true, options: ["₹1–1.5 Cr", "₹1.5–2 Cr", "₹2 Cr+"] }),
      f({ id: "f5", type: "select", label: "Configuration", placeholder: "Choose", required: true, options: ["3 BHK", "4 BHK", "Penthouse"] }),
    ],
  },
  f5: {
    multiStep: false,
    submitLabel: "Request callback",
    fields: [
      f({ id: "f1", type: "text", label: "Full name", placeholder: "Your name", required: true }),
      f({ id: "f2", type: "phone", label: "Phone number", placeholder: "+91 98765 43210", required: true }),
      f({ id: "f3", type: "select", label: "Best time to call", placeholder: "Choose a slot", required: true, options: ["Morning", "Afternoon", "Evening"] }),
    ],
  },
};
