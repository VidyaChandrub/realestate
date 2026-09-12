-- Subscription expiry lifecycle + Super Admin-configurable grace period.
--
--  1. SubscriptionStatus gains `expired` (set once the grace period lapses
--      and the configured expiry behaviour is 'restrict').
--  2. Subscription gains `grace_ends_at` — end of the past_due grace window.
--  3. NotificationType gains the three subscription-lifecycle events.
--  4. PlatformConfig gains the four Super Admin billing policy knobs.
--  5. Plan.capabilities backfill `publishing: true` on existing active plans
--     so today's customers keep their publishing right (offered by default,
--     revocable from the plan editor going forward).
--
-- All additive / defaulted; existing rows are untouched or upgraded in place.

-- AlterEnum
ALTER TYPE "billing"."SubscriptionStatus" ADD VALUE 'expired';

-- AlterEnum
ALTER TYPE "audit"."NotificationType" ADD VALUE 'subscription_expiring';
ALTER TYPE "audit"."NotificationType" ADD VALUE 'subscription_past_due';
ALTER TYPE "audit"."NotificationType" ADD VALUE 'subscription_expired';

-- AlterTable (subscriptions)
ALTER TABLE "billing"."subscriptions"
  ADD COLUMN "grace_ends_at" TIMESTAMP(3);

-- AlterTable (platform_configs) — single global row (id 'platform').
ALTER TABLE "identity"."platform_configs"
  ADD COLUMN "billing_expiry_notify_days" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "identity"."platform_configs"
  ADD COLUMN "billing_grace_period_days" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "identity"."platform_configs"
  ADD COLUMN "billing_expiry_behavior" TEXT NOT NULL DEFAULT 'restrict';
ALTER TABLE "identity"."platform_configs"
  ADD COLUMN "billing_expiry_message" TEXT NOT NULL DEFAULT 'Your subscription is due for renewal soon. Renew to keep your landing pages and features running without interruption.';

-- Backfill: existing active plans keep the publishing capability. `publishing`
-- is a plan-capability boolean (missing key = false) — without this backfill
-- every in-flight plan would silently lose its publishing right. Administrators
-- can revoke it per plan from the plan editor.
UPDATE "billing"."plans"
SET "capabilities" = COALESCE("capabilities", '{}'::jsonb) || '{"publishing": true}'::jsonb
WHERE "is_active" = true;