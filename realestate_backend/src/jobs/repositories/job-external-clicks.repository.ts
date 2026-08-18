import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface JobExternalClickWithUser {
    id: string;
    jobId: string;
    userId: string;
    clickedAt: Date;
    user: {
        fullName: string | null;
        email: string | null;
    } | null;
}

@Injectable()
export class JobExternalClicksRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(jobId: string, userId: string): Promise<{ id: string }> {
        return this.prisma.jobExternalClick.create({
            data: {
                job: { connect: { id: jobId } },
                user: { connect: { userId } },
            },
            select: { id: true },
        });
    }

    async countByJob(jobId: string): Promise<number> {
        return this.prisma.jobExternalClick.count({ where: { jobId } });
    }

    async countsByJobs(jobIds: string[]): Promise<Map<string, number>> {
        if (jobIds.length === 0) return new Map();

        const rows = await this.prisma.jobExternalClick.groupBy({
            by: ['jobId'],
            where: { jobId: { in: jobIds } },
            _count: { jobId: true },
        });

        return new Map(rows.map((r) => [r.jobId, r._count.jobId]));
    }

    async findByJob(
        jobId: string,
        page: number,
        limit: number,
    ): Promise<{ clicks: JobExternalClickWithUser[]; total: number }> {
        const [clicks, total] = await Promise.all([
            this.prisma.jobExternalClick.findMany({
                where: { jobId },
                orderBy: { clickedAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: {
                        select: { fullName: true, email: true },
                    },
                },
            }),
            this.prisma.jobExternalClick.count({ where: { jobId } }),
        ]);

        return { clicks, total };
    }

    async findAllByJob(jobId: string): Promise<JobExternalClickWithUser[]> {
        return this.prisma.jobExternalClick.findMany({
            where: { jobId },
            orderBy: { clickedAt: 'desc' },
            include: {
                user: {
                    select: { fullName: true, email: true },
                },
            },
        });
    }
}
