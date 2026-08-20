import type { ColumnNode, ElementNode, RowNode } from "./lp-types";
import { cloneElement, makeElement } from "./lp-widgets";

export type Selection =
  | { kind: "page" }
  | { kind: "header" }
  | { kind: "footer" }
  | { kind: "row"; rowId: string }
  | { kind: "column"; rowId: string; columnId: string }
  | { kind: "element"; rowId: string; columnId: string; elementId: string };

// ---------------------------------------------------------------------------
// Immutable tree helpers
// ---------------------------------------------------------------------------

export function updateRow(
  rows: RowNode[],
  rowId: string,
  fn: (row: RowNode) => RowNode,
): RowNode[] {
  return rows.map((row) => (row.id === rowId ? fn(row) : row));
}

export function updateColumn(
  columns: ColumnNode[],
  columnId: string,
  fn: (col: ColumnNode) => ColumnNode,
): ColumnNode[] {
  return columns.map((col) => (col.id === columnId ? fn(col) : col));
}

export function updateElementIn(
  elements: ElementNode[],
  elementId: string,
  fn: (el: ElementNode) => ElementNode,
): ElementNode[] {
  return elements.map((el) => {
    if (el.id === elementId) return fn(el);
    if (el.elements) {
      return { ...el, elements: updateElementIn(el.elements, elementId, fn) };
    }
    return el;
  });
}

// ---------------------------------------------------------------------------
// Creation helpers
// ---------------------------------------------------------------------------

export function createColumn(): ColumnNode {
  return {
    id: crypto.randomUUID(),
    settings: {},
    elements: [],
  };
}

export function createRow(columns: ColumnNode[] = [createColumn()]): RowNode {
  return {
    id: crypto.randomUUID(),
    settings: {
      layout: "full_width",
      padding: { top: 60, right: 20, bottom: 60, left: 20 },
    },
    columns,
  };
}

export function newElementFromWidget(widgetType: string): ElementNode {
  return makeElement(widgetType) as ElementNode;
}

// ---------------------------------------------------------------------------
// Add / remove / duplicate / move
// ---------------------------------------------------------------------------

export function addRow(rows: RowNode[], row: RowNode): RowNode[] {
  return [...rows, row];
}

export function insertRow(rows: RowNode[], index: number, row: RowNode): RowNode[] {
  const next = [...rows];
  next.splice(index, 0, row);
  return next;
}

export function removeRow(rows: RowNode[], rowId: string): RowNode[] {
  return rows.filter((row) => row.id !== rowId);
}

export function duplicateRow(rows: RowNode[], rowId: string): RowNode[] {
  const index = rows.findIndex((row) => row.id === rowId);
  if (index < 0) return rows;
  const copy = cloneRow(rows[index]);
  return insertRow(rows, index + 1, copy);
}

export function moveRow(rows: RowNode[], rowId: string, dir: -1 | 1): RowNode[] {
  const index = rows.findIndex((row) => row.id === rowId);
  const target = index + dir;
  if (index < 0 || target < 0 || target >= rows.length) return rows;
  const next = [...rows];
  const [row] = next.splice(index, 1);
  next.splice(target, 0, row);
  return next;
}

export function addColumnToRow(rows: RowNode[], rowId: string): RowNode[] {
  return updateRow(rows, rowId, (row) => {
    const count = row.columns.length + 1;
    const each = 100 / count;
    return {
      ...row,
      columns: [
        ...row.columns.map((col) => ({
          ...col,
          settings: { ...col.settings, width: each },
        })),
        { ...createColumn(), settings: { width: each } },
      ],
    };
  });
}

export function removeColumn(rows: RowNode[], rowId: string, columnId: string): RowNode[] {
  return updateRow(rows, rowId, (row) => {
    const columns = row.columns.filter((col) => col.id !== columnId);
    const each = 100 / (columns.length || 1);
    return {
      ...row,
      columns: columns.map((col) => ({ ...col, settings: { ...col.settings, width: each } })),
    };
  });
}

export function duplicateColumn(
  rows: RowNode[],
  rowId: string,
  columnId: string,
): RowNode[] {
  return updateRow(rows, rowId, (row) => {
    const index = row.columns.findIndex((col) => col.id === columnId);
    if (index < 0) return row;
    const copy = cloneColumn(row.columns[index]);
    const columns = [...row.columns];
    columns.splice(index + 1, 0, copy);
    const each = 100 / columns.length;
    return { ...row, columns: columns.map((col) => ({ ...col, settings: { ...col.settings, width: each } })) };
  });
}

export function addElementToColumn(
  rows: RowNode[],
  rowId: string,
  columnId: string,
  widgetType: string,
): RowNode[] {
  return updateRow(rows, rowId, (row) => ({
    ...row,
    columns: updateColumn(row.columns, columnId, (col) => ({
      ...col,
      elements: [...col.elements, newElementFromWidget(widgetType)],
    })),
  }));
}

export function addElementToContainer(
  rows: RowNode[],
  rowId: string,
  columnId: string,
  elementId: string,
  widgetType: string,
): RowNode[] {
  return updateRow(rows, rowId, (row) => ({
    ...row,
    columns: updateColumn(row.columns, columnId, (col) => ({
      ...col,
      elements: updateElementIn(col.elements, elementId, (el) => ({
        ...el,
        elements: [...(el.elements ?? []), newElementFromWidget(widgetType)],
      })),
    })),
  }));
}

