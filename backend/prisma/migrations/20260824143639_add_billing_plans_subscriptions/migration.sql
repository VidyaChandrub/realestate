-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "billing";

-- CreateEnum
CREATE TYPE "billing"."BillingCycle" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "billing"."SubscriptionStatus" AS ENUM ('active', 'past_due', 'trial', 'cancelled', 'paused');

-- CreateTable
CREATE TABLE "billing"."plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "price_monthly" INTEGER NOT NULL,
    "price_yearly" INTEGER NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "limits" JSONB,
    "color" TEXT NOT NULL DEFAULT '#eef0fe',
    "badge" TEXT NOT NULL DEFAULT 'b-indigo',
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."subscriptions" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "billing_cycle" "billing"."BillingCycle" NOT NULL DEFAULT 'monthly',
    "status" "billing"."SubscriptionStatus" NOT NULL DEFAULT 'active',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "renews_at" TIMESTAMP(3),
    "mrr" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "billing"."plans"("slug");

-- CreateIndex
CREATE INDEX "subscriptions_org_id_idx" ON "billing"."subscriptions"("org_id");

-- CreateIndex
CREATE INDEX "subscriptions_plan_id_idx" ON "billing"."subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "billing"."subscriptions"("status");

-- AddForeignKey
ALTER TABLE "billing"."subscriptions" ADD CONSTRAINT "subscriptions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "billing"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
