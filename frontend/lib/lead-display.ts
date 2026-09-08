import type { CrmLead } from "./types";

const NAME_KEYS = [
  "fullName",
  "full_name",
  "name",
  "Name",
  "Full Name",
  "Full name",
  "Your Name",
  "Your name",
  "full name",
];
const PHONE_KEYS = [
  "phone",
  "phoneNumber",
  "phone_number",
  "Phone",
  "Phone Number",
  "Phone number",
  "phone number",
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
  "Email address",
  "email_address",
];
const PROJECT_KEYS = ["project", "Project", "projectName", "Project Name"];
const INTEREST_KEYS = [
  "interestedIn",
  "Interested in",
  "interested_in",
  "Interest",
  "Configuration",
];

const SOURCE_PLACE: Record<string, string> = {
  "project-widget": "Project widget",
  "Project widget": "Project widget",
  website: "Page form",
  "Page form": "Page form",
  brochure_gate: "Brochure gate",
  "Brochure gate": "Brochure gate",
  floorplan: "Floor plan",
  "Floor plan": "Floor plan",
  popup_form: "Popup",
  Popup: "Popup",
  crm: "CRM",
  CRM: "CRM",
  hero: "Hero section",
  "Hero section": "Hero section",
};

export function composeLeadSource(parts: {
  place: string;
  project?: string | null;
  interest?: string | null;
}): string {
  return [parts.place, parts.project?.trim(), parts.interest?.trim()]
    .filter(Boolean)
    .join(" · ");
}

export function leadDisplaySource(
  lead: Pick<CrmLead, "source" | "data"> & { project?: { name: string } | null },
): string {
  const raw = (lead.source ?? "").trim();
  const [first, ...rest] = raw ? raw.split(" · ").map((p) => p.trim()).filter(Boolean) : [];
  const place = SOURCE_PLACE[first ?? ""] ?? SOURCE_PLACE[raw] ?? first ?? "Website";
  const fromRestProject = rest.find((p) => !/bhk|villa|plot|penthouse|interest/i.test(p));
  const fromRestInterest = rest.find((p) => /bhk|villa|plot|penthouse|interest/i.test(p));
  const project =
    lead.project?.name || firstString(lead.data, PROJECT_KEYS) || fromRestProject || "";
  const interest = firstString(lead.data, INTEREST_KEYS) || fromRestInterest || "";
  return composeLeadSource({ place, project, interest });
}

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
