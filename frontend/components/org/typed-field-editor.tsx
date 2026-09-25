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
      rowClassName={roles ? "field-def-row" : "field-def-row field-def-row-notype"}
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
          {/* A project field created inside an actual project (ProjectFieldRows)
              is always plain text with no way to pick a different type — hiding
              the type control here too keeps Settings from offering something
              that isn't actually available once you're working on a project. */}
          {roles ? (
            <>
              <select
                className="inp"
                aria-label={`Type of ${row.label || "this field"}`}
                value={row.type}
                onChange={(e) => {
                  const type = e.target.value as FieldType;
                  // A role can't survive a type change it's no longer valid for
                  // (e.g. Price moving off Number) — there's no per-row control
                  // left to fix that manually, so drop it rather than leave the
                  // template invalid. Same reasoning for extraDefault, which only
                  // means anything on a Number field.
                  const role = row.role && !ROLE_ALLOWED_TYPES[row.role].includes(type) ? "" : row.role;
                  const extraDefault = type === "number" ? row.extraDefault : false;
                  update({ type, role, extraDefault });
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
          ) : null}
          {/* Spans the full row, on its own line — tells you upfront what a
              field's type makes it eligible for, so seeing it show up (or not)
              in the panel above is never a surprise. */}
          {roles ? (
            <span className="hint" style={{ gridColumn: "1 / -1", fontSize: 11 }}>
              {row.role
                ? `Currently used for: ${FIELD_ROLE_LABEL[row.role]}`
                : row.type === "number"
                ? "Can be used for: Price, Area, Floor, or an extra default — set up in the panel above."
                : row.type === "text" || row.type === "choice"
                ? "Can be used for: Tower / Block / Sector or Configuration — set up in the panel above."
                : "Not used for any special feature."}
            </span>
          ) : null}
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
        className="btn btn-soft btn-sm"
        style={{ fontWeight: 700, border: "1.5px solid var(--brand, #4f46e5)" }}
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
            Tell the system which fields represent Price, Area, Towers, and Floors. We&apos;ll use them to organize
            your inventory grid and auto-fill pricing.
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
          {(() => {
            // Every non-role field is listed, not just Number ones — a
            // Text/Choice/Yes-No field shows up too, greyed out with the
            // reason spelled out, so it's never a mystery why it's not
            // available here instead of just silently missing from the list.
            const extraCandidates = rows.filter((r) => r.label.trim() && !r.role);
            if (extraCandidates.length === 0) return null;
            return (
              <div style={{ paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                <div className="hint" style={{ marginBottom: 6 }}>
                  Extra default columns (optional) — Check any extra number fields you want to set defaults for
                  (e.g., Built-up Area). These will auto-fill when adding a unit.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {extraCandidates.map((r) => {
                    const eligible = r.type === "number";
                    return (
                      <div key={r.rowId}>
                        <label
                          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, opacity: eligible ? 1 : 0.5 }}
                        >
                          <input
                            type="checkbox"
                            checked={eligible && r.extraDefault}
                            disabled={!eligible}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              onChange(rows.map((row) => (row.rowId === r.rowId ? { ...row, extraDefault: checked } : row)));
                            }}
                          />
                          {r.label}
                        </label>
                        {!eligible ? (
                          <div className="hint" style={{ fontSize: 11, marginLeft: 24 }}>
                            Only number fields can be used as defaults.
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
