/**
 * Typed field templates — fully dynamic project types.
 *
 * A project type is just a list of fields; there is no fixed layout. Some
 * fields carry a `role` that wires them onto a real Unit column and the
 * feature that column powers (availability grid grouping, floor view,
 * price per unit area, configuration prefill). Which inventory controls a
 * project has is derived from which roles its unit template's fields carry —
 * deleting a role field just turns that feature off, it never errors.
 *
 * Mirrors backend `common/utils/field-template.util.ts`, which is the
 * authority — the server re-validates everything.
 */

export type FieldType = "number" | "text" | "yesno" | "choice";

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  number: "Number",
  text: "Text",
  yesno: "Yes / No",
  choice: "Choice",
};

export const FIELD_ROLES = ["price", "area", "group", "floor", "configuration"] as const;
export type FieldRole = (typeof FIELD_ROLES)[number];

export const FIELD_ROLE_LABEL: Record<FieldRole, string> = {
  price: "Price",
  area: "Area",
  group: "Tower / Block / Sector",
  floor: "Floor",
  configuration: "Configuration",
};

/** The input type(s) a role may land on — must fit the Unit column it maps to. */
export const ROLE_ALLOWED_TYPES: Record<FieldRole, FieldType[]> = {
  price: ["number"],
  area: ["number"],
  floor: ["number"],
  group: ["text", "choice"],
  configuration: ["text", "choice"],
};

/**
 * Plain-language copy for the confirmation shown when deleting a field that
 * currently carries a role. No "role"/"mapping"/"wiring" jargon — just what
 * breaks.
 */
export const ROLE_DELETE_CONSEQUENCE: Record<FieldRole, string> = {
  price: "This field is currently used as the unit price. If you delete it, units will not have a price field until another field is selected as Price.",
  area: "This field is currently used as the unit area. If you delete it, units will not have an area field until another field is selected as Area.",
  group: "This field is currently used to group units (tower / block / sector). If you delete it, units will not be grouped in the availability grid until another field is selected as the group field.",
  floor: "This field is currently used as the unit floor. If you delete it, there will not be a floor-wise view until another field is selected as Floor.",
  configuration: "This field is currently used as the unit configuration. If you delete it, there will not be a configuration picker when adding units until another field is selected as Configuration.",
};

/** The roles present in `baseline` that no field in `rows` currently carries. */
export function missingRoles(rows: Pick<FieldRow, "role">[], baseline: Set<FieldRole>): FieldRole[] {
  const current = new Set(rows.map((r) => r.role).filter(Boolean));
  return FIELD_ROLES.filter((r) => baseline.has(r) && !current.has(r));
}

/** The role set a saved template carries — the reference `missingRoles` compares live edits against. */
export function roleBaselineOf(fields: FieldDef[] | null | undefined): Set<FieldRole> {
  return new Set((fields ?? []).map((f) => f.role).filter((r): r is FieldRole => !!r));
}

export interface FieldDef {
  /** Stable identity — values are stored against it, never against the label. */
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  /** Groups fields under a heading when the form renders. */
  section?: string;
  /** Wires this field onto a real Unit column. Fixed once set; only the label stays editable. */
  role?: FieldRole;
  /** choice only */
  options?: string[];
  /** number only — display suffix such as "acres" */
  unit?: string;
  /** text only — render as a textarea instead of a single-line input. */
  multiline?: boolean;
  /**
   * number, non-role fields only — an explicit opt-in to also get a column
   * in "Defaults per configuration" and prefill on Add Unit the same way
   * Price and Area do. Never inferred from the field's name.
   */
  extraDefault?: boolean;
}

/** The field currently carrying `role` in a template, or null. */
export function roleField(template: FieldDef[], role: FieldRole): FieldDef | null {
  return template.find((f) => f.role === role) ?? null;
}

/** The fields whose values belong in customFields — a role field's value has its own Unit column. */
export function nonRoleFields(template: FieldDef[]): FieldDef[] {
  return template.filter((f) => !f.role);
}

/**
 * Non-role Number fields explicitly opted in (via `extraDefault`) to also get
 * a column in "Defaults per configuration" and prefill on Add Unit — e.g.
 * Built-up Area alongside the actual Area-role field. Deliberately not
 * inferred from the field's name: which fields show up here is exactly what
 * was ticked in the field-roles panel, nothing else.
 */
export function defaultableExtraFields(template: FieldDef[]): FieldDef[] {
  return nonRoleFields(template).filter((f) => f.type === "number" && f.extraDefault === true);
}

