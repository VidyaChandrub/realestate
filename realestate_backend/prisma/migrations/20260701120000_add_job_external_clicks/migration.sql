-- CreateTable
CREATE TABLE "jobs"."job_external_clicks" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_external_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_external_clicks_job_id_idx" ON "jobs"."job_external_clicks"("job_id");

-- CreateIndex
CREATE INDEX "job_external_clicks_user_id_idx" ON "jobs"."job_external_clicks"("user_id");

-- CreateIndex
CREATE INDEX "job_external_clicks_clicked_at_idx" ON "jobs"."job_external_clicks"("clicked_at");

-- AddForeignKey
ALTER TABLE "jobs"."job_external_clicks" ADD CONSTRAINT "job_external_clicks_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."job_external_clicks" ADD CONSTRAINT "job_external_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
