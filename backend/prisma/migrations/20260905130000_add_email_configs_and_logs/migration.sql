-- Super Admin SMTP settings and dispatch audit.
-- These tables were previously created only in seed.ts, so production
-- deployments that never ran seed fail PUT /admin/email/config with 500.

CREATE SCHEMA IF NOT EXISTS "identity";
CREATE SCHEMA IF NOT EXISTS "audit";

CREATE TABLE IF NOT EXISTS "identity"."email_configs" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "user" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL DEFAULT '',
    "from_email" TEXT NOT NULL,
    "from_name" TEXT NOT NULL DEFAULT 'iPixxel Realty',
    "reply_to" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "invite_subject" TEXT,
    "invite_body" TEXT,
    "reset_subject" TEXT,
    "reset_body" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_configs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "identity"."email_configs" ADD COLUMN IF NOT EXISTS "invite_subject" TEXT;
ALTER TABLE "identity"."email_configs" ADD COLUMN IF NOT EXISTS "invite_body" TEXT;
ALTER TABLE "identity"."email_configs" ADD COLUMN IF NOT EXISTS "reset_subject" TEXT;
ALTER TABLE "identity"."email_configs" ADD COLUMN IF NOT EXISTS "reset_body" TEXT;

CREATE TABLE IF NOT EXISTS "audit"."email_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "metadata" JSONB,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "email_logs_to_idx" ON "audit"."email_logs"("to");
CREATE INDEX IF NOT EXISTS "email_logs_status_idx" ON "audit"."email_logs"("status");
CREATE INDEX IF NOT EXISTS "email_logs_sent_at_idx" ON "audit"."email_logs"("sent_at");
