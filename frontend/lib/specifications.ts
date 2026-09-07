/**
 * Project `specifications` — reading and writing the blob.
 *
 * The blob is now a *dynamic* list: `{ items: [{ label, value }], notes }`.
 * The user picks the labels, so the four build-quality fields the wizard used
 * to hard-code (Flooring / Kitchen / Doors & windows / Fittings) are now just
 * pre-filled default rows that can be renamed or deleted.
 *
 * Projects created before that rework hold the original fixed-key object —
 * `{ flooring, kitchen, doorsWindows, fittings, notes }` — and nothing was
 * migrated in place, so every read goes through `normalizeSpecifications`,
 * which understands both shapes. That keeps old projects editable (and their
 * specs visible) without a data migration, and without either page having to
 * know which shape it got.
 */

export interface SpecRow {
  /** Stable React key. Local to the client — never sent to the API. */
  key: number;
  label: string;
  value: string;
}

export interface SpecForm {
  rows: SpecRow[];
  notes: string;
}

/**
 * Labels the wizard pre-fills for a new project. Also the display names the
 * legacy fixed-key shape maps onto, so an old project reads back identically
 * to how it was entered.
 */
export const DEFAULT_SPEC_LABELS = [
  "Flooring",
  "Kitchen",
  "Doors & windows",
  "Fittings",
] as const;

/** Legacy key -> display label, in the order the old form showed them. */
const LEGACY_KEY_LABELS: [string, string][] = [
  ["flooring", "Flooring"],
  ["kitchen", "Kitchen"],
  ["doorsWindows", "Doors & windows"],
  ["fittings", "Fittings"],
];

let nextKey = 1;
/** Monotonic row key — collision-free regardless of how fast rows are added. */
export function specRowKey(): number {
  return nextKey++;
}

export function makeSpecRow(label = "", value = ""): SpecRow {
  return { key: specRowKey(), label, value };
}

/** The four pre-labelled, empty, deletable rows a new project starts with. */
export function defaultSpecRows(): SpecRow[] {
  return DEFAULT_SPEC_LABELS.map((label) => makeSpecRow(label));
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

/**
 * Read a stored `specifications` blob of either shape into editable rows.
 *
 * - New shape: `items` is used as-is (entries without a label *and* without a
 *   value are dropped, so a half-saved blob doesn't resurrect blank rows).
 * - Legacy shape: the four known keys become labelled rows in their original
 *   order; any *other* key is kept as a row labelled with the raw key, so an
 *   imported or hand-edited blob can't silently lose data.
 * - Null / empty: no rows. Callers that need the wizard's starting state use
 *   `defaultSpecRows()` instead.
 *
 * `notes` is a separate field in both shapes and is carried across unchanged.
 */
export function normalizeSpecifications(
  raw: Record<string, unknown> | null | undefined,
): SpecForm {
  const spec = raw ?? {};
  const notes = asString(spec.notes);

  if (Array.isArray(spec.items)) {
    const rows = (spec.items as unknown[])
      .map((item) => {
        const o = (item ?? {}) as Record<string, unknown>;
        return makeSpecRow(asString(o.label), asString(o.value));
      })
      .filter((r) => r.label.trim() || r.value.trim());
    return { rows, notes };
  }

  const rows: SpecRow[] = [];
  for (const [key, label] of LEGACY_KEY_LABELS) {
    const value = asString(spec[key]);
    if (value.trim()) rows.push(makeSpecRow(label, value));
  }
  for (const [key, value] of Object.entries(spec)) {
    if (key === "notes" || key === "items") continue;
    if (LEGACY_KEY_LABELS.some(([k]) => k === key)) continue;
    const text = asString(value);
    if (text.trim()) rows.push(makeSpecRow(key, text));
  }
  return { rows, notes };
}

/**
 * Rows + notes -> the blob to persist.
 *
 * A row is kept only if it has a *value*: a label on its own says nothing, and
 * a project where Step 5 was left alone would otherwise persist the four
 * pre-filled default labels as empty noise. With no valued row and no notes
 * the whole blob collapses to `undefined`, exactly as the fixed-key version
 * omitted an all-empty `specifications`.
 */
export function serializeSpecifications(
  rows: SpecRow[],
  notes: string,
): { items: { label: string; value: string }[]; notes?: string } | undefined {
  const items = rows
    .map((r) => ({ label: r.label.trim(), value: r.value.trim() }))
    .filter((r) => r.value);
  const trimmedNotes = notes.trim();
  if (items.length === 0 && !trimmedNotes) return undefined;
  return trimmedNotes ? { items, notes: trimmedNotes } : { items };
}

/**
 * Read-only view for the project detail page: filled rows only, as
 * `[label, value]` pairs.
 */
export function specificationRows(
  raw: Record<string, unknown> | null | undefined,
): [string, string][] {
  return normalizeSpecifications(raw)
    .rows.filter((r) => r.value.trim())
    .map((r) => [r.label.trim() || "—", r.value.trim()] as [string, string]);
}
