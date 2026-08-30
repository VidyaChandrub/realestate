import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Super Admin's global inbox: rows addressed to "all super admins"
  // (recipientId null) plus any addressed to this specific user.
  async list(recipientId: string, query: { page?: number; limit?: number; unreadOnly?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: any = {
      OR: [{ recipientId: null }, { recipientId }],
    };
    if (query.unreadOnly === 'true') where.readAt = null;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          organisation: { select: { id: true, name: true, slug: true, subdomain: true } },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async unreadCount(recipientId: string) {
    const count = await this.prisma.notification.count({
      where: { OR: [{ recipientId: null }, { recipientId }], readAt: null },
    });
    return { count };
  }

  async markRead(id: string, recipientId: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.recipientId !== null && notif.recipientId !== recipientId) {
      throw new NotFoundException('Notification not found');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(recipientId: string) {
    await this.prisma.notification.updateMany({
      where: { OR: [{ recipientId: null }, { recipientId }], readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}
