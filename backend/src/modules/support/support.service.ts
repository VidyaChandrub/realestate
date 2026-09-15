import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { buildNotificationData } from '../../common/utils/notifications.util';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { ListSupportTicketsQueryDto } from './dto/list-support-tickets-query.dto';
import { CreateSupportUploadUrlDto } from './dto/create-support-upload-url.dto';
import { HoldSupportTicketDto } from './dto/hold-support-ticket.dto';
import { AssignSupportTicketDto } from './dto/assign-support-ticket.dto';

const ACTOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  orgId: true,
} as const;

const TICKET_INCLUDE = {
  raisedBy: { select: ACTOR_SELECT },
  closedBy: { select: ACTOR_SELECT },
  heldBy: { select: ACTOR_SELECT },
  assignedTo: { select: ACTOR_SELECT },
  organisation: { select: { id: true, name: true } },
} satisfies Prisma.SupportTicketInclude;

const MESSAGE_INCLUDE = {
  sender: { select: ACTOR_SELECT },
} satisfies Prisma.SupportMessageInclude;

type TicketRow = Prisma.SupportTicketGetPayload<{ include: typeof TICKET_INCLUDE }>;
type MessageRow = Prisma.SupportMessageGetPayload<{ include: typeof MESSAGE_INCLUDE }>;

/** Up to this many attempts at picking the next per-org ticket number before
 *  giving up — only ever needed if two tickets for the same org are created
 *  in the same instant (see createTicket). */
