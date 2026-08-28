"use client";

import { useRef, useState } from "react";
import { Copy, Eye, EyeOff, GripVertical, Layers, Plus, Trash2, ChevronUp, ChevronDown, Pencil } from "lucide-react";
import type { SectionInstance } from "@/lib/prestate/types";
import { SLUG_ICONS } from "@/lib/prestate/data";

function iconFor(typeOrIcon: string, size = 14) {
  const Icon = SLUG_ICONS[typeOrIcon] ?? Layers;
  return <Icon size={size} />;
}

export function SectionsNavigator({
  sections,
  selectedId,
  onSelect,
  onReorder,
  onDuplicate,
  onDelete,
  onAddAt,
  onMoveUp,
  onMoveDown,
  onToggleHidden,
}: {
  sections: SectionInstance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (fromId: string, toId: string, after: boolean) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAddAt: (index: number) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onToggleHidden: (id: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; after: boolean } | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragEnd = () => {
    setDragId(null);
    setDropTarget(null);
  };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!dragId || dragId === id) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    setDropTarget({ id, after });
  };
  const handleDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    const from = e.dataTransfer.getData("text/plain") || dragId;
    if (!from || from === id) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    onReorder(from, id, after);
    setDragId(null);
    setDropTarget(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid var(--ps-line)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Layers size={14} style={{ color: "var(--ps-primary)" }} />
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: "var(--ps-ink)", textTransform: "uppercase" }}>Navigator</span>
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", background: "var(--ps-bg)", border: "1px solid var(--ps-line)", borderRadius: 999, padding: "2px 7px" }}>{sections.length}</span>
        </div>
        <div style={{ fontSize: 11, lineHeight: 1.5, color: "var(--ps-muted)" }}>
          Page → Sections → Widgets → Items. Drag to reorder.
        </div>
      </div>

      {/* Actions bar */}
      <div style={{ padding: "8px 12px", display: "flex", gap: 6, borderBottom: "1px solid var(--ps-line)", flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onAddAt(sections.length)}
          style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 8px", borderRadius: 8, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          <Plus size={13} /> Add section
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 8px 12px", display: "flex", flexDirection: "column", gap: 0 }}>
        {sections.length === 0 ? (
          <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--ps-muted)", fontSize: 12.5, lineHeight: 1.6, border: "1.5px dashed var(--ps-line-strong)", borderRadius: 10, background: "rgba(255,255,255,0.02)" }}>
            <div style={{ fontWeight: 800, color: "var(--ps-ink)", marginBottom: 4 }}>No sections yet</div>
            Add a widget from the library or click + to create your first section.
          </div>
        ) : (
          sections.map((sec, idx) => {
            const isSelected = selectedId === sec.id;
            const isDragging = dragId === sec.id;
            const isDrop = dropTarget?.id === sec.id;
            const isDropAfter = isDrop && dropTarget.after;
            const isDropBefore = isDrop && !dropTarget.after;
            return (
              <div key={sec.id} style={{ position: "relative" }}>
                {/* Add between button above first item */}
                {idx === 0 ? (
                  <div
                    onClick={() => onAddAt(0)}
                    title="Add section here"
                    style={{
                      height: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      margin: "2px 0",
                      opacity: 0,
                      transition: "opacity .12s",
                    }}
                    className="ps-navigator-insert"
                  >
                    <span style={{ height: 2, flex: 1, background: "var(--ps-line-strong)", borderRadius: 999 }} />
                    <span style={{ margin: "0 6px", width: 18, height: 18, borderRadius: "50%", background: "var(--ps-primary)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Plus size={10} />
                    </span>
                    <span style={{ height: 2, flex: 1, background: "var(--ps-line-strong)", borderRadius: 999 }} />
                  </div>
                ) : null}

                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, sec.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, sec.id)}
                  onDrop={(e) => handleDrop(e, sec.id)}
                  onDragLeave={() => setDropTarget(null)}
                  onClick={() => onSelect(sec.id)}
                  title={sec.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 8px",
                    borderRadius: 10,
                    border: isSelected ? "1.5px solid var(--ps-primary)" : isDrop ? "1.5px dashed var(--ps-primary)" : "1px solid var(--ps-line)",
                    background: isDragging ? "rgba(109,93,252,0.08)" : isSelected ? "var(--ps-primary-mist)" : isDrop ? "var(--ps-primary-mist)" : "var(--ps-bg)",
                    opacity: isDragging ? 0.55 : sec.hidden ? 0.55 : 1,
                    cursor: "pointer",
                    transition: "all .12s",
                    boxShadow: isSelected ? "0 0 0 3px rgba(109,93,252,0.12)" : undefined,
                    position: "relative",
                  }}
                >
                  {/* Drop indicator lines */}
                  {isDropBefore ? <span style={{ position: "absolute", top: -6, left: 0, right: 0, height: 3, background: "var(--ps-primary)", borderRadius: 999, zIndex: 1 }} /> : null}
                  {isDropAfter ? <span style={{ position: "absolute", bottom: -6, left: 0, right: 0, height: 3, background: "var(--ps-primary)", borderRadius: 999, zIndex: 1 }} /> : null}

                  <span
                    onMouseDown={(e) => e.stopPropagation()}
                    draggable={false}
                    style={{ color: isSelected ? "var(--ps-primary)" : "var(--ps-muted)", display: "inline-flex", padding: 2, cursor: "grab" }}
                    title="Drag to reorder"
                  >
                    <GripVertical size={14} />
                  </span>

                  <span style={{ width: 26, height: 26, borderRadius: 7, background: isSelected ? "var(--ps-primary-soft)" : "rgba(255,255,255,0.05)", color: isSelected ? "var(--ps-primary)" : "var(--ps-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {iconFor(sec.icon || sec.type, 14)}
                  </span>

                  <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? "var(--ps-ink)" : "var(--ps-slate)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {idx + 1}. {sec.label || sec.type}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--ps-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sec.type}</span>
                  </span>

                  <span style={{ display: "inline-flex", gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button type="button" title={sec.hidden ? "Show" : "Hide"} onClick={() => onToggleHidden(sec.id)} style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "transparent", color: sec.hidden ? "var(--ps-danger)" : "var(--ps-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      {sec.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button type="button" title="Edit" onClick={() => onSelect(sec.id)} style={{ width: 22, height: 22, borderRadius: 6, border: isSelected ? "1px solid var(--ps-primary)" : "none", background: isSelected ? "var(--ps-primary-soft)" : "transparent", color: isSelected ? "var(--ps-primary)" : "var(--ps-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <Pencil size={11} />
                    </button>
                  </span>
                </div>

                {/* Reveal actions on selected */}
                {isSelected ? (
                  <div style={{ display: "flex", gap: 4, padding: "6px 2px 0", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => onMoveUp(sec.id)} title="Move up" style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 6px", borderRadius: 7, border: "1px solid var(--ps-line)", background: "var(--ps-panel-raised)", color: "var(--ps-slate)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      <ChevronUp size={11} /> Up
                    </button>
                    <button type="button" onClick={() => onMoveDown(sec.id)} title="Move down" style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 6px", borderRadius: 7, border: "1px solid var(--ps-line)", background: "var(--ps-panel-raised)", color: "var(--ps-slate)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      <ChevronDown size={11} /> Down
                    </button>
                    <button type="button" onClick={() => onDuplicate(sec.id)} title="Duplicate" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--ps-line)", background: "#fff", color: "var(--ps-slate)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <Copy size={11} />
                    </button>
                    <button type="button" onClick={() => onDelete(sec.id)} title="Delete" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--ps-line)", background: "var(--ps-danger-soft)", color: "var(--ps-danger)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                ) : null}

                {/* Insert between */}
                <div
                  onClick={() => onAddAt(idx + 1)}
                  title="Add section here"
                  style={{ height: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", margin: "2px 0", opacity: 0, transition: "opacity .12s" }}
                  className="ps-navigator-insert"
                >
                  <span style={{ height: 2, flex: 1, background: "var(--ps-line-strong)", borderRadius: 999 }} />
                  <span style={{ margin: "0 6px", width: 18, height: 18, borderRadius: "50%", background: "var(--ps-primary)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Plus size={10} />
                  </span>
                  <span style={{ height: 2, flex: 1, background: "var(--ps-line-strong)", borderRadius: 999 }} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .ps-navigator-insert:hover { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
