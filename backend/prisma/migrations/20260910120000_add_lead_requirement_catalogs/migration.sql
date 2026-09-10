-- Lead-requirement option lists for the lead edit page (Settings → Lead
-- Catalogs). Separate from the project/unit `facing` / `parking` values so the
-- two evolve independently. No rows are seeded — orgs build each list from
-- scratch, same as every other catalog.
-- (PostgreSQL 12+ allows ALTER TYPE ... ADD VALUE inside a transaction as long
-- as the new value isn't referenced in the same transaction — it isn't here.)
ALTER TYPE "projects"."OrgCatalogCategory" ADD VALUE 'lead_purpose';
ALTER TYPE "projects"."OrgCatalogCategory" ADD VALUE 'lead_financing';
ALTER TYPE "projects"."OrgCatalogCategory" ADD VALUE 'lead_loan_status';
ALTER TYPE "projects"."OrgCatalogCategory" ADD VALUE 'lead_timeline_to_buy';
ALTER TYPE "projects"."OrgCatalogCategory" ADD VALUE 'lead_preferred_floor';
ALTER TYPE "projects"."OrgCatalogCategory" ADD VALUE 'lead_facing';
ALTER TYPE "projects"."OrgCatalogCategory" ADD VALUE 'lead_parking';
