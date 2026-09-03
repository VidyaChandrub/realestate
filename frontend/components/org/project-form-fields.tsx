"use client";

import { currencyPrefix } from "@/lib/money";
import type { OrgCatalogCategory, OrgCatalogOption } from "@/lib/types";

// Shared field controls for the project create wizard and the project edit
// page, so both render pricing / catalog inputs identically.

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
