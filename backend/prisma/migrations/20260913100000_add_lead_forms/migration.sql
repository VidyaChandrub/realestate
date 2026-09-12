-- Lead Forms — the Form Builder library, mirrored exactly on the org side.
--
-- One table, two owner classes (same trick as typography_sets):
--   * org_id NULL  -> platform-wide form owned by the Super Admin.
--   * org_id set   -> an organisation's own form.
-- The two are never mixed: the /admin/forms controller reads org_id IS NULL,
-- the /org/forms controller reads ONLY the caller's orgId. Deleting an
-- organisation cascades its forms.

-- CreateTable: lead_forms
CREATE TABLE "templates"."lead_forms" (
    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "name" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_forms_org_id_idx" ON "templates"."lead_forms"("org_id");
CREATE INDEX "lead_forms_updated_at_idx" ON "templates"."lead_forms"("updated_at");

-- AddForeignKey
ALTER TABLE "templates"."lead_forms" ADD CONSTRAINT "lead_forms_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;