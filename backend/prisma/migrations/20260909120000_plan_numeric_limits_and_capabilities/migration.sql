-- Plan.limits: retype from loose string values ("3" / "All" / "—") to numeric
-- { projects, users, templates }, each `number | null` (null = unlimited).
-- Plan.capabilities: new JSON column, `{ <catalogKey>: boolean }`, default {}.
--
-- Column TYPE is unchanged (both were / are JSONB) — this migration only adds
-- the new column and rewrites the shape of existing `limits` data.

-- AddColumn
ALTER TABLE "billing"."plans"
  ADD COLUMN "capabilities" JSONB NOT NULL DEFAULT '{}';

-- Backfill: convert string limits to integers; anything not a plain
-- non-negative integer ("All", "Unlimited", "—", "", unparseable, or a
-- missing key) becomes JSON null, matching the old parser's Infinity result.
-- Capabilities are intentionally left as the {} default — not inferred from
-- the free-text `features` array.
UPDATE "billing"."plans"
SET "limits" = jsonb_build_object(
  'projects',
    CASE WHEN ("limits" ->> 'projects') ~ '^[0-9]+$'
         THEN (("limits" ->> 'projects')::int) ELSE NULL END,
  'users',
    CASE WHEN ("limits" ->> 'users') ~ '^[0-9]+$'
         THEN (("limits" ->> 'users')::int) ELSE NULL END,
  'templates',
    CASE WHEN ("limits" ->> 'templates') ~ '^[0-9]+$'
         THEN (("limits" ->> 'templates')::int) ELSE NULL END
)
WHERE "limits" IS NOT NULL;
