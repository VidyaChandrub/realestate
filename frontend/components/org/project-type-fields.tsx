"use client";

import { TypedFieldEditor } from "@/components/org/typed-field-editor";
import {
  groupNoun,
  layoutInfo,
  type CustomValueDraft,
  type FieldDef,
  type FieldRow,
  type ProjectLayout,
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
      {template.map((f) => {
        const value = values[f.key] ?? "";
        const err = errorFor?.(`cf_${f.key}`) ?? "";
        return (
          <div className={`field${err ? " field-invalid" : ""}`} key={f.key}>
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
                  onChange={(e) => onChange(f.key, e.target.value)}
                />
                {f.unit ? (
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 13, pointerEvents: "none" }}>
                    {f.unit}
                  </span>
                ) : null}
              </div>
            ) : f.type === "yesno" ? (
              <select className="inp" value={value} onChange={(e) => onChange(f.key, e.target.value)}>
                <option value="">—</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            ) : f.type === "choice" ? (
              <select className="inp" value={value} onChange={(e) => onChange(f.key, e.target.value)}>
                <option value="">—</option>
                {/* A stored value no longer among the options stays visible. */}
                {value && !(f.options ?? []).includes(value) ? <option value={value}>{value}</option> : null}
                {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input className="inp" value={value} maxLength={500} onChange={(e) => onChange(f.key, e.target.value)} />
            )}
            {err ? <div className="field-err">{err}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Per-project editing of what the type prefilled: this project's own copy of
 * the project-level and unit-level field templates, and the name of its
 * grouping column. Changes here never touch the org's project type.
 */
export function ProjectTemplateCustomizer({
  layout,
  projectRows,
  onProjectRows,
  unitRows,
  onUnitRows,
  groupLabel,
  onGroupLabel,
}: {
  layout: ProjectLayout;
  projectRows: FieldRow[];
  onProjectRows: (rows: FieldRow[]) => void;
  unitRows: FieldRow[];
  onUnitRows: (rows: FieldRow[]) => void;
  groupLabel: string;
  onGroupLabel: (v: string) => void;
}) {
  const info = layoutInfo(layout);
  const noun = groupNoun(layout, groupLabel);
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
        {info.defaultGroupLabel !== null ? (
          <div className="field">
            <label>What do you call a group?</label>
            <input className="inp" style={{ maxWidth: 260 }} value={groupLabel} maxLength={40} placeholder={info.defaultGroupLabel} onChange={(e) => onGroupLabel(e.target.value)} />
            <div className="hint">Currently &ldquo;{noun}&rdquo;.</div>
          </div>
        ) : null}
        <div className="field">
          <label>Project fields</label>
          <TypedFieldEditor rows={projectRows} onChange={onProjectRows} emptyText="No project fields." />
        </div>
        <div className="field mb-0">
          <label>Unit fields</label>
          <TypedFieldEditor rows={unitRows} onChange={onUnitRows} emptyText="No unit fields." />
        </div>
      </div>
    </details>
  );
}
