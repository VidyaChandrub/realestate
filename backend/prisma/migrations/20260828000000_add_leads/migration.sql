-- CreateTable
CREATE TABLE "templates"."leads" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "landing_page_id" TEXT,
    "form_name" TEXT,
    "source" TEXT,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_org_id_idx" ON "templates"."leads" ("org_id");
CREATE INDEX "leads_landing_page_id_idx" ON "templates"."leads" ("landing_page_id");
CREATE INDEX "leads_created_at_idx" ON "templates"."leads" ("created_at");
