-- AlterTable
ALTER TABLE "projects"."projects" ADD COLUMN     "address_line" TEXT,
ADD COLUMN     "booking_amount" INTEGER,
ADD COLUMN     "brochure_url" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "connectivity" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cover_image_url" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "gallery_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "landmarks" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "locality" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "marketing" JSONB,
ADD COLUMN     "offers" TEXT,
ADD COLUMN     "payment_plan" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "price_includes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "published_to_website" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "require_booking_approval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rera_certificate_url" TEXT,
ADD COLUMN     "specifications" JSONB,
ADD COLUMN     "visible_to_telecallers" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "projects"."project_sales_agents" (
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_sales_agents_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateIndex
CREATE INDEX "project_sales_agents_user_id_idx" ON "projects"."project_sales_agents"("user_id");

-- AddForeignKey
ALTER TABLE "projects"."project_sales_agents" ADD CONSTRAINT "project_sales_agents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."project_sales_agents" ADD CONSTRAINT "project_sales_agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
