-- Facebook Lead Ads attribution columns + platform labels + Meta page connections

ALTER TABLE "templates"."leads"
  ADD COLUMN IF NOT EXISTS "medium" TEXT,
  ADD COLUMN IF NOT EXISTS "campaign_id" TEXT,
  ADD COLUMN IF NOT EXISTS "ad_set" TEXT,
  ADD COLUMN IF NOT EXISTS "ad_set_id" TEXT,
  ADD COLUMN IF NOT EXISTS "ad" TEXT,
  ADD COLUMN IF NOT EXISTS "ad_id" TEXT,
  ADD COLUMN IF NOT EXISTS "utm_term" TEXT,
  ADD COLUMN IF NOT EXISTS "utm_content" TEXT,
  ADD COLUMN IF NOT EXISTS "landing_page_url" TEXT,
  ADD COLUMN IF NOT EXISTS "fbclid" TEXT,
  ADD COLUMN IF NOT EXISTS "gclid" TEXT,
  ADD COLUMN IF NOT EXISTS "meta_leadgen_id" TEXT,
  ADD COLUMN IF NOT EXISTS "meta_form_id" TEXT,
  ADD COLUMN IF NOT EXISTS "meta_page_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "leads_meta_leadgen_id_key"
  ON "templates"."leads"("meta_leadgen_id");

CREATE INDEX IF NOT EXISTS "leads_utm_source_idx"
  ON "templates"."leads"("utm_source");

CREATE INDEX IF NOT EXISTS "leads_campaign_id_idx"
  ON "templates"."leads"("campaign_id");

CREATE TABLE IF NOT EXISTS "identity"."platform_attribution_labels" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_attribution_labels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_attribution_labels_key_key"
  ON "identity"."platform_attribution_labels"("key");

CREATE INDEX IF NOT EXISTS "platform_attribution_labels_enabled_idx"
  ON "identity"."platform_attribution_labels"("enabled");

CREATE TABLE IF NOT EXISTS "identity"."meta_page_connections" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "page_id" TEXT NOT NULL,
  "page_name" TEXT NOT NULL,
  "access_token" TEXT NOT NULL,
  "project_id" TEXT,
  "connected_by" TEXT,
  "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meta_page_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "meta_page_connections_org_id_page_id_key"
  ON "identity"."meta_page_connections"("org_id", "page_id");

CREATE INDEX IF NOT EXISTS "meta_page_connections_page_id_idx"
  ON "identity"."meta_page_connections"("page_id");

CREATE INDEX IF NOT EXISTS "meta_page_connections_org_id_idx"
  ON "identity"."meta_page_connections"("org_id");

ALTER TABLE "identity"."meta_page_connections"
  DROP CONSTRAINT IF EXISTS "meta_page_connections_org_id_fkey";
ALTER TABLE "identity"."meta_page_connections"
  ADD CONSTRAINT "meta_page_connections_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identity"."meta_page_connections"
  DROP CONSTRAINT IF EXISTS "meta_page_connections_project_id_fkey";
ALTER TABLE "identity"."meta_page_connections"
  ADD CONSTRAINT "meta_page_connections_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default Organisation Labels (attribution fields). ON CONFLICT keeps
-- Super Admin enable/disable and custom display names across re-runs.
INSERT INTO "identity"."platform_attribution_labels" ("id", "key", "label", "sort_order", "enabled", "created_at", "updated_at")
VALUES
  (gen_random_uuid()::text, 'source', 'Source', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'medium', 'Medium', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'campaign', 'Campaign', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'campaign_id', 'Campaign ID', 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ad_set', 'Ad Set', 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ad', 'Ad', 60, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'utm_source', 'UTM Source', 70, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'utm_medium', 'UTM Medium', 80, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'utm_campaign', 'UTM Campaign', 90, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'utm_term', 'UTM Term', 100, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'utm_content', 'UTM Content', 110, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'landing_page_url', 'Landing Page URL', 120, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'fbclid', 'Facebook Click ID', 130, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'gclid', 'Google Click ID', 140, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
