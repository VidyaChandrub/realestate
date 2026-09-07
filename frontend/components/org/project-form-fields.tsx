"use client";

import Link from "next/link";
import { currencyPrefix } from "@/lib/money";
import { GalleryUpload, MediaUpload } from "@/components/org/media-upload";
import { makeSpecRow, type SpecRow } from "@/lib/specifications";
import type {
  OrgCatalogCategory,
  OrgCatalogOption,
  UnitPriceBasis,
} from "@/lib/types";

// Shared field controls for the project create wizard, the project edit page,
// and both unit-creation entry points (the [id]/units modal and
// all-units/create), so they render identical inputs.

/**
 * Short "when" for the units list's authorship cell — "12 Mar 2026". Shared so
 * the project units table and the all-units table read identically.
 */
export function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Human name for a price basis, as shown in the label. */
export const PRICE_BASIS_LABEL: Record<UnitPriceBasis, string> = {
  carpet: "carpet",
  builtup: "built-up",
};

/**
 * Derived ₹/sqft for a unit — price ÷ the area the *organisation* prices on
 * (Settings → Project Catalogs → Pricing basis). Never stored; the server
 * derives the same figure from the same setting.
 *
 * Returns "" (not "0", not an error) when the price or the relevant area is
 * missing, so the field degrades to blank rather than lying.
 *
 * The basis is always named in the output. A per-sqft price on the wrong
 * denominator is a real commercial error, so there is deliberately no way to
 * render this figure unlabelled.
 */
export function pricePerSqftLabel(
  price: number | null | undefined,
  carpetSqft: number | null | undefined,
  builtupSqft: number | null | undefined,
  basis: UnitPriceBasis,
  currency = "INR",
): string {
  const area = basis === "builtup" ? builtupSqft : carpetSqft;
  if (!price || !area) return "";
  const sym = currencyPrefix(currency).trim() || "₹";
  const value = Math.round(price / area).toLocaleString("en-IN");
  return `${sym}${value} / sqft (${PRICE_BASIS_LABEL[basis]})`;
}

const CATALOG_NOUNS: Record<OrgCatalogCategory, string> = {
  unit_variant: "unit variants",
  project_type: "project types",
  unit_type: "unit configurations",
  connectivity: "connectivity options",
  amenity: "amenities",
  price_includes: "price-inclusion options",
  payment_plan: "payment plans",
  facing: "facing options",
  parking: "parking options",
};

/**
 * A text money field with a static currency adornment kept OUT of the value
 * (so `parseAmount` always sees clean digits) instead of a "₹ …" placeholder.
 */
export function MoneyInput({
  value,
  onChange,
  placeholder,
  currency = "INR",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  currency?: string;
}) {
  const sym = currencyPrefix(currency).trim() || "₹";
  return (
    <div style={{ position: "relative" }}>
      <span
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--muted)",
          fontSize: 13,
          pointerEvents: "none",
        }}
      >
        {sym}
      </span>
      <input
        className="inp"
        style={{ paddingLeft: sym.length > 1 ? 46 : 24 }}
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/**
 * Renders one catalog-backed option list (project type / unit config /
 * connectivity / amenity / price inclusions / payment plan). No hardcoded
 * fallback: while unloaded it shows a spinner line, and an empty catalog shows
 * an empty-state linking to Settings rather than silently substituting a
 * default list.
 */
export function CatalogOptions({
  category,
  options,
  loaded,
  error,
  single = false,
  isSelected,
  onToggle,
}: {
  category: OrgCatalogCategory;
  options: OrgCatalogOption[];
  loaded: boolean;
  error: string | null;
  single?: boolean;
  isSelected: (label: string) => boolean;
  onToggle: (label: string) => void;
}) {
  if (error) {
    return <div className="hint" style={{ color: "var(--rose)" }}>{error}</div>;
  }
  if (!loaded) {
    return <div className="hint">Loading options…</div>;
  }
  if (options.length === 0) {
    return (
      <div
        style={{
          border: "1.5px dashed var(--line-2)",
          borderRadius: 12,
          padding: "14px 16px",
          background: "var(--surface-2)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "4px 10px",
          fontSize: 13,
          color: "var(--muted)",
        }}
      >
        <span>No {CATALOG_NOUNS[category]} configured yet.</span>
        <a className="brand-link" href="/org/settings?section=catalogs" target="_blank" rel="noreferrer">
          Add them in Settings →
        </a>
      </div>
    );
  }
  return (
    <div className="opts" data-single={single || undefined}>
      {options.map((o) => {
        const on = isSelected(o.label);
        return (
          <span
            key={o.id}
            className={`opt ${single ? "rad " : ""}${on ? "on" : ""}`}
            onClick={() => onToggle(o.label)}
          >
            <span className="b">{on ? (single ? "●" : "✓") : ""}</span>{o.label}
          </span>
        );
      })}
    </div>
  );
}

