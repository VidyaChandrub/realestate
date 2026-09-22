-- Add organisation package change requests and their review state.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'billing' AND t.typname = 'PackageChangeRequestStatus'
    ) THEN
        CREATE TYPE "billing"."PackageChangeRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "billing"."package_change_requests" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "current_plan_id" TEXT NOT NULL,
    "target_plan_id" TEXT NOT NULL,
    "billing_cycle" "billing"."BillingCycle" NOT NULL DEFAULT 'monthly',
    "status" "billing"."PackageChangeRequestStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_change_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "billing"."package_change_requests"
    ADD COLUMN IF NOT EXISTS "org_id" TEXT,
    ADD COLUMN IF NOT EXISTS "requested_by_id" TEXT,
    ADD COLUMN IF NOT EXISTS "current_plan_id" TEXT,
    ADD COLUMN IF NOT EXISTS "target_plan_id" TEXT,
    ADD COLUMN IF NOT EXISTS "billing_cycle" "billing"."BillingCycle" NOT NULL DEFAULT 'monthly',
    ADD COLUMN IF NOT EXISTS "status" "billing"."PackageChangeRequestStatus" NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
    ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "reviewed_by_id" TEXT,
    ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "package_change_requests_org_id_idx" ON "billing"."package_change_requests"("org_id");
CREATE INDEX IF NOT EXISTS "package_change_requests_status_idx" ON "billing"."package_change_requests"("status");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'package_change_requests_org_id_fkey') THEN
        ALTER TABLE "billing"."package_change_requests"
            ADD CONSTRAINT "package_change_requests_org_id_fkey"
            FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'package_change_requests_requested_by_id_fkey') THEN
        ALTER TABLE "billing"."package_change_requests"
            ADD CONSTRAINT "package_change_requests_requested_by_id_fkey"
            FOREIGN KEY ("requested_by_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'package_change_requests_reviewed_by_id_fkey') THEN
        ALTER TABLE "billing"."package_change_requests"
            ADD CONSTRAINT "package_change_requests_reviewed_by_id_fkey"
            FOREIGN KEY ("reviewed_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'package_change_requests_current_plan_id_fkey') THEN
        ALTER TABLE "billing"."package_change_requests"
            ADD CONSTRAINT "package_change_requests_current_plan_id_fkey"
            FOREIGN KEY ("current_plan_id") REFERENCES "billing"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'package_change_requests_target_plan_id_fkey') THEN
        ALTER TABLE "billing"."package_change_requests"
            ADD CONSTRAINT "package_change_requests_target_plan_id_fkey"
            FOREIGN KEY ("target_plan_id") REFERENCES "billing"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
