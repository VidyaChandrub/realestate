-- Migration: Add Reports menu and Others Specializations submenu
-- Uses dynamic UUID lookups instead of hardcoded IDs
-- Fully compatible with Prisma schema: UUIDs for all IDs, uq_role_menu unique constraint

-- ============================================================
-- UP: Add Reports parent menu (if not exists by route)
-- ============================================================
INSERT INTO master_data.menus (id, label, "to", icon, group_label, parent_id, is_active, sort_order)
SELECT 
  gen_random_uuid(),
  'Reports',
  '/reports',
  'FileText',
  'Reports',
  NULL,
  true,
  99
WHERE NOT EXISTS (
  SELECT 1 FROM master_data.menus WHERE "to" = '/reports'
);

-- ============================================================
-- UP: Add Others Specializations child menu (if not exists by route)
-- Establishes parent-child relationship using actual Reports menu UUID
-- ============================================================
INSERT INTO master_data.menus (id, label, "to", icon, group_label, parent_id, is_active, sort_order)
WITH reports_menu AS (
  SELECT id FROM master_data.menus WHERE "to" = '/reports' LIMIT 1
)
SELECT 
  gen_random_uuid(),
  'Others Specializations',
  '/reports/others-specializations',
  'FileText',
  'Reports',
  (SELECT id FROM reports_menu),
  true,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM master_data.menus WHERE "to" = '/reports/others-specializations'
)
AND EXISTS (SELECT 1 FROM reports_menu);

-- ============================================================
-- UP: Grant Others Specializations permission to ADMIN role
-- Uses NOT EXISTS on (roleId, menuId) to respect unique constraint
-- ============================================================
INSERT INTO master_data.role_permissions (id, role_id, menu_id)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM master_data.roles WHERE name = 'ADMIN'),
  (SELECT id FROM master_data.menus WHERE "to" = '/reports/others-specializations')
WHERE NOT EXISTS (
  SELECT 1 FROM master_data.role_permissions 
  WHERE role_id = (SELECT id FROM master_data.roles WHERE name = 'ADMIN')
  AND menu_id = (SELECT id FROM master_data.menus WHERE "to" = '/reports/others-specializations')
)
AND EXISTS (SELECT 1 FROM master_data.roles WHERE name = 'ADMIN')
AND EXISTS (SELECT 1 FROM master_data.menus WHERE "to" = '/reports/others-specializations');

-- ============================================================
-- DOWN (Rollback Instructions):
-- Safe removal of Reports menu structure
-- Remove role permissions for Others Specializations menu
-- DELETE FROM master_data.role_permissions 
-- WHERE menu_id IN (
--   SELECT id FROM master_data.menus 
--   WHERE "to" = '/reports/others-specializations'
-- );
-- Remove menus (child first, then parent)
-- DELETE FROM master_data.menus WHERE "to" = '/reports/others-specializations';
-- DELETE FROM master_data.menus WHERE "to" = '/reports';
-- ============================================================
