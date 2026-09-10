-- Part 1 — Activity feed actor attribution.
-- Make the actor nullable so automated entries (public website-form captures)
-- can be recorded with no user and rendered as "System". Swap the FK from
-- CASCADE to SET NULL so a deleted user's history survives as System.
ALTER TABLE "templates"."activity_events" ALTER COLUMN "agent_id" DROP NOT NULL;

ALTER TABLE "templates"."activity_events" DROP CONSTRAINT "activity_events_agent_id_fkey";

ALTER TABLE "templates"."activity_events" ADD CONSTRAINT "activity_events_agent_id_fkey"
  FOREIGN KEY ("agent_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Part 2 — Lead edit-form fields. All additive: nullable scalars, or
-- non-null scalar lists / booleans with a safe default. No type changes,
-- no data rewrite.
ALTER TABLE "templates"."leads"
  ADD COLUMN "alt_name" TEXT,
  ADD COLUMN "alt_phone" TEXT,
  ADD COLUMN "whatsapp" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "budget_min" BIGINT,
  ADD COLUMN "budget_max" BIGINT,
  ADD COLUMN "configurations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "purpose" TEXT,
  ADD COLUMN "financing" TEXT,
  ADD COLUMN "loan_status" TEXT,
  ADD COLUMN "timeline_to_buy" TEXT,
  ADD COLUMN "preferred_floor" TEXT,
  ADD COLUMN "facing" TEXT,
  ADD COLUMN "parking" TEXT,
  ADD COLUMN "requirement_notes" TEXT,
  ADD COLUMN "campaign" TEXT,
  ADD COLUMN "utm_source" TEXT,
  ADD COLUMN "utm_medium" TEXT,
  ADD COLUMN "utm_campaign" TEXT,
  ADD COLUMN "temperature" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "consent_whatsapp" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consent_call" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consent_email" BOOLEAN NOT NULL DEFAULT false;
