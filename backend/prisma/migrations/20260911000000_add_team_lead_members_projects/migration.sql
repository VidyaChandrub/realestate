-- Team create/edit + members + project assignment. Additive only.
--   * TeamModuleAccess (team_module_access) is untouched — confirmed unused
--     anywhere in the codebase.
--   * TeamMember.role is a brand-new enum with zero relation to the org-wide
--     Role/RBAC system (RoleModulePermission/UserModulePermission). The
--     value 'telecaller' exists independently in both enums by coincidence
--     only — never map or compare across them.
--   * teams currently has zero rows in every environment, so no backfill is
--     needed for the new NOT NULL columns below.

-- CreateEnum
CREATE TYPE "access"."TeamMemberRole" AS ENUM ('team_lead', 'sr_agent', 'sales_agent', 'telecaller', 'viewer');

-- AlterTable: teams — team lead FK (mirrors projects.manager_id exactly),
-- plus the plain display fields. updated_at has no DB default, same as
-- every other @updatedAt column in this schema — Prisma Client supplies it
-- on every write, including the initial create.
ALTER TABLE "access"."teams"
  ADD COLUMN "team_lead_id" TEXT,
  ADD COLUMN "region" TEXT,
  ADD COLUMN "working_hours" TEXT,
  ADD COLUMN "description" TEXT DEFAULT '',
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable: team_members — per-member seniority label + join timestamp.
ALTER TABLE "access"."team_members"
  ADD COLUMN "role" "access"."TeamMemberRole" NOT NULL DEFAULT 'sales_agent',
  ADD COLUMN "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable: team_projects — a team's assigned projects, replaced
-- wholesale on write. Mirrors project_sales_agents' shape and cascade
-- behaviour exactly.
CREATE TABLE "access"."team_projects" (
    "team_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_projects_pkey" PRIMARY KEY ("team_id","project_id")
);

-- CreateIndex
CREATE INDEX "teams_org_id_idx" ON "access"."teams"("org_id");
CREATE INDEX "teams_team_lead_id_idx" ON "access"."teams"("team_lead_id");
CREATE INDEX "team_projects_project_id_idx" ON "access"."team_projects"("project_id");

-- AddForeignKey
ALTER TABLE "access"."teams" ADD CONSTRAINT "teams_team_lead_id_fkey" FOREIGN KEY ("team_lead_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "access"."team_projects" ADD CONSTRAINT "team_projects_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "access"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access"."team_projects" ADD CONSTRAINT "team_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