export function removeElement(
  rows: RowNode[],
  rowId: string,
  columnId: string,
  elementId: string,
): RowNode[] {
  return updateRow(rows, rowId, (row) => ({
    ...row,
    columns: updateColumn(row.columns, columnId, (col) => ({
      ...col,
      elements: removeElementFromList(col.elements, elementId),
    })),
  }));
}

function removeElementFromList(elements: ElementNode[], elementId: string): ElementNode[] {
  return elements
    .filter((el) => el.id !== elementId)
    .map((el) =>
      el.elements ? { ...el, elements: removeElementFromList(el.elements, elementId) } : el,
    );
}

export function duplicateElement(
  rows: RowNode[],
  rowId: string,
  columnId: string,
  elementId: string,
): RowNode[] {
  return updateRow(rows, rowId, (row) => ({
    ...row,
    columns: updateColumn(row.columns, columnId, (col) => ({
      ...col,
      elements: duplicateInList(col.elements, elementId),
    })),
  }));
}

function duplicateInList(elements: ElementNode[], elementId: string): ElementNode[] {
  const out: ElementNode[] = [];
  for (const el of elements) {
    out.push(el);
    if (el.id === elementId) out.push(cloneElement(el) as ElementNode);
    else if (el.elements) {
      out[out.length - 1] = {
        ...el,
        elements: duplicateInList(el.elements, elementId),
      };
    }
  }
  return out;
}

export function moveElement(
  rows: RowNode[],
  rowId: string,
  columnId: string,
  elementId: string,
  dir: -1 | 1,
): RowNode[] {
  return updateRow(rows, rowId, (row) => ({
    ...row,
    columns: updateColumn(row.columns, columnId, (col) => ({
      ...col,
      elements: moveInList(col.elements, elementId, dir),
    })),
  }));
}

function moveInList(
  elements: ElementNode[],
  elementId: string,
  dir: -1 | 1,
): ElementNode[] {
  const index = elements.findIndex((el) => el.id === elementId);
  if (index >= 0) {
    const target = index + dir;
    if (target < 0 || target >= elements.length) return elements;
    const next = [...elements];
    const [el] = next.splice(index, 1);
    next.splice(target, 0, el);
    return next;
  }
  return elements.map((el) =>
    el.elements ? { ...el, elements: moveInList(el.elements, elementId, dir) } : el,
  );
}

export function setColumnWidth(
  rows: RowNode[],
  rowId: string,
  columnId: string,
  width: number,
): RowNode[] {
  return updateRow(rows, rowId, (row) => ({
    ...row,
    columns: updateColumn(row.columns, columnId, (col) => ({
      ...col,
      settings: { ...col.settings, width: Math.min(100, Math.max(5, width)) },
    })),
  }));
}

// ---------------------------------------------------------------------------
// Cloning with new ids
// ---------------------------------------------------------------------------

export function cloneRow(row: RowNode): RowNode {
  return {
    ...row,
    id: crypto.randomUUID(),
    columns: row.columns.map((col) => ({
      ...cloneColumn(col),
    })),
  };
}

function cloneColumn(col: ColumnNode): ColumnNode {
  return {
    ...col,
    id: crypto.randomUUID(),
    settings: { ...col.settings },
    elements: col.elements.map((el) => cloneElement(el) as ElementNode),
  };
}

// ---------------------------------------------------------------------------
// Find helpers
// ---------------------------------------------------------------------------

export function findElement(
  rows: RowNode[],
  elementId: string,
): ElementNode | null {
  for (const row of rows) {
    for (const col of row.columns) {
      const found = findInList(col.elements, elementId);
      if (found) return found;
    }
  }
  return null;
}

function findInList(elements: ElementNode[], elementId: string): ElementNode | null {
  for (const el of elements) {
    if (el.id === elementId) return el;
    if (el.elements) {
      const found = findInList(el.elements, elementId);
      if (found) return found;
    }
  }
  return null;
}

export function setElementSettings(
  rows: RowNode[],
  rowId: string,
  columnId: string,
  elementId: string,
  patch: Record<string, unknown>,
): RowNode[] {
  return updateRow(rows, rowId, (row) => ({
    ...row,
    columns: updateColumn(row.columns, columnId, (col) => ({
      ...col,
      elements: updateElementIn(col.elements, elementId, (el) => ({
        ...el,
        settings: { ...el.settings, ...patch },
      })),
    })),
  }));
}

export function setColumnSettings(
  rows: RowNode[],
  rowId: string,
  columnId: string,
  patch: Record<string, unknown>,
): RowNode[] {
  return updateRow(rows, rowId, (row) => ({
    ...row,
    columns: updateColumn(row.columns, columnId, (col) => ({
      ...col,
      settings: { ...col.settings, ...patch },
    })),
  }));
}

export function setRowSettings(
  rows: RowNode[],
  rowId: string,
  patch: Record<string, unknown>,
): RowNode[] {
  return updateRow(rows, rowId, (row) => ({
    ...row,
    settings: { ...row.settings, ...patch },
  }));
}

export function rowFromTemplate(document: unknown): RowNode {
  const doc = document as { rows?: RowNode[] };
  const source = doc?.rows?.[0];
  if (!source) return createRow();
  return cloneRow(source);
}