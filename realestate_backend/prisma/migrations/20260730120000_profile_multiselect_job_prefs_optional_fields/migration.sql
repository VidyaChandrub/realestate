-- Convert Profile.preferred_employment_type_id from a single UUID to a UUID[]
-- so job seekers can select multiple preferred employment types. Existing
-- values are preserved as single-element arrays; no data is lost.
ALTER TABLE "users"."profiles"
  ALTER COLUMN "preferred_employment_type_id" TYPE UUID[]
  USING (
    CASE
      WHEN "preferred_employment_type_id" IS NULL THEN ARRAY[]::UUID[]
      ELSE ARRAY["preferred_employment_type_id"]
    END
  );

ALTER TABLE "users"."profiles"
  ALTER COLUMN "preferred_employment_type_id" SET DEFAULT ARRAY[]::UUID[],
  ALTER COLUMN "preferred_employment_type_id" SET NOT NULL;

-- The old btree index only supported equality lookups on a scalar column;
-- replace it with a GIN index suited to array-containment lookups.
DROP INDEX IF EXISTS "users"."profiles_preferred_employment_type_id_idx";
CREATE INDEX "profiles_preferred_employment_type_id_idx" ON "users"."profiles" USING GIN ("preferred_employment_type_id");

-- Convert Profile.preferred_work_mode from a single enum value to an enum[]
-- so job seekers can select multiple preferred work modes. Existing values
-- are preserved as single-element arrays; no data is lost.
ALTER TABLE "users"."profiles"
  ALTER COLUMN "preferred_work_mode" TYPE "users"."PreferredWorkMode"[]
  USING (
    CASE
      WHEN "preferred_work_mode" IS NULL THEN ARRAY[]::"users"."PreferredWorkMode"[]
      ELSE ARRAY["preferred_work_mode"]
    END
  );

ALTER TABLE "users"."profiles"
  ALTER COLUMN "preferred_work_mode" SET DEFAULT ARRAY[]::"users"."PreferredWorkMode"[],
  ALTER COLUMN "preferred_work_mode" SET NOT NULL;

-- Education: university name and year of passing are now optional fields.
-- Relaxing NOT NULL is non-destructive and preserves all existing rows.
ALTER TABLE "users"."education_details"
  ALTER COLUMN "university_name" DROP NOT NULL,
  ALTER COLUMN "year_of_passing" DROP NOT NULL;

-- Professional experience: only job_title stays required; company name,
-- employment status, and years/months of experience become optional so
-- partial experience entries can be saved. Non-destructive relaxation.
ALTER TABLE "users"."professional_experiences"
  ALTER COLUMN "company_name" DROP NOT NULL,
  ALTER COLUMN "years_of_experience" DROP NOT NULL,
  ALTER COLUMN "months_of_experience" DROP NOT NULL,
  ALTER COLUMN "employment_status" DROP NOT NULL;
