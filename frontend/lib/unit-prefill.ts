/**
 * Prefilling a unit's areas and price from its project's unit type.
 *
 * A project's `UnitType` rows are its planned mix — "a 2 BHK here is 1,000 sqft
 * carpet at ₹64L". The unit form used to ask for all of that again, which is
 * what made "add a unit type, then add a unit" feel like doing the same work
 * twice. Picking a configuration now copies those values in.
 *
 * Three rules this deliberately keeps:
 *
 * - **Match on name, not a foreign key.** The `Unit → UnitType` relation was
 *   removed in the restructure and is not coming back; the link here is the
 *   configuration label within one project, resolved at pick time.
 * - **A snapshot, never a binding.** The values are copied into the form and
 *   are the user's from then on — a corner 2 BHK can be priced differently.
 *   Editing the unit type later changes nothing about units already created.
 * - **Prefill, don't lock.** Every prefilled field stays editable, and the
 *   "from the unit type" note on a field clears as soon as that field is
 *   touched, so the hint never outlives its truth.
 *
 * Standalone units have no project and therefore no unit types: no prefill,
 * blank fields, no error. A configuration with no matching unit type behaves
 * the same way.
 */

import type { UnitType } from "./types";

/** The three fields a unit type can prefill. */
export type PrefillField = "carpetSqft" | "builtupSqft" | "price";

export const PREFILL_FIELDS: PrefillField[] = [
  "carpetSqft",
  "builtupSqft",
  "price",
];

export interface PrefillResult {
  /** Form values to apply, as strings. Only includes fields the type has. */
  values: Partial<Record<PrefillField, string>>;
  /** Which fields were actually filled — drives the "from X" note. */
  filled: PrefillField[];
}

const toField = (v: number | null | undefined): string =>
  v == null ? "" : String(v);

/**
 * Values to copy in when `configuration` is picked in a project context.
 *
 * `unitTypes` is the project's planned mix. Returns empty when there's no
 * project, no matching type, or the type carries none of the three values —
 * all of which mean "leave the form alone", not "error".
 */
export function prefillFromUnitType(
  configuration: string,
  unitTypes: UnitType[] | null | undefined,
): PrefillResult {
  const empty: PrefillResult = { values: {}, filled: [] };
  const label = configuration.trim();
  if (!label || !unitTypes?.length) return empty;

  // Case-insensitive so "2 bhk" picked from a legacy row still resolves.
  const match = unitTypes.find(
    (t) => t.name.trim().toLowerCase() === label.toLowerCase(),
  );
  if (!match) return empty;

  const values: Partial<Record<PrefillField, string>> = {};
  const filled: PrefillField[] = [];
  for (const field of PREFILL_FIELDS) {
    const next = toField(match[field]);
    if (next === "") continue;
    values[field] = next;
    filled.push(field);
  }
  return { values, filled };
}
