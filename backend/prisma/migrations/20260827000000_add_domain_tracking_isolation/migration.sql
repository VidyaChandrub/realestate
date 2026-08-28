-- CreateEnum
CREATE TYPE "templates"."DomainRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'dns_required', 'verification_pending', 'verified', 'ssl_pending', 'connected', 'verification_failed', 'connection_failed');
CREATE TYPE "templates"."DnsStatus" AS ENUM ('pending', 'verified', 'failed');
CREATE TYPE "templates"."SslStatus" AS ENUM ('pending', 'active', 'failed', 'expired');

-- CreateTable
CREATE TABLE "templates"."domain_requests" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "landing_page_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "templates"."DomainRequestStatus" NOT NULL DEFAULT 'pending',
    "requested_by" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "rejection_reason" TEXT,
    "dns_status" "templates"."DnsStatus" NOT NULL DEFAULT 'pending',
    "ssl_status" "templates"."SslStatus" NOT NULL DEFAULT 'pending',
    "verification_token" TEXT NOT NULL,
    "dns_instructions" JSONB,
    "expected_records" JSONB,
    "detected_records" JSONB,
    "last_verification_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "ssl_issued_at" TIMESTAMP(3),
    "ssl_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "domain_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates"."dns_verification_logs" (
    "id" TEXT NOT NULL,
    "domain_request_id" TEXT NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "expected" JSONB,
    "detected" JSONB,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dns_verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates"."tracking_events" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "landing_page_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "domain_requests_landing_page_id_key" ON "templates"."domain_requests"("landing_page_id");
CREATE INDEX "domain_requests_org_id_idx" ON "templates"."domain_requests"("org_id");
CREATE INDEX "domain_requests_domain_idx" ON "templates"."domain_requests"("domain");
CREATE INDEX "domain_requests_status_idx" ON "templates"."domain_requests"("status");
CREATE INDEX "dns_verification_logs_domain_request_id_idx" ON "templates"."dns_verification_logs"("domain_request_id");
CREATE INDEX "tracking_events_org_id_idx" ON "templates"."tracking_events"("org_id");
CREATE INDEX "tracking_events_landing_page_id_idx" ON "templates"."tracking_events"("landing_page_id");
CREATE INDEX "tracking_events_event_type_idx" ON "templates"."tracking_events"("event_type");

-- AddForeignKey
ALTER TABLE "templates"."domain_requests" ADD CONSTRAINT "domain_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "templates"."domain_requests" ADD CONSTRAINT "domain_requests_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "templates"."landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "templates"."dns_verification_logs" ADD CONSTRAINT "dns_verification_logs_domain_request_id_fkey" FOREIGN KEY ("domain_request_id") REFERENCES "templates"."domain_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "templates"."tracking_events" ADD CONSTRAINT "tracking_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "templates"."tracking_events" ADD CONSTRAINT "tracking_events_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "templates"."landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
