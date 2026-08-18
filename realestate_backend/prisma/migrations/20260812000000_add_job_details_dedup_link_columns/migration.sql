-- Job-dedup feature: flags a scraper.job_details row as a repost/duplicate of another
-- (is_duplicate/superseded_by), and links a jobs.jobs row back to the job_details row it
-- was synced from (job_details_id) so a retroactively-flagged duplicate's already-live
-- jobs.jobs row can be found and closed. This is the single source of truth for this
-- schema — job-scrappers no longer carries its own SQL migrations for it.

-- AlterTable: scraper.job_details
ALTER TABLE "scraper"."job_details"
  ADD COLUMN IF NOT EXISTS "is_duplicate" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "superseded_by" INTEGER;

-- AlterTable: jobs.jobs
ALTER TABLE "jobs"."jobs"
  ADD COLUMN IF NOT EXISTS "job_details_id" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "job_details_is_duplicate_idx" ON "scraper"."job_details"("is_duplicate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_job_details_match_fields" ON "scraper"."job_details"("company", "job_title", "country", "state", "city", "experience_level");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_jobs_job_details_id" ON "jobs"."jobs"("job_details_id");

-- AddForeignKey (self-relation: superseded_by -> job_details.id)
DO $$
BEGIN
  BEGIN
    ALTER TABLE "scraper"."job_details"
      ADD CONSTRAINT "job_details_superseded_by_fkey"
      FOREIGN KEY ("superseded_by") REFERENCES "scraper"."job_details"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- AddForeignKey (jobs.jobs.job_details_id -> scraper.job_details.id)
DO $$
BEGIN
  BEGIN
    ALTER TABLE "jobs"."jobs"
      ADD CONSTRAINT "jobs_job_details_id_fkey"
      FOREIGN KEY ("job_details_id") REFERENCES "scraper"."job_details"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
