-- AlterTable
ALTER TABLE "ads"."advertisement_targeting" ADD COLUMN "specialization_ids" UUID[] DEFAULT ARRAY[]::UUID[];
