-- Convert Project.manager (free-text name) to Project.managerId (FK -> identity.users).
-- No backfill: no production data exists yet, and the brief says the one
-- test project's manager value can be discarded.

-- AlterTable
ALTER TABLE "projects"."projects" DROP COLUMN "manager",
ADD COLUMN     "manager_id" TEXT;

-- CreateIndex
CREATE INDEX "projects_manager_id_idx" ON "projects"."projects"("manager_id");

-- AddForeignKey
ALTER TABLE "projects"."projects" ADD CONSTRAINT "projects_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
