"use client";

import type { ReactNode } from "react";

/**
 * The shared shell behind every "list of editable rows" form — the project
 * specifications and the typed field templates. It owns the row grid, the
 * delete control on every row and the "+ Add" button; the caller supplies the
 * cells of a row. Extracted from SpecificationRows so both editors look and
 * behave identically.
 */
export function RowListEditor<T>({
  rows,
  getKey,
  onChange,
  renderCells,
  makeRow,
  addLabel,
  emptyText,
  removeLabel,
  rowClassName,
}: {
  rows: T[];
  getKey: (row: T) => string | number;
  onChange: (rows: T[]) => void;
  /** The inputs of one row; `update` patches just that row. */
  renderCells: (row: T, update: (patch: Partial<T>) => void) => ReactNode;
  makeRow: () => T;
  addLabel: string;
  emptyText: string;
  removeLabel: (row: T) => string;
  /** Extra class on each row, to change the column layout. */
  rowClassName?: string;
}) {
  return (
    <>
      <div className="spec-rows">
        {rows.length === 0 ? (
          <div className="hint" style={{ marginBottom: 10 }}>{emptyText}</div>
        ) : (
          rows.map((row) => (
            <div className={`spec-row${rowClassName ? ` ${rowClassName}` : ""}`} key={getKey(row)}>
              {renderCells(row, (patch) =>
                onChange(rows.map((r) => (getKey(r) === getKey(row) ? { ...r, ...patch } : r))),
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm spec-del"
                aria-label={removeLabel(row)}
                title="Remove this row"
                onClick={() => onChange(rows.filter((r) => getKey(r) !== getKey(row)))}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-sm mt-8"
        onClick={() => onChange([...rows, makeRow()])}
      >
        {addLabel}
      </button>
    </>
  );
}
