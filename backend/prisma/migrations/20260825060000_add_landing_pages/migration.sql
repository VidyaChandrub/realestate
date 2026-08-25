-- CreateEnum
CREATE TYPE "templates"."LandingPageStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'published', 'unpublished');

-- CreateTable
CREATE TABLE "templates"."landing_pages" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "team_id" TEXT,
    "source_template_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "templates"."LandingPageStatus" NOT NULL DEFAULT 'draft',
    "content" JSONB NOT NULL,
    "thumbnail" TEXT,
    "page_type" "templates"."TemplatePageType" NOT NULL DEFAULT 'landing',
    "parent_id" TEXT,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "rejection_reason" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "landing_pages_org_id_idx" ON "templates"."landing_pages"("org_id");

-- CreateIndex
CREATE INDEX "landing_pages_status_idx" ON "templates"."landing_pages"("status");

-- CreateIndex
CREATE UNIQUE INDEX "landing_pages_org_id_slug_key" ON "templates"."landing_pages"("org_id", "slug");

-- AddForeignKey
ALTER TABLE "templates"."landing_pages" ADD CONSTRAINT "landing_pages_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates"."landing_pages" ADD CONSTRAINT "landing_pages_source_template_id_fkey" FOREIGN KEY ("source_template_id") REFERENCES "templates"."templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates"."landing_pages" ADD CONSTRAINT "landing_pages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "templates"."landing_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
