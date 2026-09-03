-- Org page/action permission configuration (piece of the RBAC build):
--   1. role_module_permissions becomes org-scoped (per-org role config) and
--      gains a can_approve action.
--   2. new user_module_permissions table holds per-user overrides so an org
--      admin can grant a specific member / sales agent different access than
--      their role grants by default.
--
-- The table was never written to by any code (global, unused), so dropping
-- and recreating it with the new shape is safe.

-- DropTable
DROP TABLE "access"."role_module_permissions";

-- CreateTable
CREATE TABLE "access"."role_module_permissions" (
    "org_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_add" BOOLEAN NOT NULL DEFAULT false,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_approve" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "role_module_permissions_pkey" PRIMARY KEY ("org_id","role_id","module_key")
);

-- CreateIndex
CREATE INDEX "role_module_permissions_org_id_role_id_idx" ON "access"."role_module_permissions"("org_id", "role_id");

-- AddForeignKey
ALTER TABLE "access"."role_module_permissions" ADD CONSTRAINT "role_module_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "identity"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "access"."user_module_permissions" (
    "org_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "can_view" BOOLEAN,
    "can_add" BOOLEAN,
    "can_edit" BOOLEAN,
    "can_delete" BOOLEAN,
    "can_approve" BOOLEAN,

    CONSTRAINT "user_module_permissions_pkey" PRIMARY KEY ("org_id","user_id","module_key")
);

-- CreateIndex
CREATE INDEX "user_module_permissions_org_id_user_id_idx" ON "access"."user_module_permissions"("org_id", "user_id");

-- AddForeignKey
ALTER TABLE "access"."user_module_permissions" ADD CONSTRAINT "user_module_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
