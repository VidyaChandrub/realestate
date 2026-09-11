-- Unit-level manager, mirroring Project.managerId. Mainly used by standalone
-- units, which have no project to inherit an access scope from. Nullable;
-- ON DELETE SET NULL keeps the unit when the manager is removed.
ALTER TABLE "projects"."units"
  ADD COLUMN "manager_id" TEXT;

ALTER TABLE "projects"."units"
  ADD CONSTRAINT "units_manager_id_fkey" FOREIGN KEY ("manager_id")
    REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "units_manager_id_idx" ON "projects"."units"("manager_id");

-- Per-unit sales-agent assignment — the same shape as project_sales_agents,
-- one level down. A project-bound unit is worked by its project's sales
-- team; a standalone unit (no project) needs its own assignable set.
CREATE TABLE "projects"."unit_sales_agents" (
    "unit_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_sales_agents_pkey" PRIMARY KEY ("unit_id","user_id")
);

CREATE INDEX "unit_sales_agents_user_id_idx" ON "projects"."unit_sales_agents"("user_id");

ALTER TABLE "projects"."unit_sales_agents" ADD CONSTRAINT "unit_sales_agents_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "projects"."units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects"."unit_sales_agents" ADD CONSTRAINT "unit_sales_agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
