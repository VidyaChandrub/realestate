-- `lead_tag` catalog category — the org-managed list behind the lead edit
-- page's Tags multi-select, managed from Settings → CRM & Leads. No seeding,
-- consistent with every other catalog category.
-- (PostgreSQL 12+ allows ALTER TYPE ... ADD VALUE inside a transaction as long
-- as the new value isn't referenced in the same transaction — it isn't here.)
ALTER TYPE "projects"."OrgCatalogCategory" ADD VALUE 'lead_tag';
