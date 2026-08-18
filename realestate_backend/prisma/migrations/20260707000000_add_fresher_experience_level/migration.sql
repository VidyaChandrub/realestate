-- Migration: Seed "Fresher" EXPERIENCE_LEVEL master data entry
-- Idempotent: only inserts when no EXPERIENCE_LEVEL/fresher row already exists.
-- Does not modify or remove any existing master data.

INSERT INTO "master_data"."categories" (
    "id",
    "type",
    "value",
    "slug",
    "description",
    "parent_id",
    "is_active",
    "sort_order",
    "metadata",
    "status",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid(),
    'EXPERIENCE_LEVEL',
    'Fresher',
    'fresher',
    NULL,
    NULL,
    true,
    COALESCE(
        (SELECT MAX("sort_order") + 1 FROM "master_data"."categories" WHERE "type" = 'EXPERIENCE_LEVEL'),
        0
    ),
    NULL,
    'ACTIVE',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM "master_data"."categories"
    WHERE "type" = 'EXPERIENCE_LEVEL' AND "slug" = 'fresher'
);
