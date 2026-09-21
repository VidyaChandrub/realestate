import { describe, expect, it } from "vitest";
import {
  fieldsToRows,
  makeFieldRow,
  rowsToFields,
  validateFieldRows,
} from "@/lib/field-template";

describe("field template rows", () => {
  it("round-trips a template, keeping the server key and choices", () => {
    const rows = fieldsToRows([
      { key: "soil", label: "Soil", type: "choice", required: true, options: ["Red", "Black"] },
      { key: "total_land", label: "Total land", type: "number", required: false, unit: "acres" },
    ]);
    expect(rowsToFields(rows)).toEqual([
      { key: "soil", label: "Soil", type: "choice", required: true, options: ["Red", "Black"] },
      { key: "total_land", label: "Total land", type: "number", required: false, unit: "acres" },
    ]);
  });

  it("gives a new field a key from its label, avoiding keys already taken", () => {
    const rows = [
      makeFieldRow({ key: "dimensions", label: "Old dims" }),
      makeFieldRow({ label: "Dimensions", type: "text" }),
    ];
    expect(rowsToFields(rows).map((f) => f.key)).toEqual(["dimensions", "dimensions_2"]);
  });

  it("drops untouched blank rows", () => {
    expect(rowsToFields([makeFieldRow()])).toEqual([]);
  });

  it("flags a missing label, duplicate labels and a choice with no options", () => {
    expect(validateFieldRows([makeFieldRow({ label: " " })], "Unit fields")).toMatch(/needs a label/);
    expect(
      validateFieldRows([makeFieldRow({ label: "A" }), makeFieldRow({ label: "a" })], "Unit fields"),
    ).toMatch(/both called/);
    expect(
      validateFieldRows([makeFieldRow({ label: "Soil", type: "choice" })], "Unit fields"),
    ).toMatch(/at least one choice/);
    expect(validateFieldRows([makeFieldRow({ label: "Soil", type: "choice", optionsText: "Red" })], "x")).toBeNull();
  });
});
