-- Wizard Step 1-2 identity/timeline fields that the create wizard collected
-- but had nowhere to store, so they were dropped on publish and the edit page
-- could not show them. Purely additive: all nullable, no backfill, no
-- existing column touched.
ALTER TABLE "projects"."projects"
  ADD COLUMN "project_type" TEXT,
  ADD COLUMN "tagline" TEXT,
  ADD COLUMN "launch_date" TEXT,
  ADD COLUMN "construction_stage" TEXT,
  ADD COLUMN "highlights" TEXT,
  ADD COLUMN "sales_team" TEXT;
