-- Marketing Integration Hub: shared platforms, connections, campaigns, sync logs
-- + Lead platform/referrer/first-last touch columns + attribution label seeds

ALTER TABLE "templates"."leads"
  ADD COLUMN IF NOT EXISTS "platform" TEXT,
  ADD COLUMN IF NOT EXISTS "referrer" TEXT,
  ADD COLUMN IF NOT EXISTS "landing_page" TEXT,
  ADD COLUMN IF NOT EXISTS "first_touch_source" TEXT,
  ADD COLUMN IF NOT EXISTS "last_touch_source" TEXT;

CREATE INDEX IF NOT EXISTS "leads_platform_idx"
  ON "templates"."leads"("platform");

CREATE TABLE IF NOT EXISTS "identity"."marketing_platforms" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "supports_oauth" BOOLEAN NOT NULL DEFAULT false,
  "supports_webhook" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "marketing_platforms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketing_platforms_key_key"
  ON "identity"."marketing_platforms"("key");

CREATE INDEX IF NOT EXISTS "marketing_platforms_enabled_idx"
  ON "identity"."marketing_platforms"("enabled");

CREATE TABLE IF NOT EXISTS "identity"."marketing_org_platform_access" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "platform_key" TEXT NOT NULL,
  "allowed" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "marketing_org_platform_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketing_org_platform_access_org_id_platform_key_key"
  ON "identity"."marketing_org_platform_access"("org_id", "platform_key");

CREATE INDEX IF NOT EXISTS "marketing_org_platform_access_org_id_idx"
  ON "identity"."marketing_org_platform_access"("org_id");

CREATE TABLE IF NOT EXISTS "identity"."marketing_connections" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "platform_key" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'connected',
  "external_account_id" TEXT NOT NULL,
  "external_account_name" TEXT NOT NULL,
  "access_token" TEXT,
  "refresh_token" TEXT,
  "project_id" TEXT,
  "metadata" JSONB,
  "last_sync_at" TIMESTAMP(3),
  "last_error" TEXT,
  "connected_by" TEXT,
  "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "marketing_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketing_connections_org_id_platform_key_external_account_id_key"
  ON "identity"."marketing_connections"("org_id", "platform_key", "external_account_id");

CREATE INDEX IF NOT EXISTS "marketing_connections_org_id_idx"
  ON "identity"."marketing_connections"("org_id");

CREATE INDEX IF NOT EXISTS "marketing_connections_platform_key_idx"
  ON "identity"."marketing_connections"("platform_key");

CREATE INDEX IF NOT EXISTS "marketing_connections_external_account_id_idx"
  ON "identity"."marketing_connections"("external_account_id");

CREATE TABLE IF NOT EXISTS "identity"."marketing_campaigns" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "platform_key" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT,
  "spend" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "impressions" BIGINT NOT NULL DEFAULT 0,
  "clicks" BIGINT NOT NULL DEFAULT 0,
  "leads_count" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketing_campaigns_org_id_platform_key_external_id_key"
  ON "identity"."marketing_campaigns"("org_id", "platform_key", "external_id");

CREATE INDEX IF NOT EXISTS "marketing_campaigns_org_id_idx"
  ON "identity"."marketing_campaigns"("org_id");

CREATE INDEX IF NOT EXISTS "marketing_campaigns_connection_id_idx"
  ON "identity"."marketing_campaigns"("connection_id");

CREATE TABLE IF NOT EXISTS "identity"."marketing_ad_sets" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT,
  "spend" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "impressions" BIGINT NOT NULL DEFAULT 0,
  "clicks" BIGINT NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "marketing_ad_sets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketing_ad_sets_campaign_id_external_id_key"
  ON "identity"."marketing_ad_sets"("campaign_id", "external_id");

CREATE INDEX IF NOT EXISTS "marketing_ad_sets_org_id_idx"
  ON "identity"."marketing_ad_sets"("org_id");

