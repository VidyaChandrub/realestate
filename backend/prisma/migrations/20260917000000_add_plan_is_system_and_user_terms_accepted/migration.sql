-- Simplified onboarding: seeded "Basic" plan protection + ToS acceptance record.
--
-- `is_system` marks the platform's seeded default plan (Basic) so it can be
-- edited but never deleted (see AdminPlansService.remove()) — a flag on the
-- row rather than a slug check, so renaming the plan in the admin UI can't
-- silently drop the protection. False for every existing plan.
--
-- `terms_accepted_at` records ToS & Privacy Policy acceptance, now collected
-- at signup Step 2 (Organisation) instead of the removed Templates step.
-- Null for every existing user — nothing to backfill.

ALTER TABLE "billing"."plans" ADD COLUMN "is_system" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "identity"."users" ADD COLUMN "terms_accepted_at" TIMESTAMP(3);
