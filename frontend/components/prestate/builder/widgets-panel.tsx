"use client";

import { useState } from "react";
import type * as React from "react";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { WIDGETS, WIDGET_CATEGORY_META } from "@/lib/prestate/data";

export const WIDGET_MIME = "application/x-prestate-widget";

export function readWidgetId(e: React.DragEvent): string | null {
  return e.dataTransfer.getData(WIDGET_MIME) || null;
}

const GROUP_COLORS: Record<string, string> = {
  Layout: "var(--ps-primary)",
  Property: "var(--ps-primary)",
  "Trust & Content": "var(--ps-gold)",
  Location: "var(--ps-success)",
  Conversion: "#9b8aff",
  Media: "#60a5fa",
  Marketing: "#f472b6",
};

export function WidgetsPanel({
  open,
  onToggle,
  onAddWidget,
}: {
  open: boolean;
  onToggle: () => void;
  onAddWidget: (widgetId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Layout: true,
    Property: true,
    "Trust & Content": false,
    Location: false,
    Conversion: true,
    Media: false,
    Marketing: false,
  });
  const [hovered, setHovered] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = WIDGETS.filter((w) => !q || w.label.toLowerCase().includes(q) || w.group.toLowerCase().includes(q) || w.desc.toLowerCase().includes(q));

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

  return (
    <div className="ps-widgets">
      <div className="ps-widgets-head">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ps-widgets-title">Widgets</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ps-muted)", marginLeft: "auto" }}>{WIDGETS.length}</span>
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
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for “{query}”
          </div>
        ) : null}

        {byCategory.map(({ meta, items }) => {
          const isOpen = q ? true : !!openGroups[meta.label];
          const color = GROUP_COLORS[meta.label] ?? "var(--ps-primary)";
          return (
            <div key={meta.key}>
              <button
                type="button"
                onClick={() => setOpenGroups((o) => ({ ...o, [meta.label]: !o[meta.label] }))}
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
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(WIDGET_MIME, widget.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={onAdd}
      onMouseEnter={() => onHover(widget.id)}
      onMouseLeave={() => onHover(null)}
      title={`${widget.label} — ${widget.desc}`}
      className="ps-widget-card"
      data-selected={isSection || hovered ? "true" : "false"}
    >
      <span style={{ width: 26, height: 26, borderRadius: 8, background: hovered || isSection ? "var(--ps-primary-soft)" : "rgba(255,255,255,0.04)", color: hovered || isSection ? "var(--ps-primary)" : "var(--ps-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={14} />
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: hovered || isSection ? "var(--ps-ink)" : "var(--ps-slate)", lineHeight: 1.25 }}>{widget.label}</span>
    </button>
  );
}
