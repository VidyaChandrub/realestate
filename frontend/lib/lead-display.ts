import type { CrmLead } from "./types";

const NAME_KEYS = [
  "fullName",
  "full_name",
  "name",
  "Name",
  "Full Name",
  "Your Name",
  "full name",
];
const PHONE_KEYS = [
  "phone",
  "phoneNumber",
  "phone_number",
  "Phone",
  "Mobile",
  "mobile",
  "WhatsApp",
  "whatsapp",
];
const EMAIL_KEYS = [
  "email",
  "Email",
  "emailAddress",
  "Email Address",
  "email_address",
];

function firstString(
  data: Record<string, unknown> | null | undefined,
  keys: string[],
): string {
  if (!data) return "";
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function leadDisplayName(lead: Pick<CrmLead, "data" | "formName">): string {
  return firstString(lead.data, NAME_KEYS) || lead.formName || "Unnamed lead";
}

export function leadDisplayPhone(lead: Pick<CrmLead, "data">): string {
  return firstString(lead.data, PHONE_KEYS);
}

export function leadDisplayEmail(lead: Pick<CrmLead, "data">): string {
  return firstString(lead.data, EMAIL_KEYS);
}

export function leadField(
  data: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  return firstString(data, keys) || "—";
}
