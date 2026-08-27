"use client";

import { useEffect, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Box,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  LayoutPanelTop,
  Monitor,
  Move,
  Palette,
  Plus,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Trash2,
  Type,
  X,
} from "lucide-react";
import type { Device, LandingPageData, SectionInstance, SiteConfig } from "@/lib/prestate/types";
import { SLUG_ICONS } from "@/lib/prestate/data";
import { ensureConfig } from "@/lib/prestate/site-config";
import { FIELD_LOGIC_OPS } from "@/lib/prestate/form-logic";
import type { FieldLogicOp, FormLeadField } from "@/lib/prestate/types";
import { GitBranch, Copy as CopyIcon, ChevronDown as ChevronDownIcon } from "lucide-react";
import { loadFormLibrary, saveFormLibrary } from "@/lib/prestate/forms-store";
import type { FormDefinition } from "@/lib/prestate/forms-store";
import { FOOTER_DESIGNS, HEADER_DESIGNS } from "@/lib/prestate/chrome-presets";
import { designsForWidget } from "@/lib/prestate/widget-designs";
import type { TemplateTypography, TypeKey } from "@/lib/prestate/design-system";
import { fontOptions, loadFonts } from "@/lib/prestate/design-system";
import { setRowColumnCount } from "@/lib/prestate/tree";
import { Collapse, FieldRow, SliderField, TextField, Toggle, SelectField, ColorField, LengthInput, Chip } from "@/components/prestate/ui";
import { RichTextEditor, sanitizeHtml } from "@/components/prestate/rich-text-editor";
import { MediaPicker } from "@/components/media-picker";
import { isIconFieldKey, isImageFieldKey, isImageListKey } from "@/lib/media";

// ---------------------------------------------------------------------------
// Generic content field editor (infers control from value type)
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<string, string> = {
  text: "TEXT",
  ctaLabel: "CTA LABEL",
  phone: "PHONE",
  whatsapp: "WHATSAPP",
};

function formatFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

const OBJECT_LIST_SEEDS: Record<string, string[]> = {
  links: ["label", "href"],
  socials: ["label", "href"],
};

// Per-widget object-array seeds — ensures "Add item" works even when list is empty
const WIDGET_OBJECT_SEEDS: Record<string, Record<string, string[]>> = {
  hero: { heroStats: ["value", "label"], highlights: ["label"] },
  overview: { stats: ["value", "label"], bullets: ["label"] },
  highlights: { items: ["icon", "value", "label"] },
  stats: { items: ["icon", "value", "label"] },
  amenities: { items: ["icon", "title", "desc"] },
  gallery: { captions: ["label"] },
  "video-gallery": { videos: ["title", "url"] },
  floorplans: { plans: ["name", "beds", "area", "price"] },
  "master-plan": { items: ["label", "value"] },
  pricing: { plans: ["name", "area", "price", "per", "features", "cta", "featured"] },
  features: { items: ["title", "text"] },
  specifications: { rows: ["label", "value"] },
  timeline: { items: ["title", "text"] },
  construction: { items: ["title", "text"] },
  "property-details": { items: ["label", "value"] },
  "unit-types": { items: ["name", "beds", "area", "price"] },
  "payment-plans": { items: ["plan", "amount", "details"] },
  "location-advantages": { items: ["icon", "title", "meta"] },
  "builder-profile": { items: ["title", "text"] },
  brochure: { gateFields: ["label", "type"] },
  downloads: { files: ["name", "url"] },
  testimonials: { items: ["name", "role", "quote", "rating"] },
  faq: { items: ["q", "a"] },
  tabs: { items: ["label", "body"] },
  carousel: { slides: ["caption", "image"] },
};

// Enumerated settings keys get a dropdown instead of a free-text field.
function enumOptions(fieldKey: string, widgetType?: string): { value: string; label: string }[] | null {
  if (fieldKey === "trigger") {
    return [
      { value: "load", label: "On page load" },
      { value: "delay", label: "After a delay" },
      { value: "scroll", label: "On scroll %" },
      { value: "exit", label: "On exit intent" },
      { value: "click", label: "Button click (by popup id)" },
      { value: "form-success", label: "After successful form submit" },
      { value: "url-param", label: "URL / query parameter" },
    ];
  }
  if (fieldKey === "action" && (widgetType === "button" || widgetType === "hero")) {
    return [
      { value: "link", label: "Open link / anchor" },
      { value: "url", label: "Open external URL" },
      { value: "popup", label: "Open popup (id)" },
      { value: "brochure", label: "Gated brochure download" },
      { value: "call", label: "Call phone number" },
      { value: "whatsapp", label: "WhatsApp chat" },
    ];
  }
  if (fieldKey === "style" && widgetType === "button") {
    return [
      { value: "solid", label: "Solid" },
      { value: "outline", label: "Outline" },
      { value: "ghost", label: "Ghost" },
    ];
  }
  if (fieldKey === "style" && widgetType === "stats") {
    return [
      { value: "cards", label: "Cards" },
      { value: "minimal", label: "Minimal numbers" },
    ];
  }
  if (fieldKey === "mode" && widgetType === "call-cta") {
    return [
      { value: "call", label: "Call phone number" },
      { value: "whatsapp", label: "Open WhatsApp chat" },
    ];
  }
  if (fieldKey === "layout" && widgetType === "cta-banner") {
    return [
      { value: "banner", label: "Full banner" },
      { value: "strip", label: "Slim strip" },
    ];
  }
  if (fieldKey === "size") {
    return [
      { value: "sm", label: "Small" },
      { value: "md", label: "Medium" },
      { value: "lg", label: "Large" },
    ];
  }
  if (fieldKey === "tag") {
    return [
      { value: "h1", label: "H1" },
      { value: "h2", label: "H2" },
      { value: "h3", label: "H3" },
      { value: "h4", label: "H4" },
      { value: "h5", label: "H5" },
      { value: "h6", label: "H6" },
    ];
  }
  if (fieldKey === "align") {
    return [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
      { value: "right", label: "Right" },
    ];
  }
  if (fieldKey === "side") {
    return [
      { value: "left", label: "Left" },
      { value: "right", label: "Right" },
    ];
  }
  if (fieldKey === "ctaShape") {
    return [
      { value: "circle", label: "Circle icon" },
      { value: "pill", label: "Pill button" },
    ];
  }
  if (fieldKey === "navStyle") {
    return [
      { value: "chip", label: "Chip pills" },
      { value: "plain", label: "Plain uppercase links" },
    ];
  }
  if (fieldKey.startsWith("primary") && fieldKey.endsWith("Action")) {
    return [
      { value: "link", label: "Open link / anchor" },
      { value: "popup", label: "Open popup (id)" },
      { value: "brochure", label: "Gated brochure download" },
      { value: "call", label: "Call phone number" },
    ];
  }
  if (fieldKey.startsWith("secondary") && fieldKey.endsWith("Action")) {
    return [
      { value: "link", label: "Open link / anchor" },
      { value: "popup", label: "Open popup (id)" },
      { value: "brochure", label: "Gated brochure download" },
      { value: "call", label: "Call phone number" },
    ];
  }
  return null;
}

