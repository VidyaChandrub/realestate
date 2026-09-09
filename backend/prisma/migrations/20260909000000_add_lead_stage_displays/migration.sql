-- Per-org DISPLAY overrides for the fixed LeadStatus pipeline stages.
-- One optional row per (org, status); no row = built-in default label/colour.
-- Lead.status and every comparison keyed to it are untouched.

-- CreateTable
CREATE TABLE "templates"."org_lead_stage_displays" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "status" "templates"."LeadStatus" NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_lead_stage_displays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "org_lead_stage_displays_org_id_idx" ON "templates"."org_lead_stage_displays"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_lead_stage_displays_org_id_status_key" ON "templates"."org_lead_stage_displays"("org_id", "status");

-- AddForeignKey
ALTER TABLE "templates"."org_lead_stage_displays" ADD CONSTRAINT "org_lead_stage_displays_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
