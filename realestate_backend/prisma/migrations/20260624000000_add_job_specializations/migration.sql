-- Create job_specializations join table for job specialization persistence
CREATE TABLE "jobs"."job_specializations" (
    "job_id" TEXT NOT NULL,
    "specialization_id" uuid NOT NULL,

    CONSTRAINT "job_specializations_pkey" PRIMARY KEY ("job_id","specialization_id")
);

CREATE INDEX "job_specializations_specialization_id_idx"
    ON "jobs"."job_specializations"("specialization_id");

ALTER TABLE "jobs"."job_specializations"
    ADD CONSTRAINT "job_specializations_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "jobs"."jobs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "jobs"."job_specializations"
    ADD CONSTRAINT "job_specializations_specialization_id_fkey"
    FOREIGN KEY ("specialization_id") REFERENCES "master_data"."categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
