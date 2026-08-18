-- Migration: add_custom_specialization
-- Adds the custom_specialization column to users.education_details.
-- Existing rows are untouched (column is nullable, defaults to NULL).

ALTER TABLE "users"."education_details"
  ADD COLUMN IF NOT EXISTS "custom_specialization" VARCHAR(255);
