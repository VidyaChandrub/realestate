-- DropForeignKey
ALTER TABLE "templates"."organisation_templates" DROP CONSTRAINT "organisation_templates_org_id_fkey";

-- DropForeignKey
ALTER TABLE "templates"."organisation_templates" DROP CONSTRAINT "organisation_templates_template_id_fkey";

-- DropForeignKey
ALTER TABLE "templates"."team_template_access" DROP CONSTRAINT "team_template_access_team_id_fkey";

-- DropForeignKey
ALTER TABLE "templates"."team_template_access" DROP CONSTRAINT "team_template_access_template_id_fkey";

-- DropTable
DROP TABLE "templates"."organisation_templates";

-- DropTable
DROP TABLE "templates"."team_template_access";

-- DropTable
DROP TABLE "templates"."templates";

-- DropEnum
DROP TYPE "templates"."PaymentStatus";

-- DropEnum
DROP TYPE "templates"."PricingModel";

-- DropEnum
DROP TYPE "templates"."TemplateStatus";

-- DropEnum
DROP TYPE "templates"."TemplateType";

-- CreateTable
CREATE TABLE "templates"."organisation_landing_page_templates" (
    "org_id" TEXT NOT NULL,
    "landing_page_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisation_landing_page_templates_pkey" PRIMARY KEY ("org_id","landing_page_id")
);

-- AddForeignKey
ALTER TABLE "templates"."organisation_landing_page_templates" ADD CONSTRAINT "organisation_landing_page_templates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates"."organisation_landing_page_templates" ADD CONSTRAINT "organisation_landing_page_templates_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "templates"."landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
