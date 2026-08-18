import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Application, Prisma, ApplicationStatus } from '@prisma/client';
import { ListApplicationsDto } from '../dto/list-applications.dto';

@Injectable()
export class ApplicationsRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create a new application
     */
    async create(data: Prisma.ApplicationCreateInput): Promise<Application> {
        return this.prisma.application.create({ data });
    }

    /**
     * Find all applications with filtering and pagination
     */
    async findAll(query: ListApplicationsDto): Promise<{ applications: Application[]; total: number }> {
        const { jobId, userId, status, page, limit } = query;
        const pageNumber = page ?? 1;
        const limitNumber = limit ?? 20;
        const skip = (pageNumber - 1) * limitNumber;

        const where: Prisma.ApplicationWhereInput = {
            AND: [
                jobId ? { jobId } : {},
                userId ? { userId: userId } : {},
                status ? { status } : {},
            ],
        };

        const [applications, total] = await Promise.all([
            this.prisma.application.findMany({
                where,
                skip,
                take: limitNumber,
                orderBy: { appliedAt: 'desc' },
                include: {
                    job: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                        },
                    },
                    user: {
                        select: {
                            userId: true, // This is the id
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            }),
            this.prisma.application.count({ where }),
        ]);

        return { applications, total };
    }

    /**
     * Find a single application by ID
     */
    async findOne(id: string): Promise<Application | null> {
        return this.prisma.application.findUnique({
            where: { id },
            include: {
                job: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                    },
                },
                user: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }

    /**
     * Find application by user and job
     */
    async findByUserAndJob(userId: string, jobId: string): Promise<Application | null> {
        return this.prisma.application.findUnique({
            where: {
                jobId_userId: {
                    jobId,
                    userId: userId,
                },
            },
            include: {
                job: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                    },
                },
                user: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }

    /**
     * Update an application
     */
    async update(id: string, data: Prisma.ApplicationUpdateInput): Promise<Application> {
        return this.prisma.application.update({
            where: { id },
            data,
            include: {
                job: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                    },
                },
                user: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }

    /**
     * Delete an application
     */
    async delete(id: string): Promise<Application> {
        return this.prisma.application.delete({
            where: { id },
        });
    }

    /**
     * Count applications matching criteria
     */
    async count(where: Prisma.ApplicationWhereInput): Promise<number> {
        return this.prisma.application.count({ where });
    }
}
