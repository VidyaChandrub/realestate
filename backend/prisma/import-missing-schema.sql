-- =============================================================================
-- Importable migration: missing schema for the BigEstate backend
-- -----------------------------------------------------------------------------
-- Brings a database up to date with `prisma/schema.prisma` by creating the
-- enums and columns that the current schema expects but that may be absent
-- from an existing/imported database.
--
-- Target schema.prisma additions covered here:
--   enums  : identity.OnboardingStep, identity.OrgIndustry
--   table  : identity.organisations  + enabled_modules, gstin, industry,
--            legal_name, rera_license_no, support_email, support_phone
--            (city made nullable)
--   table  : identity.users          + onboarding_step
--
-- Idempotent: each statement is guarded so it can be imported more than once
-- without error. Safe to run against an already-migrated DB (no-ops).
--
-- Usage:  psql -h localhost -U postgres -d bigestate -f import-missing-schema.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. identity.OnboardingStep enum
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "identity"."OnboardingStep" AS ENUM (
    'account', 'organisation', 'business_details', 'modules',
    'subscription', 'templates', 'invite', 'connect', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. identity.OrgIndustry enum
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "identity"."OrgIndustry" AS ENUM ('developer', 'broker', 'channel', 'mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 3. identity.organisations — new profile / business-details columns
-- -----------------------------------------------------------------------------
ALTER TABLE "identity"."organisations"
  DROP COLUMN IF EXISTS "enabled_modules";
ALTER TABLE "identity"."organisations"
  ADD COLUMN "enabled_modules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "identity"."organisations" ADD COLUMN IF NOT EXISTS "gstin" TEXT;
ALTER TABLE "identity"."organisations" ADD COLUMN IF NOT EXISTS "rera_license_no" TEXT;
ALTER TABLE "identity"."organisations" ADD COLUMN IF NOT EXISTS "legal_name" TEXT;
ALTER TABLE "identity"."organisations" ADD COLUMN IF NOT EXISTS "support_email" TEXT;
ALTER TABLE "identity"."organisations" ADD COLUMN IF NOT EXISTS "support_phone" TEXT;

DO $$ BEGIN
  ALTER TABLE "identity"."organisations" ADD COLUMN "industry" "identity"."OrgIndustry";
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- city is now collected later at Step 3 (Business Details) -> nullable
ALTER TABLE "identity"."organisations" ALTER COLUMN "city" DROP NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. identity.users — onboarding_step (signup-wizard resume tracking)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE "identity"."users" ADD COLUMN "onboarding_step" "identity"."OnboardingStep" NOT NULL DEFAULT 'account';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- Done. Verify with:
--   npx prisma migrate diff --from-url "postgresql://postgres:postgres@localhost:5432/bigestate?schema=public" --to-schema-datamodel prisma/schema.prisma --script
-- (empty output == schema is fully in sync)
-- =============================================================================
