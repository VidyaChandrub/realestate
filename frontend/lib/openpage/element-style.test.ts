import { describe, expect, it } from "vitest";
import type { BlockConfig } from "@/components/openpage/blocks/types";
import {
  ancestorItemIds,
  collectElementIds,
  itemAt,
  itemElementId,
  listElementId,
  migrateBlockListIds,
  newElementId,
  resolveList,
  type ListRef,
} from "@/lib/openpage/element-style";

const ROOT: ListRef = { path: ["columns"] };
const NESTED: ListRef = { path: ["columns", "links"], parentItemId: "col_1" };
const DEEP: ListRef = { path: ["a", "b", "c"], parentItemIds: ["a1", "b1"] };

describe("listElementId", () => {
  it("namespaces root lists by prop key", () => {
    expect(listElementId(ROOT, "it_x")).toBe("columns:it_x");
  });

  it("keeps nested lists distinct across parent items", () => {
    const one = listElementId({ path: ["columns", "links"], parentItemId: "col_1" }, "it_a");
    const two = listElementId({ path: ["columns", "links"], parentItemId: "col_2" }, "it_a");
    expect(one).toBe("columns:col_1/links:it_a");
    expect(two).toBe("columns:col_2/links:it_a");
    expect(one).not.toBe(two);
  });

  it("treats parentItemIds as a full ancestor chain", () => {
    expect(listElementId(DEEP, "it_x")).toBe("a:a1/b:b1/c:it_x");
  });

  it("agrees whether the ancestor is given as a chain or a single id", () => {
    expect(listElementId(NESTED, "it_x")).toBe(
      listElementId({ path: ["columns", "links"], parentItemIds: ["col_1"] }, "it_x"),
    );
  });

  it("falls back to the raw id for a degenerate ref", () => {
    expect(listElementId({ path: [] }, "it_x")).toBe("it_x");
  });
});

describe("ancestorItemIds", () => {
  it("normalises both spellings", () => {
    expect(ancestorItemIds(ROOT)).toEqual([]);
    expect(ancestorItemIds(NESTED)).toEqual(["col_1"]);
    expect(ancestorItemIds({ path: ["a"], parentItemIds: [], parentItemId: "x" })).toEqual([]);
  });
});

describe("resolveList", () => {
  const props = {
    columns: [
      { _id: "col_1", title: "Explore", links: [{ _id: "lnk_1", label: "Home" }] },
      { _id: "col_2", title: "Legal" },
    ],
  };

  it("returns a root list", () => {
    expect(resolveList(props, ROOT)).toBe(props.columns);
  });

  it("descends through the parent item for a nested list", () => {
    expect(resolveList(props, NESTED)).toBe(props.columns[0].links);
  });

  it("returns undefined when the nested key is absent on the parent", () => {
    expect(resolveList(props, { path: ["columns", "links"], parentItemId: "col_2" })).toBeUndefined();
  });

  it("returns undefined for a missing root list or unknown parent", () => {
    expect(resolveList(props, { path: ["items"] })).toBeUndefined();
    expect(resolveList(props, { path: ["columns", "links"], parentItemId: "nope" })).toBeUndefined();
    expect(resolveList(undefined, ROOT)).toBeUndefined();
  });

  it("exposes the live array so the store selector stays referentially stable", () => {
    expect(resolveList(props, ROOT)).toBe(props.columns);
  });
});

describe("itemAt", () => {
  const list = [{ _id: "a", title: "A" }, { _id: "b", title: "B" }];

  it("finds by stable id", () => {
    expect(itemAt(list, "b")).toBe(list[1]);
  });

  it("tolerates malformed input", () => {
    expect(itemAt(list, undefined)).toBeUndefined();
    expect(itemAt("nope", "a")).toBeUndefined();
    expect(itemAt([null, 5, { _id: "a" }], "a")).toEqual({ _id: "a" });
  });
});

