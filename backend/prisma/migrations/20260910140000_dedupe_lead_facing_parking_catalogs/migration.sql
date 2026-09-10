-- Drop the `lead_facing` / `lead_parking` catalog categories. They duplicated
-- the existing project/unit `facing` / `parking` value sets (a buyer's
-- preferred facing/parking is the same list as a unit's), so Leads now reuses
-- those directly — the way Configuration already reuses `unit_type`. The
-- lead-only categories with no project twin (purpose, financing, loan status,
-- timeline, preferred floor) stay.
--
-- Verified before writing this: zero org_catalog_options rows use either value,
-- so the USING cast below can't lose data.
-- AlterEnum
BEGIN;
CREATE TYPE "projects"."OrgCatalogCategory_new" AS ENUM ('project_type', 'unit_type', 'connectivity', 'amenity', 'price_includes', 'payment_plan', 'facing', 'parking', 'unit_variant', 'lead_purpose', 'lead_financing', 'lead_loan_status', 'lead_timeline_to_buy', 'lead_preferred_floor');
ALTER TABLE "projects"."org_catalog_options" ALTER COLUMN "category" TYPE "projects"."OrgCatalogCategory_new" USING ("category"::text::"projects"."OrgCatalogCategory_new");
ALTER TYPE "projects"."OrgCatalogCategory" RENAME TO "OrgCatalogCategory_old";
ALTER TYPE "projects"."OrgCatalogCategory_new" RENAME TO "OrgCatalogCategory";
DROP TYPE "projects"."OrgCatalogCategory_old";
COMMIT;
