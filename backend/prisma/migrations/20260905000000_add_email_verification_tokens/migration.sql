-- AlterTable
ALTER TABLE "identity"."users" ADD COLUMN "email_verified_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "identity"."email_verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "identity"."email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing accounts that already finished setup are treated as verified.
UPDATE "identity"."users"
SET "email_verified_at" = COALESCE("email_verified_at", "created_at")
WHERE "onboarding_step" = 'completed' AND "email_verified_at" IS NULL;

-- Platform Super Admins predate onboarding tracking — mark them complete
-- so they are never sent through the organisation signup wizard.
UPDATE "identity"."users" AS u
SET
  "onboarding_step" = 'completed',
  "email_verified_at" = COALESCE(u."email_verified_at", u."created_at")
WHERE u."org_id" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "identity"."user_roles" ur
    JOIN "identity"."roles" r ON r."id" = ur."role_id"
    WHERE ur."user_id" = u."id" AND r."key" = 'super_admin'
  );
