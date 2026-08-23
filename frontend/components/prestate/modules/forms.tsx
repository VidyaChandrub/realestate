"use client";

import { useState } from "react";
import type * as React from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  FilePlus2,
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
  Upload,
  Users,
} from "lucide-react";
import { FORM_TEMPLATES, uid } from "@/lib/prestate/data";
import { FORM_PRESETS } from "@/lib/prestate/form-presets";
import type { FormLeadField, LandingPageData, SiteConfig } from "@/lib/prestate/types";
import { ensureConfig, siteThemeStyle } from "@/lib/prestate/site-config";
import { builderPath, localPreviewPath } from "@/lib/prestate/paths";
import { savePages } from "@/lib/prestate/persist";
import { ModuleHeader, SiteScopeBar } from "./shared";
import { Btn, Chip, Collapse, FieldRow, SelectField, TextField, Toggle } from "@/components/prestate/ui";

type FieldType = "text" | "phone" | "email" | "select" | "radio" | "checkbox" | "date" | "file" | "textarea" | "hidden";

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ReactNode }[] = [
  { type: "text", label: "Text input", icon: <TextCursorInput size={15} /> },
  { type: "phone", label: "Phone", icon: <Phone size={15} /> },
  { type: "email", label: "Email", icon: <Mail size={15} /> },
  { type: "textarea", label: "Text area", icon: <MessageSquare size={15} /> },
  { type: "select", label: "Dropdown", icon: <Settings2 size={15} /> },
  { type: "radio", label: "Radio group", icon: <Circle size={15} /> },
  { type: "checkbox", label: "Checkbox", icon: <Check size={15} /> },
  { type: "date", label: "Date picker", icon: <Calendar size={15} /> },
  { type: "file", label: "File upload", icon: <Upload size={15} /> },
  { type: "hidden", label: "Hidden field", icon: <Smartphone size={15} /> },
];

