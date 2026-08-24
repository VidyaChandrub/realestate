"use client";

import { useRef, useState } from "react";
import type * as React from "react";
import { ChevronDown, Layers, PanelLeftClose, PanelLeftOpen, Search, Trash2 } from "lucide-react";
import { WIDGETS, WIDGET_CATEGORY_META, SLUG_ICONS } from "@/lib/prestate/data";
import type { SavedSectionTemplate } from "@/lib/prestate/persist";

export const WIDGET_MIME = "application/x-prestate-widget";
/** Drag prefix for reusable sections saved via "Save as template". */
export const SAVED_WIDGET_PREFIX = "saved:";

export function isWidgetDrag(e: React.DragEvent): boolean {
  const types = Array.from(e.dataTransfer?.types ?? []);
  return types.includes(WIDGET_MIME) || types.includes("text/plain") || types.includes("Text");
}

export function isSavedWidgetId(id: string): boolean {
  return id.startsWith(SAVED_WIDGET_PREFIX);
}

export function savedWidgetStorageId(id: string): string {
  return id.slice(SAVED_WIDGET_PREFIX.length);
}

export function readWidgetId(e: React.DragEvent): string | null {
  const custom = e.dataTransfer.getData(WIDGET_MIME);
  if (custom) return custom;
  const plain = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("Text");
  if (!plain) return null;
  const id = plain.trim();
  if (isSavedWidgetId(id)) return id;
  return WIDGETS.some((w) => w.id === id) ? id : null;
}

const GROUP_COLORS: Record<string, string> = {
  Layout: "var(--ps-primary)",
  Basic: "var(--ps-primary)",
  "Real Estate": "var(--ps-gold)",
  Media: "#60a5fa",
  Forms: "#34d399",
  Marketing: "#f472b6",
  "Header & Footer": "#fbbf24",
  Advanced: "#a78bfa",
};

