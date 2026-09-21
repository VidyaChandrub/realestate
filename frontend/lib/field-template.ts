/**
 * Typed field templates and project layouts.
 *
 * A project type carries a fixed structure *layout* (code) plus two
 * org-configured field templates (data): summary fields on the project, and
 * per-unit fields. Mirrors backend `common/utils/field-template.util.ts`,
 * which is the authority — the server re-validates everything.
 */

export type FieldType = "number" | "text" | "yesno" | "choice";

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  number: "Number",
  text: "Text",
  yesno: "Yes / No",
  choice: "Choice",
};

export interface FieldDef {
  /** Stable identity — values are stored against it, never against the label. */
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  /** choice only */
  options?: string[];
  /** number only — display suffix such as "acres" */
  unit?: string;
}

/** The fixed structure layouts. Which inventory controls exist is decided by these. */
export type ProjectLayout = "tower" | "cluster" | "individual";

export interface LayoutInfo {
  value: ProjectLayout;
  title: string;
  blurb: string;
  /** Default name of the grouping column; null = no grouping. */
  defaultGroupLabel: string | null;
}

export const LAYOUTS: LayoutInfo[] = [
  {
    value: "tower",
    title: "Towers & floors",
    blurb: "Towers or blocks with floors — apartments, commercial complexes.",
    defaultGroupLabel: "Tower",
  },
  {
    value: "cluster",
    title: "Phases / clusters",
    blurb: "Groups such as phases, sectors or rows, with no floors — villas, plots.",
    defaultGroupLabel: "Phase",
  },
  {
    value: "individual",
    title: "Individual units",
    blurb: "A flat list with no grouping — farmhouses, one-off properties.",
    defaultGroupLabel: null,
  },
];

export function layoutInfo(layout: ProjectLayout): LayoutInfo {
  return LAYOUTS.find((l) => l.value === layout) ?? LAYOUTS[0];
}

/** An editable template row. `rowId` is a client-only React key. */
export interface FieldRow {
  rowId: number;
  /** Server-assigned key; null for a field that hasn't been saved yet. */
  key: string | null;
  label: string;
  type: FieldType;
  required: boolean;
  /** choice: comma-separated choices as typed */
  optionsText: string;
  /** number: display unit as typed */
  unit: string;
}

let nextRowId = 1;

export function makeFieldRow(patch: Partial<FieldRow> = {}): FieldRow {
  return {
    rowId: nextRowId++,
    key: null,
    label: "",
    type: "text",
    required: false,
    optionsText: "",
    unit: "",
    ...patch,
  };
}

export function fieldsToRows(fields: FieldDef[] | null | undefined): FieldRow[] {
  return (fields ?? []).map((f) =>
    makeFieldRow({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      optionsText: (f.options ?? []).join(", "),
      unit: f.unit ?? "",
    }),
  );
}

/** Mirror of the server's slugifyFieldKey. */
export function slugifyFieldKey(label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  return /^[a-z]/.test(slug) ? slug : `f_${slug}`.slice(0, 40);
}

