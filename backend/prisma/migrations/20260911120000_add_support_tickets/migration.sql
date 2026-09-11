-- Support ticket lifecycle notification types.
ALTER TYPE "audit"."NotificationType" ADD VALUE 'support_ticket_created';
ALTER TYPE "audit"."NotificationType" ADD VALUE 'support_ticket_message';
ALTER TYPE "audit"."NotificationType" ADD VALUE 'support_ticket_status_changed';

-- CreateEnum
CREATE TYPE "audit"."SupportTicketStatus" AS ENUM ('open', 'ongoing', 'resolved');

-- CreateEnum
CREATE TYPE "audit"."SupportTicketPriority" AS ENUM ('normal', 'high', 'urgent');

-- CreateTable
CREATE TABLE "audit"."support_tickets" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "org_id" TEXT NOT NULL,
    "raised_by_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "audit"."SupportTicketPriority" NOT NULL DEFAULT 'normal',
    "status" "audit"."SupportTicketStatus" NOT NULL DEFAULT 'open',
    "closed_at" TIMESTAMP(3),
    "closed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."support_messages" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachment_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_org_id_number_key" ON "audit"."support_tickets"("org_id", "number");

-- CreateIndex
CREATE INDEX "support_tickets_org_id_idx" ON "audit"."support_tickets"("org_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "audit"."support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_messages_ticket_id_idx" ON "audit"."support_messages"("ticket_id");

-- AddForeignKey
ALTER TABLE "audit"."support_tickets" ADD CONSTRAINT "support_tickets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit"."support_tickets" ADD CONSTRAINT "support_tickets_raised_by_id_fkey" FOREIGN KEY ("raised_by_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit"."support_tickets" ADD CONSTRAINT "support_tickets_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit"."support_messages" ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "audit"."support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit"."support_messages" ADD CONSTRAINT "support_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
