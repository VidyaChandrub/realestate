-- CreateTable
CREATE TABLE "templates"."organisation_templates" (
    "org_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "organisation_templates_pkey" PRIMARY KEY ("org_id","template_id")
);

-- CreateIndex
CREATE INDEX "organisation_templates_template_id_idx" ON "templates"."organisation_templates"("template_id");

-- AddForeignKey
ALTER TABLE "templates"."organisation_templates" ADD CONSTRAINT "organisation_templates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates"."organisation_templates" ADD CONSTRAINT "organisation_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"."templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
