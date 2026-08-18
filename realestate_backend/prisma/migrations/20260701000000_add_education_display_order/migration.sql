-- Migration: add_education_display_order
-- Adds a display_order column to users.education_details so the application can
-- preserve the exact sequence the user entered their education records, independent
-- of PostgreSQL's physical heap order (which changes after any UPDATE via MVCC).
--
-- After this migration, display_order is the permanent source of truth for
-- education ordering.  The sync endpoint (syncImportedSpecializations) only
-- writes to specialization / custom_specialization and must never touch this column.

-- Step 1: Add the column.
-- DEFAULT 0 means existing rows receive 0 temporarily; Step 2 corrects them.
ALTER TABLE "users"."education_details"
  ADD COLUMN IF NOT EXISTS "display_order" INTEGER NOT NULL DEFAULT 0;

-- Step 2: One-time backfill for existing rows.
-- We need a deterministic seed ordering for rows that pre-date this column.
-- yearOfPassing ASC, id ASC is chosen only here; it is NOT the business ordering
-- going forward.  From this point on, display_order is set by the application
-- whenever education records are saved (see updateProfile -> createMany).
WITH ordered AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY profile_id
      ORDER BY year_of_passing ASC, id ASC
    ) - 1) AS rn
  FROM "users"."education_details"
)
UPDATE "users"."education_details" ed
SET    "display_order" = ordered.rn
FROM   ordered
WHERE  ed.id = ordered.id;
