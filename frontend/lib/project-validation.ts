/**
 * Required-field rules for a project, shared by the create wizard and the
 * project edit page.
 *
 * This is the single source of truth for "which fields must a project have,
 * and which step owns each one". Both pages import it rather than keeping
 * their own copy, so the two can't drift apart the way they had.
 *
 * The rules mirror the red asterisks in the UI. "Developer / channel partner"
 * carries an asterisk but is deliberately absent: it's a read-only mirror of
 * the organisation name, fetched async and not fixable from either page, so
 * blocking on it would only ever fire on a slow request.
 */

export interface RequiredField {
  /** Matches the field's inline error anchor, so summary and field agree. */
  id: string;
  /** Human label, as shown next to the input. */
  label: string;
  /** The inline message shown under the field when it's empty. */
  error: string;
  filled: boolean;
}

/** A required field plus the step that owns it. */
export interface MissingField extends RequiredField {
  step: number;
}

/** The raw values the rules read. Both pages hold these as form state. */
export interface ProjectRequiredValues {
  name: string;
  projectType: string;
  reraId: string;
  priceMin: string;
  address: string;
  city: string;
  managerId: string;
}

/**
 * The wizard's steps, in order. The rail and the step headers both read this.
 *
 * "Team & access" (index 6) is `hidden: true` — Team, Project Manager and
 * Sales Agent assignment moved to the Teams module (see OrgTeamsService).
 * The step is skipped, not removed: its index stays 6 so `step === 6` checks
 * elsewhere don't need renumbering, and un-hiding it later is a one-line
 * revert. See add-new-project/page.tsx's goNext/goBack/rail, which skip any
 * step marked hidden.
 */
export const PROJECT_STEPS = [
  { label: "Project basics", sub: "Name, type, RERA", hidden: false },
  { label: "Inventory & config", sub: "Unit types & sizes", hidden: false },
  { label: "Pricing & payment", sub: "Price, plans, offers", hidden: false },
  { label: "Location", sub: "Address & connectivity", hidden: false },
  { label: "Amenities & specs", sub: "Features & finishes", hidden: false },
  { label: "Marketing & leads", sub: "Sources, budget, AI", hidden: false },
  { label: "Team & access", sub: "Manager, agents", hidden: true },
  { label: "Documents & media", sub: "Brochure, photos", hidden: false },
  { label: "Review & launch", sub: "Confirm & publish", hidden: false },
] as const;

/**
 * Every required field, grouped by the 0-indexed step that owns it. Steps with
 * no required fields simply have no entry.
 */
export function projectRequirements(
  v: ProjectRequiredValues,
): Record<number, RequiredField[]> {
  return {
    0: [
      { id: "name", label: "Project name", error: "Project name is required.", filled: !!v.name.trim() },
      { id: "projectType", label: "Project type", error: "Pick a project type.", filled: !!v.projectType },
      { id: "reraId", label: "RERA registration no.", error: "RERA registration number is required.", filled: !!v.reraId.trim() },
    ],
    2: [
      { id: "priceMin", label: "Price range — from", error: "Enter the starting price.", filled: !!v.priceMin.trim() },
    ],
    3: [
      { id: "address", label: "Full address", error: "Full address is required.", filled: !!v.address.trim() },
      { id: "city", label: "City", error: "City is required.", filled: !!v.city.trim() },
    ],
    // Step 6 (Team & access) is hidden — see PROJECT_STEPS — so it owns no
    // required fields for now. Project manager moved to the Teams module.
  };
}

/** Whether a step index is currently hidden from the wizard (see PROJECT_STEPS). */
export function isHiddenStep(index: number): boolean {
  return PROJECT_STEPS[index]?.hidden ?? false;
}

/** The unfilled required fields on one step. */
export function missingOn(
  requirements: Record<number, RequiredField[]>,
  step: number,
): RequiredField[] {
  return (requirements[step] ?? []).filter((f) => !f.filled);
}

/** Every unfilled required field across the whole form, in step order. */
export function allMissing(
  requirements: Record<number, RequiredField[]>,
): MissingField[] {
  return Object.keys(requirements)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((step) => missingOn(requirements, step).map((f) => ({ ...f, step })));
}

/**
 * How one step should read in the step rail.
 *
 * - `current`  — the step being shown.
 * - `complete` — moved past, and it passes its own required-field check.
 * - `incomplete` — moved past while still missing something. This is the case
 *   a plain "everything behind me is done" rule got wrong: bypassing a step
 *   via "Go to X anyway" used to leave a green tick on a step that was never
 *   filled in. It earns an alert icon instead.
 * - `upcoming` — not reached yet; shows its plain number.
 *
 * Derived from live values, so completing a bypassed step later flips it from
 * `incomplete` to `complete` on its own.
 */
export type StepStatus = "current" | "complete" | "incomplete" | "upcoming";

export function stepStatus(
  index: number,
  currentStep: number,
  requirements: Record<number, RequiredField[]>,
): StepStatus {
  if (index === currentStep) return "current";
  if (index > currentStep) return "upcoming";
  return missingOn(requirements, index).length === 0 ? "complete" : "incomplete";
}

/** The rail button's class and glyph for a step status. */
export function stepIndicator(
  status: StepStatus,
  index: number,
): { className: string; glyph: string } {
  switch (status) {
    case "current":
      return { className: "on", glyph: String(index + 1) };
    case "complete":
      return { className: "done", glyph: "✓" };
    case "incomplete":
      return { className: "warn", glyph: "!" };
    default:
      return { className: "", glyph: String(index + 1) };
  }
}
