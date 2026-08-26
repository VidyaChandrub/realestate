-- CreateTable
CREATE TABLE "templates"."typography_sets" (
    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "name" TEXT NOT NULL,
    "tokens" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "typography_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "typography_sets_org_id_name_key" ON "templates"."typography_sets"("org_id", "name");

-- AddForeignKey
ALTER TABLE "templates"."typography_sets" ADD CONSTRAINT "typography_sets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
