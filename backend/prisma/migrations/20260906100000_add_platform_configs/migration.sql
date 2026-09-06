-- Super Admin platform subdomain/DNS configuration (single global row).
-- Mirrors the email_configs approach: created at runtime by the service too,
-- so production deployments whose migrations never ran still get the table.

CREATE SCHEMA IF NOT EXISTS "identity";

CREATE TABLE IF NOT EXISTS "identity"."platform_configs" (
    "id" TEXT NOT NULL,
    "subdomain_mode" TEXT NOT NULL DEFAULT 'production',
    "subdomain_base" TEXT,
    "dns_mode" TEXT NOT NULL DEFAULT 'a',
    "infra_ip" TEXT,
    "infra_ipv6" TEXT,
    "infra_cname" TEXT,
    "infra_ns1" TEXT,
    "infra_ns2" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_configs_pkey" PRIMARY KEY ("id")
);