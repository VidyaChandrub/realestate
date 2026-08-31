-- CreateEnum
CREATE TYPE "identity"."OnboardingStep" AS ENUM ('account', 'organisation', 'business_details', 'modules', 'subscription', 'templates', 'invite', 'connect', 'completed');

-- AlterTable
ALTER TABLE "identity"."organisations" ADD COLUMN     "enabled_modules" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "rera_license_no" TEXT;

-- AlterTable
ALTER TABLE "identity"."users" ADD COLUMN     "onboarding_step" "identity"."OnboardingStep" NOT NULL DEFAULT 'account';

