ALTER TABLE "identity"."email_configs"
  ADD COLUMN IF NOT EXISTS "account_activated_subject" TEXT,
  ADD COLUMN IF NOT EXISTS "account_activated_body" TEXT,
  ADD COLUMN IF NOT EXISTS "account_deactivated_subject" TEXT,
  ADD COLUMN IF NOT EXISTS "account_deactivated_body" TEXT;
