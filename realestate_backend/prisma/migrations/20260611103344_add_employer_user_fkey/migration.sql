/*
  Warnings:

  - The values [EXPIRED,ARCHIVED] on the enum `MasterStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `external_registration_clicks` on the `event_metrics` table. All the data in the column will be lost.
  - You are about to drop the `analytics_event_dedup` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "master_data"."MasterStatus_new" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
ALTER TABLE "master_data"."categories" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "master_data"."categories" ALTER COLUMN "status" TYPE "master_data"."MasterStatus_new" USING ("status"::text::"master_data"."MasterStatus_new");
ALTER TYPE "master_data"."MasterStatus" RENAME TO "MasterStatus_old";
ALTER TYPE "master_data"."MasterStatus_new" RENAME TO "MasterStatus";
DROP TYPE "master_data"."MasterStatus_old";
ALTER TABLE "master_data"."categories" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropIndex
DROP INDEX "jobs"."jobs_keywords_idx";

-- AlterTable
ALTER TABLE "analytics"."event_metrics" DROP COLUMN "external_registration_clicks";

-- DropTable
DROP TABLE "analytics"."analytics_event_dedup";

-- AddForeignKey
ALTER TABLE "employers"."employers" ADD CONSTRAINT "employers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