export function WidgetsPanel({
  open,
  onToggle,
  onAddWidget,
  templates,
  onDeleteTemplate,
}: {
  open: boolean;
  onToggle: () => void;
  onAddWidget: (widgetId: string) => void;
  /** Reusable sections stored via the toolbar's "Save as template". */
  templates?: SavedSectionTemplate[];
  onDeleteTemplate?: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Saved: true,
    Layout: true,
    Basic: true,
    "Real Estate": true,
    Media: false,
    Forms: true,
    Marketing: false,
    "Header & Footer": false,
    Advanced: false,
  });
  const [hovered, setHovered] = useState<string | null>(null);

  // Library entries flagged hidden are aliases of other widgets (e.g. slider ≈
  // carousel) — they stay valid for existing pages but don't clutter the panel.
  const visibleWidgets = WIDGETS.filter((w) => !w.hidden);
  const q = query.trim().toLowerCase();
  const filtered = visibleWidgets.filter((w) => !q || w.label.toLowerCase().includes(q) || w.group.toLowerCase().includes(q) || w.desc.toLowerCase().includes(q));
  const filteredTemplates = (templates ?? []).filter((t) => !q || t.name.toLowerCase().includes(q));

  const byCategory = WIDGET_CATEGORY_META.map((meta) => ({
    meta,
    items: filtered.filter((w) => w.category === meta.key),
  })).filter((g) => g.items.length > 0);

  if (!open) {
    return (
      <div className="ps-widgets ps-widgets--collapsed">
        <button
          type="button"
          onClick={onToggle}
          title="Open widget library"
          className="ps-topnav-icon-btn"
          style={{ width: 36, height: 36, background: "var(--ps-primary-mist)", color: "var(--ps-primary)" }}
        >
          <PanelLeftOpen size={17} />
        </button>
        <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 10, fontWeight: 800, letterSpacing: 1.6, color: "var(--ps-muted)", marginTop: 10, userSelect: "none" }}>
          WIDGETS
        </span>
      </div>
    );
  }

  const toggleGroup = (key: string) => setOpenGroups((o) => ({ ...o, [key]: !o[key] }));

  return (
    <div className="ps-widgets">
      <div className="ps-widgets-head">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ps-widgets-title">Widgets</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ps-muted)", marginLeft: "auto" }}>{visibleWidgets.length + filteredTemplates.length}</span>
          <button type="button" onClick={onToggle} title="Collapse widget library" style={{ background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer", padding: 4, display: "inline-flex" }}>
            <PanelLeftClose size={16} />
          </button>
        </div>
        <div style={{ marginTop: 10, position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ps-muted)", pointerEvents: "none" }} />
          <input className="ps-input" placeholder="Search widgets…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 34 }} />
        </div>
      </div>

      <div className="ps-widgets-body">
        {q ? (
          <div style={{ padding: "6px 14px", fontSize: 11.5, color: "var(--ps-muted)" }}>
            {filteredTemplates.length + filtered.length} result{filteredTemplates.length + filtered.length !== 1 ? "s" : ""} for “{query}”
          </div>
        ) : null}

        {(filteredTemplates.length > 0 || !q) && templates && templates.length > 0 ? (
          <div key="saved">
            <button
              type="button"
              onClick={() => toggleGroup("Saved")}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "none", border: "none", cursor: "pointer" }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 2, background: "var(--ps-secondary)", flexShrink: 0 }} />
              <span className="ps-widgets-cat-label">Saved</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ps-muted)" }}>{filteredTemplates.length}</span>
              <ChevronDown size={14} style={{ color: "var(--ps-muted)", transform: openGroups.Saved ? "rotate(0)" : "rotate(-90deg)", transition: "transform .15s" }} />
            </button>
            {openGroups.Saved ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, padding: "2px 12px 10px" }}>
                {filteredTemplates.map((t) => (
                  <SavedTemplateCard
                    key={t.id}
                    template={t}
                    hovered={hovered === t.id}
                    onHover={setHovered}
                    onAdd={() => onAddWidget(SAVED_WIDGET_PREFIX + t.id)}
                    onDelete={onDeleteTemplate ? () => onDeleteTemplate(t.id) : undefined}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {byCategory.map(({ meta, items }) => {
          const isOpen = q ? true : !!openGroups[meta.label];
          const color = GROUP_COLORS[meta.label] ?? "var(--ps-primary)";
          return (
            <div key={meta.key}>
              <button
                type="button"
                onClick={() => toggleGroup(meta.label)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "none", border: "none", cursor: "pointer" }}
              >
                <span style={{ width: 7, height: 7, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span className="ps-widgets-cat-label">{meta.label}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ps-muted)" }}>{items.length}</span>
                <ChevronDown size={14} style={{ color: "var(--ps-muted)", transform: isOpen ? "rotate(0)" : "rotate(-90deg)", transition: "transform .15s" }} />
              </button>
              {isOpen ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, padding: "2px 12px 10px" }}>
                  {items.map((w) => (
                    <WidgetCard key={w.id} widget={w} hovered={hovered === w.id} onHover={setHovered} onAdd={() => onAddWidget(w.id)} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="ps-widgets-foot" style={{ padding: "10px 14px", borderTop: "1px solid var(--ps-line)", background: "var(--ps-primary-mist)", fontSize: 11, color: "var(--ps-muted)", lineHeight: 1.5 }}>
        <strong style={{ color: "var(--ps-primary)" }}>Tip:</strong> drag onto canvas or click to append.
      </div>
    </div>
  );
}

function WidgetCard({
  widget,
  hovered,
  onHover,
  onAdd,
}: {
  widget: (typeof WIDGETS)[number];
  hovered: boolean;
  onHover: (id: string | null) => void;
  onAdd: () => void;
}) {
  const Icon = widget.icon;
  const isSection = widget.id === "section";
  return (
    <DraggableCard
      id={widget.id}
      label={widget.label}
      desc={`${widget.label} — ${widget.desc}`}
      icon={<Icon size={14} />}
      hovered={hovered}
      onHover={onHover}
      highlight={isSection}
      onAdd={onAdd}
    />
  );
}

function SavedTemplateCard({
  template,
  hovered,
  onHover,
  onAdd,
  onDelete,
}: {
  template: SavedSectionTemplate;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onAdd: () => void;
  onDelete?: () => void;
}) {
  const SavedIcon = SLUG_ICONS[template.data?.icon as string] ?? Layers;
  return (
    <div style={{ position: "relative" }}>
      <DraggableCard
        id={SAVED_WIDGET_PREFIX + template.id}
        label={template.name}
        desc={`${template.name} — reusable ${template.type} section`}
        icon={<SavedIcon size={14} />}
        hovered={hovered}
        onHover={onHover}
        highlight={false}
        onAdd={onAdd}
      />
      {onDelete ? (
        <button
          type="button"
          title="Delete saved section"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", border: "1px solid var(--ps-line-strong)", background: "var(--ps-panel-raised)", color: "#e5484d", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0 }}
        >
          <Trash2 size={10} />
        </button>
      ) : null}
    </div>
  );
}

function DraggableCard({
  id,
  label,
  desc,
  icon,
  hovered,
  onHover,
  highlight,
  onAdd,
}: {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  hovered: boolean;
  onHover: (id: string | null) => void;
  highlight: boolean;
  onAdd: () => void;
}) {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const active = hovered || highlight;
  return (
    <button
      type="button"
      draggable
      onPointerDown={(e) => {
        origin.current = { x: e.clientX, y: e.clientY };
        dragging.current = false;
      }}
      onDragStart={(e) => {
        dragging.current = true;
        e.dataTransfer.setData(WIDGET_MIME, id);
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onPointerUp={(e) => {
        if (!origin.current) return;
        const dx = Math.abs(e.clientX - origin.current.x);
        const dy = Math.abs(e.clientY - origin.current.y);
        origin.current = null;
        if (!dragging.current && dx < 8 && dy < 8) onAdd();
      }}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      title={desc}
      className="ps-widget-card"
      data-selected={active ? "true" : "false"}
    >
      <span style={{ width: 26, height: 26, borderRadius: 8, background: active ? "var(--ps-primary-soft)" : "rgba(255,255,255,0.04)", color: active ? "var(--ps-primary)" : "var(--ps-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: active ? "var(--ps-ink)" : "var(--ps-slate)", lineHeight: 1.25 }}>{label}</span>
    </button>
  );
}