/** A key for a new field that doesn't collide with any other row's. */
export function uniqueFieldKey(label: string, rows: FieldRow[]): string {
  const taken = new Set(rows.map((r) => r.key).filter(Boolean));
  const base = slugifyFieldKey(label);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base.slice(0, 36)}_${n}`)) n++;
  return `${base.slice(0, 36)}_${n}`;
}

/**
 * Rows → the payload sent to the API. Untouched blank rows are dropped. Every
 * field carries a key (an unsaved one gets it from its label), so values typed
 * against a new field line up with what the server stores.
 */
export function rowsToFields(rows: FieldRow[]): Array<FieldDef> {
  const kept = rows.filter((r) => r.label.trim() || r.key);
  const withKeys: FieldRow[] = [];
  for (const r of kept) {
    withKeys.push({ ...r, key: r.key ?? uniqueFieldKey(r.label || "field", [...kept, ...withKeys]) });
  }
  return withKeys
    .map((r) => ({
      key: r.key as string,
      label: r.label.trim(),
      type: r.type,
      required: r.required,
      ...(r.type === "choice"
        ? { options: r.optionsText.split(",").map((o) => o.trim()).filter(Boolean) }
        : {}),
      ...(r.type === "number" && r.unit.trim() ? { unit: r.unit.trim() } : {}),
    }));
}

/** Client-side mirror of the server's template rules, for fast feedback. */
export function validateFieldRows(rows: FieldRow[], where: string): string | null {
  const seen = new Set<string>();
  for (const r of rows) {
    const label = r.label.trim();
    if (!label) return `${where}: every field needs a label.`;
    if (seen.has(label.toLowerCase())) return `${where}: two fields are both called "${label}".`;
    seen.add(label.toLowerCase());
    if (r.type === "choice" && !r.optionsText.split(",").some((o) => o.trim())) {
      return `${where}: "${label}" needs at least one choice.`;
    }
  }
  return null;
}

/** What each layout gives a project. Code, not org data. */
export interface LayoutTraits {
  /** Floors are captured (tower only). */
  floors: boolean;
  /** The unit-configuration mix (BHK types, planned counts, size/price table). */
  configurations: boolean;
  /** Units are organised into named groups. */
  grouped: boolean;
}

export const LAYOUT_TRAITS: Record<ProjectLayout, LayoutTraits> = {
  tower: { floors: true, configurations: true, grouped: true },
  cluster: { floors: false, configurations: false, grouped: true },
  individual: { floors: false, configurations: false, grouped: false },
};

/** The grouping column's name for a project ("Tower", "Sector"…); null = no grouping. */
export function groupNoun(layout: ProjectLayout, groupLabel: string | null | undefined): string | null {
  const info = layoutInfo(layout);
  if (info.defaultGroupLabel === null) return null;
  return groupLabel?.trim() || info.defaultGroupLabel;
}

/** Pluralise a group noun for a form label ("Tower" → "towers"). */
export function groupPlural(noun: string): string {
  const n = noun.toLowerCase();
  return /(s|x|ch|sh)$/.test(n) ? `${n}es` : `${n}s`;
}

/**
 * Typed values as the form holds them: every value is a string so inputs stay
 * controlled — numbers as typed, choice as the option, yes/no as "yes"/"no",
 * and "" for unset.
 */
export type CustomValueDraft = Record<string, string>;

export type CustomFieldValues = Record<string, string | number | boolean | null>;

/**
 * Stored values → form drafts. With a template, only its fields; with `null`
 * every stored key (for a caller that opens a form before the template has
 * loaded — extra keys are harmless, only template fields are ever sent back).
 */
export function valuesToDraft(
  template: FieldDef[] | null,
  stored: CustomFieldValues | null | undefined,
): CustomValueDraft {
  const draft: CustomValueDraft = {};
  const keys = template ? template.map((f) => f.key) : Object.keys(stored ?? {});
  for (const key of keys) {
    const v = stored?.[key];
    if (v === undefined || v === null) continue;
    draft[key] = typeof v === "boolean" ? (v ? "yes" : "no") : String(v);
  }
  return draft;
}

/**
 * Form drafts → the API payload. An empty field is sent as null (which clears
 * it); fields not in the template are never sent, and the server keeps the
 * stored values of fields that have left the template.
 */
export function draftToPayload(template: FieldDef[], draft: CustomValueDraft): CustomFieldValues {
  const out: CustomFieldValues = {};
  for (const f of template) {
    const raw = (draft[f.key] ?? "").trim();
    if (!raw) { out[f.key] = null; continue; }
    if (f.type === "number") out[f.key] = Number(raw);
    else if (f.type === "yesno") out[f.key] = raw === "yes";
    else out[f.key] = raw;
  }
  return out;
}

/** A stored value as text for a table cell or summary: "—" when empty, Yes/No, with its unit. */
export function customValueText(f: FieldDef, v: string | number | boolean | null | undefined): string {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return f.unit ? `${v} ${f.unit}` : String(v);
}

/** Required template fields as project-validation requirements (ids `cf_<key>`). */
export function customFieldRequirements(template: FieldDef[], draft: CustomValueDraft) {
  return template
    .filter((f) => f.required)
    .map((f) => ({
      id: `cf_${f.key}`,
      label: f.label,
      error: `${f.label} is required.`,
      filled: !!(draft[f.key] ?? "").trim(),
    }));
}

/** A template as the editor rows hold it, back to plain definitions (keys kept). */
export function rowsToTemplate(rows: FieldRow[]): FieldDef[] {
  return rowsToFields(rows);
}
