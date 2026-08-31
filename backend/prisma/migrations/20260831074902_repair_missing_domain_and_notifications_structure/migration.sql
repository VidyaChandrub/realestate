-- Pre-existing drift repair (not part of the onboarding-wizard change).
-- These types/tables/columns have been declared in schema.prisma and
-- depended on by existing application code (old atomic signup() creates a
-- Notification row on every signup, and an OrgDomainRequest row when a
-- custom domain is requested) for some time, but were entirely absent
-- from this dev database -- confirmed via `prisma migrate diff` against
-- the live DB, which also turned up a leftover `templates_backup_20260825`
-- table and a couple of unrelated minor drifts (landing_pages.subdomain,
-- leads.source default) deliberately left untouched here since they're
-- outside this change's scope. Adding back exactly the structure the
-- already-committed schema and existing code require, nothing else.

CREATE TYPE "audit"."NotificationType" AS ENUM ('organisation_registration', 'subdomain_request', 'custom_domain_request', 'organisation_approved', 'organisation_rejected');
CREATE TYPE "templates"."OrgDomainRequestKind" AS ENUM ('subdomain', 'custom_domain');
CREATE TYPE "templates"."OrgDomainRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'connected');

ALTER TABLE "identity"."organisations" ADD COLUMN "custom_domain" TEXT,
ADD COLUMN "custom_domain_status" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN "subdomain" TEXT,
ADD COLUMN "subdomain_status" TEXT NOT NULL DEFAULT 'pending';

CREATE UNIQUE INDEX "organisations_subdomain_key" ON "identity"."organisations"("subdomain");
CREATE UNIQUE INDEX "organisations_custom_domain_key" ON "identity"."organisations"("custom_domain");

CREATE TABLE "audit"."notifications" (
    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "recipient_id" TEXT,
    "type" "audit"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entity" TEXT,
    "entity_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_recipient_id_read_at_idx" ON "audit"."notifications"("recipient_id", "read_at");
CREATE INDEX "notifications_type_idx" ON "audit"."notifications"("type");
ALTER TABLE "audit"."notifications" ADD CONSTRAINT "notifications_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit"."notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "templates"."org_domain_requests" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "kind" "templates"."OrgDomainRequestKind" NOT NULL,
    "subdomain" TEXT,
    "custom_domain" TEXT,
    "status" "templates"."OrgDomainRequestStatus" NOT NULL DEFAULT 'pending',
    "requested_by" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_domain_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "org_domain_requests_org_id_idx" ON "templates"."org_domain_requests"("org_id");
CREATE INDEX "org_domain_requests_status_idx" ON "templates"."org_domain_requests"("status");
ALTER TABLE "templates"."org_domain_requests" ADD CONSTRAINT "org_domain_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
