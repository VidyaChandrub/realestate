import type { FormFieldType, FormLeadField } from "./types";

export const FIELD_TYPE_LABEL: Record<FormFieldType, string> = {
  text: "Text",
  name: "Name",
  email: "Email",
  phone: "Phone",
  number: "Number",
  select: "Dropdown",
  radio: "Radio",
  checkbox: "Checkbox",
  date: "Date",
  time: "Time",
  datetime: "Date / Time",
  textarea: "Paragraph",
  file: "File upload",
  address: "Address",
  hidden: "Hidden",
  heading: "Heading",
  html: "HTML",
  consent: "Consent",
  captcha: "CAPTCHA",
  submit: "Submit",
};

export const FIELD_TYPE_HINT: Partial<Record<FormFieldType, string>> = {
  text: "Single line input",
  name: "Full name",
  email: "Valid email format",
  phone: "10 digit mobile",
  number: "Numeric value",
  select: "Pick one option",
  radio: "Single choice",
  checkbox: "Yes / no",
  date: "Date picker",
  time: "Time picker",
  datetime: "Date and time",
  textarea: "Long text",
  file: "File upload",
  address: "Street address",
  hidden: "Not shown",
  heading: "Section title",
  html: "Custom markup",
  consent: "Consent checkbox",
  captcha: "Spam check",
  submit: "Submit button",
};

export const PALETTE_TYPES: FormFieldType[] = [
  "text",
  "email",
  "phone",
  "name",
  "number",
  "select",
  "radio",
  "checkbox",
  "textarea",
  "date",
  "datetime",
  "file",
  "address",
  "hidden",
  "heading",
  "html",
  "consent",
  "captcha",
  "submit",
];

export function newFieldId() {
  return `fld_${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultField(type: FormFieldType): FormLeadField {
  const label = FIELD_TYPE_LABEL[type] || "Field";
  return {
    id: newFieldId(),
    type,
    label,
    placeholder: type === "email" ? "name@example.com" : type === "phone" ? "+91" : "",
    required: false,
    options:
      type === "select" || type === "radio" || type === "checkbox" || type === "consent"
        ? ["Option 1", "Option 2"]
        : undefined,
    defaultValue: "",
    width: "full",
    helpText: "",
    html: type === "html" ? "<p>Custom HTML</p>" : undefined,
  };
}
