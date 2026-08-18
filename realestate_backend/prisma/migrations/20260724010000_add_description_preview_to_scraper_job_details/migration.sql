-- Add nullable description_preview column to scraper.job_details. This is
-- written by the scraper's import pipeline (a separate service) as a short
-- preview of the scraped `description`, and is carried through to
-- jobs.jobs.description_preview when a job detail is published/imported
-- into Core Service.
ALTER TABLE "scraper"."job_details" ADD COLUMN "description_preview" TEXT;
