/**
 * Resolving a project's `UnitType` rows by configuration label.
 *
 * `unit_types` has no unique constraint on (projectId, name), so one project
 * can hold several rows for the same configuration — typically an empty
 * placeholder seeded by the create wizard plus a populated one added later
 * from the Units page. Anything that looks a row up "by name" therefore has to
 * choose, and every such place must choose *identically*: if the edit table
 * shows one row while prefill reads another, the user fills in values that
 * never get used.
 *
 * `pickUnitTypeForConfiguration` is that single choice. Both the
 * size-and-price table and `prefillFromUnitType` go through it.
 */

import type { UnitType } from "./types";

/** Does this row carry any media at all? */
function hasMedia(t: UnitType): boolean {
  return Boolean(
    t.floorPlanUrl || t.brochureUrl || t.videoUrl || t.galleryUrls.length,
  );
}

/**
 * How much real content a row carries, 0-5. One point each for a carpet area,
 * a built-up area, a price, a non-zero planned count, and any media.
 *
 * Deliberately flat: the point is to prefer a row someone actually filled in
 * over an empty placeholder, not to rank two populated rows by importance.
 */
export function unitTypeScore(t: UnitType): number {
  return (
    (t.carpetSqft != null ? 1 : 0) +
    (t.builtupSqft != null ? 1 : 0) +
    (t.price != null ? 1 : 0) +
    (t.totalUnits > 0 ? 1 : 0) +
    (hasMedia(t) ? 1 : 0)
  );
}

/**
 * The one row that represents `configuration` for this project.
 *
 * Ordering rule, applied in sequence:
 *   1. Highest `unitTypeScore` — a filled-in row beats an empty placeholder.
 *   2. Most recently updated — between two equally populated rows, the one
 *      someone touched last is the one they mean.
 *   3. Lowest `id` — an arbitrary but *stable* final tiebreak, so the answer
 *      can't change between renders, reloads, or callers.
 *
 * Returns null when the project has no row for that label.
 */
export function pickUnitTypeForConfiguration(
  configuration: string,
  unitTypes: UnitType[] | null | undefined,
): UnitType | null {
  const label = configuration.trim().toLowerCase();
  if (!label || !unitTypes?.length) return null;

  const matches = unitTypes.filter(
    (t) => t.name.trim().toLowerCase() === label,
  );
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  return [...matches].sort((a, b) => {
    const byScore = unitTypeScore(b) - unitTypeScore(a);
    if (byScore !== 0) return byScore;
    const byUpdated =
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (byUpdated !== 0) return byUpdated;
    return a.id.localeCompare(b.id);
  })[0];
}

/** One configuration label that has more than one row on this project. */
export interface DuplicateConfiguration {
  label: string;
  /** Every row for this label, most-representative first. */
  rows: UnitType[];
  /** The row `pickUnitTypeForConfiguration` resolves to. */
  used: UnitType;
  /** The rest — safe to remove only if they carry nothing (see `isEmptyRow`). */
  others: UnitType[];
}

/**
 * What removing a configuration from the planned mix should do.
 *
 * Only *actual units* can block removal. Whether someone typed a carpet area
 * or a price into the row says nothing about whether the configuration is in
 * use — treating that as a blocker forced an absurd workaround (edit the row
 * to zero, save, then delete) to drop a configuration that was never used.
 * Those values are worth confirming before they're discarded, not refusing
 * over.
 */
export type PlannedMixRemoval =
  /** Units carry this configuration — refuse, and say how many. */
  | { kind: "blocked"; reason: string }
  /** No units, but the row holds values that would be lost — ask first. */
  | { kind: "confirm"; message: string }
  /** No units, nothing recorded — just remove it. */
  | { kind: "allowed" };

/** The values a row holds, named for the confirmation copy. */
function recordedValues(rows: UnitType[]): string[] {
  const names: string[] = [];
  if (rows.some((r) => r.carpetSqft != null)) names.push("carpet area");
  if (rows.some((r) => r.builtupSqft != null)) names.push("built-up area");
  if (rows.some((r) => r.price != null)) names.push("price");
  if (rows.some((r) => r.totalUnits > 0)) names.push("planned unit count");
  return names;
}

/** "a, b and c" */
function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}

/**
 * Decide what removing a configuration from the planned mix means. Shared by
 * the Units page's remove action and the project edit form's configuration
 * untick — the same row reached two ways, so one rule and one wording.
 *
 * Removing the row can never delete units (there is no FK from Unit to
 * UnitType); it drops the planned mix and whatever sizes and pricing it
 * carried, and leaves any units showing as "derived from units — not in the
 * planned mix" with nothing left to prefill from. That is why units block it
 * and recorded values only warrant a confirmation.
 */
export function plannedMixRemoval(
  label: string,
  unitCount: number,
  rows: UnitType[],
): PlannedMixRemoval {
  if (unitCount > 0) {
    const n = unitCount;
    return {
      kind: "blocked",
      reason:
        `"${label}" can't be removed from the planned mix — ${n} unit${n === 1 ? "" : "s"} on this project ${n === 1 ? "uses" : "use"} it. ` +
        `Delete ${n === 1 ? "that unit" : "those units"} first, or leave the configuration in place.`,
    };
  }
  const values = recordedValues(rows);
  if (values.length > 0) {
    return {
      kind: "confirm",
      message: `This will remove the "${label}" planned mix, including its ${joinList(values)}. Continue?`,
    };
  }
  return { kind: "allowed" };
}

/** A row carrying nothing at all: no sizes, price, planned count or media. */
export function isEmptyRow(t: UnitType): boolean {
  return unitTypeScore(t) === 0;
}

/**
 * Configuration labels this project has more than one row for, so the UI can
 * say which row it's using instead of quietly picking one.
 */
export function findDuplicateConfigurations(
  unitTypes: UnitType[] | null | undefined,
): DuplicateConfiguration[] {
  if (!unitTypes?.length) return [];

  const byLabel = new Map<string, UnitType[]>();
  for (const t of unitTypes) {
    const key = t.name.trim().toLowerCase();
    byLabel.set(key, [...(byLabel.get(key) ?? []), t]);
  }

  const out: DuplicateConfiguration[] = [];
  for (const rows of byLabel.values()) {
    if (rows.length < 2) continue;
    const used = pickUnitTypeForConfiguration(rows[0].name, rows);
    if (!used) continue;
    out.push({
      label: rows[0].name,
      rows,
      used,
      others: rows.filter((r) => r.id !== used.id),
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}
