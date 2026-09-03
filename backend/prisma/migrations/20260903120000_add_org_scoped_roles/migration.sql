-- Allow organisations to create their own custom roles (org-scoped),
-- alongside the existing platform-wide/system roles (orgId IS NULL).
ALTER TABLE "identity"."roles" ADD COLUMN "org_id" TEXT;

ALTER TABLE "identity"."roles"
  ADD CONSTRAINT "roles_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Replace the old globally-unique key constraint with one that only
-- requires uniqueness within its own scope (global vs a specific org).
DROP INDEX IF EXISTS "identity"."roles_key_key";
CREATE UNIQUE INDEX "roles_org_id_key_key" ON "identity"."roles"("org_id", "key");
