-- Signup Step 1 didn't persist the selected country anywhere, so resuming a
-- draft before an Organisation exists had nothing to restore the Country
-- select from — the phone field then rendered the dial code and local
-- number concatenated (stripCallingCode had no calling code to strip).
--
-- Stores the country typed at Step 1 directly on User. Null for every
-- existing row — nothing to backfill, and a user who already reached Step 2
-- reads their country from Organisation.country instead.

ALTER TABLE "identity"."users" ADD COLUMN "country" TEXT;
