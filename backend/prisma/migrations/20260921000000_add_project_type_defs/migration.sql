-- Project types become a structured, per-org catalog: a name + a fixed layout
-- (tower | cluster | individual) + two typed field templates. Replaces the flat
-- `project_type` OrgCatalogOption list for this purpose.

CREATE TYPE "projects"."ProjectLayout" AS ENUM ('tower', 'cluster', 'individual');

CREATE TABLE "projects"."project_type_defs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layout" "projects"."ProjectLayout" NOT NULL DEFAULT 'tower',
    "group_label" TEXT,
    "project_fields" JSONB NOT NULL DEFAULT '[]',
    "unit_fields" JSONB NOT NULL DEFAULT '[]',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_type_defs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_type_defs_org_id_name_key" ON "projects"."project_type_defs"("org_id", "name");
CREATE INDEX "project_type_defs_org_id_idx" ON "projects"."project_type_defs"("org_id");

ALTER TABLE "projects"."project_type_defs"
  ADD CONSTRAINT "project_type_defs_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry each org's existing project types over as `tower` types with no
-- fields, so every current project keeps working exactly as before. The old
-- catalog rows are left in place (nothing reads them any more).
INSERT INTO "projects"."project_type_defs" ("id", "org_id", "name", "layout", "sort_order", "updated_at")
SELECT gen_random_uuid()::text, "org_id", "label", 'tower', "sort_order", CURRENT_TIMESTAMP
FROM "projects"."org_catalog_options"
WHERE "category" = 'project_type';
