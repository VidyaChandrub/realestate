-- Create DevicePlatform enum for push notification device tokens
CREATE TYPE "notifications"."DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- Create device_tokens table (does not modify the existing notifications table)
CREATE TABLE "notifications"."device_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "notifications"."DevicePlatform" NOT NULL,
    "device_name" TEXT,
    "app_version" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "device_tokens_token_key" ON "notifications"."device_tokens"("token");

CREATE INDEX "device_tokens_user_id_idx" ON "notifications"."device_tokens"("user_id");

CREATE INDEX "device_tokens_device_id_idx" ON "notifications"."device_tokens"("device_id");

CREATE INDEX "device_tokens_is_active_idx" ON "notifications"."device_tokens"("is_active");
