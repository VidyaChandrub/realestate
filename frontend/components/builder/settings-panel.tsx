"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import type {
  ElementNode,
  LpDocument,
  LpDomain,
  LpSeo,
  LpTracking,
  RowNode,
} from "@/lib/lp-types";
import type { Selection } from "@/lib/lp-edit";
import {
  setColumnSettings,
  setElementSettings,
  setRowSettings,
} from "@/lib/lp-edit";
import { WIDGET_MAP, type FieldDef } from "@/lib/lp-widgets";
import { Icon, ICON_OPTIONS } from "@/lib/lp-icon";
import { MediaPicker } from "@/components/media-picker";

// ---------------------------------------------------------------------------
// Generic field renderer
// ---------------------------------------------------------------------------

export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value?: unknown;
  onChange: (v: unknown) => void;
}) {
  const styles = {
    label: {
      display: "block",
      fontSize: 11,
      fontWeight: 700,
      color: "#64748b",
      textTransform: "uppercase" as const,
      letterSpacing: 0.4,
      marginBottom: 5,
    },
    input: {
      width: "100%",
      background: "#fff",
      border: "1px solid #e2e8f0",
      color: "#0f172a",
      borderRadius: 8,
      padding: "7px 10px",
      fontSize: 13,
      outline: "none",
      boxSizing: "border-box" as const,
    },
    wrap: { marginBottom: 12 },
  };

  switch (field.type) {
    case "textarea":
    case "code":
      return (
        <div style={styles.wrap}>
          <label style={styles.label}>{field.label}</label>
          <textarea
            style={{
              ...styles.input,
              minHeight: field.rows ? field.rows * 18 + 20 : 70,
              fontFamily: field.type === "code" ? "monospace" : undefined,
              resize: "vertical",
            }}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {field.help ? <div style={{ fontSize: 11, color: "#6d76a0", marginTop: 4 }}>{field.help}</div> : null}
        </div>
      );
    case "number":
      return (
        <div style={styles.wrap}>
          <label style={styles.label}>{field.label}</label>
          <input
            type="number"
            style={styles.input}
            value={(value as number | string) ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </div>
      );
    case "slider":
      return (
        <div style={styles.wrap}>
          <label style={styles.label}>
            {field.label} <span style={{ color: "#c7cdf0" }}>{value as number}</span>
          </label>
          <input
            type="range"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            value={(value as number) ?? field.min}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#6366f1" }}
          />
        </div>
      );
    case "select":
      return (
        <div style={styles.wrap}>
          <label style={styles.label}>{field.label}</label>
          <select
            style={styles.input}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">—</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    case "color":
      return (
        <div style={styles.wrap}>
          <label style={styles.label}>{field.label}</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="color"
              value={(value as string) ?? "#000000"}
              onChange={(e) => onChange(e.target.value)}
              style={{ width: 40, height: 32, border: "none", background: "transparent", cursor: "pointer" }}
            />
            <input
              type="text"
              style={styles.input}
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </div>
      );
    case "toggle":
      return (
        <div style={{ ...styles.wrap, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ ...styles.label, marginBottom: 0 }}>{field.label}</label>
          <button
            type="button"
            onClick={() => onChange(!value)}
            style={{
              width: 40,
              height: 22,
              borderRadius: 999,
              border: "none",
              background: value ? "#4f46e5" : "#e2e8f0",
              position: "relative",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                left: value ? 20 : 3,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#fff",
                transition: "left .15s",
              }}
            />
          </button>
        </div>
      );
    case "image":
      return (
        <div style={styles.wrap}>
          <MediaPicker kind="image" label={field.label} value={(value as string) ?? ""} onChange={onChange} />
        </div>
      );
    case "icon":
      return (
        <div style={styles.wrap}>
          <MediaPicker
            kind="icon"
            label={field.label}
            value={(value as string) ?? ""}
            onChange={onChange}
            iconNames={(field.options ?? ICON_OPTIONS).map((o) => o.value)}
          />
        </div>
      );
    case "list": {
      const items = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div style={styles.wrap}>
          <label style={styles.label}>{field.label}</label>
          {items.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                style={styles.input}
                value={item}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  onChange(next);
                }}
              />
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                style={{ background: "#fff1f2", color: "#ef4444", border: "none", borderRadius: 6, padding: "0 10px", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange([...items, ""])}
            style={{ background: "#f1f5f9", color: "#4f46e5", border: "1px dashed #c7d2fe", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", width: "100%" }}
          >
            + Add item
          </button>
        </div>
      );
    }
    case "object-list": {
      const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
      return (
        <div style={styles.wrap}>
          <label style={styles.label}>{field.label}</label>
          {items.map((item, i) => (
            <ObjectItemEditor
              key={i}
              item={item}
              fields={field.itemFields ?? []}
              onPatch={(patch) => {
                const next = [...items];
                next[i] = { ...item, ...patch };
                onChange(next);
              }}
              onRemove={() => onChange(items.filter((_, j) => j !== i))}
            />
          ))}
          <button
            type="button"
            onClick={() => {
              const empty: Record<string, unknown> = {};
              for (const f of field.itemFields ?? []) {
                empty[f.key] = f.type === "toggle" ? false : "";
              }
              onChange([...items, empty]);
            }}
            style={{ background: "#f1f5f9", color: "#4f46e5", border: "1px dashed #c7d2fe", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", width: "100%" }}
          >
            + Add {field.label}
          </button>
        </div>
      );
    }
    default:
      return (
        <div style={styles.wrap}>
          <label style={styles.label}>{field.label}</label>
          <input
            type="text"
            style={styles.input}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      );
  }
}

function ObjectItemEditor({
  item,
  fields,
  onPatch,
  onRemove,
}: {
  item: Record<string, unknown>;
  fields: FieldDef[];
  onPatch: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const title = fields[0] ? String(item[fields[0].key] ?? "Item") : "Item";
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 8, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          background: "#f8fafc",
          color: "#334155",
          border: "none",
          padding: "8px 10px",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{String(title)}</span>
        <span onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ color: "#ef4444", display: "inline-flex" }}><X size={14} /></span>
      </button>
      {open ? (
        <div style={{ padding: 10, background: "#f8fafc" }}>
          {fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={item[field.key]}
              onChange={(v) => onPatch({ [field.key]: v })}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible settings section
// ---------------------------------------------------------------------------

export function Section({ title, children, defaultOpen = false }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid #f1f5f9", padding: "14px 0" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          color: "#0f172a",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          padding: "2px",
          borderRadius: 6,
          transition: "color .15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#4f46e5"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#0f172a"; }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{title}</span>
        {open ? <ChevronDown size={16} style={{ color: "#94a3b8", flexShrink: 0 }} /> : <ChevronRight size={16} style={{ color: "#94a3b8", flexShrink: 0 }} />}
      </button>
      {open ? <div style={{ paddingTop: 14 }}>{children}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings panel — driven by selection
// ---------------------------------------------------------------------------

export function SettingsPanel({
  document,
  selection,
  patchDocument,
  seo,
  setSeo,
  tracking,
  setTracking,
  domain,
  setDomain,
}: {
  document: LpDocument;
  selection: Selection;
  patchDocument: (doc: LpDocument) => void;
  seo: LpSeo | null;
  setSeo: (seo: LpSeo) => void;
  tracking: LpTracking | null;
  setTracking: (tracking: LpTracking) => void;
  domain: LpDomain | null;
  setDomain: (domain: LpDomain) => void;
}) {
  const [tab, setTab] = useState<"design" | "seo" | "tracking" | "domain">("design");

  // ---- locate the selected node ----
  const findTarget = (): { title: string; subtitle: string; content: ReactNode } | null => {
    if (selection.kind === "page") {
      return {
        title: "Page Settings",
        subtitle: "Global design system",
        content: (
          <PageSettings
            settings={document?.settings}
            onChange={(s) => patchDocument({ ...document, settings: s })}
          />
        ),
      };
    }
    if (selection.kind === "header") {
      return {
        title: "Header",
        subtitle: "Logo, navigation and CTAs",
        content: (
          <HeaderSettings
            header={document.header}
            patch={(patch) =>
              patchDocument({ ...document, header: { ...document.header, ...patch } })
            }
          />
        ),
      };
    }
    if (selection.kind === "footer") {
      return {
        title: "Footer",
        subtitle: "Footer columns and links",
        content: (
          <FooterSettings
            footer={document.footer}
            patch={(patch) =>
              patchDocument({ ...document, footer: { ...document.footer, ...patch } })
            }
          />
        ),
      };
    }
    if (selection.kind === "row") {
      const row = document?.rows?.find((r) => r.id === selection.rowId);
      if (!row) return null;
      const firstEl = row.columns?.[0]?.elements?.[0];
      const sectionLabel = firstEl ? (WIDGET_MAP[firstEl.type]?.label ?? firstEl.type) : "Section";
      return {
        title: row.settings?.name || sectionLabel,
        subtitle: "Section content & layout",
        content: (
          <SectionContentPanel
            row={row}
            onChange={(patch) =>
              patchDocument({
                ...document,
                rows: setRowSettings(document.rows, row.id, patch),
              })
            }
            onElementChange={(colId, elId, patch) =>
              patchDocument({
                ...document,
                rows: setElementSettings(document.rows, row.id, colId, elId, patch),
              })
            }
          />
        ),
      };
    }
    if (selection.kind === "column") {
      const row = document?.rows?.find((r) => r.id === selection.rowId);
      const col = row?.columns.find((c) => c.id === selection.columnId);
      if (!row || !col) return null;
      return {
        title: "Column",
        subtitle: "Width & layout",
        content: (
          <ColumnSettings
            width={col.settings?.width}
            background={col.settings?.background}
            onChange={(patch) =>
              patchDocument({
                ...document,
                rows: setColumnSettings(document.rows, row.id, col.id, patch),
              })
            }
          />
        ),
      };
    }
    if (selection.kind === "element") {
      const row = document?.rows?.find((r) => r.id === selection.rowId);
      const col = row?.columns.find((c) => c.id === selection.columnId);
      const el = col?.elements.find((e) => e.id === selection.elementId);
      if (!row || !col || !el) return null;
      const widget = WIDGET_MAP[el.type];
      if (!widget) return null;
      return {
        title: widget.label,
        subtitle: widget.description,
        content: (
          <WidgetSettings
            element={el}
            widget={widget}
            onChange={(patch) =>
              patchDocument({
                ...document,
                rows: setElementSettings(document.rows, row.id, col.id, el.id, patch),
              })
            }
          />
        ),
      };
    }
    return null;
  };

  const target = findTarget();
  // SEO/Tracking/Domain tabs are page-level only; reset to design when a section is selected
  const isPageLevel = selection.kind === "page";
  const visibleTabs = isPageLevel
    ? (["design", "seo", "tracking", "domain"] as const)
    : (["design"] as const);

  return (
    <div
      style={{
        width: "100%",
        background: "#fff",
        height: "100%",
        overflowY: "auto",
        color: "#0f172a",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {isPageLevel ? (
        <>
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
            {visibleTabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: "11px 4px",
                  background: "transparent",
                  border: "none",
                  color: tab === t ? "#4f46e5" : "#64748b",
                  fontSize: 11.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  cursor: "pointer",
                  borderBottom: tab === t ? "2px solid #4f46e5" : "2px solid transparent",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "design" ? (
            target ? (
              <div style={{ padding: "0 20px 24px", flex: 1 }}>
                <div style={{ padding: "16px 0 4px", borderBottom: "1px solid #f1f5f9", marginBottom: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{target.title}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{target.subtitle}</div>
                </div>
                {target.content}
              </div>
            ) : (
              <div style={{ padding: 24, fontSize: 13, color: "#94a3b8" }}>
                Select a section, column or element to edit its settings.
              </div>
            )
          ) : tab === "seo" ? (
            <div style={{ padding: "0 20px 16px" }}>
              <SeoTab seo={seo} setSeo={setSeo} />
            </div>
          ) : tab === "tracking" ? (
            <div style={{ padding: "0 20px 16px" }}>
              <TrackingTab tracking={tracking} setTracking={setTracking} />
            </div>
          ) : (
            <div style={{ padding: "0 20px 16px" }}>
              <DomainTab domain={domain} setDomain={setDomain} />
            </div>
          )}
        </>
      ) : target ? (
        <div style={{ padding: "0 20px 24px", flex: 1 }}>
          <div style={{ padding: "18px 0 12px", borderBottom: "1px solid #f1f5f9", marginBottom: 2 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{target.title}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{target.subtitle}</div>
          </div>
          {target.content}
        </div>
      ) : (
        <div style={{ padding: 24, fontSize: 13, color: "#94a3b8" }}>
          Select a section, column or element to edit its settings.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page settings (global design system)
// ---------------------------------------------------------------------------

function PageSettings({
  settings,
  onChange,
}: {
  settings?: LpDocument["settings"];
  onChange: (s: LpDocument["settings"]) => void;
}) {
  const s = settings ?? {};
  const set = (key: string, value: unknown) => onChange({ ...s, [key]: value });
  const setColor = (key: string, value: unknown) =>
    onChange({ ...s, colors: { ...(s.colors ?? {}), [key]: value } });
  const setFont = (key: string, value: unknown) =>
    onChange({ ...s, fonts: { ...(s.fonts ?? {}), [key]: value } });

  return (
    <>
      <Section title="Brand Colors" defaultOpen>
        <FieldInput field={{ key: "primary", label: "Primary", type: "color" }} value={s.colors?.primary} onChange={(v) => setColor("primary", v)} />
        <FieldInput field={{ key: "secondary", label: "Secondary", type: "color" }} value={s.colors?.secondary} onChange={(v) => setColor("secondary", v)} />
        <FieldInput field={{ key: "accent", label: "Accent", type: "color" }} value={s.colors?.accent} onChange={(v) => setColor("accent", v)} />
        <FieldInput field={{ key: "text", label: "Text", type: "color" }} value={s.colors?.text} onChange={(v) => setColor("text", v)} />
      </Section>
      <Section title="Typography">
        <FieldInput
          field={{ key: "body", label: "Body Font", type: "select", options: FONT_OPTIONS }}
          value={s.fonts?.body}
          onChange={(v) => setFont("body", v)}
        />
        <FieldInput
          field={{ key: "heading", label: "Heading Font", type: "select", options: FONT_OPTIONS }}
          value={s.fonts?.heading}
          onChange={(v) => setFont("heading", v)}
        />
      </Section>
      <Section title="Layout">
        <FieldInput
          field={{ key: "containerWidth", label: "Container Width", type: "slider", min: 960, max: 1440, step: 20 }}
          value={s.containerWidth}
          onChange={(v) => set("containerWidth", v)}
        />
        <FieldInput field={{ key: "pageBackground", label: "Page Background", type: "color" }} value={s.pageBackground} onChange={(v) => set("pageBackground", v)} />
      </Section>
    </>
  );
}

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Roboto", label: "Roboto" },
  { value: "Lora", label: "Lora" },
  { value: "Merriweather", label: "Merriweather" },
  { value: "Source Serif 4", label: "Source Serif 4" },
  { value: "DM Sans", label: "DM Sans" },
];

// ---------------------------------------------------------------------------
// Header / Footer settings
// ---------------------------------------------------------------------------

function HeaderSettings({
  header,
  patch,
}: {
  header: LpDocument["header"];
  patch: (s: LpDocument["header"]) => void;
}) {
  const h = header ?? {};
  const set = (key: string, value: unknown) => patch({ ...h, [key]: value });
  return (
    <>
      <Section title="Visibility" defaultOpen>
        <FieldInput field={{ key: "enabled", label: "Show Header", type: "toggle" }} value={h.enabled} onChange={(v) => set("enabled", v)} />
        <FieldInput field={{ key: "sticky", label: "Sticky Header", type: "toggle" }} value={h.sticky} onChange={(v) => set("sticky", v)} />
        <FieldInput field={{ key: "transparent", label: "Transparent", type: "toggle" }} value={h.transparent} onChange={(v) => set("transparent", v)} />
      </Section>
      <Section title="Logo">
        <FieldInput
          field={{ key: "type", label: "Logo Type", type: "select", options: [{ value: "text", label: "Text" }, { value: "image", label: "Image" }] }}
          value={h.logo?.type}
          onChange={(v) => set("logo", { ...h.logo, type: v })}
        />
        <FieldInput field={{ key: "text", label: "Logo Text", type: "text" }} value={h.logo?.text} onChange={(v) => set("logo", { ...h.logo, text: v })} />
        <FieldInput field={{ key: "image", label: "Logo Image", type: "image" }} value={h.logo?.image} onChange={(v) => set("logo", { ...h.logo, image: v })} />
      </Section>
      <Section title="Menu" defaultOpen>
        {ObjectItemEditorList(h.menu ?? [], "menu", (items) => set("menu", items))}
      </Section>
      <Section title="CTA">
        <FieldInput field={{ key: "label", label: "CTA Label", type: "text" }} value={h.cta?.label} onChange={(v) => set("cta", { ...h.cta, label: v })} />
        <FieldInput field={{ key: "href", label: "CTA Link", type: "text" }} value={h.cta?.href} onChange={(v) => set("cta", { ...h.cta, href: v })} />
      </Section>
      <Section title="Phone & WhatsApp">
        <FieldInput field={{ key: "enabled", label: "Show Phone", type: "toggle" }} value={h.phone?.enabled} onChange={(v) => set("phone", { ...h.phone, enabled: v })} />
        <FieldInput field={{ key: "number", label: "Phone Number", type: "text" }} value={h.phone?.number} onChange={(v) => set("phone", { ...h.phone, number: v })} />
        <FieldInput field={{ key: "enabled", label: "Show WhatsApp", type: "toggle" }} value={h.whatsapp?.enabled} onChange={(v) => set("whatsapp", { ...h.whatsapp, enabled: v })} />
        <FieldInput field={{ key: "number", label: "WhatsApp Number", type: "text" }} value={h.whatsapp?.number} onChange={(v) => set("whatsapp", { ...h.whatsapp, number: v })} />
      </Section>
    </>
  );
}

function ObjectItemEditorList(
  items: { label: string; href?: string }[],
  key: string,
  onChange: (items: { label: string; href?: string }[]) => void,
) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, marginBottom: 8 }}>
          <input
            style={{ width: "100%", background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: 6, padding: "6px 8px", fontSize: 12, marginBottom: 6 }}
            placeholder="Label"
            value={item.label}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...item, label: e.target.value };
              onChange(next);
            }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <input
              style={{ flex: 1, background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: 6, padding: "6px 8px", fontSize: 12 }}
              placeholder="href (#section)"
              value={item.href ?? ""}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, href: e.target.value };
                onChange(next);
              }}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              style={{ background: "#fff1f2", color: "#ef4444", border: "none", borderRadius: 6, padding: "0 10px", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { label: "", href: "#" }])}
        style={{ background: "#f1f5f9", color: "#4f46e5", border: "1px dashed #c7d2fe", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", width: "100%" }}
      >
        + Add menu item
      </button>
    </div>
  );
}

function FooterSettings({
  footer,
  patch,
}: {
  footer: LpDocument["footer"];
  patch: (s: LpDocument["footer"]) => void;
}) {
  const f = footer ?? {};
  const set = (key: string, value: unknown) => patch({ ...f, [key]: value });
  return (
    <>
      <Section title="Visibility" defaultOpen>
        <FieldInput field={{ key: "enabled", label: "Show Footer", type: "toggle" }} value={f.enabled} onChange={(v) => set("enabled", v)} />
      </Section>
      <Section title="Footer Columns">
        {FooterColumnsEditor(f.columns ?? [], (cols) => set("columns", cols))}
      </Section>
      <Section title="Contact">
        <FieldInput field={{ key: "phone", label: "Phone", type: "text" }} value={f.contact?.phone} onChange={(v) => set("contact", { ...f.contact, phone: v })} />
        <FieldInput field={{ key: "email", label: "Email", type: "text" }} value={f.contact?.email} onChange={(v) => set("contact", { ...f.contact, email: v })} />
        <FieldInput field={{ key: "address", label: "Address", type: "text" }} value={f.contact?.address} onChange={(v) => set("contact", { ...f.contact, address: v })} />
      </Section>
      <Section title="Legal & Disclaimer">
        <FieldInput field={{ key: "disclaimer", label: "RERA / Disclaimer", type: "textarea", rows: 3 }} value={f.disclaimer} onChange={(v) => set("disclaimer", v)} />
        <FieldInput field={{ key: "copyright", label: "Copyright", type: "text" }} value={f.copyright} onChange={(v) => set("copyright", v)} />
      </Section>
    </>
  );
}

function FooterColumnsEditor(
  columns: NonNullable<LpDocument["footer"]>["columns"],
  onChange: (cols: NonNullable<LpDocument["footer"]>["columns"]) => void,
) {
  const cols = columns ?? [];
  return (
    <div>
      {cols.map((col, i) => (
        <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input
              style={{ flex: 1, background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: 6, padding: "6px 8px", fontSize: 12 }}
              placeholder="Column title"
              value={col.title ?? ""}
              onChange={(e) => {
                const next = [...cols];
                next[i] = { ...col, title: e.target.value };
                onChange(next);
              }}
            />
            <button
              type="button"
              onClick={() => onChange(cols.filter((_, j) => j !== i))}
              style={{ background: "#fff1f2", color: "#ef4444", border: "none", borderRadius: 6, padding: "0 10px", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
            >
              <X size={14} />
            </button>
          </div>
          <textarea
            style={{ width: "100%", background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: 6, padding: "6px 8px", fontSize: 12, minHeight: 44, resize: "vertical", marginBottom: 6 }}
            placeholder="Column text"
            value={col.text ?? ""}
            onChange={(e) => {
              const next = [...cols];
              next[i] = { ...col, text: e.target.value };
              onChange(next);
            }}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...cols, { title: "", text: "" }])}
        style={{ background: "#f1f5f9", color: "#4f46e5", border: "1px dashed #c7d2fe", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", width: "100%" }}
      >
        + Add column
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section content panel — shown when a row is selected
// ---------------------------------------------------------------------------

function SectionContentPanel({
  row,
  onChange,
  onElementChange,
}: {
  row: RowNode;
  onChange: (patch: Record<string, unknown>) => void;
  onElementChange: (colId: string, elId: string, patch: Record<string, unknown>) => void;
}) {
  // Flatten all elements across all columns for a simpler accordion
  const allElements = row.columns.flatMap((col) =>
    col.elements.map((el) => ({ col, el })),
  );

  return (
    <>
      {/* Admin section name */}
      <div style={{ marginBottom: 4 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>
          Section name <span style={{ fontWeight: 400, color: "#94a3b8" }}>(admin only)</span>
        </label>
        <input
          type="text"
          value={row.settings?.name ?? ""}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Hero Banner, Amenities…"
          style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", background: "#fff", color: "#0f172a", boxSizing: "border-box" }}
        />
      </div>

      {/* Element content fields */}
      {allElements.length === 0 ? (
        <div style={{ fontSize: 13, color: "#94a3b8", padding: "16px 0" }}>No elements in this section.</div>
      ) : (
        allElements.map(({ col, el }) => {
          const widget = WIDGET_MAP[el.type];
          if (!widget) return null;
          return (
            <Section key={el.id} title={<><Icon name={widget.icon} size={14} /> {widget.label}</>} defaultOpen={allElements.length === 1}>
              {widget.fields.map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={el.settings[field.key]}
                  onChange={(v) => onElementChange(col.id, el.id, { [field.key]: v })}
                />
              ))}
            </Section>
          );
        })
      )}

      {/* Layout & Background at bottom */}
      <Section title="Layout & Background">
        <RowSettings row={row} onChange={onChange} />
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Row / Column settings
// ---------------------------------------------------------------------------

function RowSettings({ row, onChange }: { row: RowNode; onChange: (patch: Record<string, unknown>) => void }) {
  const s = row.settings ?? {};
  const bg = s.background ?? {};
  return (
    <>
      <Section title="Layout" defaultOpen>
        <FieldInput
          field={{ key: "layout", label: "Layout", type: "select", options: [{ value: "full_width", label: "Full Width" }, { value: "boxed", label: "Boxed" }] }}
          value={s.layout}
          onChange={(v) => onChange({ layout: v })}
        />
        <FieldInput
          field={{ key: "contentWidth", label: "Content Width", type: "select", options: [{ value: "boxed", label: "Boxed" }, { value: "full", label: "Full" }] }}
          value={s.contentWidth}
          onChange={(v) => onChange({ contentWidth: v })}
        />
        <FieldInput field={{ key: "gap", label: "Column Gap", type: "slider", min: 0, max: 80 }} value={s.gap} onChange={(v) => onChange({ gap: v })} />
        <FieldInput field={{ key: "minHeight", label: "Min Height", type: "slider", min: 0, max: 900, step: 10 }} value={s.minHeight} onChange={(v) => onChange({ minHeight: v })} />
      </Section>
      <Section title="Background" defaultOpen>
        <FieldInput field={{ key: "color", label: "Background Color", type: "color" }} value={bg.color} onChange={(v) => onChange({ background: { ...bg, color: v } })} />
        <FieldInput field={{ key: "image", label: "Background Image", type: "image" }} value={bg.image} onChange={(v) => onChange({ background: { ...bg, image: v } })} />
        <FieldInput field={{ key: "gradient", label: "Gradient", type: "text" }} value={bg.gradient} onChange={(v) => onChange({ background: { ...bg, gradient: v } })} />
        <FieldInput field={{ key: "overlayColor", label: "Overlay Color", type: "color" }} value={bg.overlayColor} onChange={(v) => onChange({ background: { ...bg, overlayColor: v } })} />
      </Section>
      <Section title="Padding">
        <FieldInput field={{ key: "top", label: "Padding Top", type: "slider", min: 0, max: 200 }} value={s.padding?.top} onChange={(v) => onChange({ padding: { ...s.padding, top: v } })} />
        <FieldInput field={{ key: "bottom", label: "Padding Bottom", type: "slider", min: 0, max: 200 }} value={s.padding?.bottom} onChange={(v) => onChange({ padding: { ...s.padding, bottom: v } })} />
        <FieldInput field={{ key: "left", label: "Padding Left", type: "slider", min: 0, max: 200 }} value={s.padding?.left} onChange={(v) => onChange({ padding: { ...s.padding, left: v } })} />
        <FieldInput field={{ key: "right", label: "Padding Right", type: "slider", min: 0, max: 200 }} value={s.padding?.right} onChange={(v) => onChange({ padding: { ...s.padding, right: v } })} />
      </Section>
      <Section title="Border & Shadow">
        <FieldInput field={{ key: "radius", label: "Radius", type: "slider", min: 0, max: 60 }} value={s.border?.radius} onChange={(v) => onChange({ border: { ...s.border, radius: v } })} />
        <FieldInput field={{ key: "shadow", label: "Box Shadow", type: "text" }} value={s.shadow} onChange={(v) => onChange({ shadow: v })} />
      </Section>
    </>
  );
}

function ColumnSettings({
  width,
  background,
  onChange,
}: {
  width?: number;
  background?: { color?: string; image?: string; gradient?: string; overlayColor?: string };
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const bg = background ?? {};
  return (
    <>
      <Section title="Width" defaultOpen>
        <FieldInput field={{ key: "width", label: "Column Width %", type: "slider", min: 5, max: 100 }} value={width ?? 50} onChange={(v) => onChange({ width: v })} />
      </Section>
      <Section title="Background">
        <FieldInput field={{ key: "color", label: "Background Color", type: "color" }} value={bg.color} onChange={(v) => onChange({ background: { ...bg, color: v } })} />
        <FieldInput field={{ key: "image", label: "Background Image", type: "image" }} value={bg.image} onChange={(v) => onChange({ background: { ...bg, image: v } })} />
        <FieldInput field={{ key: "gradient", label: "Gradient", type: "text" }} value={bg.gradient} onChange={(v) => onChange({ background: { ...bg, gradient: v } })} />
      </Section>
      <Section title="Alignment">
        <FieldInput
          field={{ key: "verticalAlign", label: "Vertical Align", type: "select", options: [{ value: "top", label: "Top" }, { value: "middle", label: "Middle" }, { value: "bottom", label: "Bottom" }] }}
          onChange={(v) => onChange({ verticalAlign: v })}
        />
        <FieldInput
          field={{ key: "align", label: "Horizontal Align", type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] }}
          onChange={(v) => onChange({ align: v })}
        />
      </Section>
      <Section title="Spacing">
        <FieldInput field={{ key: "top", label: "Padding Top", type: "slider", min: 0, max: 120 }} onChange={(v) => onChange({ padding: { top: v } })} />
        <FieldInput field={{ key: "bottom", label: "Padding Bottom", type: "slider", min: 0, max: 120 }} onChange={(v) => onChange({ padding: { bottom: v } })} />
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Widget settings (driven by widget schema)
// ---------------------------------------------------------------------------

function WidgetSettings({
  element,
  widget,
  onChange,
}: {
  element: ElementNode;
  widget: (typeof WIDGET_MAP)[string];
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const s = element.settings ?? {};
  const sections = new Set(widget.fields.map((f) => f.section ?? "Content"));
  const grouped = [...sections].map((section) => ({
    section,
    fields: widget.fields.filter((f) => (f.section ?? "Content") === section),
  }));

  return (
    <>
      {grouped.map(({ section, fields }) => (
        <Section key={section} title={section} defaultOpen={section === "Content"}>
          {fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={s[field.key]}
              onChange={(v) => onChange({ [field.key]: v })}
            />
          ))}
        </Section>
      ))}
      <Section title="Card / widget background">
        <FieldInput
          field={{ key: "color", label: "Background Color", type: "color" }}
          value={(s.background as { color?: string } | undefined)?.color}
          onChange={(v) => onChange({ background: { ...(typeof s.background === "object" && s.background ? s.background : {}), color: v } })}
        />
        <FieldInput
          field={{ key: "image", label: "Background Image", type: "image" }}
          value={(s.background as { image?: string } | undefined)?.image}
          onChange={(v) => onChange({ background: { ...(typeof s.background === "object" && s.background ? s.background : {}), image: v } })}
        />
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// SEO / Tracking / Domain tabs
// ---------------------------------------------------------------------------

function SeoTab({ seo, setSeo }: { seo: LpSeo | null; setSeo: (s: LpSeo) => void }) {
  const s = seo ?? {};
  const set = (key: string, value: unknown) => setSeo({ ...s, [key]: value });
  return (
    <>
      <Section title="Search Engines" defaultOpen>
        <FieldInput field={{ key: "title", label: "SEO Title", type: "text" }} value={s.title} onChange={(v) => set("title", v)} />
        <FieldInput field={{ key: "description", label: "Meta Description", type: "textarea", rows: 3 }} value={s.description} onChange={(v) => set("description", v)} />
        <FieldInput field={{ key: "keywords", label: "Meta Keywords", type: "text" }} value={s.keywords} onChange={(v) => set("keywords", v)} />
        <FieldInput field={{ key: "canonical", label: "Canonical URL", type: "text" }} value={s.canonical} onChange={(v) => set("canonical", v)} />
        <FieldInput
          field={{ key: "robots", label: "Robots", type: "select", options: [{ value: "index,follow", label: "Index, Follow" }, { value: "noindex,nofollow", label: "No Index" }] }}
          value={s.robots}
          onChange={(v) => set("robots", v)}
        />
        <FieldInput field={{ key: "sitemapIncluded", label: "Include in XML Sitemap", type: "toggle" }} value={s.sitemapIncluded} onChange={(v) => set("sitemapIncluded", v)} />
      </Section>
      <Section title="Open Graph">
        <FieldInput field={{ key: "ogTitle", label: "OG Title", type: "text" }} value={s.ogTitle} onChange={(v) => set("ogTitle", v)} />
        <FieldInput field={{ key: "ogDescription", label: "OG Description", type: "textarea", rows: 2 }} value={s.ogDescription} onChange={(v) => set("ogDescription", v)} />
        <FieldInput field={{ key: "ogImage", label: "OG Image", type: "image" }} value={s.ogImage} onChange={(v) => set("ogImage", v)} />
        <FieldInput field={{ key: "favicon", label: "Favicon", type: "image" }} value={s.favicon} onChange={(v) => set("favicon", v)} />
      </Section>
      <Section title="Structured Data">
        <FieldInput
          field={{ key: "schema", label: "JSON-LD Schema", type: "code", rows: 8 }}
          value={s.schema}
          onChange={(v) => set("schema", v)}
        />
      </Section>
    </>
  );
}

function TrackingTab({ tracking, setTracking }: { tracking: LpTracking | null; setTracking: (s: LpTracking) => void }) {
  const s = tracking ?? {};
  const set = (key: string, value: unknown) => setTracking({ ...s, [key]: value });
  return (
    <>
      <Section title="Google" defaultOpen>
        <FieldInput field={{ key: "gtm", label: "GTM ID", type: "text" }} value={s.gtm} onChange={(v) => set("gtm", v)} />
        <FieldInput field={{ key: "ga4", label: "GA4 Measurement ID", type: "text" }} value={s.ga4} onChange={(v) => set("ga4", v)} />
        <FieldInput field={{ key: "gadsConversion", label: "Google Ads Conversion ID", type: "text" }} value={s.gadsConversion} onChange={(v) => set("gadsConversion", v)} />
        <FieldInput field={{ key: "gadsLabel", label: "Conversion Label", type: "text" }} value={s.gadsLabel} onChange={(v) => set("gadsLabel", v)} />
      </Section>
      <Section title="Meta">
        <FieldInput field={{ key: "metaPixel", label: "Meta Pixel ID", type: "text" }} value={s.metaPixel} onChange={(v) => set("metaPixel", v)} />
      </Section>
      <Section title="Custom">
        <FieldInput field={{ key: "customScripts", label: "Custom Tracking Scripts", type: "code", rows: 6 }} value={s.customScripts} onChange={(v) => set("customScripts", v)} />
      </Section>
    </>
  );
}

function DomainTab({ domain, setDomain }: { domain: LpDomain | null; setDomain: (s: LpDomain) => void }) {
  const s = domain ?? {};
  const [requestInput, setRequestInput] = useState(s.requestedDomain ?? "");
  const set = (key: string, value: unknown) => setDomain({ ...s, [key]: value });
  const reqStatus = s.requestStatus;

  const statusChip = (() => {
    const live = s.customDomain === s.requestedDomain && s.customDomain;
    if (live) {
      return { label: "Live", bg: "#dcfce7", fg: "#15803d" };
    }
    switch (reqStatus) {
      case "pending":
        return { label: "Pending approval", bg: "#fef9c3", fg: "#a16207" };
      case "approved":
        return { label: "Approved — connect DNS", bg: "#dcfce7", fg: "#15803d" };
      case "rejected":
        return { label: "Rejected", bg: "#fee2e2", fg: "#b91c1c" };
      default:
        return null;
    }
  })();

  const submitRequest = () => {
    const domainName = requestInput
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");
    if (!domainName) return;
    setDomain({
      ...s,
      requestedDomain: domainName,
      requestStatus: "pending",
      requestedAt: new Date().toISOString(),
    });
  };

  return (
    <>
      <Section title="Domain" defaultOpen>
        <FieldInput field={{ key: "customDomain", label: "Custom Domain", type: "text" }} value={s.customDomain} onChange={(v) => set("customDomain", v)} />
        <FieldInput field={{ key: "subdomain", label: "Subdomain", type: "text" }} value={s.subdomain} onChange={(v) => set("subdomain", v)} />
        <FieldInput field={{ key: "sslEnabled", label: "SSL Enabled", type: "toggle" }} value={s.sslEnabled} onChange={(v) => set("sslEnabled", v)} />
      </Section>

      <Section title="Request Domain Mapping" defaultOpen>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, marginBottom: 10 }}>
          Want to serve this page from your own domain? Submit a request and the team will set it up for you.
        </div>

        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>
          Desired Domain
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={requestInput}
            onChange={(e) => setRequestInput(e.target.value)}
            placeholder="e.g. www.yourbrand.com"
            style={{ flex: 1, background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
          <button
            type="button"
            onClick={submitRequest}
            disabled={!requestInput.trim()}
            style={{
              padding: "7px 14px",
              border: "none",
              borderRadius: 8,
              background: requestInput.trim() ? "#4f46e5" : "#e2e8f0",
              color: requestInput.trim() ? "#fff" : "#94a3b8",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: requestInput.trim() ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
            }}
          >
            Request
          </button>
        </div>

        {s.requestedDomain ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>{s.requestedDomain}</span>
              {statusChip ? (
                <span style={{ fontSize: 11, fontWeight: 700, background: statusChip.bg, color: statusChip.fg, padding: "3px 10px", borderRadius: 999 }}>
                  {statusChip.label}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setDomain({ ...s, requestedDomain: undefined, requestStatus: undefined, requestNote: undefined, requestedAt: undefined });
                  setRequestInput("");
                }}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: 0 }}
              >
                Remove request
              </button>
            </div>
            {s.requestedAt ? (
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                Requested {new Date(s.requestedAt).toLocaleString()}
              </div>
            ) : null}
            {s.requestNote ? (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px" }}>
                {s.requestNote}
              </div>
            ) : null}
          </div>
        ) : null}
      </Section>

      <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, marginTop: 12 }}>
        Point a DNS A/CNAME record to this platform to serve the landing page from your own domain.
      </div>
    </>
  );
}