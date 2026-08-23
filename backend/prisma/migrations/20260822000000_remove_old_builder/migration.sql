-- DropForeignKey
ALTER TABLE "templates"."organisation_landing_page_templates" DROP CONSTRAINT "organisation_landing_page_templates_org_id_fkey";

-- DropForeignKey
ALTER TABLE "templates"."organisation_landing_page_templates" DROP CONSTRAINT "organisation_landing_page_templates_landing_page_id_fkey";

-- DropForeignKey
ALTER TABLE "templates"."landing_leads" DROP CONSTRAINT "landing_leads_landing_page_id_fkey";

-- DropTable
DROP TABLE "templates"."landing_pages";

-- DropTable
DROP TABLE "templates"."organisation_landing_page_templates";

-- DropTable
DROP TABLE "templates"."landing_section_templates";

-- DropTable
DROP TABLE "templates"."landing_leads";

-- DropEnum
DROP TYPE "templates"."LandingPageCategory";

-- DropEnum
DROP TYPE "templates"."LandingPageStatus";

