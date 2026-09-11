-- Real active/inactive status for a team, replacing the earlier decision to
-- skip it — now explicitly requested with a place to toggle it. Additive,
-- defaults every existing row to 'active'.

-- CreateEnum
CREATE TYPE "access"."TeamStatus" AS ENUM ('active', 'inactive');

-- AlterTable
ALTER TABLE "access"."teams" ADD COLUMN "status" "access"."TeamStatus" NOT NULL DEFAULT 'active';
