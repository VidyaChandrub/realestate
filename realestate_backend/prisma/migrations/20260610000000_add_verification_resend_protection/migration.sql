ALTER TABLE "users"."users"
ADD COLUMN "resend_verification_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "last_verification_resend_at" TIMESTAMP(3),
ADD COLUMN "verification_resend_window_started_at" TIMESTAMP(3);
