"use client";

import { useState } from "react";
import type * as React from "react";
import {
  Calendar,
  Check,
  Copy,
  GripVertical,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Save,
  Send,
  Settings2,
  Smartphone,
  Sparkles,
  TextCursorInput,
  Trash2,
  Users,
} from "lucide-react";
import { FORM_TEMPLATES } from "@/lib/prestate/data";
import type { FormLeadField, LandingPageData, SiteConfig } from "@/lib/prestate/types";
import { ensureConfig } from "@/lib/prestate/site-config";
import { ModuleHeader, SiteScopeBar } from "./shared";
import { Btn, Chip, Collapse, FieldRow, TextField, Toggle } from "@/components/prestate/ui";

type FieldType = "text" | "phone" | "email" | "select" | "checkbox" | "date" | "textarea" | "hidden";

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ReactNode }[] = [
  { type: "text", label: "Text input", icon: <TextCursorInput size={15} /> },
  { type: "phone", label: "Phone", icon: <Phone size={15} /> },
  { type: "email", label: "Email", icon: <Mail size={15} /> },
  { type: "textarea", label: "Text area", icon: <MessageSquare size={15} /> },
  { type: "select", label: "Dropdown", icon: <Settings2 size={15} /> },
  { type: "date", label: "Date picker", icon: <Calendar size={15} /> },
  { type: "checkbox", label: "Checkbox", icon: <Check size={15} /> },
  { type: "hidden", label: "Hidden field", icon: <Smartphone size={15} /> },
];

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
}

const INITIAL_FIELDS: FormField[] = [
  { id: "f1", type: "text", label: "Full name", placeholder: "e.g. Rohan Kapoor", required: true },
  { id: "f2", type: "phone", label: "Phone number", placeholder: "+91 98765 43210", required: true },
  { id: "f3", type: "email", label: "Email address", placeholder: "you@email.com", required: false },
  { id: "f4", type: "select", label: "Interested in", placeholder: "Choose an option", required: true },
  { id: "f5", type: "checkbox", label: "I agree to receive updates", placeholder: "", required: true },
];

let _fieldSeq = 5;

