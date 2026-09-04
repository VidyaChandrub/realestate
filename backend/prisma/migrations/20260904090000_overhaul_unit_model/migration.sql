-- The Unit no longer belongs to a UnitType. It is org-scoped directly and
-- optionally project-scoped (null = standalone listing), and carries its own
-- configuration / areas. UnitType survives only as the project's planned mix.
-- The `units` table is empty at this point, so the column drop is safe.

-- DropForeignKey
ALTER TABLE "projects"."units" DROP CONSTRAINT "units_unit_type_id_fkey";

-- DropIndex
DROP INDEX "projects"."units_unit_type_id_idx";

-- AlterTable
ALTER TABLE "projects"."units"
  DROP COLUMN "unit_type_id",
  ADD COLUMN "org_id" TEXT NOT NULL,
  ADD COLUMN "project_id" TEXT,
  ADD COLUMN "configuration" TEXT,
  ADD COLUMN "variant_label" TEXT,
  ADD COLUMN "carpet_sqft" INTEGER,
  ADD COLUMN "builtup_sqft" INTEGER,
  ADD COLUMN "address_line" TEXT,
  ADD COLUMN "owner_name" TEXT,
  ADD COLUMN "notes" TEXT;

-- CreateIndex
CREATE INDEX "units_org_id_idx" ON "projects"."units"("org_id");

-- CreateIndex
CREATE INDEX "units_project_id_idx" ON "projects"."units"("project_id");

-- AddForeignKey
ALTER TABLE "projects"."units" ADD CONSTRAINT "units_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."units" ADD CONSTRAINT "units_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
