// CSV lead import — maps an uploaded sheet onto the rows POSTed to
// /org/leads/import. The server re-validates every row (required fields,
// email/phone format, project match); this only reads the file shape.

import { parseCsv } from "@/lib/csv";

export const LEAD_IMPORT_COLUMNS = ["Name", "Phone", "Email", "Project"] as const;
/** Must match LEAD_IMPORT_MAX_ROWS on the backend. */
export const LEAD_IMPORT_MAX_ROWS = 1000;
export const LEAD_IMPORT_MAX_BYTES = 2 * 1024 * 1024;

export type LeadImportRow = {
  /** 1-based line in the CSV (header = 1), echoed back in server errors. */
  rowNumber: number;
  name: string;
  phone: string;
  email: string;
  project: string;
};

type Field = "name" | "phone" | "email" | "project";

// Accepted header spellings, compared lowercase with non-alphanumerics removed
// ("Full Name", "full_name" → "fullname").
const HEADER_ALIASES: Record<Field, string[]> = {
  name: ["name", "fullname", "leadname"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber", "contactnumber"],
  email: ["email", "emailaddress", "emailid"],
  project: ["project", "projectname"],
};

const FIELD_LABEL: Record<Field, string> = {
  name: "Name",
  phone: "Phone",
  email: "Email",
  project: "Project",
};

const headerKey = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

export type ParsedLeadCsv = { rows: LeadImportRow[] } | { error: string };

/** Read CSV text into import rows, or a file-level error to show the user. */
export function parseLeadCsv(text: string): ParsedLeadCsv {
  const table = parseCsv(text);
  const headerIndex = table.findIndex((r) => r.some((c) => c.trim()));
  if (headerIndex === -1) return { error: "The file is empty." };

  const header = table[headerIndex].map(headerKey);
  const col = {} as Record<Field, number>;
  const missing: string[] = [];
  for (const field of Object.keys(HEADER_ALIASES) as Field[]) {
    const idx = header.findIndex((h) => HEADER_ALIASES[field].includes(h));
    if (idx === -1) missing.push(FIELD_LABEL[field]);
    col[field] = idx;
  }
  if (missing.length > 0) {
    return {
      error: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Download the sample CSV for the expected format.`,
    };
  }

  const rows: LeadImportRow[] = [];
  for (let i = headerIndex + 1; i < table.length; i++) {
    const cells = table[i];
    if (!cells.some((c) => c.trim())) continue; // blank line
    const cell = (f: Field) => (cells[col[f]] ?? "").trim();
    rows.push({
      rowNumber: i + 1,
      name: cell("name"),
      phone: cell("phone"),
      email: cell("email"),
      project: cell("project"),
    });
  }

  if (rows.length === 0) return { error: "The file has no lead rows below the header." };
  if (rows.length > LEAD_IMPORT_MAX_ROWS) {
    return {
      error: `The file has ${rows.length} rows — import at most ${LEAD_IMPORT_MAX_ROWS} leads at a time.`,
    };
  }
  return { rows };
}

/** Sample sheet: header + example rows bound to the org's real projects. */
export function sampleLeadCsvRows(projectNames: string[]): string[][] {
  const p1 = projectNames[0] ?? "Your Project Name";
  const p2 = projectNames[1] ?? p1;
  return [
    [...LEAD_IMPORT_COLUMNS],
    ["Asha Rao", "+91 98250 41200", "asha.rao@example.com", p1],
    ["Vikram Mehta", "+91 99099 12345", "vikram.mehta@example.com", p2],
  ];
}
