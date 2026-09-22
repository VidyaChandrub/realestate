-- Add the template category catalog and align templates with the current Prisma model.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'templates' AND t.typname = 'TemplateTier'
    ) THEN
        CREATE TYPE "templates"."TemplateTier" AS ENUM ('free', 'paid', 'premium');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "templates"."template_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tier" "templates"."TemplateTier" NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "template_categories_name_key" ON "templates"."template_categories"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "template_categories_slug_key" ON "templates"."template_categories"("slug");

ALTER TABLE "templates"."templates"
    ADD COLUMN IF NOT EXISTS "tier" "templates"."TemplateTier" NOT NULL DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS "category_id" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'templates_category_id_fkey') THEN
        ALTER TABLE "templates"."templates"
            ADD CONSTRAINT "templates_category_id_fkey"
            FOREIGN KEY ("category_id") REFERENCES "templates"."template_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
