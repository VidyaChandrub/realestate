"use client";

import { useRef, useState, type CSSProperties } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  Monitor,
  Plus,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
import type { Device, ElementNode, RowNode } from "@/lib/lp-types";
import {
  duplicateElement,
  duplicateRow,
  moveElement,
  removeElement,
  setElementSettings,
  setRowSettings,
  updateColumn,
  updateRow,
} from "@/lib/lp-edit";
import { WIDGET_MAP, type FieldDef, type WidgetDef } from "@/lib/lp-widgets";
import { Icon } from "@/lib/lp-icon";
import { FieldInput, Section } from "./settings-panel";

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

const DEPTH = { label: { display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: 0.4, marginBottom: 5 } };

function textSummary(el: ElementNode): string {
  const s = el.settings ?? {};
  const keys = ["title", "heading", "name", "label", "subheading", "subtitle", "text", "buttonText", "value", "address", "content"];
  for (const k of keys) {
    const v = s[k];
    if (typeof v === "string" && v.trim()) return v.length > 60 ? v.slice(0, 60) + "…" : v;
  }
  const items = s.items;
  if (Array.isArray(items) && items.length) return `${items.length} item${items.length !== 1 ? "s" : ""}`;
  return WIDGET_MAP[el.type]?.label ?? el.type;
}

const DEVICES: { key: Device; icon: typeof Monitor; label: string }[] = [
  { key: "desktop", icon: Monitor, label: "Desktop" },
  { key: "tablet", icon: Tablet, label: "Tablet" },
  { key: "mobile", icon: Smartphone, label: "Mobile" },
];

// ---------------------------------------------------------------------------
// Main Section Editor
// ---------------------------------------------------------------------------

