-- Add nullable company_logo column to scraper.job_details so the LinkedIn
-- company logo captured by the scraper can be persisted alongside the rest
-- of the scraped job detail fields.
ALTER TABLE "scraper"."job_details" ADD COLUMN "company_logo" TEXT;

-- Add nullable company_logo column to jobs.jobs so imported jobs retain the
-- company logo after the scraper job is published/embedded.
ALTER TABLE "jobs"."jobs" ADD COLUMN "company_logo" TEXT;
