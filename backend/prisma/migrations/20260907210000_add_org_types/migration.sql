-- Catalog of organisation kinds. CREATE IF NOT EXISTS so local DBs that
-- already have identity.org_types (from an earlier ad-hoc seed) stay valid.
CREATE TABLE IF NOT EXISTS "identity"."org_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "org_types_slug_key" ON "identity"."org_types"("slug");

INSERT INTO "identity"."org_types" ("id", "name", "slug", "description", "sort_order", "is_active")
VALUES
  ('11111111-1111-1111-1111-111111111101', 'Developer / Builder', 'developer', 'Real-estate developers and builders launching their own projects', 0, true),
  ('11111111-1111-1111-1111-111111111102', 'Broker / Agency', 'broker', 'Brokerages and agencies managing multiple listings', 1, true),
  ('11111111-1111-1111-1111-111111111103', 'Channel Partner', 'channel_partner', 'Channel partners and referral networks', 2, true),
  ('11111111-1111-1111-1111-111111111104', 'Enterprise Sales', 'enterprise', 'Enterprise sales teams with large portfolios', 3, true)
ON CONFLICT ("slug") DO NOTHING;
