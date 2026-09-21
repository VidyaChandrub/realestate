-- A project carries its own copy of its type's structure layout and field
-- templates, plus the typed values for the project-level template.
ALTER TABLE "projects"."projects"
  ADD COLUMN "layout" "projects"."ProjectLayout" NOT NULL DEFAULT 'tower',
  ADD COLUMN "project_type_id" TEXT,
  ADD COLUMN "group_label" TEXT,
  ADD COLUMN "project_field_template" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "unit_field_template" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "custom_fields" JSONB NOT NULL DEFAULT '{}';

-- Existing projects are all `tower` (the default above); link them to the
-- project type of the same name so usage counts and the layout lock are right.
UPDATE "projects"."projects" p
SET "project_type_id" = d."id"
FROM "projects"."project_type_defs" d
WHERE d."org_id" = p."org_id" AND d."name" = p."project_type";

CREATE INDEX "projects_project_type_id_idx" ON "projects"."projects"("project_type_id");
