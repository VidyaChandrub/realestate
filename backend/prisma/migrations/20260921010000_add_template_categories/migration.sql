-- Add the template category catalog and align templates with the current Prisma model.
CREATE TYPE "templates"."TemplateTier" AS ENUM ('free', 'paid', 'premium');

CREATE TABLE "templates"."template_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tier" "templates"."TemplateTier" NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "template_categories_name_key" ON "templates"."template_categories"("name");
CREATE UNIQUE INDEX "template_categories_slug_key" ON "templates"."template_categories"("slug");

ALTER TABLE "templates"."templates"
    ADD COLUMN "tier" "templates"."TemplateTier" NOT NULL DEFAULT 'free',
    ADD COLUMN "category_id" TEXT;

ALTER TABLE "templates"."templates"
    ADD CONSTRAINT "templates_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "templates"."template_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
