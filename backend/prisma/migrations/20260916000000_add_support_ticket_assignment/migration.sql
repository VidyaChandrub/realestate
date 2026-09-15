-- Support ticket assignment — a Super Admin can hand a ticket off to a
-- specific Platform Team member; that member then only sees/acts on their
-- own assigned tickets in Support Management.
ALTER TYPE "audit"."NotificationType" ADD VALUE 'support_ticket_assigned';

-- AlterTable
ALTER TABLE "audit"."support_tickets" ADD COLUMN     "assigned_to_id" TEXT;

-- CreateIndex
CREATE INDEX "support_tickets_assigned_to_id_idx" ON "audit"."support_tickets"("assigned_to_id");

-- AddForeignKey
ALTER TABLE "audit"."support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
