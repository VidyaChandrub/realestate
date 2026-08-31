CREATE TYPE "identity"."OrgIndustry" AS ENUM ('developer', 'broker', 'channel', 'mixed');

ALTER TABLE "identity"."organisations" ADD COLUMN     "industry" "identity"."OrgIndustry",
ADD COLUMN     "legal_name" TEXT,
ADD COLUMN     "support_email" TEXT,
ADD COLUMN     "support_phone" TEXT;