export function SectionEditor({
  row,
  rows,
  rowId,
  onRowsChange,
  onSelectElement,
}: {
  row: RowNode;
  rows: RowNode[];
  rowId: string;
  onRowsChange: (rows: RowNode[]) => void;
  onSelectElement: (columnId: string, elementId: string) => void;
}) {
  const [tab, setTab] = useState<"content" | "design">("content");
  const [device, setDevice] = useState<Device>("desktop");
  const [expandedEl, setExpandedEl] = useState<string | null>(null);

  const patchRow = (patch: Record<string, unknown>) => onRowsChange(setRowSettings(rows, rowId, patch));
  const patchEl = (colId: string, elId: string, patch: Record<string, unknown>) =>
    onRowsChange(setElementSettings(rows, rowId, colId, elId, patch));
  const dupEl = (colId: string, elId: string) => onRowsChange(duplicateElement(rows, rowId, colId, elId));
  const delEl = (colId: string, elId: string) => onRowsChange(removeElement(rows, rowId, colId, elId));
  const moveEl = (colId: string, elId: string, dir: -1 | 1) => onRowsChange(moveElement(rows, rowId, colId, elId, dir));

  const firstEl = row.columns[0]?.elements?.[0];
  const typeLabel = firstEl ? (WIDGET_MAP[firstEl.type]?.label ?? firstEl.type) : "Section";
  const enabled = row.settings?.enabled !== false;

  const reorderInColumn = (colId: string, dragElId: string, targetElId: string) => {
    onRowsChange(
      updateRow(rows, rowId, (row) => ({
        ...row,
        columns: updateColumn(row.columns, colId, (col) => {
          const ids = col.elements.map((e) => e.id);
          const from = ids.indexOf(dragElId);
          const to = ids.indexOf(targetElId);
          if (from < 0 || to < 0 || from === to) return col;
          const elements = [...col.elements];
          const [moved] = elements.splice(from, 1);
          elements.splice(to, 0, moved);
          return { ...col, elements };
        }),
      })),
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", background: "#fff" }}>
      {/* ── Section header ── */}
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              type="text"
              value={row.settings?.name ?? ""}
              onChange={(e) => patchRow({ name: e.target.value })}
              placeholder="Section name"
              style={{ width: "100%", border: "none", outline: "none", fontWeight: 800, fontSize: 15, color: "#0f172a", padding: "2px 0", background: "transparent" }}
            />
            <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 1 }}>Section · {typeLabel}</div>
          </div>
          {/* Enable/disable */}
          <button
            type="button"
            title={enabled ? "Disable section" : "Enable section"}
            onClick={() => patchRow({ enabled: !enabled })}
            style={{ width: 38, height: 22, borderRadius: 999, border: "none", background: enabled ? "#4f46e5" : "#cbd5e1", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background .2s" }}
          >
            <span style={{ position: "absolute", top: 3, left: enabled ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
          </button>
        </div>
        {/* Quick actions */}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button type="button" onClick={() => onRowsChange(duplicateRowAction(rows, rowId))} style={miniBtn}><Copy size={13} /> Duplicate</button>
          <button type="button" onClick={() => onRowsChange(rows.filter((r) => r.id !== rowId))} style={{ ...miniBtn, color: "#e11d48" }}><Trash2 size={13} /> Delete</button>
        </div>
      </div>

      {/* ── Content / Design tabs ── */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
        {(["content", "design"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{ flex: 1, padding: "10px 4px", background: "transparent", border: "none", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, cursor: "pointer", color: tab === t ? "#4f46e5" : "#64748b", borderBottom: tab === t ? "2px solid #4f46e5" : "2px solid transparent" }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "content" ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 24px" }}>
          {/* Columns & elements */}
          {row.columns.map((col, ci) => (
            <div key={col.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, color: "#94a3b8", background: "#f1f5f9", borderRadius: 6, padding: "3px 8px" }}>
                  Column {ci + 1} · {col.settings?.width !== undefined ? `${Math.round(col.settings.width)}%` : "flex"}
                </span>
                {row.columns.length > 1 ? (
                  <span style={{ fontSize: 10.5, color: "#94a3b8" }}>{col.elements.length} element{col.elements.length !== 1 ? "s" : ""}</span>
                ) : null}
              </div>

              {col.elements.length === 0 ? (
                <div style={{ border: "1px dashed #c7d2fe", borderRadius: 8, color: "#8b93c9", fontSize: 12, padding: "10px", textAlign: "center", background: "#fafbff" }}>
                  Drop a widget here (use + Add Element below)
                </div>
              ) : (
                col.elements.map((el) => (
                  <ElementRow
                    key={el.id}
                    el={el}
                    expanded={expandedEl === el.id}
                    onExpand={() => setExpandedEl(expandedEl === el.id ? null : el.id)}
                    onPatch={(patch) => patchEl(col.id, el.id, patch)}
                    onDuplicate={() => dupEl(col.id, el.id)}
                    onDelete={() => delEl(col.id, el.id)}
                    onMove={(dir) => moveEl(col.id, el.id, dir)}
                    onReorder={(dragId, targetId) => reorderInColumn(col.id, dragId, targetId)}
                    canUp={col.elements.findIndex((e) => e.id === el.id) > 0}
                    canDown={col.elements.findIndex((e) => e.id === el.id) < col.elements.length - 1}
                    onSelect={() => onSelectElement(col.id, el.id)}
                  />
                ))
              )}
            </div>
          ))}

          <div style={{ padding: "8px 10px", borderRadius: 10, border: "1.5px dashed #c7d2fe", background: "#eef2ff", color: "#6366f1", fontSize: 12, fontWeight: 600, textAlign: "center" }}>
            Use the Elements palette in the left panel to add widgets to this section
          </div>
        </div>
      ) : (
        /* ── Design tab ── */
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 24px" }}>
          <SectionDesign
            row={row}
            patchRow={patchRow}
            device={device}
            setDevice={setDevice}
          />
        </div>
      )}
    </div>
  );
}

const miniBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "5px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#fff",
  color: "#334155",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

// ---------------------------------------------------------------------------
// Element row (content tab)
// ---------------------------------------------------------------------------

function ElementRow({
  el,
  expanded,
  onExpand,
  onPatch,
  onDuplicate,
  onDelete,
  onMove,
  onReorder,
  canUp,
  canDown,
  onSelect,
}: {
  el: ElementNode;
  expanded: boolean;
  onExpand: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onReorder: (dragElId: string, targetElId: string) => void;
  canUp: boolean;
  canDown: boolean;
  onSelect: () => void;
}) {
  const widget = WIDGET_MAP[el.type];
  const dragId = useRef<string | null>(null);

  return (
    <div
      draggable
      onDragStart={(e) => {
        dragId.current = el.id;
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
      onDrop={(e) => {
        e.preventDefault();
        if (dragId.current) onReorder(dragId.current, el.id);
        dragId.current = null;
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        border: expanded ? "1.5px solid #4f46e5" : "1px solid #e2e8f0",
        borderRadius: 10,
        background: expanded ? "#eef2ff" : "#fff",
        marginBottom: 6,
        cursor: "pointer",
        boxShadow: expanded ? "0 0 0 3px rgba(79,70,229,.12)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px 8px 6px" }}>
        <span style={{ color: "#cbd5e1", cursor: "grab", display: "inline-flex", flexShrink: 0 }}><GripVertical size={15} /></span>
        <span style={{ color: "#6366f1", display: "inline-flex", flexShrink: 0 }}><Icon name={widget?.icon ?? "puzzle"} size={16} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{widget?.label ?? el.type}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{textSummary(el)}</div>
        </div>
        <button type="button" title="Move up" onClick={(e) => { e.stopPropagation(); onMove(-1); }} disabled={!canUp} style={iconBtn(canUp)}><ChevronDown size={13} style={{ transform: "rotate(180deg)" }} /></button>
        <button type="button" title="Move down" onClick={(e) => { e.stopPropagation(); onMove(1); }} disabled={!canDown} style={iconBtn(canDown)}><ChevronDown size={13} /></button>
        <button type="button" title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} style={iconBtn(true)}><Copy size={13} /></button>
        <button type="button" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ ...iconBtn(true), color: "#e11d48" }}><Trash2 size={13} /></button>
        <button type="button" title={expanded ? "Collapse" : "Expand"} onClick={(e) => { e.stopPropagation(); onExpand(); }} style={{ ...iconBtn(true), color: expanded ? "#4f46e5" : "#94a3b8" }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {expanded && widget ? (
        <div style={{ padding: "0 10px 12px", borderTop: "1px solid #dfe3f8" }}>
          <ElementFieldsEditor el={el} widget={widget} onPatch={onPatch} />
        </div>
      ) : null}
    </div>
  );
}

function iconBtn(enabled: boolean): CSSProperties {
  return {
    width: 24,
    height: 24,
    border: "none",
    background: "transparent",
    color: "#94a3b8",
    borderRadius: 6,
    cursor: enabled ? "pointer" : "default",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    opacity: enabled ? 1 : 0.3,
  };
}

// ---------------------------------------------------------------------------
// Element fields editor (reuse FieldInput + Section)
// ---------------------------------------------------------------------------

function ElementFieldsEditor({
  el,
  widget,
  onPatch,
}: {
  el: ElementNode;
  widget: WidgetDef;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const s = el.settings ?? {};
  const sections = new Set(widget.fields.map((f) => f.section ?? "Content"));
  const groups = [...sections].map((name) => ({
    name,
    fields: widget.fields.filter((f) => (f.section ?? "Content") === name),
  }));

  return (
    <>
      {groups.map(({ name, fields }) => (
        <Section key={name} title={name} defaultOpen={name === "Content"}>
          {fields.map((field) =>
            field.type === "object-list" ? (
              <RepeaterManager
                key={field.key}
                field={field}
                value={s[field.key]}
                onChange={(items) => onPatch({ [field.key]: items })}
              />
            ) : (
              <FieldInput
                key={field.key}
                field={field}
                value={s[field.key]}
                onChange={(v) => onPatch({ [field.key]: v })}
              />
            ),
          )}
        </Section>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Repeater / Item Manager
// ---------------------------------------------------------------------------

export function RepeaterManager({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (items: Record<string, unknown>[]) => void;
}) {
  const [open, setOpen] = useState<number | null>(0);
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const labelKey = field.itemLabelKey ?? field.itemFields?.[0]?.key ?? "label";
  const dragIndex = useRef<number | null>(null);

  const itemTitle = (it: Record<string, unknown>) => {
    const v = it[labelKey];
    return typeof v === "string" && v.trim() ? v : `Item ${(items.indexOf(it) + 1) || ""}`;
  };
  const hasEnabled = (field.itemFields ?? []).some((f) => f.key === "enabled");
  const isEnabled = (it: Record<string, unknown>) => (it.enabled as boolean) !== false;

  return (
    <div>
      <label style={DEPTH.label}>{field.label}</label>
      {items.map((item, i) => (
        <div
          key={i}
          draggable
          onDragStart={() => { dragIndex.current = i; }}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIndex.current === null || dragIndex.current === i) return;
            const next = [...items];
            const [moved] = next.splice(dragIndex.current, 1);
            next.splice(i, 0, moved);
            onChange(next);
            dragIndex.current = null;
          }}
          style={{ border: open === i ? "1.5px solid #4f46e5" : "1px solid #e2e8f0", borderRadius: 9, marginBottom: 6, background: "#fff", overflow: "hidden" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 8px", background: open === i ? "#eef2ff" : "#f8fafc" }}>
            <span style={{ color: "#cbd5e1", cursor: "grab", display: "inline-flex" }}><GripVertical size={14} /></span>
            <button type="button" onClick={() => setOpen(open === i ? null : i)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <span style={{ fontWeight: 600, fontSize: 12.5, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{itemTitle(item)}</span>
            </button>
            {hasEnabled ? (
              <button
                type="button"
                title={isEnabled(item) ? "Disable" : "Enable"}
                onClick={() => {
                  const next = [...items];
                  next[i] = { ...item, enabled: !isEnabled(item) };
                  onChange(next);
                }}
                style={{ width: 32, height: 18, borderRadius: 999, border: "none", background: isEnabled(item) ? "#4f46e5" : "#cbd5e1", position: "relative", cursor: "pointer", flexShrink: 0 }}
              >
                <span style={{ position: "absolute", top: 2, left: isEnabled(item) ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
              </button>
            ) : null}
            <button type="button" title="Duplicate" onClick={() => { const next = [...items]; next.splice(i + 1, 0, { ...item }); onChange(next); }} style={iconBtn(true)}><Copy size={13} /></button>
            <button type="button" title="Delete" onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ ...iconBtn(true), color: "#e11d48" }}><Trash2 size={13} /></button>
            <button type="button" onClick={() => setOpen(open === i ? null : i)} style={{ ...iconBtn(true), color: open === i ? "#4f46e5" : "#94a3b8" }}>
              {open === i ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
          {open === i ? (
            <div style={{ padding: "10px 10px 12px", borderTop: "1px solid #eef0f6" }}>
              {(field.itemFields ?? []).map((f) => (
                <FieldInput key={f.key} field={f} value={item[f.key]} onChange={(v) => { const next = [...items]; next[i] = { ...item, [f.key]: v }; onChange(next); }} />
              ))}
            </div>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const empty: Record<string, unknown> = {};
          for (const f of field.itemFields ?? []) empty[f.key] = f.type === "toggle" ? true : "";
          onChange([...items, empty]);
          setOpen(items.length);
        }}
        style={{ width: "100%", padding: "6px 10px", border: "1px dashed #c7d2fe", borderRadius: 8, background: "#f1f5f9", color: "#4f46e5", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
      >
        <Plus size={13} /> Add Item
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Design tab — global section controls (responsive-aware)
// ---------------------------------------------------------------------------

function SectionDesign({
  row,
  patchRow,
  device,
  setDevice,
}: {
  row: RowNode;
  patchRow: (patch: Record<string, unknown>) => void;
  device: Device;
  setDevice: (d: Device) => void;
}) {
  const s = row.settings ?? {};
  const bg = s.background ?? {};
  const pad = s.padding ?? {};
  const hidden = s.hidden ?? {};
  const hiddenOn = hidden[device] === true;

  const patchBg = (key: string, v: unknown) => patchRow({ background: { ...bg, [key]: v } });
  const patchPad = (key: string, v: unknown) => patchRow({ padding: { ...pad, [key]: v } });

  return (
    <>
      {/* Device toggle */}
      <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 9, padding: 3, marginBottom: 14 }}>
        {DEVICES.map((d) => (
          <button
            key={d.key}
            type="button"
            title={d.label}
            onClick={() => setDevice(d.key)}
            style={{ flex: 1, padding: "5px 0", border: "none", borderRadius: 7, background: device === d.key ? "#fff" : "transparent", color: device === d.key ? "#4f46e5" : "#94a3b8", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: device === d.key ? "0 1px 3px rgba(0,0,0,.1)" : "none" }}
          >
            <d.icon size={14} />
          </button>
        ))}
      </div>

      <Section title="Layout" defaultOpen>
        <FieldInput field={{ key: "layout", label: "Layout", type: "select", options: [{ value: "full_width", label: "Full Width" }, { value: "boxed", label: "Boxed" }] }} value={s.layout} onChange={(v) => patchRow({ layout: v })} />
        <FieldInput field={{ key: "contentWidth", label: "Content Width", type: "select", options: [{ value: "boxed", label: "Boxed" }, { value: "full", label: "Full" }] }} value={s.contentWidth} onChange={(v) => patchRow({ contentWidth: v })} />
        <FieldInput field={{ key: "gap", label: "Column Gap", type: "slider", min: 0, max: 80 }} value={s.gap} onChange={(v) => patchRow({ gap: v })} />
        <FieldInput field={{ key: "minHeight", label: "Min Height", type: "slider", min: 0, max: 900, step: 10 }} value={s.minHeight} onChange={(v) => patchRow({ minHeight: v })} />
        <FieldInput field={{ key: "align", label: "Alignment", type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] }} value={s.align} onChange={(v) => patchRow({ align: v })} />
      </Section>

      <Section title="Background" defaultOpen>
        <FieldInput field={{ key: "color", label: "Background Color", type: "color" }} value={bg.color} onChange={(v) => patchBg("color", v)} />
        <FieldInput field={{ key: "image", label: "Background Image", type: "image" }} value={bg.image} onChange={(v) => patchBg("image", v)} />
        <FieldInput field={{ key: "gradient", label: "Gradient", type: "text" }} value={bg.gradient} onChange={(v) => patchBg("gradient", v)} />
        <FieldInput field={{ key: "overlayColor", label: "Overlay Color", type: "color" }} value={bg.overlayColor} onChange={(v) => patchBg("overlayColor", v)} />
      </Section>

      <Section title="Spacing">
        <FieldInput field={{ key: "top", label: "Padding Top", type: "slider", min: 0, max: 200 }} value={pad.top} onChange={(v) => patchPad("top", v)} />
        <FieldInput field={{ key: "bottom", label: "Padding Bottom", type: "slider", min: 0, max: 200 }} value={pad.bottom} onChange={(v) => patchPad("bottom", v)} />
        <FieldInput field={{ key: "left", label: "Padding Left", type: "slider", min: 0, max: 200 }} value={pad.left} onChange={(v) => patchPad("left", v)} />
        <FieldInput field={{ key: "right", label: "Padding Right", type: "slider", min: 0, max: 200 }} value={pad.right} onChange={(v) => patchPad("right", v)} />
      </Section>

      <Section title="Border & Shadow">
        <FieldInput field={{ key: "radius", label: "Border Radius", type: "slider", min: 0, max: 60 }} value={s.border?.radius} onChange={(v) => patchRow({ border: { ...s.border, radius: v } })} />
        <FieldInput field={{ key: "shadow", label: "Box Shadow", type: "text" }} value={s.shadow} onChange={(v) => patchRow({ shadow: v })} />
      </Section>

      <Section title={`Visibility · ${DEVICES.find((d) => d.key === device)?.label}`}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Hide this section</div>
            <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 1 }}>on {DEVICES.find((d) => d.key === device)?.label.toLowerCase()}</div>
          </div>
          <button
            type="button"
            onClick={() => patchRow({ hidden: { ...hidden, [device]: !hiddenOn } })}
            style={{ width: 40, height: 22, borderRadius: 999, border: "none", background: hiddenOn ? "#e11d48" : "#cbd5e1", position: "relative", cursor: "pointer" }}
          >
            <span style={{ position: "absolute", top: 3, left: hiddenOn ? 20 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
          </button>
        </div>
        {hiddenOn ? (
          <div style={{ fontSize: 11.5, color: "#e11d48", marginTop: 6, background: "#fff1f2", borderRadius: 7, padding: "6px 9px", fontWeight: 600 }}>
            Hidden on {DEVICES.find((d) => d.key === device)?.label.toLowerCase()}
          </div>
        ) : null}
      </Section>
    </>
  );
}

function duplicateRowAction(rows: RowNode[], rowId: string): RowNode[] {
  return duplicateRow(rows, rowId);
}