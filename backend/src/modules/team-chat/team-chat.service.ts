import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  leadContactFromData,
  normalizeLeadData,
} from '../../common/utils/lead-data.util';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { CreateChannelDto } from './dto/create-channel.dto';
import { CreateDmDto } from './dto/create-dm.dto';
import { CreateMessageDto } from './dto/create-message.dto';

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

type UserRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

const CHANNEL_INCLUDE = {
  team: { select: { id: true, name: true } },
  dmUser: { select: USER_SELECT },
  members: {
    select: {
      userId: true,
      lastReadAt: true,
      joinedAt: true,
      user: { select: USER_SELECT },
    },
  },
} satisfies Prisma.TeamChannelInclude;

type ChannelRow = Prisma.TeamChannelGetPayload<{
  include: typeof CHANNEL_INCLUDE;
}>;

const MESSAGE_INCLUDE = {
  sender: { select: USER_SELECT },
  lead: { include: { project: { select: { id: true, name: true } } } },
} satisfies Prisma.TeamMessageInclude;

type MessageRow = Prisma.TeamMessageGetPayload<{
  include: typeof MESSAGE_INCLUDE;
}>;

/** Channel/DM overview + per-channel chat threads. orgId always derives from
 *  the JWT, never a client param, so one org can never read or touch another
 *  org's channels. Plain REST + the frontend polls — no websockets, same as
 *  Support tickets. */
