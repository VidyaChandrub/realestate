import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BroadcastsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.BroadcastNotificationCreateInput) {
    return this.prisma.broadcastNotification.create({ data });
  }

  update(id: string, data: Prisma.BroadcastNotificationUpdateInput) {
    return this.prisma.broadcastNotification.update({ where: { id }, data });
  }

  findById(id: string) {
    return this.prisma.broadcastNotification.findUnique({ where: { id } });
  }

  async findMany(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where = this.buildSearchWhere(search);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.broadcastNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.broadcastNotification.count({ where }),
    ]);

    return { data, total };
  }

  private buildSearchWhere(search?: string): Prisma.BroadcastNotificationWhereInput | undefined {
    if (!search) {
      return undefined;
    }

    const or: Prisma.BroadcastNotificationWhereInput[] = [
      { title: { contains: search, mode: 'insensitive' } },
    ];

    const parsedDate = this.parseSearchDate(search);
    if (parsedDate) {
      const startOfDay = new Date(parsedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(parsedDate);
      endOfDay.setHours(23, 59, 59, 999);

      or.push({ createdAt: { gte: startOfDay, lte: endOfDay } });
    }

    return { OR: or };
  }

  private parseSearchDate(search: string): Date | null {
    const value = search.trim();

    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const slashYmdMatch = value.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    const dmyMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    let year: number;
    let month: number;
    let day: number;

    if (isoMatch || slashYmdMatch) {
      const match = (isoMatch ?? slashYmdMatch)!;
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    } else if (dmyMatch) {
      day = Number(dmyMatch[1]);
      month = Number(dmyMatch[2]);
      year = Number(dmyMatch[3]);
    } else {
      return null;
    }

    const date = new Date(year, month - 1, day);
    const isValid =
      date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

    return isValid ? date : null;
  }
}
