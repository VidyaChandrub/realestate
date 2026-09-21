// The fixed structure layouts (mirrors the Prisma ProjectLayout enum). Code,
// not org data: each layout decides which inventory controls exist.
export const PROJECT_LAYOUTS = ['tower', 'cluster', 'individual'] as const;
export type ProjectLayoutValue = (typeof PROJECT_LAYOUTS)[number];

// Default name of the grouping column per layout; `null` = no grouping.
export const LAYOUT_DEFAULT_GROUP_LABEL: Record<
  ProjectLayoutValue,
  string | null
> = {
  tower: 'Tower',
  cluster: 'Phase',
  individual: null,
};
