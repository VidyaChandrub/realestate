-- Support ticket "on hold" status — Super Admin can pause a ticket with a
-- required reason, shown to both sides via a tooltip in the tickets list.
ALTER TYPE "audit"."SupportTicketStatus" ADD VALUE 'on_hold';

-- AlterTable
ALTER TABLE "audit"."support_tickets" ADD COLUMN     "hold_reason" TEXT,
ADD COLUMN     "held_at" TIMESTAMP(3),
ADD COLUMN     "held_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "audit"."support_tickets" ADD CONSTRAINT "support_tickets_held_by_id_fkey" FOREIGN KEY ("held_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
