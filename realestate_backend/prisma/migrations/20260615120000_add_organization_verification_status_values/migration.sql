-- AlterTable
ALTER TYPE "employers"."VerificationStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "employers"."VerificationStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