export function FormsModule({
  site,
  pages,
  onSelectSite,
  onPatch,
  onToast,
}: {
  site: LandingPageData;
  pages: LandingPageData[];
  onSelectSite: (id: string) => void;
  onPatch: (fn: (c: SiteConfig) => SiteConfig) => void;
  onToast: (m: string) => void;
}) {
  const cfg = ensureConfig(site);
  const fields = cfg.form.fields;
  const [selected, setSelected] = useState(fields[0]?.id ?? "f1");
  const stepFlow = cfg.form.multiStep;
  const setFields = (next: FormLeadField[] | ((prev: FormLeadField[]) => FormLeadField[])) => {
    onPatch((c) => {
      const cur = c.form.fields;
      const value = typeof next === "function" ? next(cur) : next;
      return { ...c, form: { ...c.form, fields: value } };
    });
  };

  const addField = (type: FieldType) => {
    const label = FIELD_TYPES.find((f) => f.type === type)?.label ?? type;
    const field: FormLeadField = { id: `f${++_fieldSeq}`, type, label, placeholder: "", required: false };
    setFields((f) => [...f, field]);
    setSelected(field.id);
    onToast(`Added ${label} field`);
  };

  const patchField = (id: string, patch: Partial<FormLeadField>) => setFields((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const sel = fields.find((f) => f.id === selected) ?? fields[0];

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <ModuleHeader
        title="Form Builder"
        description={`Lead form for “${site.name}” only. Fields, notify email and WhatsApp never leak to other templates.`}
        actions={
          <div style={{ display: "flex", gap: 9 }}>
            <Btn variant="primary" icon={<Save size={14} />} onClick={() => onToast(`Form saved for ${site.name} only`)}>Save form</Btn>
          </div>
        }
      />
      <SiteScopeBar pages={pages} activeId={site.id} onChange={onSelectSite} />

      <div style={{ padding: "0 28px 12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <FieldRow label="Notify email">
          <TextField value={cfg.form.notifyEmail} onChange={(v) => onPatch((c) => ({ ...c, form: { ...c.form, notifyEmail: v } }))} />
        </FieldRow>
        <FieldRow label="WhatsApp">
          <TextField value={cfg.form.whatsapp} onChange={(v) => onPatch((c) => ({ ...c, form: { ...c.form, whatsapp: v } }))} />
        </FieldRow>
        <FieldRow label="Thank-you message">
          <TextField value={cfg.form.thankYou} onChange={(v) => onPatch((c) => ({ ...c, form: { ...c.form, thankYou: v } }))} />
        </FieldRow>
      </div>
      <div style={{ padding: "0 28px 18px", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 4 }}>
          {FORM_TEMPLATES.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setSelected("f1"); onToast(`Loaded template “${t.name}”`); }}
              style={{ padding: "8px 14px", borderRadius: 999, border: i === 0 ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line-strong)", background: i === 0 ? "var(--ps-primary-soft)" : "#fff", color: i === 0 ? "var(--ps-primary)" : "var(--ps-slate)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              {t.name}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: "var(--ps-slate)" }}>
          <Toggle on={stepFlow} onChange={(v) => onPatch((c) => ({ ...c, form: { ...c.form, multiStep: v } }))} /> Multi-step flow
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 280px", gap: 0, padding: "0 28px 48px", minHeight: 480, alignItems: "start" }}>
        {/* LEFT — field palette */}
        <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--ps-muted)", padding: "4px 6px 10px" }}>Field library</div>
          {FIELD_TYPES.map((ft) => (
            <button
              key={ft.type}
              type="button"
              onClick={() => addField(ft.type)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, border: "none", background: "transparent", color: "var(--ps-slate)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ width: 26, height: 26, borderRadius: 8, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ft.icon}</span>
              {ft.label}
              <Plus size={13} style={{ marginLeft: "auto", color: "var(--ps-muted)" }} />
            </button>
          ))}
        </div>

        {/* CENTER — canvas */}
        <div style={{ padding: "0 20px" }}>
          <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line)", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 30px rgba(17,24,39,.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderBottom: "1px solid var(--ps-line)", background: "var(--ps-bg)", fontSize: 12.5, fontWeight: 700, color: "var(--ps-slate)" }}>
              <Users size={14} /> {stepFlow ? "Step 1 of 2 · Contact details" : "Lead capture"}
              <span style={{ marginLeft: "auto" }}><Chip tone="primary">Embed</Chip></span>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {fields.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelected(f.id)}
                  style={{
                    border: selected === f.id ? "2px solid var(--ps-primary)" : "1.5px solid var(--ps-line)",
                    borderRadius: 11,
                    padding: "10px 12px",
                    cursor: "pointer",
                    background: selected === f.id ? "var(--ps-primary-mist)" : "#fff",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <GripVertical size={15} style={{ color: "var(--ps-muted)", cursor: "grab" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ps-ink)", marginBottom: 5 }}>
                        {f.label} {f.required ? <span style={{ color: "var(--ps-danger)" }}>*</span> : null}
                      </div>
                      {f.type === "checkbox" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 16, height: 16, borderRadius: 5, border: "1.5px solid var(--ps-line-strong)", display: "inline-flex" }} />
                          <span style={{ fontSize: 12, color: "var(--ps-muted)" }}>{f.label}</span>
                        </div>
                      ) : (
                        <input
                          className="ps-input"
                          readOnly
                          value={f.placeholder}
                          placeholder=""
                          style={{ height: 34, fontSize: 12.5, background: "var(--ps-bg)", cursor: "default" }}
                        />
                      )}
                    </div>
                    <button type="button" title="Remove field" onClick={() => setFields((x) => x.filter((y) => y.id !== f.id))} style={{ background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer", padding: 5, display: "inline-flex" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addField("text")} style={{ padding: "11px", borderRadius: 11, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                + Add field
              </button>
              <button type="button" style={{ width: "100%", marginTop: 6, padding: "12px", borderRadius: 11, background: "var(--ps-grad-primary)", color: "#fff", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer" }}>
                {stepFlow ? "Continue" : "Submit"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — settings */}
        <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line)", borderRadius: 14, padding: "6px 18px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", padding: "12px 0 4px" }}>Field settings</div>
          <FieldRow label="Field label">
            <TextField value={sel?.label ?? ""} onChange={(v) => sel && patchField(sel.id, { label: v })} />
          </FieldRow>
          {sel?.type !== "checkbox" && sel?.type !== "hidden" ? (
            <FieldRow label="Placeholder">
              <TextField value={sel?.placeholder ?? ""} onChange={(v) => sel && patchField(sel.id, { placeholder: v })} />
            </FieldRow>
          ) : null}
          <FieldRow label="Type">
            <TextField value={sel?.type ?? ""} onChange={() => {}} disabled />
          </FieldRow>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Required field</span>
            <Toggle on={sel?.required ?? false} onChange={(v) => sel && patchField(sel.id, { required: v })} />
          </div>
          <div style={{ borderTop: "1px solid var(--ps-line)", marginTop: 8, paddingTop: 12 }}>
            <Collapse title="Form actions" icon={<Send size={14} />}>
              {[
                ["Save to CRM", true],
                ["Send email copy", true],
                ["Send WhatsApp", true],
                ["Redirect to thank-you", false],
              ].map(([label, on]) => (
                <div key={label as string} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>{label as string}</span>
                  <Toggle on={on as boolean} onChange={() => {}} />
                </div>
              ))}
            </Collapse>
            <div style={{ marginTop: 10 }}>
              <FieldRow label="Success message">
                <TextField value={cfg.form.thankYou} onChange={(v) => onPatch((c) => ({ ...c, form: { ...c.form, thankYou: v } }))} />
              </FieldRow>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn variant="outline" size="sm" icon={<Sparkles size={13} />}>AI optimize</Btn>
              <Btn variant="ghost" size="sm" onClick={() => onToast("Form embed code copied")}>Embed</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}