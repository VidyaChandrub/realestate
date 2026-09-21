"use client";

import { RowListEditor } from "./row-list-editor";
import {
  FIELD_TYPE_LABEL,
  makeFieldRow,
  uniqueFieldKey,
  type FieldRow,
  type FieldType,
} from "@/lib/field-template";

/**
 * Editor for a typed field template: label, type, required, and the
 * type-specific extra (choices for Choice, display unit for Number). Order in
 * the list is the display order. Built on RowListEditor, the same shell the
 * project specifications use.
 */
export function TypedFieldEditor({
  rows,
  onChange,
  addLabel = "+ Add field",
  emptyText = "No fields yet — add the first one below.",
}: {
  rows: FieldRow[];
  onChange: (rows: FieldRow[]) => void;
  addLabel?: string;
  emptyText?: string;
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
          ) : (
            <span className="hint field-def-none">—</span>
          )}
          <label className="field-def-req">
            <input
              type="checkbox"
              checked={row.required}
              onChange={(e) => update({ required: e.target.checked })}
            />
            Required
          </label>
        </>
      )}
    />
  );
}
