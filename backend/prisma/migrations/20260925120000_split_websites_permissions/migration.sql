-- Split the old "websites" permission module into "landing_pages" and
-- "templates" (websites now only covers the Media Library). Every existing
-- grant is carried over so nobody loses access:
--   landing_pages: view/add/edit/delete as before; Publish (can_activate) and
--                  Pause / Unpublish (can_deactivate) were gated by edit.
--   templates:     view as before; Add Template from Plan (can_add) and
--                  Remove (can_delete) were gated by edit.
-- ON CONFLICT DO NOTHING keeps any row already saved for the new modules.

INSERT INTO "access"."role_module_permissions" (
  "org_id", "role_id", "module_key",
  "can_view", "can_add", "can_edit", "can_delete", "can_approve", "can_activate", "can_deactivate"
)
SELECT "org_id", "role_id", 'landing_pages',
  "can_view", "can_add", "can_edit", "can_delete", false, "can_edit", "can_edit"
FROM "access"."role_module_permissions"
WHERE "module_key" = 'websites'
ON CONFLICT ("org_id", "role_id", "module_key") DO NOTHING;

INSERT INTO "access"."role_module_permissions" (
  "org_id", "role_id", "module_key",
  "can_view", "can_add", "can_edit", "can_delete", "can_approve", "can_activate", "can_deactivate"
)
SELECT "org_id", "role_id", 'templates',
  "can_view", "can_edit", false, "can_edit", false, false, false
FROM "access"."role_module_permissions"
WHERE "module_key" = 'websites'
ON CONFLICT ("org_id", "role_id", "module_key") DO NOTHING;

-- Per-user overrides: NULL still means "inherit from the role"; rows with
-- nothing to carry over are skipped so those users keep inheriting.
INSERT INTO "access"."user_module_permissions" (
  "org_id", "user_id", "module_key",
  "can_view", "can_add", "can_edit", "can_delete", "can_approve", "can_activate", "can_deactivate"
)
SELECT "org_id", "user_id", 'landing_pages',
  "can_view", "can_add", "can_edit", "can_delete", NULL, "can_edit", "can_edit"
FROM "access"."user_module_permissions"
WHERE "module_key" = 'websites'
  AND COALESCE("can_view", "can_add", "can_edit", "can_delete") IS NOT NULL
ON CONFLICT ("org_id", "user_id", "module_key") DO NOTHING;

INSERT INTO "access"."user_module_permissions" (
  "org_id", "user_id", "module_key",
  "can_view", "can_add", "can_edit", "can_delete", "can_approve", "can_activate", "can_deactivate"
)
SELECT "org_id", "user_id", 'templates',
  "can_view", "can_edit", NULL, "can_edit", NULL, NULL, NULL
FROM "access"."user_module_permissions"
WHERE "module_key" = 'websites'
  AND COALESCE("can_view", "can_edit") IS NOT NULL
ON CONFLICT ("org_id", "user_id", "module_key") DO NOTHING;
