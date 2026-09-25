-- New button-level pills for Projects, Support & Help and Settings, stored in
-- spare action columns (see PROJECT_UNIT_ACTIONS / SUPPORT_ACTIONS /
-- SETTINGS_ACTIONS in permissions.util.ts). Every existing grant is carried
-- over from the column that used to gate the same routes, so nobody loses
-- access. Lead Forms and Roles & Permissions need no data changes.

-- Projects: unit routes were gated by add / edit / delete.
--   can_approve    = Add unit     <- can_add
--   can_activate   = Edit unit    <- can_edit
--   can_deactivate = Delete unit  <- can_delete
UPDATE "access"."role_module_permissions"
SET "can_approve" = "can_add", "can_activate" = "can_edit", "can_deactivate" = "can_delete"
WHERE "module_key" = 'projects';

UPDATE "access"."user_module_permissions"
SET "can_approve" = "can_add", "can_activate" = "can_edit", "can_deactivate" = "can_delete"
WHERE "module_key" = 'projects';

-- Support: replies were gated by add.
--   can_edit = Reply <- can_add
UPDATE "access"."role_module_permissions"
SET "can_edit" = "can_add"
WHERE "module_key" = 'support';

UPDATE "access"."user_module_permissions"
SET "can_edit" = "can_add"
WHERE "module_key" = 'support';

-- Settings: Email & SMTP was gated by edit; pipeline stage names were
-- org-admin only, so no member role had it (the Admin role keeps it wherever
-- it could edit settings).
--   can_approve  = Edit email & SMTP <- can_edit
--   can_activate = Edit pipeline     <- can_edit for the Admin role, else false
--                                       (NULL for per-user overrides)
UPDATE "access"."role_module_permissions" AS rmp
SET "can_approve" = rmp."can_edit",
    "can_activate" = CASE WHEN r."key" = 'admin' THEN rmp."can_edit" ELSE false END
FROM "identity"."roles" AS r
WHERE rmp."role_id" = r."id"
  AND rmp."module_key" = 'settings';

UPDATE "access"."user_module_permissions"
SET "can_approve" = "can_edit", "can_activate" = NULL
WHERE "module_key" = 'settings';
