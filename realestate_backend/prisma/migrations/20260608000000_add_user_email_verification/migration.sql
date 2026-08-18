ALTER TABLE "users"."users"
ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "email_verified_at" TIMESTAMP(3),
ADD COLUMN "email_verification_token" TEXT,
ADD COLUMN "email_verification_expires_at" TIMESTAMP(3);

UPDATE "users"."users"
SET
  "email_verified" = true,
  "email_verified_at" = COALESCE("email_verified_at", NOW())
WHERE "role" IN ('JOB_SEEKER', 'EMPLOYER');

CREATE UNIQUE INDEX "users_email_verification_token_key"
ON "users"."users"("email_verification_token");
