// src/events/repositories/events.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Event, Prisma } from '@prisma/client';
import { ListEventsDto } from '../dto/list-events.dto';

@Injectable()
export class EventsRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.EventCreateInput): Promise<Event> {
        return this.prisma.event.create({ data });
    }

    async findById(id: string): Promise<Event | null> {
        return this.prisma.event.findUnique({ where: { id } });
    }

    async findAll(query: ListEventsDto): Promise<{ events: any[]; total: number }> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.EventWhereInput = {
            ...(query.search ? {
                OR: [
                    { title: { contains: query.search, mode: 'insensitive' } },
                    { organization: { name: { contains: query.search, mode: 'insensitive' } } },
                ],
            } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.mode ? { mode: query.mode } : {}),
            ...(query.organizationId ? { organizationId: query.organizationId } : {}),
            ...(query.startDateFrom || query.startDateTo
                ? {
                    startDate: {
                        ...(query.startDateFrom ? { gte: new Date(query.startDateFrom) } : {}),
                        ...(query.startDateTo ? { lte: new Date(query.startDateTo) } : {}),
                    },
                }
                : {}),
        };

        const [events, total] = await Promise.all([
            this.prisma.event.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ boostScore: 'desc' }, { startDate: 'asc' }],
                include: {
                    organization: {
                        select: {
                            name: true,
                        },
                    },
                },
            }),
            this.prisma.event.count({ where }),
        ]);

        const formattedEvents = events.map(({ organization, ...event }) => ({
            ...event,
            organizationName: organization?.name ?? null,
        }));

        return { events: formattedEvents, total };
    }

    async update(id: string, data: Prisma.EventUpdateInput): Promise<Event> {
        return this.prisma.event.update({ where: { id }, data });
    }

    async updateKeywords(id: string, keywords: string | null): Promise<void> {
        if (!keywords) {
            await this.prisma.$executeRaw`
                UPDATE "events"."events"
                SET "keywords" = NULL
                WHERE "id" = ${id}
            `;
            return;
        }

        await this.prisma.$executeRaw`
            UPDATE "events"."events"
            SET "keywords" = to_tsvector('simple', ${keywords})
            WHERE "id" = ${id}
        `;
    }

    async updateEmbedding(id: string, embedding: number[] | null): Promise<void> {
        if (!embedding) {
            await this.prisma.$executeRaw`
                UPDATE "events"."events"
                SET "embedding" = NULL
                WHERE "id" = ${id}
            `;
            return;
        }

        const vectorString = `[${embedding.join(',')}]`;
        await this.prisma.$executeRaw`
            UPDATE "events"."events"
            SET "embedding" = ${vectorString}::vector
            WHERE "id" = ${id}
        `;
    }

    async countActiveRegistrations(eventId: string): Promise<number> {
        return this.prisma.eventRegistration.count({
            where: {
                eventId,
                status: { in: ['REGISTERED', 'ATTENDED'] },
            },
        });
    }

    async countByMasterDataId(masterDataId: string): Promise<number> {
        return this.prisma.event.count({
            where: {
                status: 'ACTIVE',
                OR: [
                    { categoryId: masterDataId },
                    { locationId: masterDataId },
                    { tagIds: { has: masterDataId } },
                ],
            },
        });
    }
  async cancelAllRegistrations(eventId: string): Promise<void> {
    await this.prisma.eventRegistration.updateMany({
      where: { eventId, status: { in: ['REGISTERED', 'ATTENDED'] } },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Reverses cancelAllRegistrations() when a CANCELLED event is republished.
   * There's no per-row snapshot of what a registration's status was before the
   * event-level cancellation (REGISTERED vs ATTENDED), so this restores every
   * CANCELLED registration to REGISTERED — the same state registerForEvent()
   * uses when a user re-registers after individually cancelling.
   */
  async reactivateAllRegistrations(eventId: string): Promise<void> {
    await this.prisma.eventRegistration.updateMany({
      where: { eventId, status: 'CANCELLED' },
      data: { status: 'REGISTERED' },
    });
  }
  async delete(id: string): Promise<Event> {
    await this.prisma.eventRegistration.deleteMany({ where: { eventId: id } });
    return this.prisma.event.delete({ where: { id } });
  }
}
