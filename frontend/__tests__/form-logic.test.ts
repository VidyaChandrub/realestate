import { describe, expect, it } from "vitest";
import { evalLogicRule, isFieldVisible, ruleFieldValue, withFieldValue } from "@/lib/prestate/form-logic";
import type { FormLeadField } from "@/lib/prestate/types";

const fields: FormLeadField[] = [
  { id: "f1", type: "select", label: "Budget", placeholder: "", required: false },
  { id: "f2", type: "text", label: "Full Name", placeholder: "", required: false },
  { id: "f3", type: "phone", label: "Phone Number", placeholder: "", required: false, logic: { enabled: true, match: "all", rules: [{ field: "f1", op: "eq", value: "Yes" }] } },
];

describe("form conditional logic", () => {
  it("resolves rule values by field id first, then by label (legacy)", () => {
    expect(ruleFieldValue({ field: "f1", op: "eq", value: "" }, fields, withFieldValue({}, fields[0], "Yes"))).toBe("Yes");
    // Legacy label-keyed maps still work.
    expect(ruleFieldValue({ field: "Budget", op: "eq", value: "" }, fields, { Budget: "No" })).toBe("No");
    expect(ruleFieldValue({ field: "missing", op: "eq", value: "" }, fields, {})).toBe("");
  });

  it("evalLogicRule covers all operators", () => {
    const values = withFieldValue({}, fields[0], "Hello World");
    const f = [fields[0]];
    expect(evalLogicRule({ field: "f1", op: "eq", value: "Hello World" }, f, values)).toBe(true);
    expect(evalLogicRule({ field: "f1", op: "neq", value: "x" }, f, values)).toBe(true);
    expect(evalLogicRule({ field: "f1", op: "contains", value: "world" }, f, values)).toBe(true);
    expect(evalLogicRule({ field: "f1", op: "notcontains", value: "zz" }, f, values)).toBe(true);
    expect(evalLogicRule({ field: "f1", op: "gt", value: "5" }, f, withFieldValue({}, fields[0], "10"))).toBe(true);
    expect(evalLogicRule({ field: "f1", op: "lt", value: "5" }, f, withFieldValue({}, fields[0], "10"))).toBe(false);
    expect(evalLogicRule({ field: "f1", op: "empty", value: "" }, f, {})).toBe(true);
    expect(evalLogicRule({ field: "f1", op: "notempty", value: "" }, f, values)).toBe(true);
  });

  it("isFieldVisible honours AND / OR match modes and disabled logic", () => {
    const visible = isFieldVisible(fields[2], fields, withFieldValue({}, fields[0], "Yes"));
    expect(visible).toBe(true);
    const hidden = isFieldVisible(fields[2], fields, withFieldValue({}, fields[0], "No"));
    expect(hidden).toBe(false);
    const off: FormLeadField = { ...fields[2], logic: { ...fields[2].logic!, enabled: false } };
    expect(isFieldVisible(off, fields, {})).toBe(true);
  });

  it("withFieldValue stores the answer under both id and label keys", () => {
    const next = withFieldValue({}, { id: "x1", label: "Name" }, "Ada");
    expect(next.x1).toBe("Ada");
    expect(next.Name).toBe("Ada");
  });
});
