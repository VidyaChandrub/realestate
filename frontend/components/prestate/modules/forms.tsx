"use client";

import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  FilePlus2,
  FileText,
  GitBranch,
  GripVertical,
  Hash,
  Clock3,
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
  Upload,
  Users,
  Image as ImageIcon,
  Code2,
  Palette,
  AlignCenter,
  Type,
  Link2,
  Download,
  LayoutTemplate,
  RefreshCw,
} from "lucide-react";
import { uid } from "@/lib/prestate/data";
import { FIELD_LOGIC_OPS } from "@/lib/prestate/form-logic";
import { loadFormLibrary, saveFormLibrary, newFormDefinition, embedSnippet as libEmbedSnippet } from "@/lib/prestate/forms-store";
import type { FormDefinition } from "@/lib/prestate/forms-store";
import type { FieldLogicOp, FormLeadField, LandingPageData, SiteConfig, FormThankYouPage } from "@/lib/prestate/types";
import { ensureConfig, siteThemeStyle } from "@/lib/prestate/site-config";
import { builderPath, localPreviewPath } from "@/lib/prestate/paths";
import { ModuleHeader, SiteScopeBar } from "./shared";
import { Btn, Chip, Collapse, FieldRow, SelectField, TextField, Toggle, ColorField, LengthInput } from "@/components/prestate/ui";

type FieldType = "text" | "phone" | "email" | "number" | "select" | "radio" | "checkbox" | "date" | "time" | "textarea" | "file" | "hidden";

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ReactNode }[] = [
  { type: "text", label: "Text input", icon: <TextCursorInput size={15} /> },
  { type: "phone", label: "Phone", icon: <Phone size={15} /> },
  { type: "email", label: "Email", icon: <Mail size={15} /> },
  { type: "number", label: "Number", icon: <Hash size={15} /> },
  { type: "textarea", label: "Text area", icon: <MessageSquare size={15} /> },
  { type: "select", label: "Dropdown", icon: <Settings2 size={15} /> },
  { type: "radio", label: "Radio group", icon: <Circle size={15} /> },
  { type: "checkbox", label: "Checkbox", icon: <Check size={15} /> },
  { type: "date", label: "Date picker", icon: <Calendar size={15} /> },
  { type: "time", label: "Time picker", icon: <Clock3 size={15} /> },
  { type: "file", label: "File upload", icon: <Upload size={15} /> },
  { type: "hidden", label: "Hidden field", icon: <Smartphone size={15} /> },
];

function cloneFields(fields: FormLeadField[]): FormLeadField[] {
  return fields.map((x) => ({ ...x, id: uid("fld"), options: x.options ? [...x.options] : undefined, validation: x.validation ? { ...x.validation } : undefined }));
}

