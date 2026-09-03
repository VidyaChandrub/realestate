-- Add dynamic-role support: status (soft enable/disable) + description.

CREATE TYPE "identity"."RoleStatus" AS ENUM ('active', 'inactive');

ALTER TABLE "identity"."roles"
    ADD COLUMN "status" "identity"."RoleStatus" NOT NULL DEFAULT 'active';

ALTER TABLE "identity"."roles"
    ADD COLUMN "description" TEXT NOT NULL DEFAULT '';

DROP INDEX IF EXISTS "identity"."roles_sort_order_idx";
CREATE INDEX "roles_status_sort_order_idx" ON "identity"."roles"("status", "sort_order");
