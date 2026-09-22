-- Add organisation package change requests and their review state.
CREATE TYPE "billing"."PackageChangeRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE "billing"."package_change_requests" (
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

CREATE INDEX "package_change_requests_org_id_idx" ON "billing"."package_change_requests"("org_id");
CREATE INDEX "package_change_requests_status_idx" ON "billing"."package_change_requests"("status");

ALTER TABLE "billing"."package_change_requests"
    ADD CONSTRAINT "package_change_requests_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing"."package_change_requests"
    ADD CONSTRAINT "package_change_requests_requested_by_id_fkey"
    FOREIGN KEY ("requested_by_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing"."package_change_requests"
    ADD CONSTRAINT "package_change_requests_reviewed_by_id_fkey"
    FOREIGN KEY ("reviewed_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "billing"."package_change_requests"
    ADD CONSTRAINT "package_change_requests_current_plan_id_fkey"
    FOREIGN KEY ("current_plan_id") REFERENCES "billing"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "billing"."package_change_requests"
    ADD CONSTRAINT "package_change_requests_target_plan_id_fkey"
    FOREIGN KEY ("target_plan_id") REFERENCES "billing"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
