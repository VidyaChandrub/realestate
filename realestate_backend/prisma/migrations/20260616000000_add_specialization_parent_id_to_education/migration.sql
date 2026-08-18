ALTER TABLE "users"."education_details"
ADD COLUMN IF NOT EXISTS "specialization_parent_id" uuid NULL;
