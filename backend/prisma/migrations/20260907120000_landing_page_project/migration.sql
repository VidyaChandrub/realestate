-- Link an org landing page to a project so create-from-project can fill content.
ALTER TABLE "templates"."landing_pages"
  ADD COLUMN IF NOT EXISTS "project_id" TEXT;

CREATE INDEX IF NOT EXISTS "landing_pages_project_id_idx"
  ON "templates"."landing_pages" ("project_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'landing_pages_project_id_fkey'
  ) THEN
    ALTER TABLE "templates"."landing_pages"
      ADD CONSTRAINT "landing_pages_project_id_fkey"
      FOREIGN KEY ("project_id")
      REFERENCES "projects"."projects" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
