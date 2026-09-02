-- Calls & comms + activity feed for the sales-agent dashboard.

-- CreateEnum
CREATE TYPE "templates"."CallDirection" AS ENUM ('outgoing', 'incoming');

-- CreateTable
CREATE TABLE "templates"."call_logs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "lead_name" TEXT,
    "direction" "templates"."CallDirection" NOT NULL DEFAULT 'outgoing',
    "outcome" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "call_logs_org_id_idx" ON "templates"."call_logs" ("org_id");
CREATE INDEX "call_logs_agent_id_idx" ON "templates"."call_logs" ("agent_id");
CREATE INDEX "call_logs_created_at_idx" ON "templates"."call_logs" ("created_at");

-- AddForeignKey
ALTER TABLE "templates"."call_logs" ADD CONSTRAINT "call_logs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates"."call_logs" ADD CONSTRAINT "call_logs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "templates"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "templates"."ActivityType" AS ENUM ('closed_deal', 'site_visit_booked', 'call_logged', 'whatsapp_sent', 'whatsapp_read', 'note_added', 'status_updated', 'logged_in');

-- CreateTable
CREATE TABLE "templates"."activity_events" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "type" "templates"."ActivityType" NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_events_org_id_idx" ON "templates"."activity_events" ("org_id");
CREATE INDEX "activity_events_agent_id_idx" ON "templates"."activity_events" ("agent_id");
CREATE INDEX "activity_events_created_at_idx" ON "templates"."activity_events" ("created_at");

-- AddForeignKey
ALTER TABLE "templates"."activity_events" ADD CONSTRAINT "activity_events_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates"."activity_events" ADD CONSTRAINT "activity_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "templates"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;