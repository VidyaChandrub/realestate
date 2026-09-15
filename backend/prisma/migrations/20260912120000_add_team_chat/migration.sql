-- Team Chat: channels/DMs + messages. Additive only — three new tables plus
-- FK indexes. Mirroring the teams / support patterns:
--   * teams -> SetNull (deleting a team keeps its channels, they become
--     ad-hoc), matching teams.team_lead_id.
--   * chat sender -> Cascade (same as support_messages.sender_id).
--   * dm_user / created_by -> SetNull/Cascade respectively. A deleted user's
--     DM thread survives (name is a snapshot) but joins/sends from them stop.
-- Plain REST + polling, no websockets — same as support tickets.

-- CreateTable: team_channels
CREATE TABLE "access"."team_channels" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'channel',
    "name" TEXT NOT NULL,
    "team_id" TEXT,
    "dm_user_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable: team_channel_members — membership plus a per-user last-read
-- marker. last_read_at NULL = never opened yet, so every message counts as
-- unread until the user opens the channel.
CREATE TABLE "access"."team_channel_members" (
    "channel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "last_read_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_channel_members_pkey" PRIMARY KEY ("channel_id","user_id")
);

-- CreateTable: team_messages — one row per message. lead_id + assigned_to
-- back the tagged-lead card: lead_id links the tag, assigned_to is a
-- free-text label copied at send time.
CREATE TABLE "access"."team_messages" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "lead_id" TEXT,
    "assigned_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_channels_org_id_idx" ON "access"."team_channels"("org_id");
CREATE INDEX "team_channels_team_id_idx" ON "access"."team_channels"("team_id");
CREATE INDEX "team_channel_members_user_id_idx" ON "access"."team_channel_members"("user_id");
CREATE INDEX "team_messages_channel_id_created_at_idx" ON "access"."team_messages"("channel_id","created_at");
CREATE INDEX "team_messages_org_id_idx" ON "access"."team_messages"("org_id");

-- AddForeignKey
ALTER TABLE "access"."team_channels" ADD CONSTRAINT "team_channels_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "identity"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access"."team_channels" ADD CONSTRAINT "team_channels_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "access"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "access"."team_channels" ADD CONSTRAINT "team_channels_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access"."team_channels" ADD CONSTRAINT "team_channels_dm_user_id_fkey" FOREIGN KEY ("dm_user_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "access"."team_channel_members" ADD CONSTRAINT "team_channel_members_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "access"."team_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access"."team_channel_members" ADD CONSTRAINT "team_channel_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access"."team_messages" ADD CONSTRAINT "team_messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "access"."team_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access"."team_messages" ADD CONSTRAINT "team_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access"."team_messages" ADD CONSTRAINT "team_messages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "templates"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;