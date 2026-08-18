-- Add nullable education/specialization columns and a created_at timestamp
-- to scraper.job_configurations so the job scraper keyword configuration UI
-- can capture education/specialization and display the configuration's
-- creation date.
ALTER TABLE "scraper"."job_configurations"
  ADD COLUMN "education" TEXT,
  ADD COLUMN "specialization" TEXT,
  ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
