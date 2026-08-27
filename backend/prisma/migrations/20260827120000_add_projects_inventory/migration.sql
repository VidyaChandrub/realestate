-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "projects";

-- CreateEnum
CREATE TYPE "projects"."ProjectStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "projects"."UnitStatus" AS ENUM ('available', 'booked', 'held');

-- CreateTable
CREATE TABLE "projects"."projects" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "rera_id" TEXT,
    "possession" TEXT,
    "manager" TEXT,
    "status" "projects"."ProjectStatus" NOT NULL DEFAULT 'active',
    "price_min" INTEGER,
    "price_max" INTEGER,
    "base_rate" INTEGER,
    "land_area" DECIMAL(8,2),
    "tower_count" INTEGER,
    "floors_description" TEXT,
    "amenities" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."unit_types" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "carpet_sqft" INTEGER,
    "builtup_sqft" INTEGER,
    "price" INTEGER,
    "total_units" INTEGER NOT NULL DEFAULT 0,
    "floor_plan_url" TEXT,
    "brochure_url" TEXT,
    "video_url" TEXT,
    "gallery_urls" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."units" (
    "id" TEXT NOT NULL,
    "unit_type_id" TEXT NOT NULL,
    "unit_no" TEXT NOT NULL,
    "floor" INTEGER,
    "facing" TEXT,
    "price" INTEGER,
    "status" "projects"."UnitStatus" NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_org_id_idx" ON "projects"."projects"("org_id");

-- CreateIndex
CREATE INDEX "unit_types_project_id_idx" ON "projects"."unit_types"("project_id");

-- CreateIndex
CREATE INDEX "units_unit_type_id_idx" ON "projects"."units"("unit_type_id");

-- AddForeignKey
ALTER TABLE "projects"."projects" ADD CONSTRAINT "projects_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."unit_types" ADD CONSTRAINT "unit_types_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."units" ADD CONSTRAINT "units_unit_type_id_fkey" FOREIGN KEY ("unit_type_id") REFERENCES "projects"."unit_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