/**
 * The project's build-quality specifications — a dynamic list of
 * label/value rows plus a free "Additional notes" textarea, shared by the
 * create wizard and the project edit page so both read and write the same
 * shape.
 *
 * Rows are side-by-side (label input, then value input) and every row is
 * deletable, including the four the wizard pre-fills — the labels are the
 * user's to choose, not a fixed schema. "+ Add specification" appends an
 * empty row with both halves free text.
 */
export function SpecificationRows({
  rows,
  onChange,
  notes,
  onNotesChange,
}: {
  rows: SpecRow[];
  onChange: (rows: SpecRow[]) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}) {
  const update = (key: number, patch: Partial<SpecRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <>
      <div className="spec-rows">
        {rows.length === 0 ? (
          <div className="hint" style={{ marginBottom: 10 }}>
            No specifications yet — add the first row below.
          </div>
        ) : (
          rows.map((row) => (
            <div className="spec-row" key={row.key}>
              <input
                className="inp"
                aria-label="Specification name"
                placeholder="e.g. Flooring"
                value={row.label}
                maxLength={120}
                onChange={(e) => update(row.key, { label: e.target.value })}
              />
              <input
                className="inp"
                aria-label={`Value for ${row.label || "this specification"}`}
                placeholder="e.g. Vitrified tiles / marble in living"
                value={row.value}
                onChange={(e) => update(row.key, { value: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm spec-del"
                aria-label={`Remove ${row.label || "this specification"}`}
                title="Remove this row"
                onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-sm mt-8"
        onClick={() => onChange([...rows, makeSpecRow()])}
      >
        + Add specification
      </button>
      <div className="field mb-0 mt-14">
        <label>Additional notes</label>
        <textarea
          className="inp"
          rows={2}
          placeholder="Green-building certified, seismic zone-III compliant structure…"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>
    </>
  );
}

/**
 * Tower / block field. A combobox over the tower names already used by the
 * project's other units, plus free entry — but a *new* name is only allowed
 * while the project's distinct tower count is below `towerCount`. Once every
 * slot is used it becomes select-only. Mirrors the server-side rule in
 * ProjectsService.assertTowerWithinLimit (which is authoritative — this is
 * just fast feedback). `otherTowers` must exclude the unit being edited, so
 * renaming the sole holder of a name stays possible.
 */
export function TowerCombobox({
  value,
  onChange,
  otherTowers,
  towerCount,
  disabled,
  listId = "tower-options",
}: {
  value: string;
  onChange: (v: string) => void;
  otherTowers: string[];
  towerCount: number | null;
  disabled?: boolean;
  listId?: string;
}) {
  const trimmed = value.trim();
  const known = otherTowers.includes(trimmed);
  const selectOnly =
    towerCount != null && otherTowers.length >= towerCount && !known;

  const hint =
    towerCount == null
      ? "No tower limit set on this project."
      : selectOnly
        ? `All ${towerCount} tower${towerCount === 1 ? "" : "s"} are in use — reuse one, or raise the project's tower count.`
        : `${otherTowers.length} of ${towerCount} tower${towerCount === 1 ? "" : "s"} used.`;

  return (
    <>
      {selectOnly ? (
        <select
          className="inp"
          value={trimmed}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">No tower</option>
          {otherTowers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          {trimmed && !known ? (
            <option value={trimmed}>{trimmed} (current)</option>
          ) : null}
        </select>
      ) : (
        <>
          <input
            className="inp"
            list={listId}
            placeholder={otherTowers.length ? "e.g. Tower B" : "e.g. Tower A"}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
          <datalist id={listId}>
            {otherTowers.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </>
      )}
      <div className="hint">{hint}</div>
    </>
  );
}

/**
 * The unit's "Configuration" field — a strict dropdown of the org's
 * `unit_type` catalog labels (Settings → Project Catalogs). No free typing.
 * A value already on the unit that isn't in the current catalog stays
 * selectable so editing a legacy row never silently renames it.
 *
 * `catalog` is the already-sorted `unit_type` option list, `null` while it
 * loads. `error` is a load error, if any.
 */
export function ConfigurationSelect({
  catalog,
  error,
  value,
  onChange,
  disabled,
}: {
  catalog: OrgCatalogOption[] | null;
  error: string | null;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  if (error) {
    return <div className="hint text-rose">{error}</div>;
  }
  if (catalog === null) {
    return <div className="hint">Loading configurations…</div>;
  }
  const labels = catalog.map((o) => o.label);
  const options =
    value && !labels.includes(value) ? [...labels, value] : labels;

  if (options.length === 0) {
    if (disabled) {
      return (
        <select className="inp" value="" disabled>
          <option value="">Pick a project first</option>
        </select>
      );
    }
    return (
      <div className="hint">
        No configurations in your catalog.{" "}
        <Link className="brand-link" href="/org/settings?section=catalogs">
          Add them in Settings →
        </Link>
      </div>
    );
  }
  return (
    <select
      className="inp"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select a configuration…</option>
      {options.map((label) => (
        <option key={label} value={label}>
          {label}
        </option>
      ))}
    </select>
  );
}

/**
 * A catalog-backed single-value unit attribute — facing, parking, or the unit
 * variant. One implementation for all three and for both unit-creation entry
 * points, so they can't drift into different controls again (facing was a
 * `<select>` on one page and chips on the other).
 *
 * Always optional: "—" clears it. A value already saved on the unit stays
 * selectable even after it's dropped from the catalog, so editing a unit can
 * never silently rename it — matching ConfigurationSelect.
 */
export function UnitAttributeSelect({
  options,
  loaded,
  error,
  value,
  onChange,
  disabled,
  placeholder = "Not set",
  emptyHint,
}: {
  options: OrgCatalogOption[];
  loaded: boolean;
  error: string | null;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Shown instead of the control when the catalog has no options at all. */
  emptyHint?: string;
}) {
  if (error) return <div className="hint text-rose">{error}</div>;
  if (!loaded) return <div className="hint">Loading options…</div>;

  const labels = options.map((o) => o.label);
  // Keep a legacy / removed value pickable so an edit never drops it.
  const all = value && !labels.includes(value) ? [...labels, value] : labels;

  if (all.length === 0) {
    return (
      <div className="hint">
        {emptyHint ?? "Nothing configured yet."}{" "}
        <Link className="brand-link" href="/org/settings?section=catalogs">
          Add them in Settings →
        </Link>
      </div>
    );
  }
  return (
    <select
      className="inp"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {all.map((label) => (
        <option key={label} value={label}>
          {label}
        </option>
      ))}
    </select>
  );
}

/**
 * The "prefilled from the unit type" note under an area/price field.
 * Disappears the moment the user edits that field — see `useUnitTypePrefill`.
 */
export function PrefillNote({ configuration }: { configuration: string }) {
  return (
    <div className="hint" style={{ color: "var(--brand)" }}>
      Prefilled from the “{configuration}” unit type — edit freely.
    </div>
  );
}

/** Floor plan + photos block for a unit — identical on both create paths. */
export function UnitMediaFields({
  floorPlanUrl,
  galleryUrls,
  onFloorPlanChange,
  onGalleryChange,
  ctx,
}: {
  floorPlanUrl: string;
  galleryUrls: string[];
  onFloorPlanChange: (v: string) => void;
  onGalleryChange: (v: string[]) => void;
  ctx?: { projectId?: string; unitTypeId?: string };
}) {
  return (
    <div className="grid g2">
      <MediaUpload
        field="floorPlan"
        label="Floor plan"
        value={floorPlanUrl || null}
        onChange={(u) => onFloorPlanChange(u ?? "")}
        ctx={ctx}
      />
      <div className="field">
        <label>Photos</label>
        <GalleryUpload
          value={galleryUrls}
          onChange={onGalleryChange}
          ctx={ctx}
        />
      </div>
    </div>
  );
}