@Injectable()
export class TeamChatService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Overview — the channel + DM lists on the left rail
  // -------------------------------------------------------------------------

  async overview(orgId: string, actorSub: string) {
    const memberships = await this.prisma.teamChannelMember.findMany({
      where: { userId: actorSub, channel: { orgId } },
      orderBy: { joinedAt: 'asc' },
      include: { channel: { include: CHANNEL_INCLUDE } },
    });

    const summaries = await Promise.all(
      memberships.map((m) => this.summarize(m.channel, actorSub)),
    );

    return {
      channels: summaries.filter((s) => s.kind === 'channel'),
      dms: summaries.filter((s) => s.kind === 'dm'),
    };
  }

  async getChannel(orgId: string, actorSub: string, channelId: string) {
    const channel = await this.getOwned(orgId, channelId);

    const me = channel.members.find((m) => m.userId === actorSub);
    if (!me) {
      // Best-effort auto-join — someone tagged with a link can read along
      // even before the thread shows up in their left rail.
      await this.prisma.teamChannelMember.create({
        data: { channelId, userId: actorSub },
      });
    }

    const messages = await this.prisma.teamMessage.findMany({
      where: { channelId },
      orderBy: { createdAt: 'asc' },
      include: MESSAGE_INCLUDE,
    });

    // Opening the channel clears its unread count.
    await this.prisma.teamChannelMember.updateMany({
      where: { channelId, userId: actorSub },
      data: { lastReadAt: new Date() },
    });

    // Pinned card list = every distinct lead ever tagged in this thread.
    const seen = new Map<string, NonNullable<MessageRow['lead']>>();
    for (const m of messages) {
      if (m.lead && !seen.has(m.lead.id)) seen.set(m.lead.id, m.lead);
    }

    return {
      channel: {
        id: channel.id,
        kind: channel.kind,
        name: channel.name,
        teamId: channel.teamId,
        teamName: channel.team?.name ?? null,
        memberCount: channel.members.length,
        ...(channel.kind === 'dm' && channel.dmUser
          ? {
              otherUser: {
                id: channel.dmUser.id,
                name: this.displayName(channel.dmUser),
              },
            }
          : {}),
      },
      messages: messages.map((m) => this.serializeMessage(m)),
      members: channel.members.map((r) => ({
        id: r.user.id,
        name: this.displayName(r.user),
      })),
      sharedLeads: [...seen.values()].map((l) => this.serializeLead(l)),
    };
  }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async createChannel(orgId: string, actorSub: string, dto: CreateChannelDto) {
    const name = dto.name.trim();

    // Linking the channel to a team auto-joins everyone currently on it —
    // the creator is always a member too, even for ad-hoc channels.
    let teamMemberIds: string[] = [];
    if (dto.teamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: dto.teamId, orgId },
        select: { members: { select: { userId: true } } },
      });
      if (!team) {
        throw new BadRequestException('Team must belong to your organisation');
      }
      teamMemberIds = team.members.map((m) => m.userId);
    }
    const memberIds = [...new Set([actorSub, ...teamMemberIds])];

    const channel = await this.prisma.$transaction(async (tx) => {
      const created = await tx.teamChannel.create({
        data: {
          orgId,
          kind: 'channel',
          name,
          teamId: dto.teamId ?? null,
          createdById: actorSub,
          members: { create: memberIds.map((userId) => ({ userId })) },
        },
      });
      await tx.auditLog.create({
        data: {
          orgId,
          action: 'team_chat_channel_created',
          entity: 'TeamChannel',
          entityId: created.id,
          metadata: { name },
        },
      });
      return created;
    });

    return this.summarize(await this.getOwned(orgId, channel.id), actorSub);
  }

  async createDm(orgId: string, actorSub: string, dto: CreateDmDto) {
    const other = await this.prisma.user.findFirst({
      where: { id: dto.userId, orgId },
      select: USER_SELECT,
    });
    if (!other) {
      throw new BadRequestException('User must be in your organisation');
    }
    if (other.id === actorSub) {
      throw new BadRequestException('You cannot message yourself');
    }

    // Find-or-create: re-messaging someone never spawns a duplicate thread.
    const existing = await this.prisma.teamChannel.findFirst({
      where: {
        orgId,
        kind: 'dm',
        dmUserId: other.id,
        members: {
          every: { userId: { in: [actorSub, other.id] } },
          some: { userId: actorSub },
        },
      },
      include: CHANNEL_INCLUDE,
    });
    if (existing) {
      return this.getChannel(orgId, actorSub, existing.id);
    }

    const dm = await this.prisma.teamChannel.create({
      data: {
        orgId,
        kind: 'dm',
        name: this.displayName(other),
        dmUserId: other.id,
        createdById: actorSub,
        members: { create: [{ userId: actorSub }, { userId: other.id }] },
      },
    });
    return this.getChannel(orgId, actorSub, dm.id);
  }

  async addMessage(
    orgId: string,
    actorSub: string,
    channelId: string,
    dto: CreateMessageDto,
  ) {
    await this.getOwned(orgId, channelId);
    if (dto.leadId) await this.assertOrgLead(orgId, dto.leadId);

    // Sending a message auto-joins the sender (DMs / channel scavengers).
    await this.prisma.teamChannelMember.upsert({
      where: { channelId_userId: { channelId, userId: actorSub } },
      create: { channelId, userId: actorSub },
      update: {},
    });

    const message: MessageRow = await this.prisma.$transaction(async (tx) => {
      const created = await tx.teamMessage.create({
        data: {
          channelId,
          orgId,
          senderId: actorSub,
          body: dto.body,
          leadId: dto.leadId ?? null,
          assignedTo: dto.assignedTo?.trim() || null,
        },
        include: MESSAGE_INCLUDE,
      });
      // Touch updatedAt so the thread rises to the top of the list.
      await tx.teamChannel.update({ where: { id: channelId }, data: {} });
      return created;
    });

    return this.serializeMessage(message);
  }

  // -------------------------------------------------------------------------
  // Sizing up the left rail
  // -------------------------------------------------------------------------

  private async summarize(channel: ChannelRow, actorSub: string) {
    const me = channel.members.find((m) => m.userId === actorSub);
    const since = me?.lastReadAt ?? me?.joinedAt ?? new Date(0);

    const [unread, lastMessage] = await Promise.all([
      this.prisma.teamMessage.count({
        where: { channelId: channel.id, createdAt: { gt: since } },
      }),
      this.prisma.teamMessage.findFirst({
        where: { channelId: channel.id },
        orderBy: { createdAt: 'desc' },
        include: MESSAGE_INCLUDE,
      }),
    ]);

    return {
      id: channel.id,
      kind: channel.kind,
      name: channel.name,
      teamId: channel.teamId,
      ...(channel.kind === 'dm' && channel.dmUser
        ? {
            otherUser: {
              id: channel.dmUser.id,
              name: this.displayName(channel.dmUser),
            },
          }
        : {}),
      unread,
      lastMessagePreview: lastMessage
        ? `${this.displayName(lastMessage.sender)}: ${lastMessage.body.slice(0, 90)}`
        : '',
      lastMessageAt: lastMessage?.createdAt ?? channel.createdAt,
      memberCount: channel.members.length,
    };
  }

  // -------------------------------------------------------------------------
  // Cross-tenant guards
  // -------------------------------------------------------------------------

  private async getOwned(orgId: string, id: string): Promise<ChannelRow> {
    const channel = await this.prisma.teamChannel.findFirst({
      where: { id, orgId },
      include: CHANNEL_INCLUDE,
    });
    if (!channel) {
      // Never leaks cross-tenant existence: another org's channel 404s
      // exactly like an id that doesn't exist.
      throw new NotFoundException('Channel not found');
    }
    return channel;
  }

  private async assertOrgLead(orgId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, orgId },
      select: { id: true },
    });
    if (!lead) {
      throw new BadRequestException('Tagged lead must belong to your organisation');
    }
  }

  // -------------------------------------------------------------------------
  // Serializers
  // -------------------------------------------------------------------------

  private displayName(u: UserRow): string {
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
  }

  private serializeLead(lead: NonNullable<MessageRow['lead']>) {
    const raw =
      lead.data && typeof lead.data === 'object' && !Array.isArray(lead.data)
        ? (lead.data as Record<string, unknown>)
        : {};
    const data = normalizeLeadData(raw);
    const contact = leadContactFromData(data);
    return {
      id: lead.id,
      name: contact.fullName ?? 'Untitled lead',
      phone: contact.phone,
      email: contact.email,
      project: lead.project?.name ?? data.project ?? null,
      interest: data.interestedIn ?? null,
      status: lead.status,
    };
  }

  private serializeMessage(message: MessageRow) {
    return {
      id: message.id,
      channelId: message.channelId,
      body: message.body,
      leadId: message.leadId,
      assignedTo: message.assignedTo,
      createdAt: message.createdAt,
      sender: {
        id: message.sender.id,
        name: this.displayName(message.sender),
      },
      lead: message.lead ? this.serializeLead(message.lead) : null,
    };
  }
}