-- Create BroadcastStatus enum for admin broadcast delivery tracking
CREATE TYPE "notifications"."BroadcastStatus" AS ENUM ('PENDING', 'SENDING', 'COMPLETED', 'FAILED');

-- Create broadcast_notifications table (does not modify the existing notifications table)
CREATE TABLE "notifications"."broadcast_notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "notifications"."BroadcastStatus" NOT NULL DEFAULT 'PENDING',
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "targeting_rules" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "broadcast_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "broadcast_notifications_status_idx" ON "notifications"."broadcast_notifications"("status");

CREATE INDEX "broadcast_notifications_created_at_idx" ON "notifications"."broadcast_notifications"("created_at");