CREATE TABLE IF NOT EXISTS "identity"."marketing_ads" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "ad_set_id" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT,
  "spend" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "impressions" BIGINT NOT NULL DEFAULT 0,
  "clicks" BIGINT NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "marketing_ads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketing_ads_ad_set_id_external_id_key"
  ON "identity"."marketing_ads"("ad_set_id", "external_id");

CREATE INDEX IF NOT EXISTS "marketing_ads_org_id_idx"
  ON "identity"."marketing_ads"("org_id");

CREATE TABLE IF NOT EXISTS "identity"."marketing_metric_snapshots" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "platform_key" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "spend" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "impressions" BIGINT NOT NULL DEFAULT 0,
  "clicks" BIGINT NOT NULL DEFAULT 0,
  "leads_count" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "marketing_metric_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketing_metric_snapshots_org_id_platform_key_date_key"
  ON "identity"."marketing_metric_snapshots"("org_id", "platform_key", "date");

CREATE INDEX IF NOT EXISTS "marketing_metric_snapshots_org_id_idx"
  ON "identity"."marketing_metric_snapshots"("org_id");

CREATE TABLE IF NOT EXISTS "identity"."marketing_sync_logs" (
  "id" TEXT NOT NULL,
  "org_id" TEXT,
  "connection_id" TEXT,
  "platform_key" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'inbound',
  "status" TEXT NOT NULL,
  "message" TEXT,
  "detail" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "marketing_sync_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "marketing_sync_logs_org_id_idx"
  ON "identity"."marketing_sync_logs"("org_id");

CREATE INDEX IF NOT EXISTS "marketing_sync_logs_platform_key_idx"
  ON "identity"."marketing_sync_logs"("platform_key");

CREATE INDEX IF NOT EXISTS "marketing_sync_logs_created_at_idx"
  ON "identity"."marketing_sync_logs"("created_at");

CREATE INDEX IF NOT EXISTS "marketing_sync_logs_status_idx"
  ON "identity"."marketing_sync_logs"("status");

-- FKs
ALTER TABLE "identity"."marketing_org_platform_access"
  DROP CONSTRAINT IF EXISTS "marketing_org_platform_access_org_id_fkey";
ALTER TABLE "identity"."marketing_org_platform_access"
  ADD CONSTRAINT "marketing_org_platform_access_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."marketing_org_platform_access"
  DROP CONSTRAINT IF EXISTS "marketing_org_platform_access_platform_key_fkey";
ALTER TABLE "identity"."marketing_org_platform_access"
  ADD CONSTRAINT "marketing_org_platform_access_platform_key_fkey"
  FOREIGN KEY ("platform_key") REFERENCES "identity"."marketing_platforms"("key")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."marketing_connections"
  DROP CONSTRAINT IF EXISTS "marketing_connections_org_id_fkey";
ALTER TABLE "identity"."marketing_connections"
  ADD CONSTRAINT "marketing_connections_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."marketing_connections"
  DROP CONSTRAINT IF EXISTS "marketing_connections_platform_key_fkey";
ALTER TABLE "identity"."marketing_connections"
  ADD CONSTRAINT "marketing_connections_platform_key_fkey"
  FOREIGN KEY ("platform_key") REFERENCES "identity"."marketing_platforms"("key")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "identity"."marketing_connections"
  DROP CONSTRAINT IF EXISTS "marketing_connections_project_id_fkey";
ALTER TABLE "identity"."marketing_connections"
  ADD CONSTRAINT "marketing_connections_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "identity"."marketing_campaigns"
  DROP CONSTRAINT IF EXISTS "marketing_campaigns_connection_id_fkey";
ALTER TABLE "identity"."marketing_campaigns"
  ADD CONSTRAINT "marketing_campaigns_connection_id_fkey"
  FOREIGN KEY ("connection_id") REFERENCES "identity"."marketing_connections"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."marketing_ad_sets"
  DROP CONSTRAINT IF EXISTS "marketing_ad_sets_campaign_id_fkey";
ALTER TABLE "identity"."marketing_ad_sets"
  ADD CONSTRAINT "marketing_ad_sets_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "identity"."marketing_campaigns"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."marketing_ads"
  DROP CONSTRAINT IF EXISTS "marketing_ads_ad_set_id_fkey";
ALTER TABLE "identity"."marketing_ads"
  ADD CONSTRAINT "marketing_ads_ad_set_id_fkey"
  FOREIGN KEY ("ad_set_id") REFERENCES "identity"."marketing_ad_sets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."marketing_sync_logs"
  DROP CONSTRAINT IF EXISTS "marketing_sync_logs_connection_id_fkey";
ALTER TABLE "identity"."marketing_sync_logs"
  ADD CONSTRAINT "marketing_sync_logs_connection_id_fkey"
  FOREIGN KEY ("connection_id") REFERENCES "identity"."marketing_connections"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed platforms
INSERT INTO "identity"."marketing_platforms"
  ("id", "key", "name", "description", "sort_order", "enabled", "supports_oauth", "supports_webhook", "created_at", "updated_at")
VALUES
  (gen_random_uuid()::text, 'meta', 'Facebook / Meta', 'Facebook & Instagram Lead Ads via Meta Graph API', 10, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'instagram', 'Instagram', 'Instagram Lead Ads (via Meta)', 20, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'google_ads', 'Google Ads', 'Google Ads lead forms & campaign metrics', 30, true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'linkedin', 'LinkedIn Ads', 'LinkedIn Lead Gen Forms', 40, true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'tiktok', 'TikTok Ads', 'TikTok Lead Generation', 50, true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'whatsapp', 'WhatsApp Ads', 'WhatsApp ads attribution via Meta', 60, true, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ga', 'Google Analytics', 'Analytics traffic & conversion insights', 70, true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'website', 'Website / Landing Pages', 'Built-in site & landing form attribution', 80, true, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'webhook', 'Webhook / API', 'Generic inbound lead webhook', 90, true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Extra attribution labels
INSERT INTO "identity"."platform_attribution_labels" ("id", "key", "label", "sort_order", "enabled", "created_at", "updated_at")
VALUES
  (gen_random_uuid()::text, 'platform', 'Platform', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'landing_page', 'Landing Page', 115, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'referrer', 'Referrer', 125, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'first_touch_source', 'First-Touch Source', 150, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'last_touch_source', 'Last-Touch Source', 160, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Migrate existing Meta page connections into MarketingConnection
INSERT INTO "identity"."marketing_connections" (
  "id", "org_id", "platform_key", "status", "external_account_id", "external_account_name",
  "access_token", "project_id", "metadata", "connected_by", "connected_at", "updated_at"
)
SELECT
  gen_random_uuid()::text,
  m."org_id",
  'meta',
  'connected',
  m."page_id",
  m."page_name",
  m."access_token",
  m."project_id",
  jsonb_build_object('legacyMetaPageConnectionId', m."id"),
  m."connected_by",
  m."connected_at",
  m."updated_at"
FROM "identity"."meta_page_connections" m
WHERE EXISTS (SELECT 1 FROM "identity"."marketing_platforms" p WHERE p."key" = 'meta')
ON CONFLICT ("org_id", "platform_key", "external_account_id") DO NOTHING;

-- Backfill lead platform from known sources
UPDATE "templates"."leads"
SET "platform" = 'meta',
    "first_touch_source" = COALESCE("first_touch_source", "source"),
    "last_touch_source" = COALESCE("last_touch_source", "source")
WHERE "meta_leadgen_id" IS NOT NULL AND ("platform" IS NULL OR "platform" = '');

UPDATE "templates"."leads"
SET "platform" = COALESCE("platform", 'website'),
    "first_touch_source" = COALESCE("first_touch_source", "source", 'website'),
    "last_touch_source" = COALESCE("last_touch_source", "source", 'website')
WHERE "platform" IS NULL;
