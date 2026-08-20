import type { SectionInstance } from "./types";

export const STRUCTURAL_TYPES = new Set(["container", "row", "column", "grid"]);

export function isStructural(type: string): boolean {
  return STRUCTURAL_TYPES.has(type);
}

export function newSectionId(prefix = "sec"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function cloneTree(list: SectionInstance[]): SectionInstance[] {
  return JSON.parse(JSON.stringify(list)) as SectionInstance[];
}

export interface SectionRef {
  node: SectionInstance;
  parentId: string | null;
  index: number;
}

// Immutable lookup: returns the node plus the id of the parent node (null = root).
export function findSection(list: SectionInstance[], id: string): SectionRef | null {
  for (let i = 0; i < list.length; i++) {
    const node = list[i];
    if (node.id === id) return { node, parentId: null, index: i };
    const kids = node.children;
    if (kids && kids.length) {
      const child = findSection(kids, id);
      if (child) return { node: child.node, parentId: node.id, index: child.index };
    }
  }
  return null;
}

// Mutating lookup used against a freshly-cloned tree.
function findInPlace(list: SectionInstance[], id: string): { parentList: SectionInstance[]; index: number } | null {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return { parentList: list, index: i };
    const kids = list[i].children;
    if (kids && kids.length) {
      const child = findInPlace(kids, id);
      if (child) return child;
    }
  }
  return null;
}

// Find the parent node that owns a given id (used for row/column resize).
export function findParentNode(list: SectionInstance[], id: string): { parent: SectionInstance; children: SectionInstance[]; index: number } | null {
  for (let i = 0; i < list.length; i++) {
    const node = list[i];
    const kids = node.children;
    if (kids?.some((c) => c.id === id)) return { parent: node, children: kids, index: i };
    if (kids && kids.length) {
      const child = findParentNode(kids, id);
      if (child) return child;
    }
  }
  return null;
}

export function isDescendant(list: SectionInstance[], ancestorId: string, id: string): boolean {
  const ref = findSection(list, ancestorId);
  if (!ref) return false;
  return !!findSection(ref.node.children ?? [], id);
}

// Insert a node under parentId (null = root) at the given index (default: append).
function insertUnder(list: SectionInstance[], parentId: string, node: SectionInstance, index?: number): SectionInstance[] {
  return list.map((s) => {
    if (s.id === parentId) {
      const kids = s.children ? [...s.children] : [];
      kids.splice(index == null ? kids.length : Math.max(0, Math.min(index, kids.length)), 0, node);
      return { ...s, children: kids };
    }
    if (s.children?.length) return { ...s, children: insertUnder(s.children, parentId, node, index) };
    return s;
  });
}

export function insertChild(list: SectionInstance[], parentId: string | null, node: SectionInstance, index?: number): SectionInstance[] {
  if (!parentId || !findSection(list, parentId)) {
    const next = [...list];
    next.splice(index == null ? next.length : Math.max(0, Math.min(index, next.length)), 0, node);
    return next;
  }
  return insertUnder(list, parentId, node, index);
}

export function removeSection(list: SectionInstance[], id: string): { list: SectionInstance[]; removed: SectionInstance | null } {
  const t = cloneTree(list);
  const found = findInPlace(t, id);
  if (!found) return { list, removed: null };
  const [removed] = found.parentList.splice(found.index, 1);
  return { list: t, removed };
}

// Move a node anywhere in the tree so it lands before/after the target node in the target's own parent list.
export function reorderSection(list: SectionInstance[], fromId: string, toId: string, after: boolean): SectionInstance[] | null {
  if (fromId === toId) return null;
  if (isDescendant(list, fromId, toId)) return null;
  const t = cloneTree(list);
  const from = findInPlace(t, fromId);
  if (!from) return null;
  const [moved] = from.parentList.splice(from.index, 1);
  const to = findInPlace(t, toId);
  if (!to) return null;
  const insertAt = to.index + (after ? 1 : 0);
  to.parentList.splice(insertAt, 0, moved);
  return t;
}

export function duplicateSection(list: SectionInstance[], id: string): { list: SectionInstance[]; copy: SectionInstance | null } {
  const t = cloneTree(list);
  const found = findInPlace(t, id);
  if (!found) return { list, copy: null };
  const copy = JSON.parse(JSON.stringify(found.parentList[found.index])) as SectionInstance;
  copy.id = newSectionId();
  found.parentList.splice(found.index + 1, 0, copy);
  return { list: t, copy };
}

export function patchSection(list: SectionInstance[], id: string, patch: Partial<SectionInstance>): SectionInstance[] {
  return list.map((s) => {
    if (s.id === id) return { ...s, ...patch };
    if (s.children?.length) return { ...s, children: patchSection(s.children, id, patch) };
    return s;
  });
}

export function toggleSectionFlag(list: SectionInstance[], id: string, flag: "hidden" | "locked" | "global"): SectionInstance[] {
  return list.map((s) => {
    if (s.id === id) return { ...s, [flag]: !s[flag] };
    if (s.children?.length) return { ...s, children: toggleSectionFlag(s.children, id, flag) };
    return s;
  });
}

// Append a node into the children of a structural node (the "drop inside" action).
export function nestInto(list: SectionInstance[], parentId: string, node: SectionInstance): SectionInstance[] {
  return insertChild(list, parentId, node);
}