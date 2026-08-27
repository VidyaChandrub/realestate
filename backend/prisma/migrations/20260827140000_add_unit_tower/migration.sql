-- Explicit, optional tower on a unit — replaces parsing it out of unitNo.
-- No backfill: no production data; existing test units stay tower = NULL.

-- AlterTable
ALTER TABLE "projects"."units" ADD COLUMN "tower" TEXT;
