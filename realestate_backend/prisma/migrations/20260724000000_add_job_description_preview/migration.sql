-- Add nullable description_preview column to jobs.jobs. This holds a short,
-- pre-sanitized preview of the job description for the Job Card, kept
-- separate from the rich HTML `description` used on the View Details page.
ALTER TABLE "jobs"."jobs" ADD COLUMN "description_preview" TEXT;
