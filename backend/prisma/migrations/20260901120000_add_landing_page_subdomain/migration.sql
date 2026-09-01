-- AlterTable
ALTER TABLE "templates"."landing_pages" ADD COLUMN     "subdomain" TEXT,
ADD COLUMN     "subdomain_status" TEXT NOT NULL DEFAULT 'none';

-- AlterTable
ALTER TABLE "templates"."leads" ALTER COLUMN "source" SET DEFAULT 'website';

-- CreateIndex
CREATE UNIQUE INDEX "landing_pages_subdomain_key" ON "templates"."landing_pages"("subdomain");