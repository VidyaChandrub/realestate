-- Organisation-member approval lifecycle + access-token invalidation stamp.
--
-- `pending` joins the UserStatus enum (mirrors OrgStatus.pending). Org
-- Admin-provisioned members are created `pending` and cannot log in until
-- approved. `approved_at` records the approval; it is backfilled to
-- `created_at` for every existing row so no current user is locked out.
--
-- `token_invalid_before` is the single mechanism for invalidating already
-- issued access JWTs (checked fresh per request in OrgApprovedGuard):
-- any token whose `iat` predates this timestamp is rejected. Null for all
-- existing rows, so their current sessions keep working.

ALTER TYPE "identity"."UserStatus" ADD VALUE 'pending';

ALTER TABLE "identity"."users" ADD COLUMN "approved_at" TIMESTAMP(3);
ALTER TABLE "identity"."users" ADD COLUMN "token_invalid_before" TIMESTAMP(3);

UPDATE "identity"."users" SET "approved_at" = "created_at" WHERE "approved_at" IS NULL;
