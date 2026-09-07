-- "Price includes" and "Payment plan" become org-managed catalogs, alongside
-- the existing project_type / unit_type / connectivity / amenity lists.
-- (PostgreSQL 12+ allows ALTER TYPE ... ADD VALUE inside a transaction as long
-- as the new value isn't referenced in the same transaction — it isn't here.)
ALTER TYPE "projects"."OrgCatalogCategory" ADD VALUE 'price_includes';
ALTER TYPE "projects"."OrgCatalogCategory" ADD VALUE 'payment_plan';

-- Overall project floor / site plans, uploaded in wizard Step 8. Separate from
-- unit_types.floor_plan_url, which is the per-configuration plan.
ALTER TABLE "projects"."projects" ADD COLUMN "floor_plan_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
