import { describe, expect, it } from "vitest";
import {
  cloneWithFreshIds,
  duplicateSection,
  findSection,
  isStructural,
  makeColumn,
  makeThreeColRow,
  setRowColumnCount,
} from "@/lib/prestate/tree";
import type { SectionInstance } from "@/lib/prestate/types";

function node(id: string, type = "section", children?: SectionInstance[]): SectionInstance {
  return {
    id,
    type,
    label: id,
    icon: "SquareStack",
    settings: {},
    style: { colors: {}, typography: {}, spacing: {}, layout: {}, responsive: {} },
    children,
  };
}

function collectIds(n: SectionInstance): string[] {
  return [n.id, ...(n.children ?? []).flatMap(collectIds)];
}

describe("tree utilities", () => {
  it("cloneWithFreshIds gives every descendant a unique id and keeps structure", () => {
    const original = node("root", "container", [
      node("row-1", "row", [node("col-a", "column"), node("col-b", "column")]),
      node("child-1"),
    ]);
    const copy = cloneWithFreshIds(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.type).toBe("container");
    // Same shape…
    expect(collectIds(copy)).toHaveLength(collectIds(original).length);
    // …but no id is shared with the source tree.
    const srcIds = new Set(collectIds(original));
    for (const id of collectIds(copy)) expect(srcIds.has(id)).toBe(false);
    // Column/row ids keep their prefixes.
    expect(copy.children?.[0].children?.[0].id.startsWith("col_")).toBe(true);
    expect(copy.children?.[0].id.startsWith("row_")).toBe(true);
  });

  it("duplicateSection regenerates child ids (no stale duplicates)", () => {
    const list = [node("a", "container", [node("b", "row", [node("c", "column")])])];
    const { list: next, copy } = duplicateSection(list, "a");
    expect(copy).not.toBeNull();
    const allIds = next.flatMap((n) => collectIds(n));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("setRowColumnCount clamps between 1 and 6 and keeps widths equal", () => {
    const row = setRowColumnCount(makeThreeColRow(), 5);
    expect(row.children).toHaveLength(5);
    const widths = row.children!.map((c) => Number(c.settings.width));
    const total = widths.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(99.9);
    expect(total).toBeLessThan(100.1);
    expect(setRowColumnCount(row, 99).children).toHaveLength(6);
    expect(setRowColumnCount(row, 0).children).toHaveLength(1);
  });

  it("structural helpers behave", () => {
    expect(isStructural("row")).toBe(true);
    expect(isStructural("hero")).toBe(false);
    const col = makeColumn(50);
    expect(col.settings.width).toBe(50);
    expect(findSection([col], col.id)?.parentId ?? null).toBeNull();
  });
});