const NUMBER_RETRY_LIMIT = 3;

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // -------------------------------------------------------------------------
  // Attachments
  // -------------------------------------------------------------------------

  // orgId is omitted for a Platform Team (Super Admin) upload — those land
  // under the `platform/` storage prefix instead of an org's own, same as
  // the template builder (see StorageService.buildKey).
  createUploadUrl(orgId: string | undefined, dto: CreateSupportUploadUrlDto) {
    return this.storage.createUploadUrl({
      orgId,
      field: 'supportAttachment',
      filename: dto.filename,
      contentType: dto.contentType,
      size: dto.size,
    });
  }

  // -------------------------------------------------------------------------
  // Create (org side only — a ticket always belongs to the raiser's org)
  // -------------------------------------------------------------------------

  async createTicket(orgId: string, actor: JwtPayload, dto: CreateSupportTicketDto) {
    const priority = dto.priority ?? 'normal';
    const subject = dto.subject.trim();
    const message = dto.message.trim();
    const attachmentUrls = dto.attachmentUrls ?? [];

    let lastError: unknown;
    for (let attempt = 0; attempt < NUMBER_RETRY_LIMIT; attempt++) {
      try {
        const ticket = await this.prisma.$transaction(async (tx) => {
          const count = await tx.supportTicket.count({ where: { orgId } });
          const created = await tx.supportTicket.create({
            data: {
              orgId,
              raisedById: actor.sub,
              subject,
              category: dto.category,
              priority,
              number: count + 1,
            },
          });
          await tx.supportMessage.create({
            data: {
              ticketId: created.id,
              senderId: actor.sub,
              body: message,
              attachmentUrls,
            },
          });
          // Fans out to "all Super Admins" — the same platform-wide inbox an
          // organisation registration lands in.
          await tx.notification.create({
            data: buildNotificationData({
              orgId,
              type: 'support_ticket_created',
              title: `New support ticket: ${subject}`,
              body: `SR-${created.number} · ${dto.category} · ${priority} priority`,
              entity: 'SupportTicket',
              entityId: created.id,
            }),
          });
          return created;
        });
        return this.getForOrg(orgId, actor, ticket.id);
      } catch (err) {
        // Two tickets for the same org created in the same instant can both
        // compute the same `count` before either commits — the (orgId,
        // number) unique constraint catches it; retry picks the next number.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  // -------------------------------------------------------------------------
  // Org side — always scoped to the caller's own org (never trusted from the
  // body), so one org can never see or reply to another's tickets.
  // -------------------------------------------------------------------------

  async listForOrg(orgId: string, actor: JwtPayload, query: ListSupportTicketsQueryDto) {
    return this.list({ ...query, orgId }, false, {
      recipientId: actor.sub,
      includeBroadcast: false,
    });
  }

  async getForOrg(orgId: string, actor: JwtPayload, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, orgId },
      include: TICKET_INCLUDE,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    // Opening the ticket clears its "unread" indicator in the list — the
    // same rows the bell counts, so the badge count drops too.
    await this.markTicketNotificationsRead(id, { recipientId: actor.sub });
    return this.serializeDetail(ticket, false);
  }

  async addOrgMessage(
    orgId: string,
    actor: JwtPayload,
    ticketId: string,
    dto: CreateSupportMessageDto,
  ) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, orgId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return this.addMessage(ticket, actor, dto, { asAdmin: false });
  }

  // -------------------------------------------------------------------------
  // Support Management (Super Admin / Platform Team) — every org's tickets.
  // -------------------------------------------------------------------------

  async listForAdmin(actor: JwtPayload, query: ListSupportTicketsQueryDto) {
    // A Platform Team member without the system super_admin role only ever
    // sees the tickets a Super Admin has assigned to them — not the whole
    // platform-wide inbox. See assignTicket / assertAdminTicketAccess.
    const assignedToId = this.isSuperAdmin(actor) ? undefined : actor.sub;
    return this.list(
      query,
      true,
      { recipientId: actor.sub, includeBroadcast: true },
      assignedToId,
    );
  }

  async getForAdmin(actor: JwtPayload, id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: TICKET_INCLUDE,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    this.assertAdminTicketAccess(actor, ticket);
    // Shared "all Super Admins" inbox — whoever opens the ticket clears it
    // for every Platform Team member, same as the bell's own mark-read.
    await this.markTicketNotificationsRead(id, {
      recipientId: actor.sub,
      includeBroadcast: true,
    });
    return this.serializeDetail(ticket, true);
  }

  async addAdminMessage(
    actor: JwtPayload,
    ticketId: string,
    dto: CreateSupportMessageDto,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    this.assertAdminTicketAccess(actor, ticket);
    return this.addMessage(ticket, actor, dto, { asAdmin: true });
  }

  /** Assigns (or unassigns, with `assigneeId: null`) a ticket to a Platform
   *  Team member — Super Admin only. That member then sees this ticket in
   *  their own Support Management list and can act on it (see
   *  listForAdmin / assertAdminTicketAccess). */
  async assignTicket(actor: JwtPayload, ticketId: string, dto: AssignSupportTicketDto) {
    if (!this.isSuperAdmin(actor)) {
      throw new ForbiddenException('Only a Super Admin can assign tickets.');
    }
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { organisation: { select: { name: true } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const assigneeId = dto.assigneeId ?? null;
    if (assigneeId) {
      const assignee = await this.prisma.user.findFirst({
        where: {
          id: assigneeId,
          orgId: null,
          status: 'active',
          userRoles: { some: { role: { scope: 'platform' } } },
        },
      });
      if (!assignee) {
        throw new BadRequestException(
          'That user is not an active Platform Team member.',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({
        where: { id: ticketId },
        data: { assignedToId: assigneeId },
      });
      if (assigneeId && assigneeId !== ticket.assignedToId) {
        await tx.notification.create({
          data: buildNotificationData({
            orgId: ticket.orgId,
            recipientId: assigneeId,
            type: 'support_ticket_assigned',
            title: `Ticket assigned to you: SR-${ticket.number}`,
            body: `${ticket.subject} · ${ticket.organisation.name}`,
            entity: 'SupportTicket',
            entityId: ticket.id,
          }),
        });
      }
    });
    return this.getForAdmin(actor, ticketId);
  }

  async closeTicket(actor: JwtPayload, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    this.assertAdminTicketAccess(actor, ticket);

    if (ticket.status !== 'resolved') {
      await this.prisma.$transaction(async (tx) => {
        await tx.supportTicket.update({
          where: { id: ticketId },
          data: { status: 'resolved', closedAt: new Date(), closedById: actor.sub },
        });
        await tx.notification.create({
          data: buildNotificationData({
            orgId: ticket.orgId,
            recipientId: ticket.raisedById,
            type: 'support_ticket_status_changed',
            title: `Ticket resolved: SR-${ticket.number}`,
            body: `${ticket.subject} has been marked resolved by the iPixxel team.`,
            entity: 'SupportTicket',
            entityId: ticket.id,
          }),
        });
      });
    }
    return this.getForAdmin(actor, ticketId);
  }

  /** Pauses a ticket with a required reason — Super Admin only. The org that
   *  raised it (and Support Management's own list) sees status "On Hold"
   *  with this reason behind a tooltip (see serializeSummary/serializeDetail). */
  async holdTicket(actor: JwtPayload, ticketId: string, dto: HoldSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    this.assertAdminTicketAccess(actor, ticket);
    if (ticket.status === 'resolved') {
      throw new ForbiddenException('A resolved ticket cannot be put on hold.');
    }

    const reason = dto.reason.trim();
    await this.prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: 'on_hold',
          holdReason: reason,
          heldAt: new Date(),
          heldById: actor.sub,
        },
      });
      await tx.notification.create({
        data: buildNotificationData({
          orgId: ticket.orgId,
          recipientId: ticket.raisedById,
          type: 'support_ticket_status_changed',
          title: `Ticket on hold: SR-${ticket.number}`,
          body: reason.slice(0, 160),
          entity: 'SupportTicket',
          entityId: ticket.id,
        }),
      });
    });
    return this.getForAdmin(actor, ticketId);
  }

  /** Resumes a held ticket back to active work — Super Admin only. */
  async resumeTicket(actor: JwtPayload, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    this.assertAdminTicketAccess(actor, ticket);

    if (ticket.status === 'on_hold') {
      await this.prisma.$transaction(async (tx) => {
        await tx.supportTicket.update({
          where: { id: ticketId },
          data: { status: 'ongoing' },
        });
        await tx.notification.create({
          data: buildNotificationData({
            orgId: ticket.orgId,
            recipientId: ticket.raisedById,
            type: 'support_ticket_status_changed',
            title: `Ticket resumed: SR-${ticket.number}`,
            body: `${ticket.subject} is back in progress.`,
            entity: 'SupportTicket',
            entityId: ticket.id,
          }),
        });
      });
    }
    return this.getForAdmin(actor, ticketId);
  }

  // -------------------------------------------------------------------------
  // Shared
  // -------------------------------------------------------------------------

  /** Mirrors SuperAdminGuard's own check — the system role, not just having
   *  the admin_support permission. Only this role can see every org's
   *  tickets and assign them out; every other Platform Team member is
   *  scoped to their own assigned tickets (see listForAdmin /
   *  assertAdminTicketAccess). */
  private isSuperAdmin(actor: JwtPayload): boolean {
    return actor.roles?.includes('super_admin') ?? false;
  }

  /** A non-super-admin Platform Team member may only view or act on a ticket
   *  assigned to them — 404s (not 403) so an unassigned ticket's existence
   *  isn't disclosed, matching "not shown in their list" for direct-id
   *  access too. Super Admin is always exempt. */
  private assertAdminTicketAccess(
    actor: JwtPayload,
    ticket: { assignedToId: string | null },
  ) {
    if (this.isSuperAdmin(actor)) return;
    if (ticket.assignedToId !== actor.sub) {
      throw new NotFoundException('Ticket not found');
    }
  }

  /** Marks this ticket's still-unread notifications read for one viewer (org)
   *  or the whole "all Super Admins" inbox plus this viewer (admin) — the
   *  same rows list()/unreadTicketIds reads to decide the row's indicator. */
  private async markTicketNotificationsRead(
    ticketId: string,
    scope: { recipientId: string; includeBroadcast?: boolean },
  ) {
    const recipientOr: Prisma.NotificationWhereInput[] = [
      { recipientId: scope.recipientId },
    ];
    if (scope.includeBroadcast) recipientOr.push({ recipientId: null });
    await this.prisma.notification.updateMany({
      where: {
        entity: 'SupportTicket',
        entityId: ticketId,
        readAt: null,
        OR: recipientOr,
      },
      data: { readAt: new Date() },
    });
  }

  /** Ticket ids (from `ticketIds`) that still have an unread notification for
   *  this viewer — drives the list's per-row "new activity" indicator. */
  private async unreadTicketIds(
    ticketIds: string[],
    scope: { recipientId: string; includeBroadcast?: boolean },
  ): Promise<Set<string>> {
    if (ticketIds.length === 0) return new Set();
    const recipientOr: Prisma.NotificationWhereInput[] = [
      { recipientId: scope.recipientId },
    ];
    if (scope.includeBroadcast) recipientOr.push({ recipientId: null });
    const rows = await this.prisma.notification.findMany({
      where: {
        entity: 'SupportTicket',
        entityId: { in: ticketIds },
        readAt: null,
        OR: recipientOr,
      },
      select: { entityId: true },
    });
    return new Set(
      rows.map((r) => r.entityId).filter((id): id is string => Boolean(id)),
    );
  }

  private async list(
    query: ListSupportTicketsQueryDto & { orgId?: string },
    isAdmin: boolean,
    unreadScope: { recipientId: string; includeBroadcast?: boolean },
    // Set only for a non-super-admin Platform Team member (see listForAdmin)
    // — narrows the whole list to tickets assigned to them.
    assignedToId?: string,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.SupportTicketWhereInput = {};
    if (query.orgId) where.orgId = query.orgId;
    if (query.status) where.status = query.status;
    if (assignedToId) where.assignedToId = assignedToId;
    if (query.search) {
      const search = query.search.replace(/^#?SR-/i, '');
      const asNumber = Number(search);
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        ...(Number.isFinite(asNumber) && search.trim() !== ''
          ? [{ number: asNumber }]
          : []),
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: TICKET_INCLUDE,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    const unreadIds = await this.unreadTicketIds(
      rows.map((r) => r.id),
      unreadScope,
    );

    return {
      data: rows.map((row) => this.serializeSummary(row, isAdmin, unreadIds.has(row.id))),
      total,
      page,
      limit,
    };
  }

  /**
   * Appends one message to a ticket's thread and applies the side effects:
   *  - a Platform Team reply moves a still-`open` ticket to `ongoing` and
   *    notifies the org member who raised it;
   *  - an org reply notifies every Super Admin (same inbox a new ticket
   *    lands in). It never changes status — only a Super Admin closes a
   *    ticket (see closeTicket).
   */
  private async addMessage(
    ticket: { id: string; orgId: string; raisedById: string; number: number; subject: string; status: string },
    actor: JwtPayload,
    dto: CreateSupportMessageDto,
    opts: { asAdmin: boolean },
  ) {
    // Resolved is a hard stop for both sides — the thread stays visible (see
    // getForOrg / getForAdmin) but read-only. Raising a fresh ticket is the
    // only way forward once one is closed.
    if (ticket.status === 'resolved') {
      throw new ForbiddenException(
        'This ticket is resolved and no longer accepts new messages. Raise a new ticket if you need further help.',
      );
    }

    const body = dto.body.trim();
    const attachmentUrls = dto.attachmentUrls ?? [];

    const created = await this.prisma.$transaction(async (tx) => {
      const message = await tx.supportMessage.create({
        data: { ticketId: ticket.id, senderId: actor.sub, body, attachmentUrls },
        include: MESSAGE_INCLUDE,
      });

      if (opts.asAdmin) {
        if (ticket.status === 'open') {
          await tx.supportTicket.update({
            where: { id: ticket.id },
            data: { status: 'ongoing' },
          });
        } else {
          // Touch updatedAt so the ticket resurfaces at the top of both
          // lists even when the status doesn't change.
          await tx.supportTicket.update({
            where: { id: ticket.id },
            data: {},
          });
        }
        await tx.notification.create({
          data: buildNotificationData({
            orgId: ticket.orgId,
            recipientId: ticket.raisedById,
            type: 'support_ticket_message',
            title: `New reply on SR-${ticket.number}: ${ticket.subject}`,
            body: body.slice(0, 160),
            entity: 'SupportTicket',
            entityId: ticket.id,
          }),
        });
      } else {
        await tx.supportTicket.update({ where: { id: ticket.id }, data: {} });
        await tx.notification.create({
          data: buildNotificationData({
            orgId: ticket.orgId,
            type: 'support_ticket_message',
            title: `New message on SR-${ticket.number}: ${ticket.subject}`,
            body: body.slice(0, 160),
            entity: 'SupportTicket',
            entityId: ticket.id,
          }),
        });
      }

      return message;
    });

    return this.serializeMessage(created, ticket.orgId);
  }

  private side(orgId: string, senderOrgId: string | null): 'org' | 'platform' {
    return senderOrgId === orgId ? 'org' : 'platform';
  }

  private serializeActor(actor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  }) {
    return {
      id: actor.id,
      name: [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.email,
      email: actor.email,
    };
  }

  private serializeMessage(message: MessageRow, orgId: string) {
    return {
      id: message.id,
      ticketId: message.ticketId,
      body: message.body,
      attachmentUrls: message.attachmentUrls,
      createdAt: message.createdAt,
      sender: this.serializeActor(message.sender),
      side: this.side(orgId, message.sender.orgId),
    };
  }

  private ticketCode(number: number): string {
    return `SR-${number}`;
  }

  private serializeSummary(ticket: TicketRow, isAdmin: boolean, hasUnread: boolean) {
    return {
      id: ticket.id,
      number: ticket.number,
      code: this.ticketCode(ticket.number),
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      raisedBy: this.serializeActor(ticket.raisedBy),
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      closedAt: ticket.closedAt,
      // Only meaningful while status is "on_hold" — the list's tooltip
      // reads this to show why. Left populated after a resume/close (see
      // holdTicket) so it stays available as a record if held again later.
      holdReason: ticket.holdReason,
      // Drives the list's "new activity" dot — true while an unread
      // notification for this ticket still exists for the viewer (org: the
      // ticket's raiser; admin: any Super Admin, shared inbox).
      hasUnread,
      ...(isAdmin
        ? {
            organisation: ticket.organisation,
            // Support Management only — which Platform Team member (if any)
            // this ticket is assigned to (see assignTicket).
            assignedTo: ticket.assignedTo ? this.serializeActor(ticket.assignedTo) : null,
          }
        : {}),
    };
  }

  private async serializeDetail(ticket: TicketRow, isAdmin: boolean) {
    const messages = await this.prisma.supportMessage.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: 'asc' },
      include: MESSAGE_INCLUDE,
    });
    return {
      ticket: {
        id: ticket.id,
        number: ticket.number,
        code: this.ticketCode(ticket.number),
        orgId: ticket.orgId,
        organisation: ticket.organisation,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        raisedBy: this.serializeActor(ticket.raisedBy),
        closedBy: ticket.closedBy ? this.serializeActor(ticket.closedBy) : null,
        closedAt: ticket.closedAt,
        holdReason: ticket.holdReason,
        heldBy: ticket.heldBy ? this.serializeActor(ticket.heldBy) : null,
        heldAt: ticket.heldAt,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        ...(isAdmin
          ? { assignedTo: ticket.assignedTo ? this.serializeActor(ticket.assignedTo) : null }
          : {}),
      },
      messages: messages.map((m) => this.serializeMessage(m, ticket.orgId)),
    };
  }
}
