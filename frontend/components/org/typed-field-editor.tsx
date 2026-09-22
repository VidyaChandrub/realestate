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
 * A role is fixed once a row represents a saved field (`key` is set) — only
 * its label stays editable from then on, so a role can't be silently moved
 * or removed except by deleting the whole field.
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
            <label className="field-def-req">
              <input
                type="checkbox"
                checked={row.multiline}
                onChange={(e) => update({ multiline: e.target.checked })}
              />
              Long text
            </label>
          ) : (
            <span className="hint field-def-none">—</span>
          )}
          {roles ? (
            <select
              className="inp"
              aria-label={`Role for ${row.label || "this field"}`}
              value={row.role}
              disabled={!!row.key}
              title={row.key ? "A field's role is fixed once saved — delete and re-add it to change this" : undefined}
              onChange={(e) => update({ role: e.target.value as FieldRole | "" })}
            >
              <option value="">No role</option>
              {FIELD_ROLES.map((r) => (
                <option
                  key={r}
                  value={r}
                  disabled={takenRoles.has(r) && row.role !== r}
                >
                  {FIELD_ROLE_LABEL[r]}
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
