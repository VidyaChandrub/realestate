"use client";

import { useState } from "react";
import { RowListEditor } from "./row-list-editor";
import { Icon } from "@/components/icons";
import {
  FIELD_ROLE_LABEL,
  FIELD_ROLES,
  FIELD_TYPE_LABEL,
  makeFieldRow,
  missingRoles,
  ROLE_ALLOWED_TYPES,
  ROLE_DELETE_CONSEQUENCE,
  uniqueFieldKey,
  type FieldRole,
  type FieldRow,
  type FieldType,
} from "@/lib/field-template";

/**
 * Editor for a typed field template: label, section, type, and the
 * type-specific extra (choices for Choice, display unit for Number). Order in
 * the list is the display order. Built on RowListEditor, the same shell the
 * project specifications use.
 *
 * Roles (price / area / group / floor / configuration) are never edited from
 * a row here — there is no per-row control for them. A role is set (or
 * changed) only through `FieldRolesPanel` below, and otherwise just rides
 * along unchanged on whatever field already carries it, through renames,
 * reorders and type changes. The one exception: if a field's type changes to
 * one the role can't legally carry, the role is silently dropped rather than
 * left in an invalid state with no UI left to fix it.
 */
export function TypedFieldEditor({
  rows,
  onChange,
  addLabel = "+ Add field",
  emptyText = "No fields yet — add the first one below.",
  roles = true,
}: {
  rows: FieldRow[];
  onChange: (rows: FieldRow[]) => void;
  addLabel?: string;
  emptyText?: string;
  /** Show the section input and role-aware delete warning. Off for templates with no roles (e.g. project-level fields). */
  roles?: boolean;
}) {
  return (
    <RowListEditor<FieldRow>
      rows={rows}
      getKey={(r) => r.rowId}
      onChange={onChange}
      makeRow={() => makeFieldRow()}
      addLabel={addLabel}
      emptyText={emptyText}
      removeLabel={(r) => `Remove ${r.label || "this field"}`}
      rowClassName="field-def-row"
      confirmRemove={
        roles
          ? (row) =>
              row.role
                ? {
                    title: `Delete "${row.label || "this field"}"?`,
                    message: ROLE_DELETE_CONSEQUENCE[row.role],
                  }
                : null
          : undefined
      }
      renderCells={(row, update) => (
        <>
          <input
            className="inp"
            aria-label="Field name"
            placeholder="e.g. Dimensions"
            value={row.label}
            maxLength={80}
            onChange={(e) => update({ label: e.target.value })}
            // A new field's key is fixed once it has a name, so renaming it
            // afterwards (or values typed against it) can't orphan anything.
            onBlur={() => {
              if (!row.key && row.label.trim()) update({ key: uniqueFieldKey(row.label, rows) });
            }}
          />
          {roles ? (
            <input
              className="inp"
              aria-label={`Section for ${row.label || "this field"}`}
              placeholder="Section (optional), e.g. Area & Layout"
              value={row.section}
              maxLength={60}
              onChange={(e) => update({ section: e.target.value })}
            />
          ) : null}
          <select
            className="inp"
            aria-label={`Type of ${row.label || "this field"}`}
            value={row.type}
            onChange={(e) => {
              const type = e.target.value as FieldType;
              // A role can't survive a type change it's no longer valid for
              // (e.g. Price moving off Number) — there's no per-row control
              // left to fix that manually, so drop it rather than leave the
              // template invalid.
              const role = row.role && !ROLE_ALLOWED_TYPES[row.role].includes(type) ? "" : row.role;
              update({ type, role });
            }}
          >
            {(Object.keys(FIELD_TYPE_LABEL) as FieldType[]).map((t) => (
              <option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>
            ))}
          </select>
          {row.type === "choice" ? (
            <input
              className="inp"
              aria-label={`Choices for ${row.label || "this field"}`}
              placeholder="Choices, separated by commas"
              value={row.optionsText}
              onChange={(e) => update({ optionsText: e.target.value })}
            />
          ) : row.type === "number" ? (
            <input
              className="inp"
              aria-label={`Unit for ${row.label || "this field"}`}
              placeholder="Unit (optional), e.g. acres"
              value={row.unit}
              maxLength={20}
              onChange={(e) => update({ unit: e.target.value })}
            />
          ) : row.type === "text" ? (
            <span className="hint field-def-none">Text field</span>
          ) : (
            <span className="hint field-def-none">—</span>
          )}
        </>
      )}
    />
  );
}

/**
 * Which field powers Price, Area, Tower/Block/Sector, Floor and
 * Configuration — collapsed behind one link so the normal field list stays
 * clean, but always reachable (not just when something's missing) so
 * changing an already-working assignment is a direct swap, not "delete the
 * field and hope the recovery strip catches it". `baseline` (see
 * `roleBaselineOf`) is only used for the attention badge: it's what tells a
 * type that never had a Floor field (a Plot, say) not to nag about it,
 * while a type that lost one it used to have keeps getting flagged.
 *
 * Picking a field for a role clears that role off whichever field held it
 * before (if any) and sets it on the newly picked one — a straight move,
 * never a delete. Nothing here is ever forced: leaving a role unset is
 * always fine, and the panel starts closed either way.
 */
export function FieldRolesPanel({
  rows,
  baseline,
  onChange,
}: {
  rows: FieldRow[];
  baseline: Set<FieldRole>;
  onChange: (rows: FieldRow[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const attention = missingRoles(rows, baseline).length;

  return (
    <div className="field-roles-panel mb-8">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={open ? "chevron-down" : "chevron-right"} size={13} />
        Set up Price, Area &amp; more
        {attention > 0 ? (
          <span className="badge b-amber" style={{ marginLeft: 6 }}>
            {attention} need{attention > 1 ? "s" : ""} attention
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="help mt-8" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="hint">
            These fields power features elsewhere — the availability grid, floor view, pricing and configuration
            defaults. Pick which field does what; leave any of them unset if this project doesn&apos;t need it.
          </div>
          {FIELD_ROLES.map((role) => {
            const current = rows.find((r) => r.role === role) ?? null;
            const candidates = rows.filter(
              (r) => r.label.trim() && (r.role === role || !r.role) && ROLE_ALLOWED_TYPES[role].includes(r.type),
            );
            return (
              <div key={role} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ minWidth: 170, fontWeight: 600, fontSize: 13 }}>{FIELD_ROLE_LABEL[role]}</span>
                <select
                  className="inp"
                  style={{ maxWidth: 240 }}
                  aria-label={`Field used for ${FIELD_ROLE_LABEL[role]}`}
                  value={current?.rowId ?? ""}
                  disabled={candidates.length === 0}
                  onChange={(e) => {
                    const rowId = e.target.value ? Number(e.target.value) : null;
                    onChange(
                      rows.map((r) => {
                        if (r.role === role && r.rowId !== rowId) return { ...r, role: "" };
                        if (rowId !== null && r.rowId === rowId) return { ...r, role };
                        return r;
                      }),
                    );
                  }}
                >
                  <option value="">{candidates.length === 0 ? "No matching field yet" : "Not set"}</option>
                  {candidates.map((r) => (
                    <option key={r.rowId} value={r.rowId}>{r.label}</option>
                  ))}
                </select>
                {candidates.length === 0 ? (
                  <span className="hint" style={{ fontSize: 11 }}>
                    Add a {ROLE_ALLOWED_TYPES[role].join(" or ")} field below and name it to use it here
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
