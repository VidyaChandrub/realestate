-- Add projectId to Lead (templates.leads -> projects.projects)
ALTER TABLE "templates"."leads" ADD COLUMN "project_id" TEXT;
CREATE INDEX "leads_project_id_idx" ON "templates"."leads"("project_id");
ALTER TABLE "templates"."leads" ADD CONSTRAINT "leads_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
