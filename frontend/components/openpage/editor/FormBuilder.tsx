"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { produce } from "immer";
import {
  GripVertical,
  Type,
  Mail,
  Phone,
  Hash,
  ChevronDown,
  Circle,
  CheckSquare,
  Calendar,
  Clock,
  AlignLeft,
  EyeOff,
  FileText,
  Plus,
  Trash2,
  Copy,
  ChevronRight,
  ChevronDown as ChevronDownIcon,
  Settings,
  Code,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { Section } from "./shared-components";
import type {
  FormLeadField,
  FieldLogic,
  FieldLogicRule,
  FormFieldType,
} from "@/lib/openpage/types";
import { FORM_PRESETS } from "@/lib/openpage/form-presets";
import { FIELD_LOGIC_OPS } from "@/lib/openpage/form-logic";
import type { FormDefinition } from "@/lib/openpage/forms-store";
import { newFormDefinition, embedSnippet } from "@/lib/openpage/forms-store";

const FIELD_TYPE_ICON: Record<string, React.ElementType> = {
  text: Type,
  email: Mail,
  phone: Phone,
  number: Hash,
  select: ChevronDown,
  radio: Circle,
  checkbox: CheckSquare,
  date: Calendar,
  time: Clock,
  textarea: AlignLeft,
  hidden: EyeOff,
  file: FileText,
};

const FIELD_TYPE_LABEL: Record<string, string> = {
  text: "Text",
  email: "Email",
  phone: "Phone",
  number: "Number",
  select: "Dropdown",
  radio: "Radio",
  checkbox: "Checkbox",
  date: "Date",
  time: "Time",
  textarea: "Text Area",
  hidden: "Hidden",
  file: "File",
};

const ALL_FIELD_TYPES: FormFieldType[] = [
  "text",
  "email",
  "phone",
  "number",
  "select",
  "radio",
  "checkbox",
  "date",
  "time",
  "textarea",
  "hidden",
  "file",
];

function uid(prefix = "fld"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function defaultField(type: FormFieldType): FormLeadField {
  const label = FIELD_TYPE_LABEL[type] || "Field";
  return {
    id: uid(),
    type,
    label,
    placeholder: "",
    required: false,
    options:
      type === "select" || type === "radio" || type === "checkbox"
        ? ["Option 1", "Option 2"]
        : undefined,
    logic: undefined,
    validation: undefined,
    helpText: "",
  };
}

/* ───────────────────────── Input helpers ─────────────────────── */

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  label: string;
  value: string | number | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[10px] text-text-3 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-2 text-text-0 text-[11px] outline-none focus:border-green"
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-[10px] text-text-3 mb-1">{label}</label>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? undefined : Number(v));
        }}
        min={min}
        max={max}
        className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-2 text-text-0 text-[11px] outline-none focus:border-green"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-text-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-border-default bg-bg-2 accent-green cursor-pointer"
      />
      {label}
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[10px] text-text-3 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-2 text-text-0 text-[11px] outline-none focus:border-green cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ─────────────────────── Options editor ─────────────────────── */

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (opts: string[]) => void;
}) {
  const [newOpt, setNewOpt] = useState("");

  function add() {
    const val = newOpt.trim();
    if (!val) return;
    onChange([...options, val]);
    setNewOpt("");
  }

  function remove(idx: number) {
    onChange(options.filter((_, i) => i !== idx));
  }

  function update(idx: number, val: string) {
    const next = [...options];
    next[idx] = val;
    onChange(next);
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] text-text-3">Options</label>
      {options.map((opt, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <input
            type="text"
            value={opt}
            onChange={(e) => update(idx, e.target.value)}
            className="flex-1 px-2 py-1 rounded border border-border-default bg-bg-2 text-text-0 text-[11px] outline-none focus:border-green"
          />
          <button
            onClick={() => remove(idx)}
            className="p-1 rounded hover:bg-status-red/10 text-text-3 hover:text-status-red transition-colors shrink-0"
          >
            <Trash2 size={10} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={newOpt}
          onChange={(e) => setNewOpt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="New option…"
          className="flex-1 px-2 py-1 rounded border border-border-default bg-bg-2 text-text-0 text-[11px] outline-none focus:border-green"
        />
        <button
          onClick={add}
          disabled={!newOpt.trim()}
          className="p-1 rounded bg-green text-bg-0 hover:bg-green/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={10} />
        </button>
      </div>
    </div>
  );
}

/* ──────────────────── Conditional logic editor ──────────────── */

function LogicEditor({
  logic,
  fields,
  currentFieldId,
  onChange,
}: {
  logic: FieldLogic;
  fields: FormLeadField[];
  currentFieldId: string;
  onChange: (l: FieldLogic) => void;
}) {
  const otherFields = fields.filter((f) => f.id !== currentFieldId);

  function updateRule(idx: number, partial: Partial<FieldLogicRule>) {
    const rules = [...logic.rules];
    rules[idx] = { ...rules[idx], ...partial };
    onChange({ ...logic, rules });
  }

  function addRule() {
    onChange({
      ...logic,
      rules: [
        ...logic.rules,
        { field: otherFields[0]?.id ?? "", op: "eq", value: "" },
      ],
    });
  }

  function removeRule(idx: number) {
    onChange({
      ...logic,
      rules: logic.rules.filter((_, i) => i !== idx),
    });
  }

  return (
    <div className="space-y-2">
      <Toggle
        label="Conditional logic"
        checked={logic.enabled}
        onChange={(enabled) => onChange({ ...logic, enabled })}
      />
      {logic.enabled && (
        <>
          <SelectInput
            label="Match"
            value={logic.match}
            onChange={(match) =>
              onChange({ ...logic, match: match as "all" | "any" })
            }
            options={[
              { value: "all", label: "All rules (AND)" },
              { value: "any", label: "Any rule (OR)" },
            ]}
          />
          {logic.rules.map((rule, idx) => {
            const opInfo = FIELD_LOGIC_OPS.find((o) => o.op === rule.op);
            return (
              <div
                key={idx}
                className="p-2 rounded border border-border-subtle bg-bg-3 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-text-3 uppercase tracking-wider font-semibold">
                    Rule {idx + 1}
                  </span>
                  <button
                    onClick={() => removeRule(idx)}
                    className="p-0.5 rounded hover:bg-status-red/10 text-text-3 hover:text-status-red transition-colors"
                  >
                    <Trash2 size={9} />
                  </button>
                </div>
                <select
                  value={rule.field}
                  onChange={(e) => updateRule(idx, { field: e.target.value })}
                  className="w-full px-2 py-1 rounded border border-border-default bg-bg-2 text-text-0 text-[10px] outline-none focus:border-green"
                >
                  <option value="">Select field…</option>
                  {otherFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <select
                  value={rule.op}
                  onChange={(e) => updateRule(idx, { op: e.target.value as any })}
                  className="w-full px-2 py-1 rounded border border-border-default bg-bg-2 text-text-0 text-[10px] outline-none focus:border-green"
                >
                  {FIELD_LOGIC_OPS.map((o) => (
                    <option key={o.op} value={o.op}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {opInfo?.needsValue !== false && (
                  <input
                    type="text"
                    value={rule.value}
                    onChange={(e) => updateRule(idx, { value: e.target.value })}
                    placeholder="Value…"
                    className="w-full px-2 py-1 rounded border border-border-default bg-bg-2 text-text-0 text-[10px] outline-none focus:border-green"
                  />
                )}
              </div>
            );
          })}
          <button
            onClick={addRule}
            disabled={otherFields.length === 0}
            className="w-full flex items-center justify-center gap-1 py-1.5 rounded border border-dashed border-border-default text-[10px] text-text-3 hover:text-text-1 hover:border-text-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={10} />
            Add rule
          </button>
        </>
      )}
    </div>
  );
}

/* ──────────────────── Sortable field item ───────────────────── */

function SortableFieldItem({
  field,
  fields,
  expanded,
  onToggleExpand,
  onFieldChange,
  onDelete,
  onDuplicate,
}: {
  field: FormLeadField;
  fields: FormLeadField[];
  expanded: boolean;
  onToggleExpand: () => void;
  onFieldChange: (f: FormLeadField) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  const Icon = FIELD_TYPE_ICON[field.type] || Type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded border bg-bg-2 transition-colors ${
        isDragging
          ? "border-green shadow-lg"
          : "border-border-default hover:border-border-hover"
      } ${expanded ? "border-green/40" : ""}`}
    >
      {/* Collapsed row */}
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <button
          {...attributes}
          {...listeners}
          className="p-0.5 rounded hover:bg-bg-3 text-text-3 hover:text-text-1 cursor-grab active:cursor-grabbing transition-colors shrink-0"
        >
          <GripVertical size={12} />
        </button>

        <button
          onClick={onToggleExpand}
          className="p-0.5 rounded hover:bg-bg-3 text-text-3 hover:text-text-1 transition-colors shrink-0"
        >
          {expanded ? (
            <ChevronDownIcon size={12} />
          ) : (
            <ChevronRight size={12} />
          )}
        </button>

        <Icon size={12} className="text-text-3 shrink-0" />

        <input
          type="text"
          value={field.label}
          onChange={(e) => onFieldChange({ ...field, label: e.target.value })}
          className="flex-1 min-w-0 px-1 py-0.5 rounded text-[11px] text-text-0 bg-transparent border border-transparent hover:border-border-default focus:border-green focus:bg-bg-2 outline-none transition-colors"
        />

        {field.type === "hidden" && (
          <span className="text-[9px] text-text-3 bg-bg-3 px-1 py-0.5 rounded shrink-0">
            hidden
          </span>
        )}

        <button
          onClick={() => onFieldChange({ ...field, required: !field.required })}
          className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors ${
            field.required
              ? "bg-green/15 text-green"
              : "bg-bg-3 text-text-3 hover:text-text-1"
          }`}
        >
          {field.required ? "Req" : "Opt"}
        </button>

        <button
          onClick={onDuplicate}
          className="p-0.5 rounded hover:bg-bg-3 text-text-3 hover:text-text-1 transition-colors shrink-0"
          title="Duplicate"
        >
          <Copy size={10} />
        </button>

        <button
          onClick={onDelete}
          className="p-0.5 rounded hover:bg-status-red/10 text-text-3 hover:text-status-red transition-colors shrink-0"
          title="Delete"
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border-subtle space-y-3">
          {/* Type */}
          <SelectInput
            label="Type"
            value={field.type as string}
            onChange={(type) =>
              onFieldChange({
                ...field,
                type: type as FormFieldType,
                options:
                  type === "select" || type === "radio" || type === "checkbox"
                    ? field.options && field.options.length > 0
                      ? field.options
                      : ["Option 1", "Option 2"]
                    : undefined,
              })
            }
            options={ALL_FIELD_TYPES.map((t) => ({
              value: t,
              label: FIELD_TYPE_LABEL[t] || t,
            }))}
          />

          {/* Label */}
          <Input
            label="Label"
            value={field.label}
            onChange={(v) => onFieldChange({ ...field, label: v })}
            placeholder="Field label"
          />

          {/* Placeholder */}
          <Input
            label="Placeholder"
            value={field.placeholder}
            onChange={(v) => onFieldChange({ ...field, placeholder: v })}
            placeholder="Placeholder text"
          />

          {/* Required */}
          <Toggle
            label="Required"
            checked={field.required}
            onChange={(required) => onFieldChange({ ...field, required })}
          />

          {/* Help text */}
          <Input
            label="Help text"
            value={field.helpText ?? ""}
            onChange={(v) => onFieldChange({ ...field, helpText: v })}
            placeholder="Optional help text"
          />

          {/* Options (select / radio / checkbox) */}
          {(field.type === "select" ||
            field.type === "radio" ||
            field.type === "checkbox") && (
            <OptionsEditor
              options={field.options ?? []}
              onChange={(options) => onFieldChange({ ...field, options })}
            />
          )}

          {/* Validation */}
          <div className="space-y-2">
            <label className="block text-[10px] text-text-3 uppercase tracking-wider font-semibold">
              Validation
            </label>
            <Input
              label="Pattern (regex)"
              value={field.validation?.pattern ?? ""}
              onChange={(v) =>
                onFieldChange({
                  ...field,
                  validation: { ...field.validation, pattern: v || undefined },
                })
              }
              placeholder="e.g. ^[A-Za-z]+$"
              className="font-mono"
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="Min length"
                value={field.validation?.minLength}
                onChange={(minLength) =>
                  onFieldChange({
                    ...field,
                    validation: { ...field.validation, minLength },
                  })
                }
              />
              <NumberInput
                label="Max length"
                value={field.validation?.maxLength}
                onChange={(maxLength) =>
                  onFieldChange({
                    ...field,
                    validation: { ...field.validation, maxLength },
                  })
                }
              />
            </div>
            {field.type === "number" && (
              <div className="grid grid-cols-2 gap-2">
                <NumberInput
                  label="Min"
                  value={field.validation?.min}
                  onChange={(min) =>
                    onFieldChange({
                      ...field,
                      validation: { ...field.validation, min },
                    })
                  }
                />
                <NumberInput
                  label="Max"
                  value={field.validation?.max}
                  onChange={(max) =>
                    onFieldChange({
                      ...field,
                      validation: { ...field.validation, max },
                    })
                  }
                />
              </div>
            )}
            <Input
              label="Custom error message"
              value={field.validation?.customMessage ?? ""}
              onChange={(v) =>
                onFieldChange({
                  ...field,
                  validation: {
                    ...field.validation,
                    customMessage: v || undefined,
                  },
                })
              }
              placeholder="Custom validation message"
            />
          </div>

          {/* Conditional Logic */}
          <div className="space-y-2">
            <label className="block text-[10px] text-text-3 uppercase tracking-wider font-semibold">
              Conditional Logic
            </label>
            <LogicEditor
              logic={
                field.logic ?? { enabled: false, match: "all", rules: [] }
              }
              fields={fields}
              currentFieldId={field.id}
              onChange={(logic) => onFieldChange({ ...field, logic })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── iFrame modal ───────────────────────────── */

function IframeModal({
  embedId,
  formName,
  onClose,
}: {
  embedId: string;
  formName: string;
  onClose: () => void;
}) {
  const snippet = embedSnippet(embedId);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-bg-1 border border-border-default rounded-lg shadow-2xl w-full max-w-xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <div>
            <span className="text-[12px] font-semibold text-text-0">
              Embed Form
            </span>
            <span className="text-[10px] text-text-3 ml-2">{formName}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-3 text-text-3 hover:text-text-1 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[11px] text-text-2">
            Paste this code snippet where you want the form to appear:
          </p>
          <textarea
            readOnly
            value={snippet}
            rows={5}
            className="w-full px-3 py-2 rounded border border-border-default bg-bg-2 text-text-0 text-[10px] font-mono outline-none resize-y"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-green text-bg-0 text-[11px] font-semibold hover:bg-green/90 transition-colors"
            >
              {copied ? <Check size={12} /> : <Code size={12} />}
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Main component ─────────────────────── */

export function FormBuilder({ onClose }: { onClose?: () => void }) {
  const config = useConfigStore((s) => s.config);
  const patchSite = useConfigStore((s) => s.patchSite);

  const forms = config.forms ?? [];
  const [activeFormId, setActiveFormId] = useState<string | null>(
    forms[0]?.id ?? null
  );

  const form = forms.find((f) => f.id === activeFormId) ?? forms[0] ?? null;

  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showIframe, setShowIframe] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const presetMenuRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fieldIds = useMemo(
    () => form?.fields.map((f) => f.id) ?? [],
    [form?.fields]
  );

  /* ─── helpers to patch a single form inside config.forms ─── */

  const updateForm = useCallback(
    (partial: Partial<FormDefinition>) => {
      if (!form) return;
      useConfigStore.setState(
        produce((draft: ReturnType<typeof useConfigStore.getState>) => {
          const idx = draft.config.forms?.findIndex(
            (f) => f.id === form.id
          );
          if (idx === undefined || idx < 0) return;
          Object.assign(draft.config.forms![idx], partial, {
            updatedAt: new Date().toISOString(),
          });
        })
      );
    },
    [form]
  );

  const updateFields = useCallback(
    (fields: FormLeadField[]) => {
      updateForm({ fields } as any);
    },
    [updateForm]
  );

  /* ─── create new form ─── */

  function handleCreateForm() {
    const f = newFormDefinition();
    const next = [...forms, f];
    patchSite({ forms: next } as any);
    setActiveFormId(f.id);
    toast.success("New form created");
  }

  /* ─── delete form ─── */

  function handleDeleteForm(id: string) {
    const next = forms.filter((f) => f.id !== id);
    patchSite({ forms: next } as any);
    if (activeFormId === id) {
      setActiveFormId(next[0]?.id ?? null);
    }
    toast.success("Form deleted");
  }

  /* ─── apply preset ─── */

  function handleApplyPreset(presetKey: string) {
    const preset = FORM_PRESETS[presetKey];
    if (!preset || !form) return;
    const newFields: FormLeadField[] = preset.fields.map((f) => ({
      ...f,
      id: uid(),
    }));
    updateForm({
      fields: newFields,
      multiStep: preset.multiStep,
      submitLabel: preset.submitLabel,
      name: preset.name,
    } as any);
    setPresetOpen(false);
    setExpandedFieldId(null);
    toast.success(`Loaded preset: ${preset.name}`);
  }

  /* ─── drag & drop ─── */

  function handleDragEnd(event: DragEndEvent) {
    if (!form) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = form.fields.findIndex((f) => f.id === active.id);
    const newIndex = form.fields.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = [...form.fields];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    updateFields(next);
  }

  /* ─── field operations ─── */

  function addField(type: FormFieldType) {
    if (!form) return;
    const f = defaultField(type);
    updateFields([...form.fields, f]);
    setExpandedFieldId(f.id);
    setShowAddMenu(false);
    toast.success(`Added ${FIELD_TYPE_LABEL[type]} field`);
  }

  function deleteField(id: string) {
    if (!form) return;
    updateFields(form.fields.filter((f) => f.id !== id));
    if (expandedFieldId === id) setExpandedFieldId(null);
  }

  function duplicateField(id: string) {
    if (!form) return;
    const idx = form.fields.findIndex((f) => f.id === id);
    if (idx === -1) return;
    const original = form.fields[idx];
    const clone: FormLeadField = {
      ...JSON.parse(JSON.stringify(original)),
      id: uid(),
      label: original.label + " (copy)",
    };
    const next = [...form.fields];
    next.splice(idx + 1, 0, clone);
    updateFields(next);
    setExpandedFieldId(clone.id);
    toast.success("Field duplicated");
  }

  function changeField(fieldId: string, updated: FormLeadField) {
    if (!form) return;
    updateFields(form.fields.map((f) => (f.id === fieldId ? updated : f)));
  }

  /* ─── click outside handlers ─── */

  function handleClickOutside(e: React.MouseEvent) {
    if (
      addMenuRef.current &&
      !addMenuRef.current.contains(e.target as Node)
    ) {
      setShowAddMenu(false);
    }
    if (
      presetMenuRef.current &&
      !presetMenuRef.current.contains(e.target as Node)
    ) {
      setPresetOpen(false);
    }
  }

  /* ─── empty state ─── */

  if (!form) {
    return (
      <div
        className="flex flex-col h-full"
        onClick={handleClickOutside}
      >
        <div className="px-3.5 py-2.5 border-b border-border-default flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-2">
            Form Builder
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-bg-3 text-text-3 hover:text-text-1 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-3">
          <p className="text-[11px] text-text-3 text-center">
            No forms yet. Create one to get started.
          </p>
          <button
            onClick={handleCreateForm}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-green text-bg-0 text-[11px] font-semibold hover:bg-green/90 transition-colors"
          >
            <Plus size={12} />
            Create form
          </button>
        </div>
      </div>
    );
  }

  const formFields = form.fields;

  return (
    <div
      className="flex flex-col h-full"
      onClick={handleClickOutside}
    >
      {/* ─── Header ─── */}
      <div className="px-3.5 py-2.5 border-b border-border-default">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-2">
            Form Builder
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowIframe(true)}
              className="p-1 rounded hover:bg-bg-3 text-text-3 hover:text-text-1 transition-colors"
              title="Embed code"
            >
              <Code size={12} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-bg-3 text-text-3 hover:text-text-1 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Form name */}
        <input
          type="text"
          value={form.name}
          onChange={(e) => updateForm({ name: e.target.value } as any)}
          className="w-full px-2 py-1 rounded border border-border-default bg-bg-2 text-text-0 text-[11px] font-medium outline-none focus:border-green mb-2"
        />

        {/* Form selector + preset + settings */}
        <div className="flex gap-1">
          {forms.length > 1 && (
            <select
              value={form.id}
              onChange={(e) => {
                setActiveFormId(e.target.value);
                setExpandedFieldId(null);
              }}
              className="flex-1 px-2 py-1 rounded border border-border-default bg-bg-2 text-text-0 text-[10px] outline-none focus:border-green cursor-pointer"
            >
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name || "Untitled"}
                </option>
              ))}
            </select>
          )}

          <div className="relative" ref={presetMenuRef}>
            <button
              onClick={() => setPresetOpen(!presetOpen)}
              className="flex items-center gap-1 px-2 py-1 rounded border border-border-default bg-bg-2 text-[10px] text-text-2 hover:text-text-1 hover:bg-bg-3 transition-colors"
            >
              <Settings size={10} />
              Preset
            </button>
            {presetOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-bg-1 border border-border-default rounded-lg shadow-xl z-50 py-1">
                {Object.entries(FORM_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handleApplyPreset(key)}
                    className="w-full px-3 py-2 text-left hover:bg-bg-2 transition-colors"
                  >
                    <span className="block text-[11px] text-text-0 font-medium">
                      {preset.name}
                    </span>
                    <span className="block text-[9px] text-text-3">
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] transition-colors ${
              showSettings
                ? "border-green bg-green/10 text-green"
                : "border-border-default bg-bg-2 text-text-2 hover:text-text-1 hover:bg-bg-3"
            }`}
          >
            <Settings size={10} />
            Settings
          </button>

          {forms.length > 1 && (
            <button
              onClick={() => handleDeleteForm(form.id)}
              className="p-1 rounded border border-border-default bg-bg-2 text-text-3 hover:text-status-red hover:border-status-red/30 transition-colors"
              title="Delete form"
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Form Settings (collapsible) ─── */}
      {showSettings && (
        <div className="border-b border-border-subtle px-3.5 py-3 space-y-2.5 bg-bg-1">
          <label className="block text-[10px] text-text-3 uppercase tracking-wider font-semibold mb-1">
            Form Settings
          </label>
          <Input
            label="Submit button label"
            value={form.submitLabel}
            onChange={(v) => updateForm({ submitLabel: v } as any)}
            placeholder="Submit"
          />
          <Toggle
            label="Multi-step"
            checked={form.multiStep}
            onChange={(v) => updateForm({ multiStep: v } as any)}
          />
          <Input
            label="Success message"
            value={form.thankYou}
            onChange={(v) => updateForm({ thankYou: v } as any)}
            placeholder="Thank you message"
          />
          <SelectInput
            label="Success action"
            value={form.successAction || "message"}
            onChange={(v) => updateForm({ successAction: v as any } as any)}
            options={[
              { value: "message", label: "Show message" },
              { value: "url", label: "Redirect to URL" },
              { value: "thankyou", label: "Thank you page" },
            ]}
          />
          {form.successAction === "url" && (
            <Input
              label="Redirect URL"
              value={form.successUrl}
              onChange={(v) => updateForm({ successUrl: v } as any)}
              placeholder="https://..."
            />
          )}
          <Input
            label="Notify email"
            value={form.notifyEmail}
            onChange={(v) => updateForm({ notifyEmail: v } as any)}
            placeholder="you@email.com"
          />
          <Input
            label="Error message"
            value={form.errorMessage}
            onChange={(v) => updateForm({ errorMessage: v } as any)}
            placeholder="Please fill in the highlighted fields."
          />
        </div>
      )}

      {/* ─── Field list ─── */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-1.5">
        {formFields.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[11px] text-text-3 mb-3">No fields yet</p>
            <button
              onClick={() => setShowAddMenu(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-green text-bg-0 text-[11px] font-semibold hover:bg-green/90 transition-colors"
            >
              <Plus size={12} />
              Add first field
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fieldIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5">
                {formFields.map((field) => (
                  <SortableFieldItem
                    key={field.id}
                    field={field}
                    fields={formFields}
                    expanded={expandedFieldId === field.id}
                    onToggleExpand={() =>
                      setExpandedFieldId(
                        expandedFieldId === field.id ? null : field.id
                      )
                    }
                    onFieldChange={(f) => changeField(field.id, f)}
                    onDelete={() => deleteField(field.id)}
                    onDuplicate={() => duplicateField(field.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* ─── Add field button ─── */}
        {formFields.length > 0 && (
          <div className="relative pt-1" ref={addMenuRef}>
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded border border-dashed border-border-default text-[11px] text-text-3 hover:text-text-1 hover:border-text-3 transition-colors"
            >
              <Plus size={12} />
              Add field
            </button>
            {showAddMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-bg-1 border border-border-default rounded-lg shadow-xl z-50 py-1">
                {ALL_FIELD_TYPES.map((type) => {
                  const Icon = FIELD_TYPE_ICON[type] || Type;
                  return (
                    <button
                      key={type}
                      onClick={() => addField(type)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-text-1 hover:bg-bg-2 transition-colors"
                    >
                      <Icon size={12} className="text-text-3 shrink-0" />
                      {FIELD_TYPE_LABEL[type]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Footer with field count ─── */}
      <div className="px-3.5 py-2 border-t border-border-default flex items-center justify-between">
        <span className="text-[9px] text-text-3">
          {formFields.length} field{formFields.length !== 1 ? "s" : ""}
          {form.multiStep ? " · multi-step" : ""}
        </span>
        <button
          onClick={handleCreateForm}
          className="flex items-center gap-1 px-2 py-1 rounded border border-border-default bg-bg-2 text-[10px] text-text-3 hover:text-text-1 hover:bg-bg-3 transition-colors"
        >
          <Plus size={10} />
          New form
        </button>
      </div>

      {/* ─── iFrame modal ─── */}
      {showIframe && (
        <IframeModal
          embedId={form.embed.id}
          formName={form.name}
          onClose={() => setShowIframe(false)}
        />
      )}
    </div>
  );
}
