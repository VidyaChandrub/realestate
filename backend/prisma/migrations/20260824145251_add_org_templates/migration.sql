-- CreateEnum
CREATE TYPE "templates"."TemplateStatus" AS ENUM ('draft', 'published', 'scheduled', 'password', 'unpublished');

-- CreateEnum
CREATE TYPE "templates"."TemplateKind" AS ENUM ('preset', 'custom');

-- CreateEnum
CREATE TYPE "templates"."TemplatePageType" AS ENUM ('landing', 'thank_you');

-- CreateTable
CREATE TABLE "templates"."templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "templates"."TemplateStatus" NOT NULL DEFAULT 'draft',
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "thumbnail" TEXT,
    "design_id" TEXT NOT NULL,
    "base_design_name" TEXT NOT NULL,
    "category" TEXT,
    "kind" "templates"."TemplateKind" NOT NULL DEFAULT 'custom',
    "page_type" "templates"."TemplatePageType" NOT NULL DEFAULT 'landing',
    "parent_id" TEXT,
    "domain" TEXT NOT NULL DEFAULT '',
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "templates_slug_key" ON "templates"."templates"("slug");

-- AddForeignKey
ALTER TABLE "templates"."templates" ADD CONSTRAINT "templates_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "templates"."templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
