/*
  Warnings:

  - The primary key for the `specialization_sync_history` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropIndex
DROP INDEX "reports"."idx_specialization_sync_history_synced_at_desc";

-- AlterTable
ALTER TABLE "notifications"."device_tokens" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "reports"."specialization_sync_history" DROP CONSTRAINT "specialization_sync_history_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "synced_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "specialization_sync_history_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "scraper"."job_links" ADD COLUMN     "configuration_id" INTEGER;

-- AlterTable
ALTER TABLE "users"."education_details" ALTER COLUMN "custom_specialization" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "job_links_configuration_id_idx" ON "scraper"."job_links"("configuration_id");

-- AddForeignKey
ALTER TABLE "scraper"."job_links" ADD CONSTRAINT "job_links_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "scraper"."job_configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
