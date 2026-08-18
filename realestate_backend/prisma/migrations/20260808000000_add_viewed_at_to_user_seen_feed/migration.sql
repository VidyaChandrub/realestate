-- Adds a nullable viewed_at column to analytics.user_seen_feed, distinct from the
-- existing seen_at. seen_at is set the moment an item is served in a feed response;
-- viewed_at is set only when the client confirms an actual impression (e.g. the item
-- crossed a visibility threshold in the viewport) via POST /api/v1/feed/impressions.
-- hideSeenFeeds exclusion now keys off viewed_at, not row existence, so an item that
-- was served but never actually looked at stays eligible to be shown again.
ALTER TABLE "analytics"."user_seen_feed" ADD COLUMN "viewed_at" TIMESTAMPTZ(6);
