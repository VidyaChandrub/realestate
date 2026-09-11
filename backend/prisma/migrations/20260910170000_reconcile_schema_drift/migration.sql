-- between the model file and earlier hand-written/raw SQL migrations:
--   * email_configs / email_logs id was created as gen_random_uuid()/no default
--     while schema models id as @default(uuid()) (client-side) and updated_at
--     as @updatedAt (client-side) — drop the DB-level defaults to match.
--   * platform_configs.id @default("platform") is a static value → DB default.
--   * org_types.updated_at @updatedAt has no DB default.
--   * org_types_pkey restored (was dropped by an earlier reconciliation).
--   * organisations.profile removed from the model.
--   * platform_configs.hostinger_api_token removed from the model.
--   * landing_pages.project_id no longer part of the LandingPage model.
--   * leads.configurations / tags dropped their DB defaults.
--   * email_configs.org_id unique index created by model (@unique), mirrored.
--
-- Originally generated via `prisma migrate diff --from-url <live db> ...`,
-- which diffed against a local database that had already drifted from every
-- other environment (missing org_types_pkey, missing organisations.profile).
-- That made every statement below assume the local machine's state instead
-- of checking the real one, so it failed on production, which still had the
-- primary key and the column. Every statement is now conditional on the
-- actual current state, so it applies cleanly whether a database already
-- matches the target, still has the old shape, or is entirely fresh.

-- DropIndex
DROP INDEX IF EXISTS "templates"."landing_pages_project_id_idx";

-- AlterTable
ALTER TABLE "audit"."email_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "identity"."email_configs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "identity"."org_types" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable — restore the primary key only if it's actually missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'p' AND n.nspname = 'identity' AND t.relname = 'org_types'
  ) THEN
    ALTER TABLE "identity"."org_types" ADD CONSTRAINT "org_types_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

-- AlterTable
ALTER TABLE "identity"."organisations" DROP COLUMN IF EXISTS "profile";

-- AlterTable
ALTER TABLE "identity"."platform_configs" DROP COLUMN IF EXISTS "hostinger_api_token",
ALTER COLUMN "id" SET DEFAULT 'platform',
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "templates"."landing_pages" DROP COLUMN IF EXISTS "project_id";

-- AlterTable
ALTER TABLE "templates"."leads" ALTER COLUMN "configurations" DROP DEFAULT,
ALTER COLUMN "tags" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "email_configs_org_id_key" ON "identity"."email_configs"("org_id");
