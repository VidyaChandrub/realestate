-- AlterTable
ALTER TABLE "identity"."organisations" ADD COLUMN     "address_line1" TEXT,
ADD COLUMN     "address_line2" TEXT,
ADD COLUMN     "brand_colour" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "default_language" TEXT NOT NULL DEFAULT 'en-IN',
ADD COLUMN     "favicon_url" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
ADD COLUMN     "website" TEXT;