function newEmbedId(): string {
  return `emb_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}

export function FormsModule({
  site,
  pages,
  onPatch,
  onToast,
  onCreateThankYouPage,
}: {
  site: LandingPageData;
  pages: LandingPageData[];
  onSelectSite: (id: string) => void;
  onPatch: (fn: (c: SiteConfig) => SiteConfig) => void;
  onToast: (m: string) => void;
  onCreateThankYouPage?: () => void;
}) {
  const cfg = ensureConfig(site);
  const form = cfg.form;
  const fields = form.fields;
  const thankYouPages = pages.filter((p) => p.pageType === "thank-you");
  const [selected, setSelected] = useState(fields[0]?.id ?? "");
  const [previewSent, setPreviewSent] = useState(false);
  const sel = fields.find((f) => f.id === selected) ?? fields[0];
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const patchForm = (partial: Partial<SiteConfig["form"]>) => onPatch((c) => ({ ...c, form: { ...c.form, ...partial } }));
  const patchPdf = (patch: Partial<SiteConfig["form"]["pdf"]>) => onPatch((c) => ({ ...c, form: { ...c.form, pdf: { ...c.form.pdf, ...patch } } }));
  const patchThankYou = (patch: Partial<FormThankYouPage>) => onPatch((c) => ({ ...c, form: { ...c.form, thankYouPage: { ...c.form.thankYouPage, ...patch } as FormThankYouPage } }));
  const patchThankYouTypo = (patch: Partial<FormThankYouPage["typography"]>) => onPatch((c) => ({ ...c, form: { ...c.form, thankYouPage: { ...c.form.thankYouPage, typography: { ...c.form.thankYouPage.typography, ...patch } } as FormThankYouPage } }));
  const setFields = (next: FormLeadField[] | ((prev: FormLeadField[]) => FormLeadField[])) => {
    onPatch((c) => {
      const value = typeof next === "function" ? next(c.form.fields) : next;
      return { ...c, form: { ...c.form, fields: value } };
    });
  };

  // ---- Multi-form library (reusable & independent) ----
  const [library, setLibrary] = useState<FormDefinition[]>(() => loadFormLibrary());
  const [newFormName, setNewFormName] = useState("");
  const refreshLibrary = () => setLibrary(loadFormLibrary());
  useEffect(() => { refreshLibrary(); }, [site.id]);
  const createNewForm = () => {
    const name = newFormName.trim() || `Form — ${library.length + 1}`;
    const def = newFormDefinition(site.id, name);
    const next = [...library, def];
    saveFormLibrary(next);
    setLibrary(next);
    setNewFormName("");
    onToast(`Created “${name}” — every form has its own embed, PDF & thank-you`);
  };
  const duplicateLibraryForm = (id: string) => {
    const src = library.find((f) => f.id === id);
    if (!src) return;
    const copy: FormDefinition = { ...JSON.parse(JSON.stringify(src)), id: uid("form"), embed: { ...src.embed, id: newEmbedId() }, name: `${src.name} (copy)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const next = [...library, copy];
    saveFormLibrary(next);
    setLibrary(next);
    onToast(`Duplicated “${src.name}”`);
  };
  const deleteLibraryForm = (id: string) => {
    const next = library.filter((f) => f.id !== id);
    saveFormLibrary(next);
    setLibrary(next);
    onToast("Form deleted");
  };
  const applyLibraryToPage = (id: string) => {
    const src = library.find((f) => f.id === id);
    if (!src) return;
    const { id: _id, pageId: _p, createdAt: _c, updatedAt: _u, ...formPart } = src as unknown as Record<string, unknown>;
    onPatch((c) => ({ ...c, form: { ...(formPart as SiteConfig["form"]), embed: (formPart as SiteConfig["form"]).embed ?? c.form.embed } }));
    onToast(`Applied “${src.name}” to this page’s form — embed stays independent`);
  };

  const addField = (type: FieldType) => {
    const meta = FIELD_TYPES.find((f) => f.type === type);
    const field: FormLeadField = {
      id: uid("fld"),
      type,
      label: meta?.label ?? type,
      placeholder: type === "select" || type === "radio" ? "Choose an option" : type === "number" ? "0" : type === "time" ? "09:00" : "",
      required: false,
      options: type === "select" || type === "radio" ? ["Option 1", "Option 2", "Option 3"] : undefined,
    };
    setFields((f) => [...f, field]);
    setSelected(field.id);
    setPreviewSent(false);
    onToast(`Added ${field.label}`);
  };

  const patchField = (id: string, patch: Partial<FormLeadField>) => setFields((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const moveField = (id: string, dir: -1 | 1) => {
    setFields((list) => {
      const i = list.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      const [item] = next.splice(i, 1);
      next.splice(j, 0, item);
      return next;
    });
  };

  // Starter presets removed as fixed types — use the blank builder or duplicate a library form.
  // Keeping helper for the rare “reset to blank” use only.
  const resetToBlank = () => {
    patchForm({ templateId: "custom", multiStep: false, submitLabel: "Submit", fields: [], name: form.name, description: form.description });
    setSelected("");
    setPreviewSent(false);
    onToast("Cleared fields — add any field from the library");
  };

  const embedCode = libEmbedSnippet(form.embed?.id ?? "", typeof window !== "undefined" ? window.location.origin : "");
  const iframeCode = `<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/p/${site.slug}#lead-form" title="${site.name} lead form" style="width:100%;min-height:720px;border:0"></iframe>`;

  const copyText = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast(msg);
    } catch {
      onToast("Could not copy");
    }
  };

  const handlePdfFile = (file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      onToast("Please upload a PDF file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      patchPdf({ url: dataUrl, filename: file.name, enabled: true });
      patchForm({ deliverableUrl: dataUrl, deliverableLabel: file.name.replace(/\.pdf$/i, "") });
      onToast(`PDF uploaded — ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const optimize = () => {
    setFields((list) =>
      list.map((x) => ({
        ...x,
        placeholder:
          x.type === "phone"
            ? "+91 98765 43210"
            : x.type === "email"
              ? "name@email.com"
              : x.type === "text" && /name/i.test(x.label)
                ? "Your full name"
                : x.type === "number"
                  ? "0"
                  : x.placeholder,
      })),
    );
    onToast("Field hints tightened for this form");
  };

  return (
    <div style={{ overflowY: "auto", height: "100%", ...siteThemeStyle(cfg.brand) }}>
      <ModuleHeader
        title="Universal Form Builder"
        description={`One reusable builder for every form — “${form.name || site.name}”. Edits here only affect this form (embed: ${form.embed?.id ?? "—"}).`}
        actions={
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <Btn variant="outline" icon={<Copy size={14} />} onClick={() => void copyText(embedCode, "Embed code copied")}>Embed</Btn>
            <Btn variant="outline" icon={<RefreshCw size={14} />} onClick={() => { patchForm({ embed: { ...form.embed, id: newEmbedId() } }); onToast("New embed code generated — old embeds will still load latest if you keep the previous ID"); }}>Regenerate ID</Btn>
            <Btn variant="primary" icon={<Save size={14} />} onClick={() => onToast(`Form “${form.name || "Untitled"}” saved — embed always loads latest`)}>Save form</Btn>
          </div>
        }
      />
      <SiteScopeBar pages={pages} activeId={site.id} />

      {/* Form identity */}
      <div style={{ padding: "14px 28px 10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FieldRow label="Form name / title" hint="Internal name + page form heading. This is NOT a fixed type — you decide what the form is for.">
          <TextField value={form.name ?? ""} onChange={(v) => patchForm({ name: v })} placeholder="e.g. Aurora — Enquiry Form" />
        </FieldRow>
        <FieldRow label="Form description" hint="Optional helper text shown above the form on the live page.">
          <TextField value={form.description ?? ""} onChange={(v) => patchForm({ description: v })} placeholder="Short description for this form" />
        </FieldRow>
      </div>
      <div className="ps-form-meta" style={{ padding: "0 28px 12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <FieldRow label="Notify email">
          <TextField value={form.notifyEmail} onChange={(v) => patchForm({ notifyEmail: v })} placeholder="leads@example.com" />
        </FieldRow>
        <FieldRow label="WhatsApp (digits only)">
          <TextField value={form.whatsapp} onChange={(v) => patchForm({ whatsapp: v })} placeholder="919876543210" />
        </FieldRow>
        <FieldRow label="Submit button text">
          <TextField value={form.submitLabel} onChange={(v) => patchForm({ submitLabel: v })} />
        </FieldRow>
      </div>
      <div style={{ padding: "0 28px 14px", display: "grid", gap: 12 }}>
        {/* Multi-form library manager — proves builder is reusable & independent */}
        <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line)", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <LayoutTemplate size={14} style={{ color: "var(--ps-primary)" }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>Your Forms</span>
            <Chip tone="primary">{library.length} total</Chip>
            <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--ps-muted)", fontWeight: 600 }}>This page’s form is independent — editing one never touches another</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input className="ps-input" value={newFormName} onChange={(e) => setNewFormName(e.target.value)} placeholder="New form name — e.g. Brochure Gate / Callback / Visit" style={{ flex: "1 1 220px", minWidth: 200 }} />
            <Btn variant="primary" icon={<Plus size={13} />} onClick={createNewForm}>Create new form</Btn>
            <Btn variant="outline" size="sm" onClick={resetToBlank}>Clear current form fields</Btn>
          </div>
          {library.length === 0 ? (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--ps-bg)", border: "1px dashed var(--ps-line-strong)", fontSize: 12.5, color: "var(--ps-muted)", lineHeight: 1.6 }}>
              No extra forms yet. Click <strong style={{ color: "var(--ps-slate)" }}>Create new form</strong> — each gets its own name, fields, embed code, PDF & thank-you page. The builder below edits <strong style={{ color: "var(--ps-slate)" }}>{form.name || "this page’s form"}</strong> ({form.embed?.id ?? "—"}); library forms are separate and reusable anywhere.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
              {library.map((lf) => (
                <div key={lf.id} style={{ border: "1px solid var(--ps-line)", borderRadius: 12, padding: 11, background: "var(--ps-bg)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FileText size={13} /></span>
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 800, color: "var(--ps-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lf.name}</span>
                    <Chip tone="neutral" style={{ fontSize: 10 }}>{lf.fields.length} fields</Chip>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ps-muted)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lf.embed?.id}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ps-slate)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 34 }}>{lf.description || "—"}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Btn size="sm" variant="primary" onClick={() => applyLibraryToPage(lf.id)}>Load into page</Btn>
                    <Btn size="sm" variant="outline" icon={<Copy size={11} />} onClick={() => void copyText(libEmbedSnippet(lf.embed.id, typeof window !== "undefined" ? window.location.origin : ""), "Library embed copied")}>Embed</Btn>
                    <Btn size="sm" variant="ghost" icon={<Copy size={11} />} onClick={() => duplicateLibraryForm(lf.id)}>Duplicate</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => deleteLibraryForm(lf.id)} style={{ color: "#e5484d" }}><Trash2 size={11} /></Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ps-muted)", lineHeight: 1.6 }}>
            Each card is a fully independent form (own <code>embed</code>, <code>pdf</code>, <code>thankYouPage</code>). Duplicate a form to variant-test; delete never affects the others.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: "var(--ps-slate)" }}>
            <Toggle on={form.multiStep} onChange={(v) => patchForm({ multiStep: v })} /> Multi-step flow
          </span>
        </div>
      </div>

      <div className="ps-form-builder-grid" style={{ display: "grid", gridTemplateColumns: "220px minmax(0, 1fr) 320px", gap: 16, padding: "0 28px 24px", minHeight: 480, alignItems: "start" }}>
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
          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, background: "var(--ps-bg)", border: "1px dashed var(--ps-line-strong)", fontSize: 11.5, color: "var(--ps-muted)", lineHeight: 1.5 }}>
            Every field is optional. Add number, time, dropdown, radio, checkboxes etc. No fixed “Contact/Booking/Brochure” widgets — this one builder does all.
          </div>
        </div>

        <div>
          <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line)", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 30px rgba(17,24,39,.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderBottom: "1px solid var(--ps-line)", background: "var(--ps-bg)", fontSize: 12.5, fontWeight: 700, color: "var(--ps-slate)" }}>
              <Users size={14} /> {form.name || "Lead capture"} — {form.multiStep ? "Multi-step" : "Single step"}
              <span style={{ marginLeft: "auto" }}><Chip tone="primary">{fields.length} fields</Chip></span>
            </div>
            {form.description ? <div style={{ padding: "10px 20px 0", fontSize: 12.5, color: "var(--ps-slate)", lineHeight: 1.6 }}>{form.description}</div> : null}
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {previewSent ? (
                <ThankYouPreview form={form} onReset={() => setPreviewSent(false)} />
              ) : (
                <>
                  {fields.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "var(--ps-muted)", fontSize: 13 }}>Add a field from the library.</div>
                  ) : null}
                  {fields.map((f, i) => (
                    <div
                      key={f.id}
                      onClick={() => setSelected(f.id)}
                      style={{
                        border: selected === f.id ? "2px solid var(--ps-primary)" : "1.5px solid var(--ps-line)",
                        borderRadius: 11,
                        padding: "10px 12px",
                        cursor: "pointer",
                        background: selected === f.id ? "var(--ps-primary-mist)" : "#fff",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <GripVertical size={15} style={{ color: "var(--ps-muted)" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ps-ink)", marginBottom: 5 }}>
                            {f.label} {f.required ? <span style={{ color: "var(--ps-danger)" }}>*</span> : null} <span style={{ fontSize: 10.5, color: "var(--ps-muted)", fontWeight: 600, textTransform: "uppercase" }}>{f.type}</span>
                          </div>
                          {f.type === "checkbox" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ width: 16, height: 16, borderRadius: 5, border: "1.5px solid var(--ps-line-strong)" }} />
                              <span style={{ fontSize: 12, color: "var(--ps-muted)" }}>{f.label}</span>
                            </div>
                          ) : f.type === "textarea" ? (
                            <textarea className="ps-input" readOnly value={f.placeholder} style={{ minHeight: 56, fontSize: 12.5, background: "var(--ps-bg)" }} />
                          ) : f.type === "select" ? (
                            <select className="ps-input" disabled style={{ height: 34, fontSize: 12.5, background: "var(--ps-bg)" }}>
                              {(f.options ?? []).map((o) => (
                                <option key={o}>{o}</option>
                              ))}
                            </select>
                          ) : f.type === "radio" ? (
                            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", padding: "4px 0" }}>
                              {(f.options ?? []).map((o) => (
                                <span key={o} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ps-muted)" }}>
                                  <Circle size={13} /> {o}
                                </span>
                              ))}
                            </div>
                          ) : f.type === "file" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 9, border: "1.5px dashed var(--ps-line-strong)", background: "var(--ps-bg)", fontSize: 12, color: "var(--ps-muted)" }}>
                              <Upload size={13} /> {f.placeholder || "Choose file…"}
                            </div>
                          ) : f.type === "number" ? (
                            <input className="ps-input" readOnly value={f.placeholder || "0"} style={{ height: 34, fontSize: 12.5, background: "var(--ps-bg)" }} />
                          ) : f.type === "time" ? (
                            <input className="ps-input" readOnly value={f.placeholder || "09:00"} type="time" style={{ height: 34, fontSize: 12.5, background: "var(--ps-bg)" }} />
                          ) : (
                            <input className="ps-input" readOnly value={f.placeholder} style={{ height: 34, fontSize: 12.5, background: "var(--ps-bg)" }} />
                          )}
                          {f.helpText ? <div style={{ fontSize: 11, color: "var(--ps-muted)", marginTop: 4, lineHeight: 1.4 }}>{f.helpText}</div> : null}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <button type="button" title="Move up" disabled={i === 0} onClick={(e) => { e.stopPropagation(); moveField(f.id, -1); }} style={{ background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer", padding: 2, opacity: i === 0 ? 0.35 : 1 }}>
                            <ChevronUp size={14} />
                          </button>
                          <button type="button" title="Move down" disabled={i === fields.length - 1} onClick={(e) => { e.stopPropagation(); moveField(f.id, 1); }} style={{ background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer", padding: 2, opacity: i === fields.length - 1 ? 0.35 : 1 }}>
                            <ChevronDown size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          title="Remove field"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFields((x) => {
                              const next = x.filter((y) => y.id !== f.id);
                              setSelected(next[0]?.id ?? "");
                              return next;
                            });
                          }}
                          style={{ background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer", padding: 5, display: "inline-flex" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => addField("text")} style={{ padding: "11px", borderRadius: 11, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                    + Add field
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSent(true)}
                    style={{ width: "100%", marginTop: 6, padding: "12px", borderRadius: 11, background: "var(--ps-grad-primary)", color: "#fff", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer" }}
                  >
                    {form.multiStep ? "Continue" : form.submitLabel || "Submit"}
                  </button>
                </>
              )}
            </div>
          </div>
          {/* Embed code card — always visible, per-form */}
          <div style={{ marginTop: 14, background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line)", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Code2 size={14} style={{ color: "var(--ps-primary)" }} /> <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>Form Embed Code</span> <Chip tone="primary" style={{ marginLeft: "auto", fontSize: 11 }}>{form.embed?.id ?? "—"}</Chip>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ps-muted)", lineHeight: 1.6, marginBottom: 10 }}>
              Copy this snippet and paste anywhere — website pages, landing pages, external sites, Custom HTML widgets, templates or third-party pages. It always loads the latest saved version of this form.
            </div>
            <div style={{ background: "#0c0e14", color: "#c4c8d4", borderRadius: 10, padding: "10px 12px", fontFamily: "monospace", fontSize: 11.5, lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{embedCode}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <Btn size="sm" variant="primary" icon={<Copy size={13} />} onClick={() => void copyText(embedCode, "Embed snippet copied")}>Copy snippet</Btn>
              <Btn size="sm" variant="outline" icon={<Copy size={13} />} onClick={() => void copyText(iframeCode, "Iframe copied")}>Copy iframe fallback</Btn>
              <Btn size="sm" variant="ghost" onClick={() => void copyText(form.embed?.id ?? "", "Embed ID copied")}>Copy ID only</Btn>
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ps-slate)" }}>Allow external websites</span>
              <Toggle on={form.embed?.allowExternal ?? true} onChange={(v) => patchForm({ embed: { ...form.embed, id: form.embed?.id ?? newEmbedId(), allowExternal: v } })} />
            </div>
          </div>
          {/* PDF Upload card */}
          <div style={{ marginTop: 14, background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line)", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <FileText size={14} style={{ color: "var(--ps-primary)" }} /> <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>PDF Upload & Download</span>
              <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--ps-slate)" }}><Toggle on={form.pdf?.enabled ?? false} onChange={(v) => patchPdf({ enabled: v })} /> Enabled</span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ps-muted)", lineHeight: 1.6, marginBottom: 10 }}>
              Upload a brochure, price sheet or any PDF. When enabled, it can auto-download after a successful submission: <em>Submit → Validate → Save → Thank You → Auto download PDF</em>.
            </div>
            <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" style={{ display: "none" }} onChange={(e) => handlePdfFile(e.target.files?.[0] ?? null)} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <Btn size="sm" variant="primary" icon={<Upload size={13} />} onClick={() => pdfInputRef.current?.click()}>{form.pdf?.url ? "Replace PDF" : "Upload PDF"}</Btn>
              {form.pdf?.url ? <Btn size="sm" variant="outline" icon={<Trash2 size={13} />} onClick={() => { patchPdf({ url: "", enabled: false }); patchForm({ deliverableUrl: "" }); onToast("PDF removed"); }}>Remove PDF</Btn> : null}
              {form.pdf?.url ? <Btn size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => { const a = document.createElement("a"); a.href = form.pdf.url; a.download = form.pdf.filename || "brochure.pdf"; a.click(); }}>Test download</Btn> : null}
            </div>
            {form.pdf?.url ? <div style={{ fontSize: 12, color: "var(--ps-slate)", marginBottom: 8, fontFamily: "monospace", wordBreak: "break-all", background: "var(--ps-bg)", border: "1px solid var(--ps-line)", borderRadius: 8, padding: "8px 10px" }}>{form.pdf.filename} — {Math.round(form.pdf.url.length / 1024)} KB</div> : <div style={{ fontSize: 12, color: "var(--ps-muted)", padding: "10px", border: "1px dashed var(--ps-line-strong)", borderRadius: 8, textAlign: "center" }}>No PDF uploaded yet.</div>}
            <FieldRow label="Custom PDF filename (with .pdf)">
              <TextField value={form.pdf?.filename ?? ""} onChange={(v) => patchPdf({ filename: v })} placeholder="brochure.pdf" />
            </FieldRow>
            <FieldRow label="Deliverable URL (fallback / external PDF)">
              <TextField value={form.pdf?.url ?? form.deliverableUrl ?? ""} onChange={(v) => { patchPdf({ url: v }); patchForm({ deliverableUrl: v }); }} placeholder="/brochure/project.pdf or https://..." />
            </FieldRow>
            {form.pdf?.url || form.deliverableUrl ? (
              <FieldRow label="Download button label">
                <TextField value={form.deliverableLabel ?? ""} onChange={(v) => patchForm({ deliverableLabel: v })} placeholder="Download brochure" />
              </FieldRow>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Auto-download after successful submission</span>
              <Toggle on={form.pdf?.autoDownload ?? true} onChange={(v) => patchPdf({ autoDownload: v })} />
            </div>
          </div>
          {/* Thank You Page Builder — per form, independent */}
          <div style={{ marginTop: 14, background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line)", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <LayoutTemplate size={14} style={{ color: "var(--ps-primary)" }} /> <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>Thank You Page Builder</span>
              <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--ps-slate)" }}><Toggle on={form.thankYouPage?.enabled ?? true} onChange={(v) => patchThankYou({ enabled: v })} /> Enabled</span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ps-muted)", lineHeight: 1.6, marginBottom: 12 }}>
              Design a completely custom Thank You page for <strong style={{ color: "var(--ps-slate)" }}>{form.name || "this form"}</strong>. Every form has its own thank-you — editing one never affects another.
            </div>
            <Collapse title="Heading & content" icon={<Type size={14} />} defaultOpen>
              <FieldRow label="Heading"><TextField value={form.thankYouPage?.heading ?? ""} onChange={(v) => patchThankYou({ heading: v })} placeholder="Thank You — You're All Set!" /></FieldRow>
              <FieldRow label="Description"><TextField value={form.thankYouPage?.description ?? ""} onChange={(v) => patchThankYou({ description: v })} placeholder="Short confirmation line" /></FieldRow>
              <FieldRow label="Body text"><textarea className="ps-input" value={form.thankYouPage?.text ?? ""} onChange={(e) => patchThankYou({ text: e.target.value })} placeholder="Longer message, CTA context, next-steps…" style={{ minHeight: 72 }} /></FieldRow>
              <FieldRow label="Success message (inline thank-you)"><TextField value={form.thankYouPage?.successMessage ?? ""} onChange={(v) => patchThankYou({ successMessage: v })} placeholder="Thanks — we'll call you shortly." /></FieldRow>
              <FieldRow label="Custom HTML (optional)"><textarea className="ps-input" value={form.thankYouPage?.html ?? ""} onChange={(e) => patchThankYou({ html: e.target.value })} placeholder='<div>Optional HTML block…</div>' style={{ minHeight: 70, fontFamily: "monospace", fontSize: 12 }} /></FieldRow>
            </Collapse>
            <Collapse title="Media & icon" icon={<ImageIcon size={14} />}>
              <FieldRow label="Image URL"><TextField value={form.thankYouPage?.image ?? ""} onChange={(v) => patchThankYou({ image: v })} placeholder="https://… or /image.jpg (leave empty to hide)" /></FieldRow>
              <FieldRow label="Icon name" hint="Lucide icon slug: CheckCircle2, Sparkles, Gift, Phone, etc.">
                <TextField value={form.thankYouPage?.icon ?? ""} onChange={(v) => patchThankYou({ icon: v })} placeholder="CheckCircle2" />
              </FieldRow>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Show PDF download confirmation</span>
                <Toggle on={form.thankYouPage?.showPdfConfirmation ?? true} onChange={(v) => patchThankYou({ showPdfConfirmation: v })} />
              </div>
            </Collapse>
            <Collapse title="Buttons / CTAs" icon={<Link2 size={14} />}>
              {(form.thankYouPage?.buttons ?? []).map((b, i) => (
                <div key={i} style={{ border: "1px solid var(--ps-line)", borderRadius: 10, padding: 10, marginBottom: 8, background: "var(--ps-bg)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <TextField value={b.label} onChange={(v) => { const next = [...(form.thankYouPage?.buttons ?? [])]; next[i] = { ...next[i], label: v }; patchThankYou({ buttons: next }); }} placeholder="Button label" />
                    <TextField value={b.href} onChange={(v) => { const next = [...(form.thankYouPage?.buttons ?? [])]; next[i] = { ...next[i], href: v }; patchThankYou({ buttons: next }); }} placeholder="/ or https://…" />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                    <SelectField value={b.variant} onChange={(v) => { const next = [...(form.thankYouPage?.buttons ?? [])]; next[i] = { ...next[i], variant: v as never }; patchThankYou({ buttons: next }); }} options={[{ value: "primary", label: "Primary" }, { value: "secondary", label: "Secondary" }, { value: "outline", label: "Outline" }]} />
                    <Btn size="sm" variant="ghost" onClick={() => { const next = (form.thankYouPage?.buttons ?? []).filter((_, j) => j !== i); patchThankYou({ buttons: next }); }}><Trash2 size={12} /> Remove</Btn>
                  </div>
                </div>
              ))}
              <Btn size="sm" variant="outline" icon={<Plus size={13} />} onClick={() => { const next = [...(form.thankYouPage?.buttons ?? []), { label: "New CTA", href: "/", variant: "primary" as const }]; patchThankYou({ buttons: next }); }}>Add button</Btn>
            </Collapse>
            <Collapse title="Design — typography & colors" icon={<Palette size={14} />}>
              <FieldRow label="Font family"><TextField value={form.thankYouPage?.typography?.fontFamily ?? ""} onChange={(v) => patchThankYouTypo({ fontFamily: v })} placeholder="Inter, Playfair Display…" /></FieldRow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <FieldRow label="Font size"><LengthInput value={form.thankYouPage?.typography?.fontSize ?? 16} onChange={(v) => patchThankYouTypo({ fontSize: v as never })} min={10} max={48} /></FieldRow>
                <FieldRow label="Font weight"><SelectField value={String(form.thankYouPage?.typography?.fontWeight ?? 400)} onChange={(v) => patchThankYouTypo({ fontWeight: Number(v) })} options={[{ value: "400", label: "400 Regular" }, { value: "600", label: "600 SemiBold" }, { value: "700", label: "700 Bold" }, { value: "800", label: "800 ExtraBold" }]} /></FieldRow>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <FieldRow label="Text color"><ColorField value={form.thankYouPage?.typography?.textColor ?? form.thankYouPage?.colors?.text ?? "#111827"} onChange={(v) => patchThankYouTypo({ textColor: v })} /></FieldRow>
                <FieldRow label="Accent"><ColorField value={form.thankYouPage?.colors?.accent ?? "#6D5DFC"} onChange={(v) => patchThankYou({ colors: { ...form.thankYouPage.colors, accent: v } as never })} /></FieldRow>
              </div>
              <FieldRow label="Background"><ColorField value={form.thankYouPage?.background ?? form.thankYouPage?.colors?.bg ?? "#ffffff"} onChange={(v) => patchThankYou({ background: v, colors: { ...form.thankYouPage.colors, bg: v } as never })} /></FieldRow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <FieldRow label="Padding"><LengthInput value={form.thankYouPage?.spacing?.padding ?? 32} onChange={(v) => patchThankYou({ spacing: { ...form.thankYouPage.spacing, padding: v } as never })} min={0} max={120} /></FieldRow>
                <FieldRow label="Gap"><LengthInput value={form.thankYouPage?.spacing?.gap ?? 16} onChange={(v) => patchThankYou({ spacing: { ...form.thankYouPage.spacing, gap: v } as never })} min={0} max={48} /></FieldRow>
              </div>
              <FieldRow label="Alignment"><SelectField value={form.thankYouPage?.alignment ?? "center"} onChange={(v) => patchThankYou({ alignment: v as never })} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} /></FieldRow>
            </Collapse>
            <div style={{ marginTop: 12, padding: 10, borderRadius: 10, border: "1px solid var(--ps-line)", background: "var(--ps-bg)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ps-muted)", marginBottom: 6 }}>Live preview (per-form)</div>
              <div style={{ borderRadius: 12, border: "1px solid var(--ps-line)", overflow: "hidden", background: form.thankYouPage?.background ?? "#fff", padding: 18, textAlign: form.thankYouPage?.alignment ?? "center" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: form.thankYouPage?.typography?.textColor ?? form.thankYouPage?.colors?.text ?? "#111827", fontFamily: (form.thankYouPage?.typography?.fontFamily as string) ?? undefined }}>{form.thankYouPage?.heading ?? "Thank You"}</div>
                <div style={{ fontSize: 12.5, color: "var(--ps-slate)", marginTop: 6, lineHeight: 1.6 }}>{form.thankYouPage?.description ?? ""}</div>
                {form.thankYouPage?.image ? <img src={form.thankYouPage.image} alt="" style={{ width: "100%", maxWidth: 320, borderRadius: 10, margin: "12px auto", display: "block" }} /> : null}
                <div style={{ display: "flex", gap: 8, justifyContent: form.thankYouPage?.alignment === "left" ? "flex-start" : form.thankYouPage?.alignment === "right" ? "flex-end" : "center", flexWrap: "wrap", marginTop: 10 }}>
                  {(form.thankYouPage?.buttons ?? []).map((b, i) => (
                    <span key={i} style={{ padding: "8px 14px", borderRadius: 9, fontSize: 12, fontWeight: 700, background: b.variant === "primary" ? "var(--ps-grad-primary)" : b.variant === "outline" ? "#fff" : "#111827", color: b.variant === "outline" ? "var(--ps-ink)" : "#fff", border: b.variant === "outline" ? "1px solid var(--ps-line-strong)" : "none" }}>{b.label}</span>
                  ))}
                </div>
                {form.thankYouPage?.showPdfConfirmation && (form.pdf?.url || form.deliverableUrl) ? <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ps-muted)" }}>PDF “{form.pdf?.filename ?? "brochure.pdf"}” will auto-download on the live page.</div> : null}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line)", borderRadius: 14, padding: "6px 18px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", padding: "12px 0 4px" }}>Field settings</div>
          {sel ? (
            <>
              <FieldRow label="Field label">
                <TextField value={sel.label} onChange={(v) => patchField(sel.id, { label: v })} />
              </FieldRow>
              {sel.type !== "checkbox" && sel.type !== "hidden" ? (
                <FieldRow label="Placeholder">
                  <TextField value={sel.placeholder} onChange={(v) => patchField(sel.id, { placeholder: v })} />
                </FieldRow>
              ) : null}
              <FieldRow label="Help text (optional)">
                <TextField value={sel.helpText ?? ""} onChange={(v) => patchField(sel.id, { helpText: v })} placeholder="e.g. We'll never share your phone" />
              </FieldRow>
              <FieldRow label="Type">
                <SelectField
                  value={sel.type}
                  onChange={(v) => patchField(sel.id, { type: v, options: v === "select" || v === "radio" ? sel.options?.length ? sel.options : ["Option 1", "Option 2"] : undefined })}
                  options={FIELD_TYPES.map((t) => ({ value: t.type, label: t.label }))}
                />
              </FieldRow>
              {sel.type === "select" || sel.type === "radio" ? (
                <FieldRow label="Options (one per line)">
                  <textarea
                    className="ps-input"
                    value={(sel.options ?? []).join("\n")}
                    onChange={(e) => patchField(sel.id, { options: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
                    style={{ minHeight: 88 }}
                  />
                </FieldRow>
              ) : null}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Required field</span>
                <Toggle on={sel.required} onChange={(v) => patchField(sel.id, { required: v })} />
              </div>
              <Collapse title="Validation rules" icon={<Settings2 size={14} />}>
                <FieldRow label="Pattern (regex) or preset: email/phone"><TextField value={sel.validation?.pattern ?? ""} onChange={(v) => patchField(sel.id, { validation: { ...(sel.validation ?? {}), pattern: v } })} placeholder="e.g. ^[0-9]{10}$ or email" /></FieldRow>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <FieldRow label="Min length"><TextField value={String(sel.validation?.minLength ?? "")} onChange={(v) => patchField(sel.id, { validation: { ...(sel.validation ?? {}), minLength: v ? Number(v) : undefined } })} placeholder="0" /></FieldRow>
                  <FieldRow label="Max length"><TextField value={String(sel.validation?.maxLength ?? "")} onChange={(v) => patchField(sel.id, { validation: { ...(sel.validation ?? {}), maxLength: v ? Number(v) : undefined } })} placeholder="100" /></FieldRow>
                </div>
                {sel.type === "number" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <FieldRow label="Min value"><TextField value={String(sel.validation?.min ?? "")} onChange={(v) => patchField(sel.id, { validation: { ...(sel.validation ?? {}), min: v ? Number(v) : undefined } })} placeholder="0" /></FieldRow>
                    <FieldRow label="Max value"><TextField value={String(sel.validation?.max ?? "")} onChange={(v) => patchField(sel.id, { validation: { ...(sel.validation ?? {}), max: v ? Number(v) : undefined } })} placeholder="100" /></FieldRow>
                  </div>
                ) : null}
                <FieldRow label="Custom error message"><TextField value={sel.validation?.customMessage ?? ""} onChange={(v) => patchField(sel.id, { validation: { ...(sel.validation ?? {}), customMessage: v } })} placeholder="Please enter a valid value" /></FieldRow>
              </Collapse>
              <div style={{ borderTop: "1px solid var(--ps-line)", marginTop: 10, paddingTop: 12 }}>
                <Collapse title="Conditional logic" icon={<GitBranch size={14} />}>
                  <LogicEditor
                    field={sel}
                    allFields={fields}
                    onChange={(logic) => patchField(sel.id, { logic })}
                  />
                </Collapse>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--ps-muted)" }}>Select a field to edit it.</p>
          )}
          <div style={{ borderTop: "1px solid var(--ps-line)", marginTop: 8, paddingTop: 12 }}>
            <Collapse title="Form actions" icon={<Send size={14} />} defaultOpen>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Save to CRM</span>
                <Toggle on={form.saveToCrm} onChange={(v) => patchForm({ saveToCrm: v })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Send email copy</span>
                <Toggle on={form.sendEmail} onChange={(v) => patchForm({ sendEmail: v })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Send WhatsApp</span>
                <Toggle on={form.sendWhatsapp} onChange={(v) => patchForm({ sendWhatsapp: v })} />
              </div>
            </Collapse>

            <Collapse title="Thank You behavior" icon={<Check size={14} />} defaultOpen>
              <FieldRow label="After successful submission">
                <SelectField
                  value={form.successAction ?? "message"}
                  onChange={(v) => patchForm({ successAction: v as SiteConfig["form"]["successAction"], redirectThankYou: v === "thankyou" })}
                  options={[
                    { value: "message", label: "Show inline Thank You (this form's design)" },
                    { value: "thankyou", label: "Redirect to Thank You page" },
                    { value: "url", label: "Redirect to custom URL" },
                  ]}
                />
              </FieldRow>
              {form.successAction === "message" ? (
                <div style={{ padding: "8px 10px", borderRadius: 10, background: "var(--ps-bg)", border: "1px solid var(--ps-line)", fontSize: 12, color: "var(--ps-slate)", lineHeight: 1.5 }}>
                  Inline mode uses <strong style={{ color: "var(--ps-ink)" }}>{form.thankYouPage?.heading ?? "this form's Thank You Page Builder"}</strong> above. Fully independent per form.
                </div>
              ) : null}
              {form.successAction === "thankyou" ? (
                <>
                  <FieldRow label="Thank You page">
                    <SelectField
                      value={(() => {
                        const match = thankYouPages.find((p) => form.thankYou.includes(p.slug));
                        return match ? match.id : "";
                      })()}
                      onChange={(id) => {
                        const p = thankYouPages.find((x) => x.id === id);
                        if (p) patchForm({ thankYou: `/p/${p.slug}` });
                      }}
                      options={thankYouPages.map((p) => ({ value: p.id, label: `${p.name} · /${p.slug}` }))}
                      placeholder="Select a Thank You page"
                    />
                  </FieldRow>
                  {(() => {
                    const selectedP = thankYouPages.find((p) => form.thankYou.includes(p.slug));
                    if (!selectedP) {
                      return (
                        <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", fontSize: 12, color: "var(--ps-slate)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <span>No page selected yet{thankYouPages.length ? "" : " — none exists"}.</span>
                          {onCreateThankYouPage ? (
                            <Btn size="sm" variant="primary" icon={<FilePlus2 size={13} />} onClick={onCreateThankYouPage}>Create for this template</Btn>
                          ) : null}
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 11px", borderRadius: 10, border: "1px solid var(--ps-line)", background: "var(--ps-bg)" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: "var(--ps-muted)" }}>Redirects to</div>
                          <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "var(--ps-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{localPreviewPath(selectedP)}</div>
                        </div>
                        <Btn size="sm" variant="outline" onClick={() => window.location.assign(builderPath(selectedP.id))}>Edit page</Btn>
                      </div>
                    );
                  })()}
                </>
              ) : null}
              {form.successAction === "url" ? (
                <FieldRow label="Custom redirect URL">
                  <TextField value={form.successUrl ?? ""} onChange={(v) => patchForm({ successUrl: v })} placeholder="https://example.com/welcome" />
                </FieldRow>
              ) : null}
              <FieldRow label="Open popup after submit (popup id)" hint="Conditional action — opens a Conditional Popup whose id matches after a successful submit.">
                <TextField value={form.openPopupId ?? ""} onChange={(v) => patchForm({ openPopupId: v })} placeholder="offer-popup" />
              </FieldRow>
              <FieldRow label="Success headline (fallback for legacy pages)">
                <TextField value={form.successTitle ?? ""} onChange={(v) => patchForm({ successTitle: v })} placeholder="Thanks — we'll call you shortly." />
              </FieldRow>
              <FieldRow label="Validation error message">
                <TextField value={form.errorMessage ?? ""} onChange={(v) => patchForm({ errorMessage: v })} placeholder="Please fill in the required fields." />
              </FieldRow>
            </Collapse>

            <Collapse title="Custom submission actions" icon={<Sparkles size={14} />}>
              <div style={{ fontSize: 11.5, color: "var(--ps-muted)", lineHeight: 1.5, marginBottom: 8 }}>
                Add extensible actions: webhook, email hook, WhatsApp template, redirect, etc. Each form has its own pipeline.
              </div>
              {(form.customActions ?? []).map((a, i) => (
                <div key={a.id} style={{ border: "1px solid var(--ps-line)", borderRadius: 10, padding: 9, marginBottom: 7, background: "var(--ps-bg)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Chip tone={a.enabled ? "primary" : "neutral"}>{a.type}</Chip>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--ps-ink)" }}>{a.label}</span>
                  <Toggle on={a.enabled} onChange={(v) => { const next = [...(form.customActions ?? [])]; next[i] = { ...next[i], enabled: v }; patchForm({ customActions: next }); }} />
                  <button type="button" onClick={() => { const next = (form.customActions ?? []).filter((_, j) => j !== i); patchForm({ customActions: next }); }} style={{ background: "none", border: "none", color: "#e5484d", cursor: "pointer", padding: 4, display: "inline-flex" }}><Trash2 size={12} /></button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["webhook", "email", "whatsapp", "redirect"] as const).map((t) => (
                  <Btn key={t} size="sm" variant="outline" onClick={() => { const next = [...(form.customActions ?? []), { id: uid("act"), type: t as never, label: `${t} action`, config: {}, enabled: true }]; patchForm({ customActions: next }); }}>{t}</Btn>
                ))}
              </div>
            </Collapse>

            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <Btn variant="outline" size="sm" icon={<Sparkles size={13} />} onClick={optimize}>Tighten copy</Btn>
              <Btn variant="ghost" size="sm" onClick={() => void copyText(embedCode, "Embed snippet copied")}>Copy embed</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThankYouPreview({ form, onReset }: { form: SiteConfig["form"]; onReset: () => void }) {
  const t = form.thankYouPage;
  const pdfUrl = form.pdf?.url || form.deliverableUrl;
  return (
    <div style={{ padding: "28px 16px", textAlign: t?.alignment ?? "center", background: t?.background ?? "#fff", borderRadius: 12, border: "1px solid var(--ps-line)" }}>
      {t?.icon ? <div style={{ marginBottom: 8, display: "inline-flex", color: t.colors?.accent ?? "#6D5DFC" }}>{t.icon}</div> : null}
      <div style={{ fontSize: 18, fontWeight: 800, color: t?.typography?.textColor ?? t?.colors?.text ?? "var(--ps-ink)", fontFamily: (t?.typography?.fontFamily as string) ?? undefined }}>{t?.heading ?? form.successTitle ?? form.thankYou}</div>
      <p style={{ fontSize: 13.5, color: "var(--ps-slate)", lineHeight: 1.6, margin: "8px 0 0" }}>{t?.description ?? t?.successMessage ?? form.thankYou}</p>
      {t?.text ? <p style={{ fontSize: 13, color: "var(--ps-slate)", lineHeight: 1.6, margin: "8px 0 0" }}>{t.text}</p> : null}
      {t?.html ? <div className="ps-rich" style={{ marginTop: 10, fontSize: 13 }} dangerouslySetInnerHTML={{ __html: t.html }} /> : null}
      {pdfUrl && (t?.showPdfConfirmation ?? true) ? <div style={{ marginTop: 10, fontSize: 12, color: "var(--ps-muted)" }}>Your PDF “{form.pdf?.filename ?? "brochure.pdf"}” will download automatically.</div> : null}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
        {(t?.buttons ?? []).map((b, i) => (
          <span key={i} style={{ padding: "8px 14px", borderRadius: 9, fontSize: 12, fontWeight: 700, background: b.variant === "primary" ? "var(--ps-grad-primary)" : b.variant === "outline" ? "#fff" : "#111827", color: b.variant === "outline" ? "var(--ps-ink)" : "#fff", border: b.variant === "outline" ? "1px solid var(--ps-line-strong)" : "none" }}>{b.label}</span>
        ))}
      </div>
      <Btn variant="outline" style={{ marginTop: 16 }} onClick={onReset}>Reset preview</Btn>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conditional logic editor for a single form field.
// ---------------------------------------------------------------------------

function LogicEditor({
  field,
  allFields,
  onChange,
}: {
  field: FormLeadField;
  allFields: FormLeadField[];
  onChange: (logic: FormLeadField["logic"]) => void;
}) {
  const logic = field.logic;
  const enabled = Boolean(logic?.enabled);
  const match = logic?.match ?? "all";
  const rules = logic?.rules ?? [];
  const candidates = allFields.filter((f) => f.id !== field.id && f.type !== "hidden");

  const update = (patch: Partial<NonNullable<FormLeadField["logic"]>>) => {
    onChange({
      enabled: enabled,
      match,
      rules: rules.map((r) => ({ ...r })),
      ...patch,
    });
  };

  const setEnabled = (v: boolean) => update({ enabled: v });
  const setMatch = (v: "any" | "all") => update({ match: v });

  const addRule = () => {
    const target = candidates[0];
    if (!target) return;
    update({
      enabled: true,
      rules: [...rules, { field: target.id, op: "eq", value: "" }],
    });
  };

  const patchRule = (i: number, patch: Partial<{ field: string; op: FieldLogicOp; value: string }>) => {
    update({ rules: rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  };

  const removeRule = (i: number) => {
    const next = rules.filter((_, idx) => idx !== i);
    update({ rules: next });
  };

  const duplicateRule = (i: number) => {
    update({ rules: [...rules.slice(0, i + 1), { ...rules[i] }, ...rules.slice(i + 1)] });
  };

  const moveRule = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rules.length) return;
    const next = [...rules];
    const [item] = next.splice(i, 1);
    next.splice(j, 0, item);
    update({ rules: next });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>
          Show this field only when…
        </span>
        <Toggle on={enabled} onChange={setEnabled} />
      </div>

      {!enabled ? (
        <p style={{ fontSize: 11.5, color: "var(--ps-muted)", margin: 0, lineHeight: 1.5 }}>
          Off — this field is always visible. Turn on to reveal it based on previous answers.
        </p>
      ) : candidates.length === 0 ? (
        <p style={{ fontSize: 11.5, color: "var(--ps-muted)", margin: 0, lineHeight: 1.5 }}>
          Add another field first — conditions compare against earlier answers.
        </p>
      ) : (
        <>
          {rules.length > 1 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "var(--ps-slate)" }}>
              <span>Match</span>
              <SelectField
                value={match}
                onChange={(v) => setMatch(v as "any" | "all")}
                options={[
                  { value: "all", label: "ALL of these (AND)" },
                  { value: "any", label: "ANY of these (OR)" },
                ]}
              />
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
                  {i > 0 ? (
                    <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ps-primary)" }}>
                      {match === "all" ? "AND" : "OR"}
                    </div>
                  ) : null}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 120px", minWidth: 110 }}>
                      <SelectField
                        value={r.field}
                        onChange={(v) => patchRule(i, { field: v })}
                        options={candidates.map((f) => ({ value: f.id, label: f.label }))}
                      />
                    </div>
                    <div style={{ flex: "1 1 110px", minWidth: 100 }}>
                      <SelectField
                        value={r.op}
                        onChange={(v) => patchRule(i, { op: v as FieldLogicOp })}
                        options={FIELD_LOGIC_OPS.map((o) => ({ value: o.op, label: o.label }))}
                      />
                    </div>
                  </div>
                  {showValue ? (
                    <div>
                      {isChoice ? (
                        <SelectField
                          value={r.value}
                          onChange={(v) => patchRule(i, { value: v })}
                          options={[
                            { value: "", label: "— choose —" },
                            ...(controlling?.options ?? []).map((o) => ({ value: o, label: o })),
                          ]}
                        />
                      ) : (
                        <TextField
                          value={r.value}
                          onChange={(v) => patchRule(i, { value: v })}
                          placeholder="value to compare"
                        />
                      )}
                    </div>
                  ) : null}
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button type="button" title="Move up" disabled={i === 0} onClick={() => moveRule(i, -1)} style={iconBtn(i === 0)}>
                      <ChevronUp size={13} />
                    </button>
                    <button type="button" title="Move down" disabled={i === rules.length - 1} onClick={() => moveRule(i, 1)} style={iconBtn(i === rules.length - 1)}>
                      <ChevronDown size={13} />
                    </button>
                    <button type="button" title="Duplicate" onClick={() => duplicateRule(i)} style={iconBtn(false)}>
                      <Copy size={13} />
                    </button>
                    <button type="button" title="Remove" onClick={() => removeRule(i)} style={{ ...iconBtn(false), color: "#e5484d" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addRule}
            disabled={candidates.length === 0}
            style={{ padding: "9px", borderRadius: 10, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            + Add condition
          </button>
        </>
      )}
    </div>
  );
}

function iconBtn(disabled: boolean): React.CSSProperties {
  return {
    background: "none",
    border: "none",
    color: "var(--ps-muted)",
    cursor: disabled ? "default" : "pointer",
    padding: 4,
    display: "inline-flex",
    opacity: disabled ? 0.35 : 1,
  };
}
