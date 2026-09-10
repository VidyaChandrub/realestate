import type { FieldLogic, FieldLogicOp, FieldLogicRule, FormLeadField } from "./types";

export const FIELD_LOGIC_OPS: { op: FieldLogicOp; label: string; needsValue: boolean }[] = [
  { op: "eq", label: "Equals", needsValue: true },
  { op: "neq", label: "Does not equal", needsValue: true },
  { op: "contains", label: "Contains", needsValue: true },
  { op: "notcontains", label: "Does not contain", needsValue: true },
  { op: "gt", label: "Greater than", needsValue: true },
  { op: "lt", label: "Less than", needsValue: true },
  { op: "empty", label: "Is empty", needsValue: false },
  { op: "notempty", label: "Is not empty", needsValue: false },
];

/**
 * Resolve the current value of the controlling field referenced by a rule.
 * Values are looked up by field id first (stable across renames), then by
 * label so legacy pages that only store label-keyed answers keep working.
 */
export function ruleFieldValue(
  rule: FieldLogicRule,
  fields: FormLeadField[],
  values: Record<string, string>,
): string {
  const field = fields.find((f) => f.id === rule.field || f.label === rule.field);
  if (!field) return "";
  return values[field.id ?? ""] ?? values[field.label] ?? "";
}

/**
 * Store an answer under both the field id and its label so conditional logic
 * survives renames while existing label-based readers stay intact.
 */
export function withFieldValue(
  values: Record<string, string>,
  field: { id?: string; label: string },
  value: string,
): Record<string, string> {
  const next = { ...values };
  if (field.id) next[field.id] = value;
  next[field.label] = value;
  return next;
}

export function evalLogicRule(
  rule: FieldLogicRule,
  fields: FormLeadField[],
  valuesByLabel: Record<string, string>,
): boolean {
  const val = ruleFieldValue(rule, fields, valuesByLabel).trim();
  const cmp = String(rule.value ?? "").trim();
  switch (rule.op) {
    case "eq":
      return val === cmp;
    case "neq":
      return val !== cmp;
    case "contains":
      return val.toLowerCase().includes(cmp.toLowerCase());
    case "notcontains":
      return !val.toLowerCase().includes(cmp.toLowerCase());
    case "gt":
      return Number(val) > Number(cmp);
    case "lt":
      return Number(val) < Number(cmp);
    case "empty":
      return val === "";
    case "notempty":
      return val !== "";
    default:
      return true;
  }
}

/** Returns true when a field should be visible given the current values. */
export function isFieldVisible(
  field: FormLeadField,
  allFields: FormLeadField[],
  valuesByLabel: Record<string, string>,
): boolean {
  const logic: FieldLogic | undefined = field.logic;
  if (!logic || !logic.enabled || !logic.rules || logic.rules.length === 0) return true;
  const results = logic.rules.map((r) => evalLogicRule(r, allFields, valuesByLabel));
  return logic.match === "all" ? results.every(Boolean) : results.some(Boolean);
}
