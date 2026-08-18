-- Add nullable source_name column to jobs.jobs
ALTER TABLE "jobs"."jobs" ADD COLUMN "source_name" TEXT;
