"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Monitor,
  Plus,
  Smartphone,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { DynamicLeadForm } from "@/components/openpage/dynamic-lead-form";
import { FIELD_LOGIC_ACTIONS, FIELD_LOGIC_OPS } from "@/lib/openpage/form-logic";
import { defaultField, FIELD_TYPE_HINT, FIELD_TYPE_LABEL, PALETTE_TYPES } from "@/lib/openpage/form-fields";
import type { FormDefinition } from "@/lib/openpage/forms-store";
import type { FieldLogic, FormFieldType, FormLeadField } from "@/lib/openpage/types";

function slugKey(label: string) {
  const s = label.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(" ");
  const [a, ...rest] = s;
  return (a || "field").toLowerCase() + rest.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
}

export function FormDesigner({
  form,
  onChange,
  onSave,
}: {
  form: FormDefinition;
  onChange: (next: FormDefinition) => void;
  onSave: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(form.fields[0]?.id ?? null);
  const [rightTab, setRightTab] = useState<"field" | "logic" | "form">("field");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [showPreview, setShowPreview] = useState(false);
  const [stepFilter, setStepFilter] = useState<number | "all">("all");

  const selected = form.fields.find((f) => f.id === selectedId) ?? null;
  const stepCount = Math.max(1, form.stepCount ?? 1, ...form.fields.map((f) => (f.step ?? 0) + 1));

  const canvasFields = useMemo(() => {
    if (!form.multiStep || stepFilter === "all") return form.fields;
    return form.fields.filter((f) => (f.step ?? 0) === stepFilter);
  }, [form.fields, form.multiStep, stepFilter]);

  function patch(partial: Partial<FormDefinition>) {
    onChange({ ...form, ...partial, updatedAt: new Date().toISOString() });
  }

  function patchField(id: string, next: FormLeadField) {
    onChange({
      ...form,
      fields: form.fields.map((f) => (f.id === id ? next : f)),
      updatedAt: new Date().toISOString(),
    });
  }

  function addField(type: FormFieldType) {
    const field = defaultField(type);
    if (form.multiStep && stepFilter !== "all") field.step = stepFilter;
    onChange({ ...form, fields: [...form.fields, field], updatedAt: new Date().toISOString() });
    setSelectedId(field.id);
    setRightTab("field");
  }

  function moveField(id: string, dir: -1 | 1) {
    const idx = form.fields.findIndex((f) => f.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= form.fields.length) return;
    const fields = [...form.fields];
    const [item] = fields.splice(idx, 1);
    fields.splice(next, 0, item);
    onChange({ ...form, fields, updatedAt: new Date().toISOString() });
  }

  function removeField(id: string) {
    const fields = form.fields.filter((f) => f.id !== id);
    onChange({ ...form, fields, updatedAt: new Date().toISOString() });
    if (selectedId === id) setSelectedId(fields[0]?.id ?? null);
  }

  function addStep() {
    patch({ multiStep: true, stepCount: stepCount + 1, progressBar: form.progressBar !== false });
  }

  function logicFor(field: FormLeadField): FieldLogic {
    return field.logic ?? { enabled: false, match: "all", rules: [], action: "show" };
  }

  return (
    <div className="fb-cms">
      <div className="fb-top">
        <div>
          <div className="fb-kicker">{form.fields.length} Configured Fields</div>
          <input
            className="fb-title-input"
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </div>
        <div className="fb-top-actions">
          <span className={`fb-live ${form.enabled === false ? "is-off" : ""}`}>
            {form.enabled === false ? "Disabled" : "Active & receiving leads"}
          </span>
          <button type="button" className="btn btn-ghost" onClick={() => setShowPreview(true)}>
            <Eye size={14} /> Full Preview
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onSave();
              toast.success("Form saved");
            }}
          >
            Save Form
          </button>
        </div>
      </div>

      <div className="fb-grid">
        <aside className="fb-col">
          <button type="button" className="fb-settings-btn" onClick={() => setRightTab("form")}>
            Form Settings & Rules
            <span>Notifications, steps & redirects</span>
          </button>

          <div className="fb-card">
            <div className="fb-card-h">
              <span>Form Steps</span>
              <label className="fb-switch">
                <input
                  type="checkbox"
                  checked={form.multiStep}
                  onChange={(e) => patch({ multiStep: e.target.checked, stepCount: Math.max(2, form.stepCount ?? 2) })}
                />
                Multi-Step
              </label>
            </div>
            <button
              type="button"
              className={`fb-step ${stepFilter === "all" ? "is-on" : ""}`}
              onClick={() => setStepFilter("all")}
            >
              Show All Fields <b>{form.fields.length}</b>
            </button>
            {form.multiStep
              ? Array.from({ length: stepCount }, (_, i) => {
                  const count = form.fields.filter((f) => (f.step ?? 0) === i).length;
                  return (
                    <div key={i} className={`fb-step-row ${stepFilter === i ? "is-on" : ""}`}>
                      <button type="button" onClick={() => setStepFilter(i)}>
                        {i + 1}. Step {i + 1}
                      </button>
                      <span>{count}</span>
                    </div>
                  );
                })
              : null}
            <button type="button" className="fb-add-step" onClick={addStep}>
              <Plus size={12} /> Add New Step
            </button>
          </div>

          <div className="fb-card">
            <div className="fb-card-h">
              <span>Field palette</span>
            </div>
            <p className="fb-hint">Click to add directly to canvas</p>
            <div className="fb-palette">
              {PALETTE_TYPES.map((type) => (
                <button key={type} type="button" onClick={() => addField(type)}>
                  <strong>{FIELD_TYPE_LABEL[type]}</strong>
                  <span>{FIELD_TYPE_HINT[type]}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="fb-canvas-wrap">
          <div className="fb-canvas-h">
            <span>
              Live Form Canvas · {form.fields.length} Fields Total
            </span>
            <div className="fb-devices">
              <button type="button" className={device === "desktop" ? "is-on" : ""} onClick={() => setDevice("desktop")}>
                <Monitor size={13} /> Desktop
              </button>
              <button type="button" className={device === "mobile" ? "is-on" : ""} onClick={() => setDevice("mobile")}>
                <Smartphone size={13} /> Mobile
              </button>
            </div>
          </div>
          <div className={`fb-canvas ${device}`}>
            <div className="fb-form-head" onClick={() => setRightTab("form")}>
              <small>Form header (click to edit)</small>
              <h2>{form.name || "Untitled form"}</h2>
              <p>{form.description || "Capture enquiries and send them to your CRM."}</p>
            </div>
            {canvasFields.length === 0 ? (
              <p className="fb-empty">No fields on this step. Pick one from the palette.</p>
            ) : (
              canvasFields.map((field) => (
                <div
                  key={field.id}
                  className={`fb-field ${selectedId === field.id ? "is-on" : ""}`}
                  onClick={() => {
                    setSelectedId(field.id);
                    setRightTab("field");
                  }}
                >
                  <div className="fb-field-tools">
                    <span>{String(field.type).toUpperCase()}</span>
                    <div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); moveField(field.id, -1); }}><ChevronUp size={12} /></button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); moveField(field.id, 1); }}><ChevronDown size={12} /></button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeField(field.id); }}><X size={12} /></button>
                    </div>
                  </div>
                  {field.type !== "checkbox" && field.type !== "consent" && field.type !== "heading" && field.type !== "html" ? (
                    <label>
                      {field.label}
                      {field.required ? " *" : ""}
                    </label>
                  ) : null}
                  {field.type === "select" ? (
                    <select disabled defaultValue="">
                      <option>{field.placeholder || "Choose"}</option>
                    </select>
                  ) : field.type === "textarea" || field.type === "address" ? (
                    <textarea disabled placeholder={field.placeholder} />
                  ) : field.type === "checkbox" || field.type === "consent" ? (
                    <label className="fb-check"><input type="checkbox" disabled /> {field.label}</label>
                  ) : field.type === "heading" ? (
                    <strong>{field.label}</strong>
                  ) : field.type === "html" ? (
                    <div dangerouslySetInnerHTML={{ __html: field.html || "" }} />
                  ) : field.type === "radio" ? (
                    <div className="fb-radios">{(field.options ?? []).map((o) => <label key={o}><input type="radio" disabled /> {o}</label>)}</div>
                  ) : (
                    <input disabled placeholder={field.placeholder} />
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="fb-col">
          <div className="fb-tabs">
            {([
              ["field", "Field Properties"],
              ["logic", "Conditions"],
              ["form", "Form Settings"],
            ] as const).map(([id, label]) => (
              <button key={id} type="button" className={rightTab === id ? "is-on" : ""} onClick={() => setRightTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {rightTab === "field" && selected ? (
            <div className="fb-props">
              <div className="fb-editing">
                Editing field <b>{selected.type.toUpperCase()}</b>
              </div>
              <label>Field label *</label>
              <input value={selected.label} onChange={(e) => patchField(selected.id, { ...selected, label: e.target.value })} />
              <label>Variable name (key)</label>
              <input value={slugKey(selected.label)} readOnly />
              <label>Input type</label>
              <select
                value={selected.type}
                onChange={(e) => patchField(selected.id, { ...selected, type: e.target.value as FormFieldType })}
              >
                {PALETTE_TYPES.map((t) => (
                  <option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>
                ))}
              </select>
              {form.multiStep ? (
                <>
                  <label>Assign to step</label>
                  <select
                    value={String(selected.step ?? 0)}
                    onChange={(e) => patchField(selected.id, { ...selected, step: Number(e.target.value) })}
                  >
                    {Array.from({ length: stepCount }, (_, i) => (
                      <option key={i} value={i}>Step {i + 1}</option>
                    ))}
                  </select>
                </>
              ) : null}
              <label>Placeholder</label>
              <input value={selected.placeholder} onChange={(e) => patchField(selected.id, { ...selected, placeholder: e.target.value })} />
              <label className="fb-check">
                <input
                  type="checkbox"
                  checked={selected.required}
                  onChange={(e) => patchField(selected.id, { ...selected, required: e.target.checked })}
                />
                Required / Mandatory Field
              </label>
              <label>Custom CSS / column class</label>
              <input value={selected.cssClass ?? ""} onChange={(e) => patchField(selected.id, { ...selected, cssClass: e.target.value })} />
              <label>Help text</label>
              <input value={selected.helpText ?? ""} onChange={(e) => patchField(selected.id, { ...selected, helpText: e.target.value })} />
              <label>URL parameter auto-fill</label>
              <input value={selected.queryParam ?? ""} onChange={(e) => patchField(selected.id, { ...selected, queryParam: e.target.value })} />
              {(selected.type === "select" || selected.type === "radio" || selected.type === "checkbox") && (
                <>
                  <label>Options (one per line)</label>
                  <textarea
                    rows={4}
                    value={(selected.options ?? []).join("\n")}
                    onChange={(e) => patchField(selected.id, { ...selected, options: e.target.value.split("\n") })}
                  />
                </>
              )}
            </div>
          ) : rightTab === "field" ? (
            <p className="fb-hint">Select a field on the canvas.</p>
          ) : null}

          {rightTab === "logic" && selected ? (
            <div className="fb-props">
              <label className="fb-check">
                <input
                  type="checkbox"
                  checked={!!selected.logic?.enabled}
                  onChange={(e) =>
                    patchField(selected.id, {
                      ...selected,
                      logic: { ...logicFor(selected), enabled: e.target.checked },
                    })
                  }
                />
                Enable conditional logic
              </label>
              {selected.logic?.enabled ? (
                <>
                  <label>Then</label>
                  <select
                    value={selected.logic?.action ?? "show"}
                    onChange={(e) =>
                      patchField(selected.id, {
                        ...selected,
                        logic: { ...logicFor(selected), action: e.target.value as FieldLogic["action"] },
                      })
                    }
                  >
                    {FIELD_LOGIC_ACTIONS.map((a) => (
                      <option key={a.action} value={a.action}>{a.label}</option>
                    ))}
                  </select>
                  {(selected.logic?.action ?? "show") === "set_value" ? (
                    <>
                      <label>Set value to</label>
                      <input
                        value={selected.logic?.setValue ?? ""}
                        onChange={(e) =>
                          patchField(selected.id, { ...selected, logic: { ...logicFor(selected), setValue: e.target.value } })
                        }
                      />
                    </>
                  ) : null}
                  <label>Match</label>
                  <select
                    value={selected.logic?.match ?? "all"}
                    onChange={(e) =>
                      patchField(selected.id, {
                        ...selected,
                        logic: { ...logicFor(selected), match: e.target.value as "all" | "any" },
                      })
                    }
                  >
                    <option value="all">All rules (AND)</option>
                    <option value="any">Any rule (OR)</option>
                  </select>
                  {(selected.logic?.rules ?? []).map((rule, idx) => (
                    <div key={idx} className="fb-rule">
                      <select
                        value={rule.field}
                        onChange={(e) => {
                          const rules = [...(selected.logic?.rules ?? [])];
                          rules[idx] = { ...rule, field: e.target.value };
                          patchField(selected.id, { ...selected, logic: { ...logicFor(selected), rules } });
                        }}
                      >
                        <option value="">Select field…</option>
                        {form.fields.filter((f) => f.id !== selected.id).map((f) => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>
                      <select
                        value={rule.op}
                        onChange={(e) => {
                          const rules = [...(selected.logic?.rules ?? [])];
                          rules[idx] = { ...rule, op: e.target.value as typeof rule.op };
                          patchField(selected.id, { ...selected, logic: { ...logicFor(selected), rules } });
                        }}
                      >
                        {FIELD_LOGIC_OPS.map((o) => (
                          <option key={o.op} value={o.op}>{o.label}</option>
                        ))}
                      </select>
                      {FIELD_LOGIC_OPS.find((o) => o.op === rule.op)?.needsValue !== false ? (
                        <input
                          value={rule.value}
                          onChange={(e) => {
                            const rules = [...(selected.logic?.rules ?? [])];
                            rules[idx] = { ...rule, value: e.target.value };
                            patchField(selected.id, { ...selected, logic: { ...logicFor(selected), rules } });
                          }}
                        />
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() =>
                          patchField(selected.id, {
                            ...selected,
                            logic: { ...logicFor(selected), rules: (selected.logic?.rules ?? []).filter((_, i) => i !== idx) },
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      patchField(selected.id, {
                        ...selected,
                        logic: {
                          ...logicFor(selected),
                          rules: [...(selected.logic?.rules ?? []), { field: form.fields.find((f) => f.id !== selected.id)?.id ?? "", op: "eq", value: "" }],
                        },
                      })
                    }
                  >
                    <Plus size={12} /> Add rule
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {rightTab === "form" ? (
            <div className="fb-props">
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => patch({ description: e.target.value })} />
              <label className="fb-check">
                <input type="checkbox" checked={form.enabled !== false} onChange={(e) => patch({ enabled: e.target.checked })} />
                Active & receiving leads
              </label>
              <label>Submit button label</label>
              <input value={form.submitLabel} onChange={(e) => patch({ submitLabel: e.target.value })} />
              <label>Thank-you message</label>
              <input value={form.thankYou} onChange={(e) => patch({ thankYou: e.target.value })} />
              <label>Success action</label>
              <select value={form.successAction} onChange={(e) => patch({ successAction: e.target.value as FormDefinition["successAction"] })}>
                <option value="message">Show message</option>
                <option value="url">Redirect to URL</option>
                <option value="thankyou">Thank you page</option>
              </select>
              {form.successAction === "url" ? (
                <>
                  <label>Redirect URL</label>
                  <input value={form.successUrl} onChange={(e) => patch({ successUrl: e.target.value })} />
                </>
              ) : null}
              <label>Notify email</label>
              <input value={form.notifyEmail} onChange={(e) => patch({ notifyEmail: e.target.value })} />
              <label>Webhook URL</label>
              <input value={form.webhookUrl ?? ""} onChange={(e) => patch({ webhookUrl: e.target.value })} />
              <label>Google Sheets webhook</label>
              <input value={form.integrations?.googleSheetsUrl ?? ""} onChange={(e) => patch({ integrations: { ...form.integrations, googleSheetsUrl: e.target.value } })} />
              <label className="fb-check">
                <input type="checkbox" checked={form.honeypot !== false} onChange={(e) => patch({ honeypot: e.target.checked })} />
                Honeypot spam protection
              </label>
              <label className="fb-check">
                <input type="checkbox" checked={!!form.preventDuplicate} onChange={(e) => patch({ preventDuplicate: e.target.checked })} />
                Prevent duplicate submissions
              </label>
              <label className="fb-check">
                <input type="checkbox" checked={!!form.captchaEnabled} onChange={(e) => patch({ captchaEnabled: e.target.checked })} />
                CAPTCHA
              </label>

              <div className="fb-editing" style={{ marginTop: 8 }}>After submit — file download</div>
              <label className="fb-check">
                <input
                  type="checkbox"
                  checked={!!form.pdf?.enabled}
                  onChange={(e) => patch({ pdf: { ...form.pdf, enabled: e.target.checked } })}
                />
                Download a PDF or image after submit
              </label>
              {form.pdf?.enabled ? (
                <>
                  <label>File type</label>
                  <select
                    value={form.pdf?.kind || "pdf"}
                    onChange={(e) => patch({ pdf: { ...form.pdf, kind: e.target.value as "pdf" | "image" } })}
                  >
                    <option value="pdf">PDF</option>
                    <option value="image">Image</option>
                  </select>
                  <label>{form.pdf?.kind === "image" ? "Image URL" : "PDF URL"}</label>
                  <input
                    value={form.pdf?.url ?? ""}
                    onChange={(e) => patch({ pdf: { ...form.pdf, url: e.target.value } })}
                    placeholder="https://…"
                  />
                  <label>Filename</label>
                  <input
                    value={form.pdf?.filename ?? ""}
                    onChange={(e) => patch({ pdf: { ...form.pdf, filename: e.target.value } })}
                    placeholder={form.pdf?.kind === "image" ? "brochure.jpg" : "brochure.pdf"}
                  />
                  <label className="fb-check">
                    <input
                      type="checkbox"
                      checked={form.pdf?.autoDownload !== false}
                      onChange={(e) => patch({ pdf: { ...form.pdf, autoDownload: e.target.checked } })}
                    />
                    Auto-download (also shows a button on thank-you)
                  </label>
                </>
              ) : null}

              <div className="fb-editing">Conditional downloads</div>
              <p className="fb-hint">If a field matches, that file is used instead of the default.</p>
              {(form.downloadRules ?? []).map((rule, idx) => (
                <div key={idx} className="fb-rule">
                  <label>If field</label>
                  <select
                    value={rule.field}
                    onChange={(e) => {
                      const downloadRules = [...(form.downloadRules ?? [])];
                      downloadRules[idx] = { ...rule, field: e.target.value };
                      patch({ downloadRules });
                    }}
                  >
                    <option value="">Select field…</option>
                    {form.fields.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                  <select
                    value={rule.op || "eq"}
                    onChange={(e) => {
                      const downloadRules = [...(form.downloadRules ?? [])];
                      downloadRules[idx] = { ...rule, op: e.target.value };
                      patch({ downloadRules });
                    }}
                  >
                    {FIELD_LOGIC_OPS.map((o) => (
                      <option key={o.op} value={o.op}>{o.label}</option>
                    ))}
                  </select>
                  {FIELD_LOGIC_OPS.find((o) => o.op === (rule.op || "eq"))?.needsValue !== false ? (
                    <input
                      value={rule.value}
                      onChange={(e) => {
                        const downloadRules = [...(form.downloadRules ?? [])];
                        downloadRules[idx] = { ...rule, value: e.target.value };
                        patch({ downloadRules });
                      }}
                      placeholder="Value"
                    />
                  ) : null}
                  <label>Then download</label>
                  <select
                    value={rule.kind || "pdf"}
                    onChange={(e) => {
                      const downloadRules = [...(form.downloadRules ?? [])];
                      downloadRules[idx] = { ...rule, kind: e.target.value as "pdf" | "image" };
                      patch({ downloadRules });
                    }}
                  >
                    <option value="pdf">PDF</option>
                    <option value="image">Image</option>
                  </select>
                  <input
                    value={rule.url}
                    onChange={(e) => {
                      const downloadRules = [...(form.downloadRules ?? [])];
                      downloadRules[idx] = { ...rule, url: e.target.value };
                      patch({ downloadRules });
                    }}
                    placeholder="https://…/file.pdf"
                  />
                  <input
                    value={rule.filename ?? ""}
                    onChange={(e) => {
                      const downloadRules = [...(form.downloadRules ?? [])];
                      downloadRules[idx] = { ...rule, filename: e.target.value };
                      patch({ downloadRules });
                    }}
                    placeholder="Filename"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => patch({ downloadRules: (form.downloadRules ?? []).filter((_, i) => i !== idx) })}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  patch({
                    downloadRules: [
                      ...(form.downloadRules ?? []),
                      { field: form.fields[0]?.id ?? "", op: "eq", value: "", url: "", kind: "pdf", filename: "brochure.pdf" },
                    ],
                  })
                }
              >
                <Plus size={12} /> Add download condition
              </button>
            </div>
          ) : null}
        </aside>
      </div>

      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Full preview" size="lg">
        <DynamicLeadForm form={form} live={false} place="admin-preview" />
      </Modal>
    </div>
  );
}
