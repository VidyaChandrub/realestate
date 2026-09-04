-- DropIndex
DROP INDEX "identity"."roles_status_sort_order_idx";

-- DropIndex
DROP INDEX "templates"."leads_next_action_at_idx";

-- AlterTable
ALTER TABLE "identity"."roles" ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "projects"."units" ADD COLUMN     "floor_plan_url" TEXT,
ADD COLUMN     "gallery_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
