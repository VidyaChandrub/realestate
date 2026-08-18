-- Migration: Remove the "Fetched Jobs" submenu from the Job Scrapper sidebar navigation
--
-- The Fetched Jobs page is no longer opened from the sidebar. It is now opened
-- by clicking the "Fetched Jobs" count on the Keyword Config page instead.
-- This migration ONLY removes the sidebar menu entry (the master_data.menus
-- row). It does NOT touch the Fetched Jobs page, its route, any application
-- code, or the Prisma schema.
--
-- Identifying the target row:
-- master_data.menus.id is a UUID generated at insert time (Prisma
-- `@default(uuid())`), so there is no literal 'menu-fetched-jobs' string
-- stored as a primary key -- that id is a conceptual/business name, not a
-- literal column value, and it differs per environment. To delete "by primary
-- key" as required, the target row's actual UUID primary key is first
-- resolved via its stable, unique attributes (its route, scoped to its
-- Job Scrapper parent) and then deleted via a WHERE id = <resolved-id>
-- clause, rather than deleting directly on a bare route filter.
--
-- Foreign keys / dependent data:
-- master_data.role_permissions.menu_id has ON DELETE CASCADE
-- (role_permissions_menu_id_fkey, see prisma/migrations/0_init/migration.sql),
-- so deleting the menu row automatically removes only the role_permissions
-- rows that reference it. No explicit cleanup step is required, and no other
-- menu or role_permissions rows are affected.
--
-- Idempotent: if the menu has already been removed (or never existed) in a
-- given environment, the subquery resolves to NULL and the DELETE matches
-- zero rows instead of erroring.

DELETE FROM master_data.menus
WHERE id = (
  SELECT child.id
  FROM master_data.menus child
  JOIN master_data.menus parent ON parent.id = child.parent_id
  WHERE child."to" = '/job-scrapper/fetched-jobs'
    AND child.label = 'Fetched Jobs'
    AND parent."to" = '/job-scrapper'
  LIMIT 1
);
