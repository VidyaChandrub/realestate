"use client";

import Link from "next/link";
import { currencyPrefix } from "@/lib/money";
import { GalleryUpload, MediaUpload } from "@/components/org/media-upload";
import type { OrgCatalogCategory, OrgCatalogOption } from "@/lib/types";

// Shared field controls for the project create wizard, the project edit page,
// and both unit-creation entry points (the [id]/units modal and
// all-units/create), so they render identical inputs.

export const FACING_OPTIONS = [
  "East",
  "West",
  "North",
  "South",
  "North-East",
  "North-West",
  "South-East",
  "South-West",
  "Sea",
  "Garden",
] as const;

export const PARKING_OPTIONS = ["1 covered", "2 covered", "Open"] as const;

/**
 * Derived ₹/sqft for a unit — price ÷ **carpet** area (the RERA-standard
 * basis). Never stored. Returns "" (not "0", not an error) when either input
 * is missing, so the field degrades quietly.
 */
export function pricePerSqftCarpet(
  price: number | null | undefined,
  carpetSqft: number | null | undefined,
): string {
  if (!price || !carpetSqft) return "";
  return `₹${Math.round(price / carpetSqft).toLocaleString("en-IN")} / sqft (carpet)`;
}

const CATALOG_NOUNS: Record<OrgCatalogCategory, string> = {
  project_type: "project types",
  unit_type: "unit configurations",
  connectivity: "connectivity options",
  amenity: "amenities",
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
 * connectivity / amenity). No hardcoded fallback: while unloaded it shows a
 * spinner line, and an empty catalog shows an empty-state linking to Settings
 * rather than silently substituting a default list.
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
