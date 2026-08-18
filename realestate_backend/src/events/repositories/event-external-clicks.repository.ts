import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface ExternalClickWithUser {
    id: string;
    eventId: string;
    userId: string;
    clickedAt: Date;
    user: {
        fullName: string | null;
        email: string | null;
    } | null;
}

@Injectable()
export class EventExternalClicksRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(eventId: string, userId: string): Promise<{ id: string }> {
        return this.prisma.eventExternalClick.create({
            data: {
                event: { connect: { id: eventId } },
                user: { connect: { userId } },
            },
            select: { id: true },
        });
    }

    async countByEvent(eventId: string): Promise<number> {
        return this.prisma.eventExternalClick.count({ where: { eventId } });
    }

    async countsByEvents(eventIds: string[]): Promise<Map<string, number>> {
        if (eventIds.length === 0) return new Map();

        const rows = await this.prisma.eventExternalClick.groupBy({
            by: ['eventId'],
            where: { eventId: { in: eventIds } },
            _count: { eventId: true },
        });

        return new Map(rows.map((r) => [r.eventId, r._count.eventId]));
    }

    async findByEvent(
        eventId: string,
        page: number,
        limit: number,
    ): Promise<{ clicks: ExternalClickWithUser[]; total: number }> {
        const [clicks, total] = await Promise.all([
            this.prisma.eventExternalClick.findMany({
                where: { eventId },
                orderBy: { clickedAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: {
                        select: { fullName: true, email: true },
                    },
                },
            }),
            this.prisma.eventExternalClick.count({ where: { eventId } }),
        ]);

        return { clicks, total };
    }
}
