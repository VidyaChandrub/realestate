"use client";

import type { CSSProperties, DragEvent, ReactNode } from "react";
import { useState } from "react";
import type { ColumnNode, Device, ElementNode, LpDocument, RowNode } from "@/lib/lp-types";
import { LpElement } from "@/components/lp/elements";
import { LpFooter, LpHeader } from "@/components/lp/page";
import {
  addColumnToRow,
  addElementToColumn,
  addElementToContainer,
  addRow,
  duplicateColumn,
  duplicateElement,
  duplicateRow,
  moveElement,
  moveRow,
  removeColumn,
  removeElement,
  removeRow,
  setColumnWidth,
  type Selection,
} from "@/lib/lp-edit";
import { createRow } from "@/lib/lp-edit";
import { WIDGET_MAP } from "@/lib/lp-widgets";
import { Icon } from "@/lib/lp-icon";
import { backgroundCss } from "@/lib/lp-styles";

const WIDGET_MIME = "application/x-lp-widget";

function readWidgetType(e: DragEvent): string | null {
  return e.dataTransfer.getData(WIDGET_MIME) || null;
}

// ---------------------------------------------------------------------------
// Toolbar chrome (hover overlay) used on rows, columns and elements.
// ---------------------------------------------------------------------------

function ChromeToolbar({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="lp-chrome-toolbar"
      style={{
        position: "absolute",
        top: -28,
        right: 0,
        display: "flex",
        gap: 2,
        background: "#6366f1",
        borderRadius: "6px 6px 0 0",
        padding: "3px 4px",
        zIndex: 60,
        boxShadow: "0 4px 12px rgba(79,70,229,.35)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ToolbarButton({
  icon,
  onClick,
  danger,
  style,
}: {
  icon: string;
  onClick: () => void;
  danger?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      title={icon}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 24,
        height: 24,
        border: "none",
        background: "transparent",
        color: "#fff",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: 13,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...(danger ? { background: "#e11d48" } : {}),
        ...style,
      }}
    >
      <Icon name={icon} size={13} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Element wrapper
// ---------------------------------------------------------------------------

function isContainer(type: string): boolean {
  return type === "grid" || type === "row";
}

function ElementWrap({
  element,
  selected,
  device,
  rows,
  rowId,
  columnId,
  readOnly,
  onSelect,
  onMutate,
}: {
  element: ElementNode;
  selected: boolean;
  device: Device;
  rows: RowNode[];
  rowId: string;
  columnId: string;
  readOnly?: boolean;
  onSelect: () => void;
  onMutate: (rows: RowNode[]) => void;
}) {
  const s = element.settings ?? {};
  const label = WIDGET_MAP[element.type]?.label ?? element.type;

  const containerStyle: CSSProperties = isContainer(element.type)
    ? element.type === "grid"
      ? {
          display: "grid",
          gridTemplateColumns: `repeat(${typeof s.columns === "number" ? s.columns : 3}, minmax(0,1fr))`,
          gap: typeof s.gap === "number" ? s.gap : 20,
          width: "100%",
        }
      : {
          display: "flex",
          flexWrap: "wrap",
          gap: typeof s.gap === "number" ? s.gap : 12,
          alignItems: "center",
          width: "100%",
        }
    : { width: "100%" };

  const children = element.elements ?? [];

  return (
    <div
      className={`lp-el-wrap ${selected && !readOnly ? "lp-selected" : ""}`}
      onClick={readOnly ? undefined : (e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        position: "relative",
        width: "100%",
        outline: selected && !readOnly ? "2px solid #6366f1" : "1px dashed transparent",
        outlineOffset: 2,
        minHeight: isContainer(element.type) ? 40 : undefined,
        padding: 2,
      }}
    >
      {selected && !readOnly ? (
        <ChromeToolbar>
          <ToolbarButton
            icon="arrow-up"
            onClick={() => onMutate(moveElement([...rows], rowId, columnId, element.id, -1))}
            style={{ transform: "none" }}
          />
          <ToolbarButton
            icon="arrow-down"
            onClick={() => onMutate(moveElement([...rows], rowId, columnId, element.id, 1))}
          />
          <ToolbarButton icon="copy" onClick={() => onMutate(duplicateElement(rows, rowId, columnId, element.id))} />
          <ToolbarButton icon="x" danger onClick={() => onMutate(removeElement(rows, rowId, columnId, element.id))} />
        </ChromeToolbar>
      ) : null}

      {!readOnly ? (
        <div style={{ position: "absolute", top: 2, left: 2, fontSize: 9, background: "#6366f1", color: "#fff", padding: "1px 5px", borderRadius: 4, zIndex: 50, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>
          {label}
        </div>
      ) : null}

      {isContainer(element.type) ? (
        <div
          style={containerStyle}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const type = readWidgetType(e);
            if (type) onMutate(addElementToContainer(rows, rowId, columnId, element.id, type));
          }}
        >
          {children.map((child) => (
            <ElementWrap
              key={child.id}
              element={child}
              selected={false}
              device={device}
              rows={rows}
              rowId={rowId}
              columnId={columnId}
              onSelect={onSelect}
              onMutate={onMutate}
            />
          ))}
          <div
            className="lp-drop-hint"
            style={{ border: "1px dashed #c7cbf7", borderRadius: 8, color: "#8b8fe0", fontSize: 12, padding: 8, textAlign: "center", minHeight: 34, display: "flex", alignItems: "center", justifyContent: "center", gridColumn: "1 / -1" }}
          >
            + Drop a widget here
          </div>
        </div>
      ) : (
        <LpElement element={element} device={device} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column wrapper
// ---------------------------------------------------------------------------

function ColumnWrap({
  column,
  selected,
  device,
  rows,
  rowId,
  readOnly,
  onSelect,
  onMutate,
  onWidth,
}: {
  column: ColumnNode;
  selected: boolean;
  device: Device;
  rows: RowNode[];
  rowId: string;
  readOnly?: boolean;
  onSelect: () => void;
  onMutate: (rows: RowNode[]) => void;
  onWidth: (width: number) => void;
}) {
  const [resizing, setResizing] = useState(false);
  const width = column.settings?.width;

  return (
    <div
      className={`lp-col-wrap ${selected && !readOnly ? "lp-selected" : ""}`}
      onClick={readOnly ? undefined : (e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDragOver={readOnly ? undefined : (e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={readOnly ? undefined : (e) => {
        e.preventDefault();
        e.stopPropagation();
        const type = readWidgetType(e);
        if (type) onMutate(addElementToColumn(rows, rowId, column.id, type));
      }}
      style={{
        position: "relative",
        width: width !== undefined ? `${width}%` : undefined,
        flex: width !== undefined ? "0 0 auto" : "1 1 0%",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxSizing: "border-box",
        outline: !readOnly ? (selected ? "2px solid #6366f1" : "1px dashed #d3d7f0") : "none",
        outlineOffset: -2,
        minWidth: 0,
        padding: readOnly ? 0 : 8,
        ...backgroundCss(column.settings?.background),
      }}
    >
      {selected && !readOnly ? (
        <ChromeToolbar>
          <span style={{ color: "#fff", fontSize: 11, padding: "0 6px", fontWeight: 700 }}>
            {Math.round(width ?? 50)}%
          </span>
          <ToolbarButton icon="copy" onClick={() => onMutate(duplicateColumn(rows, rowId, column.id))} />
          <ToolbarButton icon="x" danger onClick={() => onMutate(removeColumn(rows, rowId, column.id))} />
        </ChromeToolbar>
      ) : null}

      {column.elements.length === 0 ? (
        !readOnly ? (
          <div style={{ border: "1px dashed #c7cbf7", borderRadius: 8, color: "#8b8fe0", fontSize: 12, padding: 14, textAlign: "center" }}>
            Drag a widget here
          </div>
        ) : null
      ) : (
        column.elements.map((el) => (
          <ElementWrap
            key={el.id}
            element={el}
            selected={false}
            device={device}
            rows={rows}
            rowId={rowId}
            columnId={column.id}
            readOnly={readOnly}
            onSelect={onSelect}
            onMutate={onMutate}
          />
        ))
      )}

      {/* Column width handle — hidden in readOnly */}
      {!readOnly ? (
        <div
          onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setResizing(true);
          const startX = e.clientX;
          const startWidth = width ?? 50;
          const move = (ev: MouseEvent) => {
            const delta = ((ev.clientX - startX) / 900) * 100;
            onWidth(Math.min(95, Math.max(5, Math.round(startWidth + delta))));
          };
          const up = () => {
            setResizing(false);
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
        }}
        title="Drag to resize width"
        style={{
          position: "absolute",
          right: -4,
          top: 0,
          bottom: 0,
          width: 8,
          cursor: "col-resize",
          background: "rgba(99,102,241,.35)",
          borderRadius: 4,
          opacity: resizing ? 1 : 0.4,
          zIndex: 40,
        }}
      />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row wrapper
// ---------------------------------------------------------------------------

function RowWrap({
  row,
  index,
  total,
  selected,
  device,
  rows,
  readOnly,
  onSelect,
  onMutate,
}: {
  row: RowNode;
  index: number;
  total: number;
  selected: boolean;
  device: Device;
  rows: RowNode[];
  readOnly?: boolean;
  onSelect: () => void;
  onMutate: (rows: RowNode[]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`lp-row-wrap ${selected && !readOnly ? "lp-selected" : ""}`}
      onClick={readOnly ? undefined : (e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDragOver={readOnly ? undefined : (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
      }}
      onDragLeave={readOnly ? undefined : () => setDragOver(false)}
      onDrop={readOnly ? undefined : (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const type = readWidgetType(e);
        if (type) {
          onMutate(addColumnToRow(rows, row.id));
        }
      }}
      style={{
        position: "relative",
        border: !readOnly && dragOver ? "2px dashed #6366f1" : "none",
        ...backgroundCss(row.settings?.background),
        backgroundSize: row.settings?.background?.image ? "cover" : row.settings?.background?.size,
        backgroundPosition: row.settings?.background?.image ? "center" : row.settings?.background?.position,
        paddingTop: readOnly ? 0 : (row.settings?.padding?.top ?? 10),
        paddingBottom: readOnly ? 0 : (row.settings?.padding?.bottom ?? 10),
        paddingLeft: readOnly ? 0 : (row.settings?.padding?.left ?? 10),
        paddingRight: readOnly ? 0 : (row.settings?.padding?.right ?? 10),
        margin: readOnly ? 0 : "14px 0",
        minHeight: row.settings?.minHeight,
      }}
    >
      {!readOnly ? (
        <ChromeToolbar>
          <ToolbarButton icon="move-vertical" onClick={() => {}} style={{ cursor: "grab" }} />
          <ToolbarButton icon="arrow-up" onClick={() => onMutate(moveRow(rows, row.id, -1))} />
          <ToolbarButton icon="arrow-down" onClick={() => onMutate(moveRow(rows, row.id, 1))} />
          <ToolbarButton icon="copy" onClick={() => onMutate(duplicateRow(rows, row.id))} />
          <ToolbarButton icon="plus" onClick={() => onMutate(addColumnToRow(rows, row.id))} />
          <ToolbarButton icon="x" danger onClick={() => onMutate(removeRow(rows, row.id))} />
        </ChromeToolbar>
      ) : null}

      <div style={{ display: "flex", width: "100%", gap: 10, alignItems: "stretch" }}>
        {row.columns.map((col) => (
          <ColumnWrap
            key={col.id}
            column={col}
            selected={false}
            device={device}
            rows={rows}
            rowId={row.id}
            readOnly={readOnly}
            onSelect={onSelect}
            onMutate={onMutate}
            onWidth={(w) => onMutate(setColumnWidth(rows, row.id, col.id, w))}
          />
        ))}
      </div>

      {!readOnly ? (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -16, height: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "#6366f1", fontSize: 11, opacity: 0.6 }}>
          ── section {index + 1} of {total} ──
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main canvas
// ---------------------------------------------------------------------------

export function BuilderCanvas({
  document,
  device,
  selection,
  onSelect,
  onMutate,
  readOnly,
}: {
  document: LpDocument;
  device: Device;
  selection: Selection;
  onSelect: (sel: Selection) => void;
  onMutate: (rows: RowNode[]) => void;
  readOnly?: boolean;
}) {
  const rows = document?.rows ?? [];

  const canvasStyle: CSSProperties =
    device === "desktop"
      ? { width: "100%", maxWidth: 1200, margin: "0 auto" }
      : device === "tablet"
        ? { width: 768, margin: "0 auto", maxWidth: "100%" }
        : { width: 375, margin: "0 auto", maxWidth: "100%" };

  return (
    <div
      onDragOver={readOnly ? undefined : (e) => e.preventDefault()}
      onDrop={readOnly ? undefined : (e) => {
        e.preventDefault();
        const type = readWidgetType(e);
        if (type) {
          const row = createRow();
          onMutate(addRow(rows, row));
          onSelect({ kind: "column", rowId: row.id, columnId: row.columns[0].id });
        }
      }}
      style={{
        minHeight: 400,
        background: readOnly ? "#fff" : "#eef1f6",
        padding: readOnly ? 0 : "20px 10px",
      }}
    >
      {/* Header */}
      <div
        style={{ position: "relative", marginBottom: readOnly ? 0 : 20 }}
        onClick={readOnly ? undefined : (e) => { e.stopPropagation(); onSelect({ kind: "header" }); }}
      >
        <LpHeader header={document?.header} document={document} />
        {!readOnly && selection.kind === "header" ? (
          <div style={{ position: "absolute", inset: 0, border: "2px solid #6366f1", pointerEvents: "none" }} />
        ) : null}
        {!readOnly ? (
          <div style={{ position: "absolute", top: 4, left: 4, fontSize: 9, background: "#6366f1", color: "#fff", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>HEADER</div>
        ) : null}
      </div>

      <div style={canvasStyle}>
        {rows.length === 0 && !readOnly ? (
          <div style={{ border: "2px dashed #b6bce9", borderRadius: 12, padding: 60, textAlign: "center", color: "#6b71a8" }}>
            <div style={{ display: "flex", justifyContent: "center" }}><Icon name="puzzle" size={28} /></div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>Start building</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Drag a widget from the left panel here, or add a section below.</div>
          </div>
        ) : (
          rows.map((row, i) => (
            <RowWrap
              key={row.id}
              row={row}
              index={i}
              total={rows.length}
              selected={selection.kind === "row" && selection.rowId === row.id}
              device={device}
              rows={rows}
              readOnly={readOnly}
              onSelect={() => onSelect({ kind: "row", rowId: row.id })}
              onMutate={onMutate}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{ position: "relative", marginTop: readOnly ? 0 : 20 }}
        onClick={readOnly ? undefined : (e) => { e.stopPropagation(); onSelect({ kind: "footer" }); }}
      >
        <LpFooter footer={document?.footer} document={document} />
        {!readOnly && selection.kind === "footer" ? (
          <div style={{ position: "absolute", inset: 0, border: "2px solid #6366f1", pointerEvents: "none" }} />
        ) : null}
        {!readOnly ? (
          <div style={{ position: "absolute", top: 4, left: 4, fontSize: 9, background: "#6366f1", color: "#fff", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>FOOTER</div>
        ) : null}
      </div>
    </div>
  );
}