"use client";

import { RowListEditor } from "./row-list-editor";
import {
  FIELD_ROLE_LABEL,
  FIELD_ROLES,
  FIELD_TYPE_LABEL,
  makeFieldRow,
  ROLE_ALLOWED_TYPES,
  uniqueFieldKey,
  type FieldRole,
  type FieldRow,
  type FieldType,
} from "@/lib/field-template";

/**
 * Editor for a typed field template: label, section, type, role, and the
 * type-specific extra (choices for Choice, display unit for Number). Order in
 * the list is the display order. Built on RowListEditor, the same shell the
 * project specifications use.
 *
 * A role is fixed once a row represents an already-saved field — only its
 * label stays editable from then on, so a role can't be silently moved or
 * removed except by deleting the whole field. A brand-new, not-yet-saved row
 * can always have its role set (see `existing` on FieldRow — `key` alone
 * isn't the right signal, since it gets assigned as soon as you type a name).
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
  /** Show the role picker and section input. Off for templates with no roles (e.g. project-level fields). */
  roles?: boolean;
}) {
  const takenRoles = new Set(rows.map((r) => r.role).filter(Boolean));

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
            onChange={(e) => update({ type: e.target.value as FieldType })}
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
          {roles ? (
            <select
              className="inp"
              aria-label={`Used for — ${row.label || "this field"}`}
              value={row.role}
              disabled={row.existing}
              title={row.existing ? "Fixed once saved — delete and re-add the field to change this" : "Optional — only set this if the field should power a feature below"}
              onChange={(e) => update({ role: e.target.value as FieldRole | "" })}
            >
              <option value="">Just a field</option>
              {/* A role already claimed by another field, or one this field's
                  type can't carry, is left out entirely rather than shown
                  disabled — a picker full of options nothing can select is
                  more confusing than a short one. */}
              {FIELD_ROLES.filter(
                (r) => (row.role === r || !takenRoles.has(r)) && ROLE_ALLOWED_TYPES[r].includes(row.type),
              ).map((r) => (
                <option key={r} value={r}>
                  Used for: {FIELD_ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          ) : null}
        </>
      )}
    />
  );
}

export { ROLE_ALLOWED_TYPES };
