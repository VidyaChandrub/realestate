-- Per-organisation SMTP (null org_id = platform Super Admin config).

ALTER TABLE "identity"."email_configs" ADD COLUMN IF NOT EXISTS "org_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "email_configs_org_id_key" ON "identity"."email_configs"("org_id");

ALTER TABLE "audit"."email_logs" ADD COLUMN IF NOT EXISTS "org_id" TEXT;
CREATE INDEX IF NOT EXISTS "email_logs_org_id_idx" ON "audit"."email_logs"("org_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_configs_org_id_fkey'
  ) THEN
    ALTER TABLE "identity"."email_configs"
      ADD CONSTRAINT "email_configs_org_id_fkey"
      FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
