-- Migration: Restore the "Fetched Jobs" submenu under Job Scrapper
--
-- prisma/migrations/20260728000000_remove_fetched_jobs_menu removed the
-- master_data.menus row for the "Fetched Jobs" sidebar entry (route
-- '/job-scrapper/fetched-jobs', parented under "Job Scrapper" at
-- '/job-scrapper'). This migration re-inserts that same row with the same
-- values it originally had (see src/seed/menu-seed.ts / seed_menu.sql.sql):
--   label       = 'Fetched Jobs'
--   to          = '/job-scrapper/fetched-jobs'
--   icon        = 'FileText'
--   group_label = 'System'
--   parent      = "Job Scrapper" menu (looked up by route, not hardcoded)
--   is_active   = true
--   sort_order  = 2 (after Keyword Config's sort_order = 1)
--
-- It does NOT touch the Fetched Jobs page, routes, controllers, or any
-- other menu (Keyword Config and Job Scrapper are left exactly as-is).
--
-- Idempotent: if the menu row already exists (already restored, or never
-- removed in this environment), the INSERT is a no-op. If the "Job
-- Scrapper" parent menu doesn't exist in a given environment (e.g. a fresh
-- database that hasn't run the side-menu seed yet), the INSERT is also a
-- no-op rather than inserting an orphaned child.

-- ============================================================
-- UP: Restore the Fetched Jobs child menu (if not already present)
-- ============================================================
INSERT INTO master_data.menus (id, label, "to", icon, group_label, parent_id, is_active, sort_order)
WITH job_scrapper_menu AS (
  SELECT id FROM master_data.menus WHERE "to" = '/job-scrapper' LIMIT 1
)
SELECT
  gen_random_uuid(),
  'Fetched Jobs',
  '/job-scrapper/fetched-jobs',
  'FileText',
  'System',
  (SELECT id FROM job_scrapper_menu),
  true,
  2
WHERE NOT EXISTS (
  SELECT 1 FROM master_data.menus WHERE "to" = '/job-scrapper/fetched-jobs'
)
AND EXISTS (SELECT 1 FROM job_scrapper_menu);

-- ============================================================
-- UP: Restore role permissions for the Fetched Jobs menu
--
-- Rather than hardcoding a role name, this mirrors whichever roles
-- currently have permission on the sibling "Keyword Config" menu (which
-- was never removed), since both menus were originally granted to the same
-- roles in lockstep. Only missing (role, menu) pairs are inserted, and no
-- unrelated role or menu is touched.
-- ============================================================
INSERT INTO master_data.role_permissions (id, role_id, menu_id)
SELECT
  gen_random_uuid(),
  keyword_config_perm.role_id,
  fetched_jobs_menu.id
FROM master_data.role_permissions keyword_config_perm
JOIN master_data.menus keyword_config_menu
  ON keyword_config_menu.id = keyword_config_perm.menu_id
 AND keyword_config_menu."to" = '/job-scrapper/keyword-config'
CROSS JOIN (
  SELECT id FROM master_data.menus WHERE "to" = '/job-scrapper/fetched-jobs' LIMIT 1
) AS fetched_jobs_menu
WHERE NOT EXISTS (
  SELECT 1 FROM master_data.role_permissions existing
  WHERE existing.role_id = keyword_config_perm.role_id
    AND existing.menu_id = fetched_jobs_menu.id
);

-- ============================================================
-- DOWN (Rollback Instructions):
-- Remove role permissions for the Fetched Jobs menu
-- DELETE FROM master_data.role_permissions
-- WHERE menu_id IN (
--   SELECT id FROM master_data.menus WHERE "to" = '/job-scrapper/fetched-jobs'
-- );
-- Remove the Fetched Jobs menu itself
-- DELETE FROM master_data.menus WHERE "to" = '/job-scrapper/fetched-jobs';
-- ============================================================