function cloneFields(fields: FormLeadField[]): FormLeadField[] {
  return fields.map((x) => ({ ...x, id: uid("fld"), options: x.options ? [...x.options] : undefined }));
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
  /** Creates a Thank You companion page and opens it in the builder. */
  onCreateThankYouPage?: () => void;
}) {
  const cfg = ensureConfig(site);
  const form = cfg.form;
  const fields = form.fields;
  const thankYouPages = pages.filter((p) => p.pageType === "thank-you");
  const [selected, setSelected] = useState(fields[0]?.id ?? "");
  const [previewSent, setPreviewSent] = useState(false);
  const sel = fields.find((f) => f.id === selected) ?? fields[0];

  const patchForm = (partial: Partial<SiteConfig["form"]>) => onPatch((c) => ({ ...c, form: { ...c.form, ...partial } }));
  const setFields = (next: FormLeadField[] | ((prev: FormLeadField[]) => FormLeadField[])) => {
    onPatch((c) => {
      const value = typeof next === "function" ? next(c.form.fields) : next;
      return { ...c, form: { ...c.form, fields: value } };
    });
  };

  const addField = (type: FieldType) => {
    const meta = FIELD_TYPES.find((f) => f.type === type);
    const field: FormLeadField = {
      id: uid("fld"),
      type,
      label: meta?.label ?? type,
      placeholder: type === "select" || type === "radio" ? "Choose an option" : "",
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

  const loadPreset = (id: string) => {
    const preset = FORM_PRESETS[id];
    if (!preset) return;
    const next = cloneFields(preset.fields);
    patchForm({ templateId: id, multiStep: preset.multiStep, submitLabel: preset.submitLabel, fields: next });
    setSelected(next[0]?.id ?? "");
    setPreviewSent(false);
    onToast(`Loaded ${FORM_TEMPLATES.find((t) => t.id === id)?.name ?? "template"}`);
  };

  const copyEmbed = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const snippet = `<iframe src="${origin}/p/${site.slug}#lead-form" title="${site.name} lead form" style="width:100%;min-height:720px;border:0"></iframe>`;
    try {
      await navigator.clipboard.writeText(snippet);
      onToast("Embed code copied");
    } catch {
      onToast("Could not copy embed code");
    }
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
                : x.placeholder,
      })),
    );
    onToast("Field hints tightened for this form");
  };

  return (
    <div style={{ overflowY: "auto", height: "100%", ...siteThemeStyle(cfg.brand) }}>
      <ModuleHeader
        title="Form Builder"
        description={`Lead form for “${site.name}”. Fields show on this template’s page form and local preview.`}
        actions={
          <div style={{ display: "flex", gap: 9 }}>
            <Btn variant="outline" icon={<Copy size={14} />} onClick={() => void copyEmbed()}>Embed</Btn>
            <Btn variant="primary" icon={<Save size={14} />} onClick={() => onToast(`Form saved for ${site.name}`)}>Save form</Btn>
          </div>
        }
      />
      <SiteScopeBar pages={pages} activeId={site.id} />

      <div className="ps-form-meta" style={{ padding: "0 28px 12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <FieldRow label="Notify email">
          <TextField value={form.notifyEmail} onChange={(v) => patchForm({ notifyEmail: v })} placeholder="leads@example.com" />
        </FieldRow>
        <FieldRow label="WhatsApp">
          <TextField value={form.whatsapp} onChange={(v) => patchForm({ whatsapp: v })} placeholder="919876543210" />
        </FieldRow>
        <FieldRow label="Submit button">
          <TextField value={form.submitLabel} onChange={(v) => patchForm({ submitLabel: v })} />
        </FieldRow>
      </div>
      <div style={{ padding: "0 28px 18px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {FORM_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => loadPreset(t.id)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: form.templateId === t.id ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line-strong)",
              background: form.templateId === t.id ? "var(--ps-primary-soft)" : "#fff",
              color: form.templateId === t.id ? "var(--ps-primary)" : "var(--ps-slate)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t.name}
          </button>
        ))}
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: "var(--ps-slate)" }}>
          <Toggle on={form.multiStep} onChange={(v) => patchForm({ multiStep: v })} /> Multi-step flow
        </span>
      </div>

      <div className="ps-form-builder-grid" style={{ display: "grid", gridTemplateColumns: "220px minmax(0, 1fr) 280px", gap: 16, padding: "0 28px 48px", minHeight: 480, alignItems: "start" }}>
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

        <div>
          <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line)", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 30px rgba(17,24,39,.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderBottom: "1px solid var(--ps-line)", background: "var(--ps-bg)", fontSize: 12.5, fontWeight: 700, color: "var(--ps-slate)" }}>
              <Users size={14} /> {form.multiStep ? "Multi-step lead capture" : "Lead capture"}
              <span style={{ marginLeft: "auto" }}><Chip tone="primary">{fields.length} fields</Chip></span>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {previewSent ? (
                <div style={{ padding: "28px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ps-ink)", marginBottom: 8 }}>Submitted</div>
                  <p style={{ fontSize: 13.5, color: "var(--ps-slate)", lineHeight: 1.6, margin: 0 }}>{form.thankYou}</p>
                  <Btn variant="outline" style={{ marginTop: 16 }} onClick={() => setPreviewSent(false)}>Reset preview</Btn>
                </div>
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
                            {f.label} {f.required ? <span style={{ color: "var(--ps-danger)" }}>*</span> : null}
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
                          ) : (
                            <input className="ps-input" readOnly value={f.placeholder} style={{ height: 34, fontSize: 12.5, background: "var(--ps-bg)" }} />
                          )}
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
              <FieldRow label="Type">
                <SelectField
                  value={sel.type}
                  onChange={(v) => patchField(sel.id, { type: v, options: v === "select" ? sel.options?.length ? sel.options : ["Option 1", "Option 2"] : undefined })}
                  options={FIELD_TYPES.map((t) => ({ value: t.type, label: t.label }))}
                />
              </FieldRow>
              {sel.type === "select" ? (
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

            <Collapse title="After successful submission" icon={<Check size={14} />} defaultOpen>
              <FieldRow label="Success action">
                <SelectField
                  value={form.successAction ?? "message"}
                  onChange={(v) => patchForm({ successAction: v as SiteConfig["form"]["successAction"], redirectThankYou: v === "thankyou" })}
                  options={[
                    { value: "message", label: "Stay on page — show message" },
                    { value: "thankyou", label: "Redirect to Thank You page" },
                    { value: "url", label: "Redirect to custom URL" },
                  ]}
                />
              </FieldRow>
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
                    const selected = thankYouPages.find((p) => form.thankYou.includes(p.slug));
                    if (!selected) {
                      return (
                        <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", fontSize: 12, color: "var(--ps-slate)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <span>No Thank You page selected yet{thankYouPages.length ? "" : " — none exists for this workspace"}.</span>
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
                          <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "var(--ps-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{localPreviewPath(selected)}</div>
                        </div>
                        <Btn size="sm" variant="outline" onClick={() => { savePages([site]); window.location.assign(builderPath(selected.id)); }}>Edit page</Btn>
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
              <FieldRow label="Success headline">
                <TextField value={form.successTitle ?? ""} onChange={(v) => patchForm({ successTitle: v })} placeholder="Thanks — we'll call you shortly." />
              </FieldRow>
              <FieldRow label="Validation error message">
                <TextField value={form.errorMessage ?? ""} onChange={(v) => patchForm({ errorMessage: v })} placeholder="Please fill in the required fields." />
              </FieldRow>
              <FieldRow label="Auto-download file (post-submit)">
                <TextField value={form.deliverableUrl ?? ""} onChange={(v) => patchForm({ deliverableUrl: v })} placeholder="/brochure/project.pdf" />
              </FieldRow>
              {form.deliverableUrl ? (
                <FieldRow label="Download button label">
                  <TextField value={form.deliverableLabel ?? ""} onChange={(v) => patchForm({ deliverableLabel: v })} placeholder="Download brochure" />
                </FieldRow>
              ) : null}
            </Collapse>

            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <Btn variant="outline" size="sm" icon={<Sparkles size={13} />} onClick={optimize}>Tighten copy</Btn>
              <Btn variant="ghost" size="sm" onClick={() => void copyEmbed()}>Embed</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
