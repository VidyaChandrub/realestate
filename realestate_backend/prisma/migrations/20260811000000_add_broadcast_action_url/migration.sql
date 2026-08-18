-- Add optional "View Details" action URL to broadcast_notifications (nullable, additive only)
ALTER TABLE "notifications"."broadcast_notifications" ADD COLUMN "action_url" TEXT;
