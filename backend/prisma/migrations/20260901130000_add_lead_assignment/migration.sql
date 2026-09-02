-- Lead CRM lifecycle: add assignment (FK to identity.users) and a status.
-- `assigned_to_id` is nullable — a lead can be unassigned/"new". Removing the
-- assignee keeps the lead (ON DELETE SET NULL), mirroring Project.managerId.

-- CreateEnum
CREATE TYPE "templates"."LeadStatus" AS ENUM ('new', 'contacted', 'follow_up', 'site_visit', 'negotiation', 'won', 'lost');

-- AlterTable
ALTER TABLE "templates"."leads" ADD COLUMN     "assigned_to_id" TEXT,
ADD COLUMN     "status" "templates"."LeadStatus" NOT NULL DEFAULT 'new';

-- CreateIndex
CREATE INDEX "leads_assigned_to_id_idx" ON "templates"."leads"("assigned_to_id");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "templates"."leads"("status");

-- AddForeignKey
ALTER TABLE "templates"."leads" ADD CONSTRAINT "leads_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;