/** What a template's role fields give a project. Derived, never stored. */
export interface TemplateTraits {
  priced: boolean;
  hasArea: boolean;
  floors: boolean;
  configurations: boolean;
  grouped: boolean;
}

export function templateTraits(template: FieldDef[]): TemplateTraits {
  return {
    priced: !!roleField(template, "price"),
    hasArea: !!roleField(template, "area"),
    floors: !!roleField(template, "floor"),
    configurations: !!roleField(template, "configuration"),
    grouped: !!roleField(template, "group"),
  };
}

/** The grouping column's name for a project — the `group`-role field's own editable label. */
export function groupNoun(template: FieldDef[]): string | null {
  return roleField(template, "group")?.label ?? null;
}

/** Pluralise a group noun for a form label ("Tower" → "towers"). */
export function groupPlural(noun: string): string {
  const n = noun.toLowerCase();
  return /(s|x|ch|sh)$/.test(n) ? `${n}es` : `${n}s`;
}

/** Fields grouped by their `section`, in template order; unsectioned fields form a final, unlabeled group. */
export function groupBySection(template: FieldDef[]): Array<{ section: string | null; fields: FieldDef[] }> {
  const groups: Array<{ section: string | null; fields: FieldDef[] }> = [];
  for (const f of template) {
    const section = f.section ?? null;
    const last = groups[groups.length - 1];
    if (last && last.section === section) last.fields.push(f);
    else groups.push({ section, fields: [f] });
  }
  return groups;
}

/** An editable template row. `rowId` is a client-only React key. */
export interface FieldRow {
  rowId: number;
  /** Server-assigned key; null for a field that hasn't been saved yet. */
  key: string | null;
  label: string;
  type: FieldType;
  required: boolean;
  section: string;
  /**
   * Not editable through the row UI — a role is only ever set or changed via
   * the field-roles panel (see `FieldRolesPanel` in typed-field-editor.tsx),
   * never a per-row control. Carried through unchanged on rename, reorder,
   * and every other row edit; only cleared automatically if the row's type
   * changes to one the role can't carry.
   */
  role: FieldRole | "";
  /** choice: comma-separated choices as typed */
  optionsText: string;
  /** number: display unit as typed */
  unit: string;
  multiline: boolean;
  /** number, non-role fields only — see `FieldDef.extraDefault`. */
  extraDefault: boolean;
}

let nextRowId = 1;

export function makeFieldRow(patch: Partial<FieldRow> = {}): FieldRow {
  return {
    rowId: nextRowId++,
    key: null,
    label: "",
    type: "text",
    required: false,
    section: "",
    role: "",
    optionsText: "",
    unit: "",
    multiline: false,
    extraDefault: false,
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
      section: f.section ?? "",
      role: f.role ?? "",
      optionsText: (f.options ?? []).join(", "),
      unit: f.unit ?? "",
      multiline: f.multiline ?? false,
      extraDefault: f.extraDefault ?? false,
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
      ...(r.section.trim() ? { section: r.section.trim() } : {}),
      ...(r.role ? { role: r.role } : {}),
      ...(r.type === "choice"
        ? { options: r.optionsText.split(",").map((o) => o.trim()).filter(Boolean) }
        : {}),
      ...(r.type === "number" && r.unit.trim() ? { unit: r.unit.trim() } : {}),
      ...(r.type === "text" && r.multiline ? { multiline: true } : {}),
      ...(r.type === "number" && !r.role && r.extraDefault ? { extraDefault: true } : {}),
    }));
}

/** Client-side mirror of the server's template rules, for fast feedback. */
export function validateFieldRows(rows: FieldRow[], where: string): string | null {
  const seen = new Set<string>();
  const seenRoles = new Set<FieldRole>();
  for (const r of rows) {
    const label = r.label.trim();
    if (!label) return `${where}: every field needs a label.`;
    if (seen.has(label.toLowerCase())) return `${where}: two fields are both called "${label}".`;
    seen.add(label.toLowerCase());
    if (r.type === "choice" && !r.optionsText.split(",").some((o) => o.trim())) {
      return `${where}: "${label}" needs at least one choice.`;
    }
    if (r.role) {
      if (seenRoles.has(r.role)) {
        return `${where}: two fields can't both be the "${FIELD_ROLE_LABEL[r.role]}" field.`;
      }
      seenRoles.add(r.role);
      if (!ROLE_ALLOWED_TYPES[r.role].includes(r.type)) {
        return `${where}: "${label}" can't be the "${FIELD_ROLE_LABEL[r.role]}" field — change its type first.`;
      }
    }
  }
  return null;
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
