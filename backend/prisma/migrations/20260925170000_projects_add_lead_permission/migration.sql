-- Projects > Add lead: its own pill for the project pages' "Add lead" button,
-- stored in a new can_add_lead column. That button used to need
-- Leads / CRM > Add, so each saved Projects row inherits the same role's CRM
-- "Add" grant (falling back to the built-in default when no CRM row exists:
-- admin / manager / sales / telecaller could add leads, custom roles could not).
ALTER TABLE "access"."role_module_permissions"
  ADD COLUMN IF NOT EXISTS "can_add_lead" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "access"."user_module_permissions"
  ADD COLUMN IF NOT EXISTS "can_add_lead" BOOLEAN;

UPDATE "access"."role_module_permissions" AS p
SET "can_add_lead" = COALESCE(
  (
    SELECT c."can_add"
    FROM "access"."role_module_permissions" AS c
    WHERE c."org_id" = p."org_id"
      AND c."role_id" = p."role_id"
      AND c."module_key" = 'crm'
  ),
  -- the org's own CRM row may not exist; then Super Admin's default applies
  (
    SELECT c."can_add"
    FROM "access"."role_module_permissions" AS c
    WHERE c."org_id" = 'system'
      AND c."role_id" = p."role_id"
      AND c."module_key" = 'crm'
  ),
  r."key" IN ('admin', 'manager', 'sales', 'telecaller')
)
FROM "identity"."roles" AS r
WHERE p."role_id" = r."id"
  AND p."module_key" = 'projects';

-- Per-user overrides: copy an explicit CRM "Add" override; NULL still inherits.
UPDATE "access"."user_module_permissions" AS p
SET "can_add_lead" = c."can_add"
FROM "access"."user_module_permissions" AS c
WHERE c."org_id" = p."org_id"
  AND c."user_id" = p."user_id"
  AND c."module_key" = 'crm'
  AND p."module_key" = 'projects';
