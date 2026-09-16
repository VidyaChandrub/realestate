-- The development database already contains these schema changes from db push.
-- This migration records them for deploys without re-executing them locally.

ALTER TABLE "identity"."organisations"
  ADD COLUMN "single_team_membership" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "access"."teams"
  ADD COLUMN "project_manager_id" TEXT;

CREATE INDEX "teams_project_manager_id_idx"
  ON "access"."teams"("project_manager_id");

ALTER TABLE "access"."teams"
  ADD CONSTRAINT "teams_project_manager_id_fkey"
  FOREIGN KEY ("project_manager_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "access"."team_units" (
  "team_id" TEXT NOT NULL,
  "unit_id" TEXT NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "team_units_pkey" PRIMARY KEY ("team_id", "unit_id")
);

CREATE INDEX "team_units_unit_id_idx"
  ON "access"."team_units"("unit_id");

ALTER TABLE "access"."team_units"
  ADD CONSTRAINT "team_units_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "access"."teams"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "access"."team_units"
  ADD CONSTRAINT "team_units_unit_id_fkey"
  FOREIGN KEY ("unit_id") REFERENCES "projects"."units"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
