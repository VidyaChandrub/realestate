-- Remove the fixed project inventory summary columns now represented by
-- editable projectFields template entries.
ALTER TABLE "projects"."projects"
  DROP COLUMN "land_area",
  DROP COLUMN "tower_count",
  DROP COLUMN "floors_description",
  DROP COLUMN "carpet_range";