function DesignPicker({ kind, value, onChange }: { kind: "header" | "footer"; value: string; onChange: (v: string) => void }) {
  const list = kind === "header" ? HEADER_DESIGNS : FOOTER_DESIGNS;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {list.map((d) => {
        const active = value === d.id;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onChange(d.id)}
            title={d.desc}
            style={{
              textAlign: "left",
              padding: "10px 11px",
              borderRadius: 11,
              border: active ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line-strong)",
              background: active ? "var(--ps-primary-soft)" : "#fff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: active ? "var(--ps-primary)" : "var(--ps-ink)" }}>{d.name}</div>
            <div style={{ fontSize: 10, color: "var(--ps-muted)", marginTop: 2, lineHeight: 1.35 }}>{d.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

function WidgetDesignPicker({ widgetType, value, onChange }: { widgetType: string; value: string; onChange: (v: string) => void }) {
  const list = designsForWidget(widgetType);
  return (
    <div style={{ display: "grid", gridTemplateColumns: list.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr", gap: 8 }}>
      {list.map((d) => {
        const active = value === d.id;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onChange(d.id)}
            title={d.desc}
            style={{
              textAlign: "left",
              padding: "10px 11px",
              borderRadius: 11,
              border: active ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line-strong)",
              background: active ? "var(--ps-primary-soft)" : "#fff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: active ? "var(--ps-primary)" : "var(--ps-ink)" }}>{d.name}</div>
            <div style={{ fontSize: 10, color: "var(--ps-muted)", marginTop: 2, lineHeight: 1.35 }}>{d.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

function ContentField({
  label,
  fieldKey,
  widgetType,
  value,
  onChange,
}: {
  label: string;
  fieldKey: string;
  widgetType?: string;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (typeof value === "boolean") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>{label}</label>
        <Toggle on={value} onChange={onChange} />
      </div>
    );
  }
  if (typeof value === "number") {
    return (
      <FieldRow label={label}>
        <TextField value={String(value)} onChange={(v) => onChange(Number(v))} />
      </FieldRow>
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0 || value.every((v) => typeof v === "string")) {
      return (
        <FieldRow label={label}>
          <StringList value={value as string[]} onChange={(v) => onChange(v)} media={isImageListKey(fieldKey) || isImageFieldKey(fieldKey)} />
        </FieldRow>
      );
    }
    return (
      <FieldRow label={label}>
        <ObjectList label={label} fieldKey={fieldKey} widgetType={widgetType} value={value as Record<string, unknown>[]} onChange={(v) => onChange(v)} seedKeys={OBJECT_LIST_SEEDS[fieldKey]} />
      </FieldRow>
    );
  }
  if (isIconFieldKey(fieldKey, widgetType) || (typeof value === "string" && isIconFieldKey(fieldKey))) {
    return (
      <MediaPicker
        kind="icon"
        label={label}
        value={String(value ?? "")}
        onChange={onChange}
        iconNames={Object.keys(SLUG_ICONS)}
      />
    );
  }
  if (typeof value === "string" && isImageFieldKey(fieldKey)) {
    return <MediaPicker kind="image" label={label} value={value} onChange={onChange} />;
  }
  const opts = enumOptions(fieldKey, widgetType);
  if (opts) {
    return (
      <FieldRow label={label}>
        <SelectField value={String(value ?? "")} onChange={(v) => onChange(v)} options={opts} placeholder="Choose" />
      </FieldRow>
    );
  }
  const str = String(value ?? "");
  return (
    <FieldRow label={label}>
      <TextField value={str} onChange={(v) => onChange(v)} placeholder={label} />
    </FieldRow>
  );
}

function StringList({ value, onChange, media }: { value: string[]; onChange: (v: string[]) => void; media?: boolean }) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...value];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  };
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, color: "var(--ps-muted)", textTransform: "uppercase", marginBottom: 6 }}>Items · {value.length} · drag to reorder</div>
      {value.map((item, i) => (
        <div
          key={i}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragEnd={() => setDragIndex(null)}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={() => { if (dragIndex != null) move(dragIndex, i); setDragIndex(null); }}
          style={{ display: "flex", gap: 6, marginBottom: 7, alignItems: media ? "flex-start" : "center", padding: 6, borderRadius: 9, border: dragIndex === i ? "1.5px dashed var(--ps-primary)" : "1px solid var(--ps-line)", background: dragIndex === i ? "var(--ps-primary-mist)" : "var(--ps-bg)", opacity: dragIndex === i ? 0.6 : 1 }}
        >
          <span title="Drag to reorder" style={{ color: "var(--ps-muted)", display: "inline-flex", cursor: "grab", padding: "6px 2px", flexShrink: 0 }}>
            <GripVertical size={12} />
          </span>
          <span style={{ width: 18, height: 18, borderRadius: 6, background: "var(--ps-panel-raised)", color: "var(--ps-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
          {media ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <MediaPicker kind="image" compact value={item} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} />
            </div>
          ) : (
            <div style={{ flex: 1, minWidth: 0 }}>
              <TextField value={item} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} />
            </div>
          )}
          <button type="button" title="Move up" disabled={i === 0} onClick={() => move(i, i - 1)} style={{ background: "none", border: "none", color: i === 0 ? "var(--ps-line-strong)" : "var(--ps-muted)", cursor: i === 0 ? "not-allowed" : "pointer", padding: 4, display: "inline-flex" }}>
            <ChevronUp size={12} />
          </button>
          <button type="button" title="Move down" disabled={i === value.length - 1} onClick={() => move(i, i + 1)} style={{ background: "none", border: "none", color: i === value.length - 1 ? "var(--ps-line-strong)" : "var(--ps-muted)", cursor: i === value.length - 1 ? "not-allowed" : "pointer", padding: 4, display: "inline-flex" }}>
            <ChevronDown size={12} />
          </button>
          <button type="button" title="Duplicate" onClick={() => { const next = [...value]; next.splice(i + 1, 0, item); onChange(next); }} style={{ background: "var(--ps-bg)", color: "var(--ps-muted)", border: "1px solid var(--ps-line)", borderRadius: 7, padding: "0 6px", cursor: "pointer", display: "inline-flex", alignItems: "center", height: 28 }}>
            <Copy size={12} />
          </button>
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} style={{ background: "var(--ps-danger-soft)", color: "var(--ps-danger)", border: "none", borderRadius: 7, padding: "0 7px", cursor: "pointer", display: "inline-flex", alignItems: "center", height: 28 }}>
            <X size={12} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, ""])}
        style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 9, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12, fontWeight: 800, cursor: "pointer", marginTop: 4 }}
      >
        <Plus size={13} /> Add item — {value.length + 1}
      </button>
      <div style={{ fontSize: 10.5, color: "var(--ps-muted)", marginTop: 6, textAlign: "center" }}>Unlimited · drag handle to reorder · duplicate keeps content</div>
    </div>
  );
}

function ObjectList({ label, fieldKey, widgetType, value, onChange, seedKeys }: { label: string; fieldKey?: string; widgetType?: string; value: Record<string, unknown>[]; onChange: (v: Record<string, unknown>[]) => void; seedKeys?: string[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  let keys = Object.keys(value[0] ?? {});
  if (!keys.length && seedKeys?.length) keys = seedKeys;
  if (!keys.length && widgetType && fieldKey && WIDGET_OBJECT_SEEDS[widgetType]?.[fieldKey]) keys = WIDGET_OBJECT_SEEDS[widgetType][fieldKey];
  if (!keys.length && widgetType && WIDGET_OBJECT_SEEDS[widgetType]) {
    const fallback = Object.values(WIDGET_OBJECT_SEEDS[widgetType])[0];
    if (fallback?.length) keys = fallback;
  }
  if (!keys.length) keys = ["title"];
  const titleKey = keys.find((k) => ["title", "name", "label", "value", "q", "heading"].includes(k)) ?? keys[0];

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    if (open === from) setOpen(to);
    else if (open != null && ((from < open && to >= open) || (from > open && to <= open))) {
      setOpen(open + (from < open ? -1 : 1));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, color: "var(--ps-muted)", textTransform: "uppercase" }}>{label} · {value.length}</span>
        <span style={{ fontSize: 10, color: "var(--ps-muted)" }}>Page → Section → {label}</span>
      </div>
      {value.map((item, i) => {
        const title = String(item[titleKey] ?? `${label} ${i + 1}`);
        const isOpen = open === i;
        const isDragging = dragIndex === i;
        const isDropTarget = dropIndex === i;
        return (
          <div
            key={i}
            draggable={!isOpen}
            onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = "move"; }}
            onDragEnd={() => { setDragIndex(null); setDropIndex(null); }}
            onDragOver={(e) => { e.preventDefault(); if (dragIndex != null && dragIndex !== i) setDropIndex(i); }}
            onDrop={(e) => { e.preventDefault(); if (dragIndex != null) move(dragIndex, i); setDragIndex(null); setDropIndex(null); }}
            style={{
              border: isOpen ? "1.5px solid var(--ps-primary)" : isDropTarget ? "1.5px dashed var(--ps-primary)" : "1px solid var(--ps-line)",
              borderRadius: 11,
              marginBottom: 7,
              background: isOpen ? "var(--ps-panel-raised)" : isDragging ? "rgba(109,93,252,0.06)" : "var(--ps-panel-raised)",
              overflow: "hidden",
              opacity: isDragging ? 0.5 : 1,
              boxShadow: isOpen ? "0 0 0 3px rgba(109,93,252,0.12)" : isDropTarget ? "0 0 0 3px var(--ps-primary-mist)" : undefined,
              transition: "all .12s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: isOpen ? "var(--ps-primary-mist)" : "var(--ps-bg)", cursor: isOpen ? "default" : "grab" }}>
              <span title="Drag to reorder" style={{ color: "var(--ps-muted)", display: "inline-flex", cursor: "grab", padding: 2, opacity: isOpen ? 0.35 : 1 }} onMouseDown={(e) => e.stopPropagation()}>
                <GripVertical size={12} />
              </span>
              <span style={{ width: 18, height: 18, borderRadius: 6, background: isOpen ? "var(--ps-primary)" : "var(--ps-panel-raised)", color: isOpen ? "#fff" : "var(--ps-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
              <button type="button" onClick={() => setOpen(isOpen ? null : i)} style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12.5, fontWeight: 700, color: isOpen ? "var(--ps-primary)" : "var(--ps-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {title}
              </button>
              <span style={{ display: "inline-flex", gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                <button type="button" title="Move up" disabled={i === 0} onClick={() => move(i, i - 1)} style={{ background: "none", border: "none", color: i === 0 ? "var(--ps-line-strong)" : "var(--ps-muted)", cursor: i === 0 ? "not-allowed" : "pointer", padding: 2, display: "inline-flex" }}>
                  <ChevronUp size={12} />
                </button>
                <button type="button" title="Move down" disabled={i === value.length - 1} onClick={() => move(i, i + 1)} style={{ background: "none", border: "none", color: i === value.length - 1 ? "var(--ps-line-strong)" : "var(--ps-muted)", cursor: i === value.length - 1 ? "not-allowed" : "pointer", padding: 2, display: "inline-flex" }}>
                  <ChevronDown size={12} />
                </button>
                <button type="button" title="Duplicate" onClick={() => { const next = [...value]; next.splice(i + 1, 0, { ...item }); onChange(next); setOpen(i + 1); }} style={{ background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer", padding: 2, display: "inline-flex" }}>
                  <Copy size={12} />
                </button>
                <button type="button" title="Delete" onClick={() => onChange(value.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#e5484d", cursor: "pointer", padding: 2, display: "inline-flex" }}>
                  <Trash2 size={12} />
                </button>
              </span>
            </div>
            <div style={{ fontSize: 10, color: isOpen ? "var(--ps-primary)" : "var(--ps-muted)", padding: isOpen ? "0 10px 6px" : "0 10px 0", fontWeight: 600 }}>{isOpen ? "Editing — changes save automatically" : `Item ${i + 1} · drag to reorder · click to edit`}</div>
            {isOpen ? (
              <div style={{ padding: "8px 12px 12px", borderTop: "1px solid var(--ps-line)", background: "var(--ps-panel-raised)" }}>
                {keys.map((k) => (
                  <ContentField key={k} fieldKey={k} widgetType={widgetType} label={k} value={item[k]} onChange={(v) => onChange(value.map((x, j) => (j === i ? { ...x, [k]: v } : x)))} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => {
          const empty: Record<string, unknown> = {};
          for (const k of keys) empty[k] = "";
          onChange([...value, empty]);
          setOpen(value.length);
        }}
        style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 9, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12, fontWeight: 800, cursor: "pointer", marginTop: 4 }}
      >
        <Plus size={13} /> Add {label} — item {value.length + 1}
      </button>
      <div style={{ fontSize: 10.5, color: "var(--ps-muted)", marginTop: 6, lineHeight: 1.5, textAlign: "center" }}>Unlimited items · drag to reorder · duplicate keeps content</div>
    </div>
  );
}



// ---------------------------------------------------------------------------
// Main settings panel
// ---------------------------------------------------------------------------

export function SettingsPanel({
  section,
  device,
  setDevice,
  onChange,
  typographyTokens,
  page,
  onPatchConfig,
}: {
  section: SectionInstance | null;
  device: Device;
  setDevice: (d: Device) => void;
  onChange: (patch: Partial<SectionInstance>) => void;
  /** Effective design-system tokens — used for placeholders & reset-to-global. */
  typographyTokens?: TemplateTypography;
  page?: LandingPageData;
  onPatchConfig?: (recipe: (c: SiteConfig) => SiteConfig) => void;
}) {
  const [tab, setTab] = useState<"content" | "style" | "advanced">("content");

  if (!section) {
    return (
      <div className="ps-inspector">
        <PanelHead title="Settings" subtitle="Select a section to edit" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center", color: "var(--ps-muted)" }}>
          <span style={{ width: 54, height: 54, borderRadius: 16, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <LayoutPanelTop size={24} />
          </span>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ps-ink)", marginBottom: 6 }}>Nothing selected</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, maxWidth: 240 }}>
            Click any section on the canvas, or add a widget from the library to start editing content, style and advanced settings.
          </div>
        </div>
      </div>
    );
  }

  const set = (patch: Partial<SectionInstance>) => onChange(patch);
  const style = section.style;
  const spacing = style.spacing ?? { padding: { top: 72, right: 24, bottom: 72, left: 24 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 24 };
  const colors = style.colors ?? {};
  const typo = style.typography ?? {};
  const border = style.border ?? {};
  const effects = style.effects ?? {};
  const layout = style.layout ?? {};
  const responsive = style.responsive ?? {};

  // --- Per-device editing -------------------------------------------------
  // On tablet/mobile tabs, spacing/layout/typography edits are stored as
  // overrides under style.responsive[device]; desktop edits the base style.
  const isDeviceTab = device !== "desktop";
  const deviceKey = device === "mobile" ? "mobile" : "tablet";
  const deviceOverride = responsive[deviceKey] ?? {};
  const spacingEff: typeof spacing = { ...spacing, ...(deviceOverride.spacing ?? {}) };
  const layoutEff: typeof layout = { ...layout, ...(deviceOverride.layout ?? {}) };
  const typoEff: typeof typo = { ...typo, ...(deviceOverride.typography ?? {}) };
  /** The values the badge/reset act on — the active tab's own overrides. */
  const badgeTypo = isDeviceTab ? (deviceOverride.typography ?? {}) : typo;

  const setStyle = (patch: Partial<SectionInstance["style"]>) => set({ style: { ...style, ...patch } });
  /** Write a style group to the base style (desktop) or the active device override. */
  const setGroup = (group: "spacing" | "layout" | "typography", patch: Record<string, unknown>) => {
    if (!isDeviceTab) {
      setStyle({ [group]: { ...((style[group] as Record<string, unknown>) ?? {}), ...patch } } as Partial<SectionInstance["style"]>);
      return;
    }
    const prevResp = style.responsive ?? {};
    const prevDev = prevResp[deviceKey] ?? {};
    setStyle({
      responsive: {
        ...prevResp,
        [deviceKey]: {
          ...prevDev,
          [group]: { ...((prevDev[group] as Record<string, unknown>) ?? {}), ...patch },
        },
      },
    });
  };
  const resetDeviceOverrides = () => {
    if (!isDeviceTab) return;
    const prevResp = { ...(style.responsive ?? {}) };
    delete prevResp[deviceKey];
    setStyle({ responsive: prevResp });
  };
  const hasDeviceOverride = Boolean(style.responsive?.[deviceKey]);
  const setNested = (key: keyof SectionInstance["style"], patch: Record<string, unknown>) =>
    setStyle({ [key]: { ...(style[key] as Record<string, unknown>), ...patch } } as Partial<SectionInstance["style"]>);

  return (
    <div className="ps-inspector">
      {/* Header */}
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--ps-line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {iconForSection(section)}
          </span>
          <input
            value={section.label}
            onChange={(e) => set({ label: e.target.value })}
            style={{ flex: 1, border: "none", outline: "none", fontWeight: 800, fontSize: 13.5, color: "var(--ps-ink)", background: "transparent", minWidth: 0 }}
          />
          <button
            type="button"
            title={section.hidden ? "Show section" : "Hide section"}
            onClick={() => set({ hidden: !section.hidden })}
            style={{ background: "none", border: "none", color: section.hidden ? "var(--ps-danger)" : "var(--ps-muted)", cursor: "pointer", padding: 4 }}
          >
            {section.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <div style={{ fontSize: 11, color: "var(--ps-muted)", marginTop: 3 }}>{section.type} widget</div>
      </div>

      {/* Tabs */}
      <div className="ps-inspector-tabs">
        {(
          [
            { key: "content", label: "Content", icon: <Type size={13} /> },
            { key: "style", label: "Style", icon: <Palette size={13} /> },
            { key: "advanced", label: "Advanced", icon: <SlidersHorizontal size={13} /> },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="ps-inspector-tab"
            data-active={tab === t.key ? "true" : "false"}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="ps-inspector-body">
        {tab === "content" ? (
          <>
            {section.type === "row" && !("columns" in section.settings) ? (
              <div style={{ borderBottom: "1px solid var(--ps-line)", padding: "11px 0" }}>
                <FieldRow label="Columns">
                  <SliderField
                    value={section.children?.length || 3}
                    min={1}
                    max={6}
                    onChange={(n) => {
                      const next = setRowColumnCount(section, n);
                      set({ settings: next.settings, children: next.children });
                    }}
                  />
                </FieldRow>
              </div>
            ) : null}
            {/* Text Editor widget — full rich-text editor replaces raw fields */}
            {section.type === "text" ? (
              <div style={{ borderBottom: "1px solid var(--ps-line)", padding: "11px 0" }}>
                <FieldRow label="Rich text">
                  <RichTextEditor
                    value={String(section.settings.html ?? "")}
                    fontOptions={fontOptions(loadFonts())}
                    onChange={(html) => set({ settings: { ...section.settings, html } })}
                  />
                </FieldRow>
                <div style={{ fontSize: 11, color: "var(--ps-muted)", lineHeight: 1.5 }}>
                  Tip: the text is also editable directly on the canvas — click it and type. Colours & spacing come from Design → Typography unless overridden in Style.
                </div>
              </div>
            ) : null}
            {section.type === "html" ? (
              <div style={{ borderBottom: "1px solid var(--ps-line)", padding: "11px 0" }}>
                <FieldRow label="HTML content">
                  <HtmlCodeEditor
                    value={String(section.settings.code ?? "")}
                    fontOptions={fontOptions(loadFonts())}
                    onChange={(code) => set({ settings: { ...section.settings, code } })}
                  />
                </FieldRow>
                <div style={{ fontSize: 11, color: "var(--ps-muted)", lineHeight: 1.5, marginTop: 8 }}>
                  Visual gives you the same toolbar as the Text Editor. Code is for pasting embed snippets (maps, videos, forms). Scripts are removed automatically for safety.
                </div>
              </div>
            ) : null}
            {section.type === "popup" ? <PopupSettingsEditor section={section} onChange={(p) => set({ settings: { ...section.settings, ...p } })} /> : null}
            {section.type === "lead-form" ? (
              <FormWidgetConditionalEditor section={section} onChange={set} page={page} onPatchConfig={onPatchConfig} />
            ) : null}
            {section.type !== "lead-form" && Object.entries(section.settings)
              .filter(([key]) => key !== "eyebrow")
              .filter(([key]) => !(section.type === "text" && (key === "text" || key === "html")))
              .filter(([key]) => !(section.type === "popup" && POPUP_MANAGED_KEYS.includes(key)))
              .filter(([key]) => !(section.type === "html" && key === "code"))
              .map(([key, value]) => (
              <div key={key} style={{ borderBottom: "1px solid var(--ps-line)", padding: "11px 0" }}>
                {section.type === "row" && key === "columns" ? (
                  <FieldRow label="Columns">
                    <SliderField
                      value={Number(section.children?.length || value) || 3}
                      min={1}
                      max={6}
                      onChange={(n) => {
                        const next = setRowColumnCount(section, n);
                        set({ settings: next.settings, children: next.children });
                      }}
                      suffix=""
                    />
                  </FieldRow>
                ) : key === "design" ? (
                  <FieldRow label={section.type === "header" || section.type === "footer" ? "Layout design" : "Premium design"}>
                    {section.type === "header" || section.type === "footer" ? (
                      <DesignPicker kind={section.type} value={String(value ?? "")} onChange={(v) => set({ settings: { ...section.settings, design: v } })} />
                    ) : (
                      <WidgetDesignPicker widgetType={section.type} value={String(value ?? "")} onChange={(v) => set({ settings: { ...section.settings, design: v } })} />
                    )}
                  </FieldRow>
                ) : (
                  <ContentField fieldKey={key} widgetType={section.type} label={formatFieldLabel(key)} value={value} onChange={(v) => set({ settings: { ...section.settings, [key]: v } })} />
                )}
              </div>
            ))}
          </>
        ) : tab === "style" ? (
          <>
            {/* device toggle */}
            <div style={{ display: "flex", gap: 4, background: "var(--ps-bg)", borderRadius: 9, padding: 3, margin: "12px 0 4px", border: "1px solid var(--ps-line)" }}>
              {DEVICES.map((d) => (
                <button key={d.key} type="button" title={d.label} onClick={() => setDevice(d.key)} style={{ flex: 1, padding: "6px 0", border: "none", borderRadius: 7, background: device === d.key ? "var(--ps-panel-raised)" : "transparent", color: device === d.key ? "var(--ps-primary)" : "var(--ps-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: device === d.key ? "0 1px 4px rgba(0,0,0,.3)" : "none" }}>
                  <d.icon size={14} />
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--ps-muted)", margin: "10px 2px 2px" }}>Responsive visibility</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "8px 0 16px" }}>
              {DEVICES.map((d) => {
                const hidden = responsive[`hide${d.key[0].toUpperCase()}${d.key.slice(1)}` as "hideDesktop"] === true;
                return (
                  <div key={d.key} style={{ border: "1px solid var(--ps-line)", borderRadius: 10, padding: "9px 10px", background: hidden ? "var(--ps-danger-soft)" : "var(--ps-bg)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--ps-slate)", marginBottom: 7 }}>
                      <d.icon size={12} /> {d.label}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontSize: 10.5, color: hidden ? "var(--ps-danger)" : "var(--ps-muted)", fontWeight: 600 }}>{hidden ? "Hidden" : "Visible"}</span>
                      <Toggle
                        size="sm"
                        on={!hidden}
                        onChange={(v) =>
                          setNested("responsive", { [`hide${d.key[0].toUpperCase()}${d.key.slice(1)}`]: !v })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {isDeviceTab ? (
              <div className="ps-fade-in" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: 10, border: "1px solid rgba(109,93,252,.35)", background: "var(--ps-primary-mist)", marginBottom: 14 }}>
                <Smartphone size={14} style={{ color: "var(--ps-primary)", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 11.5, lineHeight: 1.5, color: "var(--ps-primary)", fontWeight: 700 }}>
                  Editing {device === "mobile" ? "mobile" : "tablet"} values — spacing, layout & font changes below override desktop. Desktop stays untouched.
                </span>
                {hasDeviceOverride ? (
                  <button type="button" onClick={resetDeviceOverrides} title="Remove all overrides for this device" style={{ border: "none", background: "var(--ps-panel-raised)", color: "var(--ps-danger)", borderRadius: 7, fontSize: 10.5, fontWeight: 800, padding: "4px 9px", cursor: "pointer", flexShrink: 0 }}>
                    ↺ Reset
                  </button>
                ) : null}
              </div>
            ) : null}

            <Collapse title="Background" icon={<Palette size={14} />} defaultOpen>
              <ColorField
                value={colors.bg ?? "#ffffff"}
                onChange={(v) => setNested("colors", { bg: v, ...(v ? { gradient: "" } : {}) })}
              />
              <div style={{ fontSize: 10.5, color: "var(--ps-muted)", marginTop: -6, marginBottom: 8 }}>Picking a solid colour clears any gradient.</div>
              <div style={{ height: 4 }} />
              <MediaPicker kind="image" label="Background image" value={colors.image ?? ""} onChange={(v) => setNested("colors", { image: v })} />
              <div style={{ height: 10 }} />
              <ColorField value={colors.overlay ?? ""} onChange={(v) => setNested("colors", { overlay: v })} />
              <div style={{ height: 10 }} />
              <FieldRow label="Text Colour (section)" hint="Inherits into text that doesn't define its own colour. For a specific widget's font colour use Style → Typography → Text Colour.">
                <ColorField value={colors.text ?? "#111827"} onChange={(v) => setNested("colors", { text: v })} />
              </FieldRow>
              <div style={{ height: 4 }} />
              <TextField value={colors.gradient ?? ""} onChange={(v) => setNested("colors", { gradient: v })} placeholder="linear-gradient(…)" />
            </Collapse>

            <Collapse
              title="Typography"
              icon={<Type size={14} />}
              badge={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {hasTypographyOverride(badgeTypo) ? <Chip tone="warn">{isDeviceTab ? `${deviceKey} custom` : "Custom"}</Chip> : <Chip tone="primary">Global</Chip>}
                  {hasTypographyOverride(badgeTypo) ? (
                    // Not a <button> — this renders inside Collapse's `badge` slot, which
                    // sits inside Collapse's own <button> trigger; a nested <button> is
                    // invalid HTML and causes a hydration mismatch. stopPropagation keeps
                    // the click from also toggling the Collapse open/closed.
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isDeviceTab) {
                          const prevResp = { ...(style.responsive ?? {}) };
                          const prevDev = { ...(prevResp[deviceKey] ?? {}) };
                          delete prevDev.typography;
                          prevResp[deviceKey] = prevDev;
                          setStyle({ responsive: prevResp });
                        } else {
                          setStyle({ typography: {} });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.click();
                      }}
                      title={isDeviceTab ? `Reset ${deviceKey} typography to desktop values` : "Reset to template/global typography"}
                      style={{ display: "inline-flex", border: "none", background: "var(--ps-bg)", color: "var(--ps-primary)", borderRadius: 7, fontSize: 10.5, fontWeight: 800, padding: "3px 8px", cursor: "pointer" }}
                    >
                      ↺ Reset
                    </span>
                  ) : null}
                </span>
              }
            >
              {(() => {
                const key: TypeKey = section.type === "text" ? "p" : (["h1", "h2", "h3", "h4", "h5", "h6"].includes(String((section.settings as Record<string, unknown>).tag ?? "")) ? (String((section.settings as Record<string, unknown>).tag) as TypeKey) : "h2");
                const tok = typographyTokens?.[key]?.desktop;
                return !hasTypographyOverride(badgeTypo) && tok ? (
                  <div style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 9, background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 11, fontWeight: 700, lineHeight: 1.5 }}>
                    Using {key.toUpperCase()} global defaults{tok.fontSize != null ? ` · ${typeof tok.fontSize === "number" ? `${tok.fontSize}px` : tok.fontSize}` : ""}{tok.fontWeight ? ` · ${tok.fontWeight}` : ""}. Toggle any value below to override just this widget.
                  </div>
                ) : null;
              })()}
              <FieldRow label="Font Family">
                <SelectField
                  value={typoEff.fontFamily ?? ""}
                  onChange={(v) => setGroup("typography", { fontFamily: v })}
                  options={[{ value: "", label: "Global default" }, ...fontOptions(loadFonts())]}
                />
              </FieldRow>
              <FieldRow label="Font Size">
                <LengthInput
                  value={(typoEff.fontSize as number | string | undefined) ?? ""}
                  onChange={(v) => setGroup("typography", { fontSize: v })}
                  min={8}
                  max={120}
                />
              </FieldRow>
              <FieldRow label="Font Weight">
                <SliderField value={typoEff.fontWeight ?? 400} onChange={(v) => setGroup("typography", { fontWeight: v })} min={300} max={900} step={100} />
              </FieldRow>
              <FieldRow label="Line Height">
                <SliderField value={typoEff.lineHeight ?? 1.6} onChange={(v) => setGroup("typography", { lineHeight: v })} min={1} max={2.5} step={0.05} />
              </FieldRow>
              <FieldRow label="Letter Spacing">
                <SliderField value={typoEff.letterSpacing ?? 0} onChange={(v) => setGroup("typography", { letterSpacing: v })} min={-2} max={8} step={0.5} />
              </FieldRow>
              <FieldRow label="Text Transform">
                <SelectField
                  value={typoEff.textTransform ?? "none"}
                  onChange={(v) => setGroup("typography", { textTransform: v })}
                  options={[
                    { value: "none", label: "None" },
                    { value: "uppercase", label: "Uppercase" },
                    { value: "capitalize", label: "Capitalize" },
                    { value: "lowercase", label: "Lowercase" },
                  ]}
                />
              </FieldRow>
              <FieldRow label="Text Colour">
                <ColorField value={typoEff.textColor ?? ""} onChange={(v) => setGroup("typography", { textColor: v })} />
              </FieldRow>
              {section.type === "text" ? (
                <FieldRow label="Paragraph Spacing">
                  <LengthInput
                    value={(typoEff.paragraphSpacing as number | string | undefined) ?? ""}
                    onChange={(v) => setGroup("typography", { paragraphSpacing: v })}
                    min={0}
                    max={64}
                  />
                </FieldRow>
              ) : null}
            </Collapse>

            <Collapse title="Borders" icon={<Box size={14} />}>
              <FieldRow label="Border Width">
                <LengthInput value={border.width ?? 0} onChange={(v) => setNested("border", { width: v })} min={0} max={16} />
              </FieldRow>
              <FieldRow label="Border Style">
                <SelectField
                  value={border.style ?? "solid"}
                  onChange={(v) => setNested("border", { style: v })}
                  options={[
                    { value: "solid", label: "Solid" },
                    { value: "dashed", label: "Dashed" },
                    { value: "dotted", label: "Dotted" },
                    { value: "none", label: "None" },
                  ]}
                />
              </FieldRow>
              <FieldRow label="Border Radius">
                <LengthInput value={border.radius ?? 0} onChange={(v) => setNested("border", { radius: v })} min={0} max={80} />
              </FieldRow>
              <ColorField value={border.color ?? "#e8eaf1"} onChange={(v) => setNested("border", { color: v })} />
            </Collapse>

            <Collapse title="Effects" icon={<SparkleIcon />}>
              <FieldRow label="Box Shadow" right={<span style={{ fontSize: 10.5, color: "var(--ps-muted)" }}>css</span>}>
                <SelectField
                  value={effects.shadow ?? "none"}
                  onChange={(v) => setNested("effects", { shadow: v })}
                  options={[
                    { value: "none", label: "None" },
                    { value: "0 4px 18px rgba(17,24,39,.07)", label: "Soft" },
                    { value: "0 18px 46px rgba(17,24,39,.13)", label: "Large" },
                    { value: "0 10px 30px rgba(109,93,252,.28)", label: "Brand glow" },
                  ]}
                />
              </FieldRow>
              <FieldRow label="Blur" right={<span style={{ fontSize: 10.5, color: "var(--ps-muted)" }}>px</span>}>
                <SliderField value={effects.blur ?? 0} onChange={(v) => setNested("effects", { blur: v })} min={0} max={24} suffix="px" />
              </FieldRow>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Glassmorphism</span>
                <Toggle on={effects.glass === true} onChange={(v) => setNested("effects", { glass: v })} />
              </div>
              <FieldRow label="Animation">
                <SelectField
                  value={effects.animation ?? "none"}
                  onChange={(v) => setNested("effects", { animation: v })}
                  options={[
                    { value: "none", label: "None" },
                    { value: "fade-up", label: "Fade up" },
                    { value: "fade-in", label: "Fade in" },
                    { value: "zoom-in", label: "Zoom in" },
                  ]}
                />
              </FieldRow>
            </Collapse>

            <Collapse title="Layout" icon={<LayoutPanelTop size={14} />}>
              <FieldRow label="Width">
                <SelectField
                  value={layoutEff.width ?? "full"}
                  onChange={(v) => setGroup("layout", { width: v })}
                  options={[
                    { value: "full", label: "Full-width section (recommended)" },
                    { value: "boxed", label: "Boxed band (bg narrows too)" },
                    { value: "custom", label: "Custom band width" },
                  ]}
                />
              </FieldRow>
              <FieldRow
                label="Container Width"
                hint={
                  layoutEff.width === "full"
                    ? "Max width of the content inside the full-bleed background. Accepts px, rem, % — default 1200."
                    : layoutEff.width === "boxed"
                      ? "Total band width, background included. Default 1200."
                      : "Exact band width — e.g. 960, 80%, 75rem."
                }
              >
                <LengthInput value={layoutEff.customWidth ?? ""} onChange={(v) => setGroup("layout", { customWidth: v === "" ? undefined : v })} min={280} max={1920} />
              </FieldRow>
              <FieldRow label="Height">
                <SelectField
                  value={layoutEff.height ?? "auto"}
                  onChange={(v) => setGroup("layout", { height: v })}
                  options={[
                    { value: "auto", label: "Auto" },
                    { value: "fixed", label: "Fixed (px)" },
                    { value: "vh", label: "Full screen (100vh)" },
                  ]}
                />
              </FieldRow>
              {layoutEff.height === "fixed" ? (
                <FieldRow label="Fixed Height">
                  <LengthInput value={layoutEff.fixedHeight} onChange={(v) => setGroup("layout", { fixedHeight: v })} min={120} max={1400} />
                </FieldRow>
              ) : null}
              <FieldRow label="Alignment">
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { k: "left", icon: <AlignLeft size={15} /> },
                    { k: "center", icon: <AlignCenter size={15} /> },
                    { k: "right", icon: <AlignRight size={15} /> },
                  ].map((a) => (
                    <button key={a.k} type="button" onClick={() => setGroup("layout", { align: a.k })} style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: layoutEff.align === a.k ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line-strong)", background: layoutEff.align === a.k ? "var(--ps-primary-soft)" : "var(--ps-bg)", color: layoutEff.align === a.k ? "var(--ps-primary)" : "var(--ps-slate)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      {a.icon}
                    </button>
                  ))}
                </div>
              </FieldRow>
              <FieldRow label="Direction" hint="Rows collapse to a column on mobile — override here if needed.">
                <SelectField value={layoutEff.direction ?? "row"} onChange={(v) => setGroup("layout", { direction: v })} options={[{ value: "row", label: "Row (horizontal)" }, { value: "column", label: "Column (vertical)" }]} />
              </FieldRow>
            </Collapse>

            <Collapse title="Spacing" icon={<Move size={14} />}>
              <FieldRow label="Padding">
                <SpacingGrid values={spacingEff.padding} onChange={(k, v) => setGroup("spacing", { padding: { ...spacingEff.padding, [k]: v } })} />
              </FieldRow>
              <FieldRow label="Margin">
                <SpacingGrid values={spacingEff.margin} onChange={(k, v) => setGroup("spacing", { margin: { ...spacingEff.margin, [k]: v } })} />
              </FieldRow>
              <FieldRow label="Gap" hint="Accepts px, rem, % — e.g. 1.5rem">
                <LengthInput value={spacingEff.gap} onChange={(v) => setGroup("spacing", { gap: v })} min={0} max={80} />
              </FieldRow>
            </Collapse>
          </>
        ) : (
          <>
            <div style={{ marginTop: 10 }}>
              <FieldRow label="CSS Classes">
                <TextField value={style.advanced?.classes ?? ""} onChange={(v) => setNested("advanced", { classes: v })} placeholder=".hero .gold" />
              </FieldRow>
              <FieldRow label="Element ID">
                <TextField value={style.advanced?.elementId ?? ""} onChange={(v) => setNested("advanced", { elementId: v })} placeholder="hero-section" />
              </FieldRow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FieldRow label="Z-Index">
                  <SliderField value={style.advanced?.zIndex ?? 0} onChange={(v) => setNested("advanced", { zIndex: v })} min={0} max={100} />
                </FieldRow>
                <FieldRow label="Position">
                  <SelectField
                    value={style.advanced?.position ?? "relative"}
                    onChange={(v) => setNested("advanced", { position: v })}
                    options={[
                      { value: "relative", label: "Relative" },
                      { value: "absolute", label: "Absolute" },
                      { value: "fixed", label: "Fixed" },
                      { value: "sticky", label: "Sticky" },
                    ]}
                  />
                </FieldRow>
              </div>
              <FieldRow label="Custom CSS">
                <textarea className="ps-input" value={style.advanced?.customCss ?? ""} onChange={(e) => setNested("advanced", { customCss: e.target.value })} placeholder=".hero-section { … }" style={{ minHeight: 120, fontFamily: "monospace", fontSize: 12, resize: "vertical" }} />
              </FieldRow>
              <FieldRow label="Custom Attributes">
                <textarea className="ps-input" value={style.advanced?.attributes ?? ""} onChange={(e) => setNested("advanced", { attributes: e.target.value })} placeholder="data-ga-event=&quot;form-submit&quot;" style={{ minHeight: 70, fontFamily: "monospace", fontSize: 12, resize: "vertical" }} />
              </FieldRow>
            </div>
            <div style={{ marginTop: 14, display: "flex", alignItems: "flex-start", gap: 8, background: "var(--ps-bg)", border: "1px solid var(--ps-line)", borderRadius: 10, padding: 10, fontSize: 11.5, color: "var(--ps-muted)", lineHeight: 1.55 }}>
              <Code2 size={14} style={{ color: "var(--ps-primary)", flexShrink: 0, marginTop: 1 }} />
              Advanced settings are applied on the live page as inline styles, classes and attributes.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function hasTypographyOverride(typo: SectionInstance["style"]["typography"]): boolean {
  if (!typo) return false;
  return (["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform", "textColor", "paragraphSpacing"] as const).some(
    (k) => typo[k] != null && typo[k] !== "" && !(k === "fontWeight" && typo.fontWeight === 0) && !(k === "letterSpacing" && typo.letterSpacing === 0),
  );
}

const DEVICES: { key: Device; icon: typeof Monitor; label: string }[] = [
  { key: "desktop", icon: Monitor, label: "Desktop" },
  { key: "tablet", icon: Tablet, label: "Tablet" },
  { key: "mobile", icon: Smartphone, label: "Mobile" },
];

/**
 * Custom HTML widget editor — same experience as the Text Editor widget.
 * Visual: WYSIWYG toolbar (RichTextEditor). Code: raw HTML with a live,
 * sanitized preview. Both modes read/write the single `code` setting.
 */
function HtmlCodeEditor({
  value,
  onChange,
  fontOptions,
}: {
  value: string;
  onChange: (code: string) => void;
  fontOptions?: { value: string; label: string }[];
}) {
  const [mode, setMode] = useState<"visual" | "code">("visual");
  return (
    <div>
      <div style={{ display: "flex", gap: 4, background: "var(--ps-bg)", borderRadius: 9, padding: 3, marginBottom: 8, border: "1px solid var(--ps-line)" }}>
        {(
          [
            { key: "visual", label: "Visual" },
            { key: "code", label: "HTML code" },
          ] as const
        ).map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            style={{
              flex: 1,
              padding: "6px 0",
              border: "none",
              borderRadius: 7,
              fontSize: 11.5,
              fontWeight: 800,
              background: mode === m.key ? "var(--ps-panel-raised)" : "transparent",
              color: mode === m.key ? "var(--ps-primary)" : "var(--ps-muted)",
              cursor: "pointer",
              boxShadow: mode === m.key ? "0 1px 4px rgba(0,0,0,.3)" : "none",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "visual" ? (
        <RichTextEditor value={value} onChange={onChange} fontOptions={fontOptions} />
      ) : (
        <>
          <textarea
            className="ps-input"
            spellCheck={false}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={'<div style="padding:20px">Your embed code…</div>'}
            style={{ minHeight: 170, fontFamily: "'Courier New', monospace", fontSize: 12, lineHeight: 1.65, resize: "vertical", whiteSpace: "pre", overflowX: "auto" }}
          />
          <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--ps-muted)", margin: "12px 2px 6px" }}>Live preview</div>
          <div
            className="ps-rich ps-fade-in"
            // Builder-authored content — sanitised exactly like the canvas/live render.
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
            style={{ minHeight: 56, padding: "12px 14px", background: "#fff", border: "1px solid var(--ps-line)", borderRadius: 10, fontSize: 13.5, color: "var(--ps-ink)", overflowWrap: "break-word" }}
          />
          <style>{`.ps-rich p { margin: 0 0 0.8em; } .ps-rich a { color: var(--ps-primary); }`}</style>
        </>
      )}
    </div>
  );
}

// Popup settings rendered by the dedicated editor below — hidden from the
// generic field list so each option appears exactly once.
const POPUP_MANAGED_KEYS = [
  "trigger",
  "delaySeconds",
  "scrollPercent",
  "urlParam",
  "frequency",
  "oncePerSession",
  "conditionMatch",
  "conditions",
];

const TRIGGER_OPTIONS = [
  { value: "load", label: "On page load" },
  { value: "delay", label: "After a delay" },
  { value: "scroll", label: "On scroll %" },
  { value: "exit", label: "On exit intent" },
  { value: "click", label: "Button click" },
  { value: "form-success", label: "After form submit" },
  { value: "url-param", label: "URL parameter" },
];

const FREQUENCY_OPTIONS = [
  { value: "session", label: "Once per visit (recommended)" },
  { value: "always", label: "Every page visit" },
  { value: "once", label: "Only once — never again" },
];

interface PopupConditionRow {
  type: string;
  value?: string | number;
}

function PopupSettingsEditor({
  section,
  onChange,
}: {
  section: SectionInstance;
  /** Patch only settings — receives a full replacement for section.settings. */
  onChange: (settingsPatch: Record<string, unknown>) => void;
}) {
  const st = section.settings as Record<string, unknown>;
  const trigger = String(st.trigger ?? "delay");
  const frequency = String(st.frequency ?? (st.oncePerSession === false ? "always" : "session"));
  const matchAll = st.conditionMatch !== "any";
  const conditions = Array.isArray(st.conditions) ? (st.conditions as PopupConditionRow[]) : [];

  const patchCondition = (i: number, p: Partial<PopupConditionRow>) =>
    onChange({ conditions: conditions.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const removeCondition = (i: number) => onChange({ conditions: conditions.filter((_, j) => j !== i) });
  const addCondition = () => {
    const used = new Set(conditions.map((c) => c.type));
    const type = ["scroll", "delay", "device"].find((t) => !used.has(t)) ?? "scroll";
    const defaults: Record<string, string | number> = { scroll: 50, delay: 5, device: "mobile" };
    onChange({ conditions: [...conditions, { type, value: defaults[type] }] });
  };

  return (
    <div style={{ borderBottom: "1px solid var(--ps-line)", padding: "11px 0" }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--ps-primary)", marginBottom: 4 }}>When to show</div>
      <FieldRow label="Trigger">
        <SelectField value={trigger} onChange={(v) => onChange({ trigger: v })} options={TRIGGER_OPTIONS} />
      </FieldRow>
      {trigger === "delay" ? (
        <FieldRow label="Delay before showing" hint="Seconds after the page opens.">
          <LengthInput value={Number(st.delaySeconds ?? 3) || 3} onChange={(v) => onChange({ delaySeconds: Number(v) || 0 })} min={0} max={120} />
        </FieldRow>
      ) : null}
      {trigger === "scroll" ? (
        <FieldRow label="Scroll depth" hint="Opens when the visitor scrolls this far down the page.">
          <SliderField value={Number(st.scrollPercent ?? 40) || 40} onChange={(v) => onChange({ scrollPercent: v })} min={5} max={100} step={5} suffix="%" />
        </FieldRow>
      ) : null}
      {trigger === "url-param" ? (
        <FieldRow label="URL parameter" hint={`Add ?${String(st.urlParam || "popup")}=${String(st.popupId || "") || "id"} to the page URL.`}>
          <TextField value={String(st.urlParam ?? "")} onChange={(v) => onChange({ urlParam: v })} placeholder="popup" />
        </FieldRow>
      ) : null}
      {trigger === "click" ? (
        <div style={{ margin: "8px 2px", padding: "8px 10px", borderRadius: 9, background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 11.5, lineHeight: 1.55 }}>
          Opens when a visitor clicks any Button whose action is “Open popup” with this popup id{String(st.popupId || "") ? `: ${String(st.popupId)}` : ""}. Set the id below.
        </div>
      ) : null}
      <FieldRow label="Popup ID" hint="Buttons and forms open this popup by its id — keep it unique on the page.">
        <TextField value={String(st.popupId ?? "")} onChange={(v) => onChange({ popupId: v })} placeholder="offer-popup" />
      </FieldRow>
      <FieldRow label="Show how often?">
        <SelectField value={frequency} onChange={(v) => onChange({ frequency: v, oncePerSession: undefined })} options={FREQUENCY_OPTIONS} />
      </FieldRow>

      <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--ps-primary)", margin: "14px 0 2px" }}>Extra conditions</div>
      <div style={{ fontSize: 11, color: "var(--ps-muted)", marginBottom: 8, lineHeight: 1.5 }}>
        Optional rules on top of the trigger.
      </div>
      {conditions.length > 1 ? (
        <FieldRow label="Match">
          <SelectField
            value={matchAll ? "all" : "any"}
            onChange={(v) => onChange({ conditionMatch: v })}
            options={[
              { value: "all", label: "ALL conditions (AND)" },
              { value: "any", label: "ANY condition (OR)" },
            ]}
          />
        </FieldRow>
      ) : null}
      {conditions.map((c, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 7 }}>
          <SelectField
            value={c.type}
            onChange={(v) => patchCondition(i, { type: v, value: v === "scroll" ? 50 : v === "delay" ? 5 : "mobile" })}
            options={[
              { value: "scroll", label: "Scrolled at least…" },
              { value: "delay", label: "After … seconds" },
              { value: "device", label: "Device is…" },
            ]}
          />
          {c.type === "scroll" ? (
            <div style={{ width: 86, flexShrink: 0 }}>
              <LengthInput value={Number(c.value ?? 50)} onChange={(v) => patchCondition(i, { value: Number(v) || 0 })} min={5} max={100} />
            </div>
          ) : c.type === "delay" ? (
            <div style={{ width: 86, flexShrink: 0 }}>
              <LengthInput value={Number(c.value ?? 5)} onChange={(v) => patchCondition(i, { value: Number(v) || 0 })} min={1} max={120} />
            </div>
          ) : (
            <div style={{ width: 110, flexShrink: 0 }}>
              <SelectField
                value={String(c.value ?? "mobile")}
                onChange={(v) => patchCondition(i, { value: v })}
                options={[
                  { value: "desktop", label: "Desktop" },
                  { value: "tablet", label: "Tablet" },
                  { value: "mobile", label: "Mobile" },
                ]}
              />
            </div>
          )}
          <button type="button" title="Remove condition" onClick={() => removeCondition(i)} style={{ background: "var(--ps-danger-soft)", color: "var(--ps-danger)", border: "none", borderRadius: 8, padding: 7, cursor: "pointer", display: "inline-flex", flexShrink: 0 }}>
            <X size={13} />
          </button>
        </div>
      ))}
      {conditions.length < 3 ? (
        <button
          type="button"
          onClick={addCondition}
          style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px", borderRadius: 9, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          <Plus size={13} /> Add condition
        </button>
      ) : null}

      <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--ps-primary)", margin: "14px 0 2px" }}>Inside the popup</div>
      <FieldRow label="Headline">
        <TextField value={String(st.heading ?? "")} onChange={(v) => onChange({ heading: v })} placeholder="Get Brochure" />
      </FieldRow>
      <FieldRow label="Message">
        <TextField value={String(st.text ?? "")} onChange={(v) => onChange({ text: v })} placeholder="Share your details to download." />
      </FieldRow>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "8px 0" }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Lead form inside popup</span>
        <Toggle on={st.showForm === true} onChange={(v) => onChange({ showForm: v })} />
      </div>
      {st.showForm === true ? (
        <>
          <FieldRow label="Submit button label">
            <TextField value={String(st.formButton ?? "")} onChange={(v) => onChange({ formButton: v })} placeholder="Submit & Download" />
          </FieldRow>
          <FieldRow label="Auto-download file after submit" hint="Starts a download once the form is valid. Leave empty to skip.">
            <TextField value={String(st.pdfUrl ?? "")} onChange={(v) => onChange({ pdfUrl: v })} placeholder="/brochure/project.pdf" />
          </FieldRow>
        </>
      ) : (
        <FieldRow label="Button label & link">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <TextField value={String(st.cta ?? "")} onChange={(v) => onChange({ cta: v })} placeholder="Download" />
            <TextField value={String(st.link ?? "")} onChange={(v) => onChange({ link: v })} placeholder="#lead-form" />
          </div>
        </FieldRow>
      )}
      <FieldRow label="Success message">
        <TextField value={String(st.successMessage ?? "")} onChange={(v) => onChange({ successMessage: v })} placeholder="Thanks! We'll be in touch shortly." />
      </FieldRow>
    </div>
  );
}

function FormWidgetConditionalEditor({ section, onChange, page, onPatchConfig }: { section: SectionInstance; onChange: (patch: Partial<SectionInstance>) => void; page?: LandingPageData; onPatchConfig?: (r: (c: SiteConfig) => SiteConfig) => void }) {
  const [library, setLibrary] = useState<FormDefinition[]>(() => loadFormLibrary());
  const refresh = () => setLibrary(loadFormLibrary());
  useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => { if (e.key === "prestate.forms.v1") refresh(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("focus", refresh); };
  }, [page?.id]);
  const selectedFormId = String((section.settings as Record<string, unknown>).formId ?? "");
  const pageCfg = page ? ensureConfig(page) : null;
  const pageForm = pageCfg?.form;
  const libraryForm = selectedFormId ? library.find((f) => f.id === selectedFormId) : undefined;
  const form = libraryForm ?? pageForm;
  const fields = form?.fields ?? [];
  const patchLogic = (fieldId: string, logic: FormLeadField["logic"]) => {
    if (libraryForm) {
      const next = library.map((f) => (f.id === libraryForm.id ? { ...f, fields: f.fields.map((fld) => (fld.id === fieldId ? { ...fld, logic } : fld)), updatedAt: new Date().toISOString() } : f));
      saveFormLibrary(next);
      setLibrary(next);
      return;
    }
    if (!onPatchConfig) return;
    onPatchConfig((c) => ({ ...c, form: { ...c.form, fields: c.form.fields.map((f) => (f.id === fieldId ? { ...f, logic } : f)) } }));
  };
  const selectOptions: { value: string; label: string }[] = [
    { value: "", label: pageForm ? `Page form — ${pageForm.name || "Default"} (${pageForm.fields.length} fields)` : "Page form (default)" },
    ...library.map((f) => ({ value: f.id, label: `${f.name} — ${f.fields.length} fields` })),
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ borderBottom: "1px solid var(--ps-line)", padding: "11px 0" }}>
        <FieldRow label="Form to display" hint="Dropdown shows whatever you created in Forms — pick any form. Each has its own embed code, fields, PDF & thank-you page.">
          <SelectField value={selectedFormId} onChange={(v) => onChange({ settings: { ...section.settings, formId: v } })} options={selectOptions} placeholder="Page form" />
        </FieldRow>
        {library.length === 0 ? (
          <div style={{ fontSize: 11.5, color: "var(--ps-muted)", background: "var(--ps-bg)", border: "1px dashed var(--ps-line-strong)", borderRadius: 8, padding: "8px 10px", lineHeight: 1.5 }}>
            No library forms yet — open <strong>Forms</strong> module and click <em>Create new form</em>. After saving, it appears here automatically.
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "var(--ps-muted)", lineHeight: 1.5 }}>Selected: <strong style={{ color: "var(--ps-slate)" }}>{form?.name ?? "—"}</strong> {libraryForm ? <span>· embed <code style={{ fontSize: 10 }}>{libraryForm.embed.id}</code></span> : <span>· page form</span>}</div>
        )}
      </div>
      <div style={{ padding: "8px 10px", borderRadius: 9, background: "var(--ps-primary-mist)", border: "1px solid rgba(109,93,252,.18)", margin: "10px 0" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ps-primary)", display: "flex", alignItems: "center", gap: 6 }}><GitBranch size={13} /> Conditional Form</div>
        <div style={{ fontSize: 11.5, color: "var(--ps-slate)", lineHeight: 1.5, marginTop: 4 }}>This widget renders only the form (pure). Build any conditional flow here — it edits the selected form’s logic directly (same as Forms module). Edits stay independent per form.</div>
      </div>
      {fields.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--ps-muted)", padding: "10px", border: "1px dashed var(--ps-line-strong)", borderRadius: 9, textAlign: "center" }}>No fields yet — add fields in Forms module, then set conditions here. Every field can be shown/hidden based on previous answers.</div>
      ) : (
        fields.map((fld) => (
          <div key={fld.id} style={{ borderBottom: "1px solid var(--ps-line)", padding: "10px 0" }}>
            <Collapse title={`${fld.label} — ${fld.type}${fld.required ? " *" : ""}`} icon={<GitBranch size={13} />} >
              <FormFieldLogicEditor field={fld} allFields={fields} onChange={(logic) => patchLogic(fld.id, logic)} />
            </Collapse>
          </div>
        ))
      )}
      <div style={{ fontSize: 11, color: "var(--ps-muted)", lineHeight: 1.5, padding: "8px 2px" }}>Conditions use field ID (stable) and preview hides/shows instantly on the canvas.</div>
    </div>
  );
}

function FormFieldLogicEditor({ field, allFields, onChange }: { field: FormLeadField; allFields: FormLeadField[]; onChange: (logic: FormLeadField["logic"]) => void }) {
  const logic = field.logic;
  const enabled = Boolean(logic?.enabled);
  const match = logic?.match ?? "all";
  const rules = logic?.rules ?? [];
  const candidates = allFields.filter((f) => f.id !== field.id && f.type !== "hidden");
  const update = (patch: Partial<NonNullable<FormLeadField["logic"]>>) => {
    onChange({ enabled, match, rules: rules.map((r) => ({ ...r })), ...patch });
  };
  const setEnabled = (v: boolean) => update({ enabled: v });
  const setMatch = (v: "any" | "all") => update({ match: v });
  const addRule = () => {
    const target = candidates[0];
    if (!target) return;
    update({ enabled: true, rules: [...rules, { field: target.id, op: "eq", value: "" }] });
  };
  const patchRule = (i: number, patch: Partial<{ field: string; op: FieldLogicOp; value: string }>) => update({ rules: rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  const removeRule = (i: number) => update({ rules: rules.filter((_, idx) => idx !== i) });
  const duplicateRule = (i: number) => update({ rules: [...rules.slice(0, i + 1), { ...rules[i] }, ...rules.slice(i + 1)] });
  const moveRule = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rules.length) return;
    const next = [...rules];
    const [item] = next.splice(i, 1);
    next.splice(j, 0, item);
    update({ rules: next });
  };
  const iconBtn = (disabled: boolean): React.CSSProperties => ({ background: "none", border: "none", color: "var(--ps-muted)", cursor: disabled ? "default" : "pointer", padding: 4, display: "inline-flex", opacity: disabled ? 0.35 : 1 });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Show this field only when…</span>
        <Toggle on={enabled} onChange={setEnabled} />
      </div>
      {!enabled ? (
        <p style={{ fontSize: 11.5, color: "var(--ps-muted)", margin: 0, lineHeight: 1.5 }}>Off — always visible. Turn on to condition on previous answers.</p>
      ) : candidates.length === 0 ? (
        <p style={{ fontSize: 11.5, color: "var(--ps-muted)", margin: 0, lineHeight: 1.5 }}>Add another field first.</p>
      ) : (
        <>
          {rules.length > 1 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "var(--ps-slate)" }}>
              <span>Match</span>
              <SelectField value={match} onChange={(v) => setMatch(v as "any" | "all")} options={[{ value: "all", label: "ALL (AND)" }, { value: "any", label: "ANY (OR)" }]} />
              <span>rules</span>
            </div>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rules.map((r, i) => {
              const controlling = allFields.find((f) => f.id === r.field);
              const op = FIELD_LOGIC_OPS.find((o) => o.op === r.op);
              const showValue = op ? op.needsValue : true;
              const isChoice = controlling?.type === "select" || controlling?.type === "radio";
              return (
                <div key={i} style={{ border: "1px solid var(--ps-line)", borderRadius: 10, padding: 9, background: "var(--ps-bg)", display: "flex", flexDirection: "column", gap: 7 }}>
                  {i > 0 ? <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ps-primary)" }}>{match === "all" ? "AND" : "OR"}</div> : null}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 120px", minWidth: 110 }}><SelectField value={r.field} onChange={(v) => patchRule(i, { field: v })} options={candidates.map((f) => ({ value: f.id, label: f.label }))} /></div>
                    <div style={{ flex: "1 1 110px", minWidth: 100 }}><SelectField value={r.op} onChange={(v) => patchRule(i, { op: v as FieldLogicOp })} options={FIELD_LOGIC_OPS.map((o) => ({ value: o.op, label: o.label }))} /></div>
                  </div>
                  {showValue ? (<div>{isChoice ? (<SelectField value={r.value} onChange={(v) => patchRule(i, { value: v })} options={[{ value: "", label: "— choose —" }, ...(controlling?.options ?? []).map((o) => ({ value: o, label: o }))]} />) : (<TextField value={r.value} onChange={(v) => patchRule(i, { value: v })} placeholder="value to compare" />)}</div>) : null}
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button type="button" disabled={i===0} onClick={() => moveRule(i,-1)} style={iconBtn(i===0)}><ChevronUp size={13} /></button>
                    <button type="button" disabled={i===rules.length-1} onClick={() => moveRule(i,1)} style={iconBtn(i===rules.length-1)}><ChevronDownIcon size={13} /></button>
                    <button type="button" onClick={() => duplicateRule(i)} style={iconBtn(false)}><CopyIcon size={13} /></button>
                    <button type="button" onClick={() => removeRule(i)} style={{ ...iconBtn(false), color: "#e5484d" }}><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={addRule} disabled={candidates.length===0} style={{ padding: "9px", borderRadius: 10, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add condition</button>
        </>
      )}
    </div>
  );
}

function PanelHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ps-line)" }}>
      <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 11.5, color: "var(--ps-muted)", marginTop: 2 }}>{subtitle}</div>
    </div>
  );
}

function SpacingGrid({
  values,
  onChange,
}: {
  values?: { top?: number | string; right?: number | string; bottom?: number | string; left?: number | string };
  onChange: (k: "top" | "right" | "bottom" | "left", v: number | string) => void;
}) {
  const v = values ?? { top: 0, right: 0, bottom: 0, left: 0 };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
      {(["top", "right", "bottom", "left"] as const).map((k) => (
        <div key={k} style={{ background: "var(--ps-bg)", border: "1px solid var(--ps-line)", borderRadius: 9, padding: "6px 8px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--ps-muted)", marginBottom: 4 }}>{k}</div>
          <LengthInput value={v[k]} onChange={(val) => onChange(k, val)} min={0} max={240} />
        </div>
      ))}
    </div>
  );
}

function iconForSection(s: SectionInstance) {
  const map: Record<string, typeof Palette> = {
    header: Monitor,
    footer: Tablet,
    hero: LayoutPanelTop,
    highlights: Palette,
    overview: LayoutPanelTop,
    amenities: Palette,
    floorplans: Palette,
    gallery: Palette,
    "virtual-tour": Palette,
    "location-advantages": Palette,
    pricing: Palette,
    testimonials: Palette,
    faq: Palette,
    "cta-banner": Palette,
    "sticky-cta": Palette,
    announcement: Palette,
  };
  const I = map[s.type] ?? LayoutPanelTop;
  return <I size={15} />;
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}