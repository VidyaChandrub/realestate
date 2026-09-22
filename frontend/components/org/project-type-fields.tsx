"use client";

import { TypedFieldEditor } from "@/components/org/typed-field-editor";
import {
  groupBySection,
  nonRoleFields,
  type CustomValueDraft,
  type FieldDef,
  type FieldRow,
} from "@/lib/field-template";

/**
 * The typed inputs for a field template — number (with its unit), text,
 * yes/no and choice. Used for the project's summary fields on the wizard and
 * the edit page. Values are strings (see CustomValueDraft).
 */
export function CustomFieldInputs({
  template,
  values,
  onChange,
  errorFor,
}: {
  template: FieldDef[];
  values: CustomValueDraft;
  onChange: (key: string, value: string) => void;
  /** The inline error for a field id (`cf_<key>`), once the user has tried to continue. */
  errorFor?: (id: string) => string;
}) {
  if (template.length === 0) return null;
  return (
    <div className="grid g3">
      {template.map((f) => (
        <FieldInput key={f.key} field={f} value={values[f.key] ?? ""} onChange={(v) => onChange(f.key, v)} error={errorFor?.(`cf_${f.key}`) ?? ""} />
      ))}
    </div>
  );
}

/** One field's input, by type — number (with unit), long/short text, yes/no, choice. */
export function FieldInput({
  field: f,
  value,
  onChange,
  error,
}: {
  field: FieldDef;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className={`field${error ? " field-invalid" : ""}`}>
      <label>
        {f.label}
        {f.required ? <span className="req"> *</span> : null}
      </label>
      {f.type === "number" ? (
        <div style={{ position: "relative" }}>
          <input
            className="inp"
            type="number"
            step="any"
            style={f.unit ? { paddingRight: 12 + f.unit.length * 8 } : undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {f.unit ? (
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 13, pointerEvents: "none" }}>
              {f.unit}
            </span>
          ) : null}
        </div>
      ) : f.type === "yesno" ? (
        <select className="inp" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      ) : f.type === "choice" ? (
        <select className="inp" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {/* A stored value no longer among the options stays visible. */}
          {value && !(f.options ?? []).includes(value) ? <option value={value}>{value}</option> : null}
          {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : f.multiline ? (
        <textarea className="inp" rows={3} maxLength={2000} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="inp" value={value} maxLength={500} onChange={(e) => onChange(e.target.value)} />
      )}
      {error ? <div className="field-err">{error}</div> : null}
    </div>
  );
}

/**
 * A unit template's NON-role fields, grouped under section headings. Role
 * fields (price / area / group / floor / configuration) are never rendered
 * here — they power dedicated inputs the caller renders itself, since each
 * backs real behaviour (tower limits, configuration validation, …) beyond a
 * plain typed value.
 */
export function SectionedFieldInputs({
  template,
  values,
  onChange,
  errorFor,
}: {
  template: FieldDef[];
  values: CustomValueDraft;
  onChange: (key: string, value: string) => void;
  errorFor?: (id: string) => string;
}) {
  const fields = nonRoleFields(template);
  if (fields.length === 0) return null;
  const sections = groupBySection(fields);
  return (
    <>
      {sections.map((s, i) => (
        <div className="q-sec" key={s.section ?? `_${i}`}>
          {s.section ? <div className="lbl">{s.section}</div> : null}
          <div className="grid g3">
            {s.fields.map((f) => (
              <FieldInput key={f.key} field={f} value={values[f.key] ?? ""} onChange={(v) => onChange(f.key, v)} error={errorFor?.(`cf_${f.key}`) ?? ""} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Per-project editing of what the type prefilled: this project's own copy of
 * the project-level and unit-level field templates. Changes here never touch
 * the org's project type. There is no separate "group name" input — a
 * `group`-role field's own label (edited directly in the unit fields below)
 * is the grouping column's name.
 */
export function ProjectTemplateCustomizer({
  projectRows,
  onProjectRows,
  unitRows,
  onUnitRows,
}: {
  projectRows: FieldRow[];
  onProjectRows: (rows: FieldRow[]) => void;
  unitRows: FieldRow[];
  onUnitRows: (rows: FieldRow[]) => void;
}) {
  return (
    <details className="tpl-custom" style={{ margin: "14px 0" }}>
      <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>
        Customise this project&apos;s fields
        <span className="muted" style={{ fontWeight: 400 }}>
          {" "}— {projectRows.length} project field{projectRows.length === 1 ? "" : "s"}, {unitRows.length} unit field{unitRows.length === 1 ? "" : "s"}
        </span>
      </summary>
      <div style={{ paddingTop: 12 }}>
        <div className="hint" style={{ marginBottom: 12 }}>
          Prefilled from the project type. Add, remove or edit fields for this project only — the type itself is not changed. Removing a field never deletes values already saved.
        </div>
        <div className="field">
          <label>Project fields</label>
          <TypedFieldEditor rows={projectRows} onChange={onProjectRows} emptyText="No project fields." roles={false} />
        </div>
        <div className="field mb-0">
          <label>Unit fields</label>
          <TypedFieldEditor rows={unitRows} onChange={onUnitRows} emptyText="No unit fields." />
        </div>
      </div>
    </details>
  );
}
