ALTER TABLE "templates"."leads"
  ADD COLUMN "next_action_type" TEXT,
  ADD COLUMN "next_action_at" TIMESTAMP(3),
  ADD COLUMN "next_action_note" TEXT,
  ADD COLUMN "reminder_at" TIMESTAMP(3);

CREATE INDEX "leads_next_action_at_idx" ON "templates"."leads" ("next_action_at");
