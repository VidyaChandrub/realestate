import { IsIn, IsOptional } from 'class-validator';

// The four catalog categories, kept as a plain const so this DTO and the
// create DTO share one source of truth. Mirrors the Prisma
// OrgCatalogCategory enum exactly (same pattern as PROJECT_STATUS_VALUES in
// projects/dto/list-projects-query.dto.ts).
export const CATALOG_CATEGORY_VALUES = [
  'project_type',
  'unit_type',
  'connectivity',
  'amenity',
] as const;

export type CatalogCategoryValue = (typeof CATALOG_CATEGORY_VALUES)[number];

export class ListCatalogOptionsQueryDto {
  @IsOptional()
  @IsIn(CATALOG_CATEGORY_VALUES)
  category?: CatalogCategoryValue;
}