describe("collectElementIds", () => {
  it("matches the ids the list editor writes, at every depth", () => {
    const block: BlockConfig = {
      id: "b1",
      type: "footer",
      props: {
        columns: [
          { _id: "col_1", links: [{ _id: "lnk_1" }] },
          { _id: "col_2", links: [] },
        ],
      },
    } as unknown as BlockConfig;

    const ids = collectElementIds(block);
    expect(ids).toContain(listElementId(ROOT, "col_1"));
    expect(ids).toContain(listElementId(ROOT, "col_2"));
    expect(ids).toContain(listElementId({ path: ["columns", "links"], parentItemId: "col_1" }, "lnk_1"));
    expect(ids).not.toContain(listElementId({ path: ["columns", "links"], parentItemId: "col_2" }, "lnk_1"));
  });
});

describe("migrateBlockListIds", () => {
  it("assigns ids to items that lack them and keeps existing ones", () => {
    const block = {
      id: "b1",
      type: "footer",
      props: { columns: [{ _id: "keep", title: "A" }, { title: "B" }] },
    } as unknown as BlockConfig;

    const migrated = migrateBlockListIds(block);
    const columns = migrated.props.columns as Array<Record<string, unknown>>;
    expect(columns[0]._id).toBe("keep");
    expect(typeof columns[1]._id).toBe("string");
    expect(columns[1]._id).not.toBe("keep");
  });

  it("migrates lists nested inside items", () => {
    const block = {
      id: "b1",
      type: "footer",
      props: { columns: [{ _id: "col_1", links: [{ label: "Home" }] }] },
    } as unknown as BlockConfig;

    const migrated = migrateBlockListIds(block);
    const columns = migrated.props.columns as Array<Record<string, unknown>>;
    const links = columns[0].links as Array<Record<string, unknown>>;
    expect(typeof links[0]._id).toBe("string");
    expect(collectElementIds(migrated)).toContain(
      listElementId({ path: ["columns", "links"], parentItemId: "col_1" }, links[0]._id as string),
    );
  });

  it("is idempotent", () => {
    const block = {
      id: "b1",
      type: "footer",
      props: { columns: [{ title: "A" }] },
    } as unknown as BlockConfig;
    const once = migrateBlockListIds(block);
    expect(migrateBlockListIds(once)).toEqual(once);
  });

  it("preserves existing ids so elementStyles keys survive a reload", () => {
    // Regression: migration used to strip and re-mint every _id, which would
    // orphan all per-element styles the first time a document was reopened.
    const block = {
      id: "b1",
      type: "footer",
      props: { columns: [{ _id: "col_1", title: "A" }] },
      elementStyles: { "columns:col_1": { padding: "20px" } },
    } as unknown as BlockConfig;

    const migrated = migrateBlockListIds(block);
    expect(migrated.elementStyles).toEqual(block.elementStyles);
    expect(collectElementIds(migrated).has("columns:col_1")).toBe(true);
  });

  it("returns the same block reference when nothing needs migrating", () => {
    const block = {
      id: "b1",
      type: "footer",
      props: { columns: [{ _id: "col_1", title: "A" }], heading: "Hi" },
    } as unknown as BlockConfig;
    expect(migrateBlockListIds(block)).toBe(block);
  });

  it("gives every migrated id a unique value", () => {
    const block = {
      id: "b1",
      type: "footer",
      props: { columns: [{ title: "A" }, { title: "B" }, { title: "C" }] },
    } as unknown as BlockConfig;
    const columns = migrateBlockListIds(block).props.columns as Array<Record<string, unknown>>;
    expect(new Set(columns.map((c) => c._id)).size).toBe(columns.length);
  });
});

describe("newElementId / itemElementId", () => {
  it("never collides", () => {
    const ids = Array.from({ length: 500 }, () => newElementId("it"));
    expect(new Set(ids).size).toBe(500);
  });

  it("reads an existing item id, with a fallback for unassigned items", () => {
    expect(itemElementId("items", { _id: "it_x" })).toBe("items:it_x");
    expect(itemElementId("items", {})).toBe("items:unassigned");
  });
});
