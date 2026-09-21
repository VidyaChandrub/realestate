-- A unit's primary area (non-tower layouts: plot / villa size, sqft) and the
-- typed values for its project's unit field template.
ALTER TABLE "projects"."units"
  ADD COLUMN "area" INTEGER,
  ADD COLUMN "custom_fields" JSONB NOT NULL DEFAULT '{}';
