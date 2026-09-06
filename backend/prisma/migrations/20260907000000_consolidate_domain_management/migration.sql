-- Consolidate domain management to a single org-level system.
--
-- Retires the per-landing-page "Page Domains" stack (DomainRequest +
-- DnsVerificationLog + their enums and the per-page subdomain columns on
-- landing_pages). The surviving system is the org-level domain identity:
--   Organisation.subdomain / subdomainStatus  (auto-assigned login URL)
--   Organisation.customDomain / customDomainStatus (primary custom domain)
--   Organisation.customDomainLandingPageId   (landing page the custom domain serves)
--   OrgDomainRequest.landingPageId           (which page a custom-domain request targets)

-- 1) Drop the retired per-page domain tables (CASCADE clears the FK that
--    dns_verification_logs holds onto domain_requests).
DROP TABLE IF EXISTS "templates"."dns_verification_logs" CASCADE;
DROP TABLE IF EXISTS "templates"."domain_requests" CASCADE;

-- 2) Drop the retired enums.
DROP TYPE IF EXISTS "templates"."SslStatus";
DROP TYPE IF EXISTS "templates"."DomainRequestStatus";
DROP TYPE IF EXISTS "templates"."DnsStatus";

-- 3) Remove per-landing-page subdomain columns (unique index first).
DROP INDEX IF EXISTS "templates"."landing_pages_subdomain_key";
ALTER TABLE "templates"."landing_pages" DROP COLUMN IF EXISTS "subdomain_status";
ALTER TABLE "templates"."landing_pages" DROP COLUMN IF EXISTS "subdomain";

-- 4) Organisation: which landing page its custom domain serves.
ALTER TABLE "identity"."organisations"
  ADD COLUMN IF NOT EXISTS "custom_domain_landing_page_id" TEXT;

ALTER TABLE "identity"."organisations"
  ADD CONSTRAINT "organisations_custom_domain_landing_page_id_fkey"
  FOREIGN KEY ("custom_domain_landing_page_id")
  REFERENCES "templates"."landing_pages" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 5) OrgDomainRequest: which landing page a custom-domain request maps to.
ALTER TABLE "templates"."org_domain_requests"
  ADD COLUMN IF NOT EXISTS "landing_page_id" TEXT;

ALTER TABLE "templates"."org_domain_requests"
  ADD CONSTRAINT "org_domain_requests_landing_page_id_fkey"
  FOREIGN KEY ("landing_page_id")
  REFERENCES "templates"."landing_pages" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 6) Land the current custom-domain mapping: point existing connected custom
--    domains at the org's most recently published landing page (mirrors what
--    the public-site resolver already does at request time).
UPDATE "identity"."organisations" org
SET "custom_domain_landing_page_id" = (
  SELECT lp."id" FROM "templates"."landing_pages" lp
  WHERE lp."org_id" = org."id"
    AND lp."status" = 'published'
  ORDER BY lp."updated_at" DESC
  LIMIT 1
)
WHERE org."custom_domain" IS NOT NULL
  AND org."custom_domain_status" = 'connected'
  AND org."custom_domain_landing_page_id" IS NULL;