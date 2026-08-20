-- CreateEnum
CREATE TYPE "templates"."LandingPageCategory" AS ENUM ('property_project', 'residential', 'luxury', 'commercial', 'apartments', 'villas', 'plots', 'campaign');

-- CreateEnum
CREATE TYPE "templates"."LandingPageStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "templates"."landing_pages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" "templates"."LandingPageCategory" NOT NULL DEFAULT 'campaign',
    "thumbnail" TEXT,
    "status" "templates"."LandingPageStatus" NOT NULL DEFAULT 'draft',
    "document" JSONB NOT NULL DEFAULT '{}',
    "seo" JSONB,
    "tracking" JSONB,
    "domain" JSONB,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates"."landing_section_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "thumbnail" TEXT,
    "document" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "landing_section_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates"."landing_leads" (
    "id" TEXT NOT NULL,
    "landing_page_id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "budget" TEXT,
    "property_type" TEXT,
    "message" TEXT,
    "intent" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "landing_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "landing_pages_slug_key" ON "templates"."landing_pages"("slug");

-- AddForeignKey
ALTER TABLE "templates"."landing_leads" ADD CONSTRAINT "landing_leads_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "templates"."landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
