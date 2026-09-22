-- Consolidate the three legacy subscription permission rows into one module.
-- OR semantics preserve every permission already granted to a platform role.
INSERT INTO "access"."role_module_permissions" (
  "org_id", "role_id", "module_key", "can_view", "can_add", "can_edit", "can_delete", "can_approve"
)
SELECT
  "org_id",
  "role_id",
  'admin_subscriptions',
  BOOL_OR("can_view"),
  BOOL_OR("can_add"),
  BOOL_OR("can_edit"),
  BOOL_OR("can_delete"),
  BOOL_OR("can_approve")
FROM "access"."role_module_permissions"
WHERE "org_id" = 'system'
  AND "module_key" IN (
    'admin_subscription_plans',
    'admin_org_subscriptions',
    'admin_package_change_requests'
  )
GROUP BY "org_id", "role_id"
ON CONFLICT ("org_id", "role_id", "module_key") DO UPDATE SET
  "can_view" = "access"."role_module_permissions"."can_view" OR EXCLUDED."can_view",
  "can_add" = "access"."role_module_permissions"."can_add" OR EXCLUDED."can_add",
  "can_edit" = "access"."role_module_permissions"."can_edit" OR EXCLUDED."can_edit",
  "can_delete" = "access"."role_module_permissions"."can_delete" OR EXCLUDED."can_delete",
  "can_approve" = "access"."role_module_permissions"."can_approve" OR EXCLUDED."can_approve";

DELETE FROM "access"."role_module_permissions"
WHERE "org_id" = 'system'
  AND "module_key" IN (
    'admin_subscription_plans',
    'admin_org_subscriptions',
    'admin_package_change_requests'
  );
