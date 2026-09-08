-- Persist Hostinger DNS API token on the singleton platform config row.
ALTER TABLE "identity"."platform_configs"
  ADD COLUMN IF NOT EXISTS "hostinger_api_token" TEXT;
