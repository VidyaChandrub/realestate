-- Org-managed custom catalogs for the project onboarding wizard: one generic
-- table keyed by `category` (project_type | unit_type | connectivity | amenity).

-- CreateEnum
CREATE TYPE "projects"."OrgCatalogCategory" AS ENUM ('project_type', 'unit_type', 'connectivity', 'amenity');

-- CreateTable
CREATE TABLE "projects"."org_catalog_options" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "category" "projects"."OrgCatalogCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_catalog_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "org_catalog_options_org_id_category_idx" ON "projects"."org_catalog_options"("org_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "org_catalog_options_org_id_category_label_key" ON "projects"."org_catalog_options"("org_id", "category", "label");

-- AddForeignKey
ALTER TABLE "projects"."org_catalog_options" ADD CONSTRAINT "org_catalog_options_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
