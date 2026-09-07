import { describe, expect, it } from "vitest";
import {
  defaultSpecRows,
  normalizeSpecifications,
  serializeSpecifications,
  specificationRows,
} from "@/lib/specifications";

// The `specifications` blob changed from a fixed-key object to a dynamic list
// of { label, value } rows. Nothing was migrated in place, so every read path
// must still understand the old shape — these lock that in.
describe("normalizeSpecifications — legacy fixed-key shape", () => {
  // Verbatim from a project created before the rework (keys deliberately out
  // of their original order, as Postgres returns them).
  const LEGACY = {
    kitchen: "Sink",
    fittings: "CP",
    flooring: "Tiles",
    doorsWindows: "UPVC",
  };

  it("maps every legacy key to a labelled row, in the old form's order", () => {
    const { rows, notes } = normalizeSpecifications(LEGACY);
    expect(rows.map((r) => [r.label, r.value])).toEqual([
      ["Flooring", "Tiles"],
      ["Kitchen", "Sink"],
      ["Doors & windows", "UPVC"],
      ["Fittings", "CP"],
    ]);
    expect(notes).toBe("");
  });

  it("keeps legacy notes as notes, not as a row", () => {
    const { rows, notes } = normalizeSpecifications({ ...LEGACY, notes: "Zone-III compliant" });
    expect(notes).toBe("Zone-III compliant");
    expect(rows.some((r) => r.label === "notes")).toBe(false);
  });

  it("drops legacy keys that were never filled in", () => {
    const { rows } = normalizeSpecifications({ flooring: "Tiles", kitchen: "" });
    expect(rows.map((r) => r.label)).toEqual(["Flooring"]);
  });

  it("keeps an unrecognised key rather than losing the data", () => {
    const { rows } = normalizeSpecifications({ flooring: "Tiles", ceiling: "False ceiling" });
    expect(rows.map((r) => [r.label, r.value])).toEqual([
      ["Flooring", "Tiles"],
      ["ceiling", "False ceiling"],
    ]);
  });

  it("round-trips a legacy blob into the new shape without loss", () => {
    const { rows, notes } = normalizeSpecifications(LEGACY);
    expect(serializeSpecifications(rows, notes)).toEqual({
      items: [
        { label: "Flooring", value: "Tiles" },
        { label: "Kitchen", value: "Sink" },
        { label: "Doors & windows", value: "UPVC" },
        { label: "Fittings", value: "CP" },
      ],
    });
  });
});

describe("normalizeSpecifications — new dynamic shape", () => {
  it("reads items through unchanged", () => {
    const { rows, notes } = normalizeSpecifications({
      items: [{ label: "Solar", value: "5 kW" }],
      notes: "n",
    });
    expect(rows.map((r) => [r.label, r.value])).toEqual([["Solar", "5 kW"]]);
    expect(notes).toBe("n");
  });

  it("drops rows that are blank on both halves", () => {
    const { rows } = normalizeSpecifications({
      items: [{ label: "Solar", value: "5 kW" }, { label: "", value: "" }],
    });
    expect(rows).toHaveLength(1);
  });

  // serializeSpecifications never writes a valueless row, but a hand-edited
  // or imported blob might carry one — read it rather than silently drop it.
  it("keeps a labelled-but-empty row from a hand-written blob", () => {
    const { rows } = normalizeSpecifications({ items: [{ label: "Fittings", value: "" }] });
    expect(rows.map((r) => r.label)).toEqual(["Fittings"]);
  });

  it("gives every row a distinct key", () => {
    const { rows } = normalizeSpecifications({
      items: [{ label: "A", value: "1" }, { label: "A", value: "2" }],
    });
    expect(rows[0].key).not.toBe(rows[1].key);
  });

  it("returns nothing for a null / empty blob", () => {
    expect(normalizeSpecifications(null)).toEqual({ rows: [], notes: "" });
    expect(normalizeSpecifications({})).toEqual({ rows: [], notes: "" });
  });
});

describe("serializeSpecifications", () => {
  it("omits the blob entirely when nothing was entered", () => {
    expect(serializeSpecifications(defaultSpecRows(), "")).toBeUndefined();
    expect(serializeSpecifications([], "  ")).toBeUndefined();
  });

  it("keeps notes-only input", () => {
    expect(serializeSpecifications(defaultSpecRows(), "Just a note")).toEqual({
      items: [],
      notes: "Just a note",
    });
  });

  it("trims, and drops rows with no value — a bare label says nothing", () => {
    const rows = [
      { key: 1, label: "  Flooring  ", value: "  Tiles  " },
      { key: 2, label: "Ceiling", value: "" },
      { key: 3, label: "", value: "" },
    ];
    expect(serializeSpecifications(rows, "")).toEqual({
      items: [{ label: "Flooring", value: "Tiles" }],
    });
  });

  it("keeps a value whose label the user cleared", () => {
    expect(serializeSpecifications([{ key: 1, label: "", value: "Tiles" }], "")).toEqual({
      items: [{ label: "", value: "Tiles" }],
    });
  });
});

describe("specificationRows (detail-page view)", () => {
  it("shows only rows that have a value, for both shapes", () => {
    expect(specificationRows({ flooring: "Tiles", kitchen: "" })).toEqual([["Flooring", "Tiles"]]);
    expect(
      specificationRows({ items: [{ label: "Solar", value: "5 kW" }, { label: "Fittings", value: "" }] }),
    ).toEqual([["Solar", "5 kW"]]);
  });

  it("starts a new project with the four pre-labelled defaults", () => {
    expect(defaultSpecRows().map((r) => r.label)).toEqual([
      "Flooring", "Kitchen", "Doors & windows", "Fittings",
    ]);
    expect(defaultSpecRows().every((r) => r.value === "")).toBe(true);
  });
});
