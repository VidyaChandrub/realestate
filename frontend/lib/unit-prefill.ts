/**
 * Prefilling a unit's fields from its project's unit type.
 *
 * A project's `UnitType` rows are its planned mix — "a 2 BHK here is 1,000
 * sq ft at ₹64L". Picking a configuration copies those values into the unit
 * form, for whichever fields the org actually filled in on that row —
 * typically at least the `area`- and `price`-role fields, but any field in
 * the unit template can carry a default. This works for any project type
 * with a `configuration`-role field, not just apartments.
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

import type { FieldDef } from "./field-template";
import type { UnitType } from "./types";
import { pickUnitTypeForConfiguration } from "./unit-types";

export interface PrefillResult {
  /** Form values to apply, as strings, keyed by template field key. */
  values: Record<string, string>;
  /** Which keys were actually filled — drives the "from X" note. */
  filled: string[];
}

const toField = (v: string | number | boolean | null | undefined): string => {
  if (v === null || v === undefined || v === "") return "";
  return typeof v === "boolean" ? (v ? "yes" : "no") : String(v);
};

/**
 * Values to copy in when `configuration` is picked in a project context.
 *
 * `unitTypes` is the project's planned mix; `template` is the project's
 * current unit template (defaults for a key no longer in the template are
 * ignored — nothing left to render them into). Returns empty when there's no
 * project, no matching type, or the type carries no defaults — all of which
 * mean "leave the form alone", not "error".
 */
export function prefillFromUnitType(
  configuration: string,
  unitTypes: UnitType[] | null | undefined,
  template: FieldDef[],
): PrefillResult {
  const empty: PrefillResult = { values: {}, filled: [] };
  const label = configuration.trim();
  if (!label || !unitTypes?.length) return empty;

  // Shared resolver: a project can hold more than one row for a label, and
  // prefill must land on the same row the edit table shows — otherwise the
  // user fills in values that are never read back. See lib/unit-types.
  const match = pickUnitTypeForConfiguration(label, unitTypes);
  if (!match) return empty;

  const templateKeys = new Set(template.map((f) => f.key));
  const values: Record<string, string> = {};
  const filled: string[] = [];
  for (const [key, raw] of Object.entries(match.fieldDefaults ?? {})) {
    if (!templateKeys.has(key)) continue;
    const next = toField(raw);
    if (next === "") continue;
    values[key] = next;
    filled.push(key);
  }
  return { values, filled };
}
