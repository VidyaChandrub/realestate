"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { OrgUnitsListResponse, ProjectsListResponse } from "@/lib/types";

export type InventoryBindValue =
  | { kind: "none" }
  | { kind: "project"; id: string }
  | { kind: "unit"; id: string };

export function inventoryBindPayload(value: InventoryBindValue): { projectId?: string; unitId?: string } {
  if (value.kind === "project") return { projectId: value.id };
  if (value.kind === "unit") return { unitId: value.id };
  return {};
}

export function InventoryBindFields({
  accessToken,
  value,
  onChange,
  disabled,
  lockedProjectId,
  onAvailabilityChange,
}: {
  accessToken: string | null;
  value: InventoryBindValue;
  onChange: (next: InventoryBindValue) => void;
  disabled?: boolean;
  lockedProjectId?: string;
  onAvailabilityChange?: (hasInventory: boolean) => void;
}) {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const availabilityRef = useRef(onAvailabilityChange);
  availabilityRef.current = onAvailabilityChange;

  useEffect(() => {
    if (!accessToken || lockedProjectId) return;
    setLoading(true);
    const headers = { Authorization: `Bearer ${accessToken}` };
    Promise.all([
      apiFetch<ProjectsListResponse>("/org/projects?page=1&limit=100", { headers }),
      apiFetch<OrgUnitsListResponse>("/org/units?page=1&limit=100&standalone=true", { headers }),
    ])
      .then(([projRes, unitRes]) => {
        setProjects((projRes.data ?? []).map((p) => ({ id: p.id, name: p.name })));
        setUnits(
          (unitRes.data ?? []).map((u) => ({
            id: u.id,
            label: [u.configuration, u.variantLabel, u.unitNo].filter(Boolean).join(" · ") || u.unitNo,
          })),
        );
        availabilityRef.current?.((projRes.data ?? []).length + (unitRes.data ?? []).length > 0);
      })
      .catch(() => {
        setProjects([]);
        setUnits([]);
        availabilityRef.current?.(false);
      })
      .finally(() => setLoading(false));
  }, [accessToken, lockedProjectId]);

  if (lockedProjectId) {
    return (
      <p className="muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
        This page will use this project’s details (name, price, RERA, location, amenities).
      </p>
    );
  }

  const hasInventory = projects.length > 0 || units.length > 0;
  const selectValue =
    value.kind === "project" ? `project:${value.id}` : value.kind === "unit" ? `unit:${value.id}` : "";

  return (
    <div style={{ marginBottom: 14 }}>
      <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
        Project or standalone unit
      </label>
      <select
        className="inp"
        disabled={disabled || loading}
        value={selectValue}
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw) {
            onChange({ kind: "none" });
            return;
          }
          const [kind, ...rest] = raw.split(":");
          const id = rest.join(":");
          if (kind === "project") onChange({ kind: "project", id });
          else if (kind === "unit") onChange({ kind: "unit", id });
          else onChange({ kind: "none" });
        }}
      >
        <option value="">{loading ? "Loading inventory…" : "Select project or unit"}</option>
        {projects.length > 0 ? (
          <optgroup label="Projects">
            {projects.map((p) => (
              <option key={p.id} value={`project:${p.id}`}>
                {p.name}
              </option>
            ))}
          </optgroup>
        ) : null}
        {units.length > 0 ? (
          <optgroup label="Standalone units">
            {units.map((u) => (
              <option key={u.id} value={`unit:${u.id}`}>
                {u.label}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      <div className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>
        {hasInventory
          ? "Only the selected record is filled into this page ({{property_name}}, price, RERA, location, and related widgets)."
          : "No projects or standalone units yet — the page will keep placeholder copy until you add inventory."}
      </div>
    </div>
  );
}

export function needsInventorySelection(value: InventoryBindValue, hasInventory: boolean): string | null {
  if (!hasInventory) return null;
  if (value.kind !== "none") return null;
  return "Select a project or a standalone unit";
}
