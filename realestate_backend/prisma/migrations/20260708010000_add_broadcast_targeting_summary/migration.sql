-- Add human-readable targeting summary to broadcast_notifications (nullable, additive only)
ALTER TABLE "notifications"."broadcast_notifications" ADD COLUMN "targeting_summary" JSONB;
