import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class EmployersRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(createOrganizationDto: CreateOrganizationDto): Promise<Organization> {
        return this.prisma.organization.create({
            data: {
                ...createOrganizationDto,
                featuredUntil: createOrganizationDto.featuredUntil ? new Date(createOrganizationDto.featuredUntil) : undefined,
            },
        }) as unknown as Organization;
    }

    async findAll(): Promise<Organization[]> {
        return this.prisma.organization.findMany({
            where: { isDeleted: false }
        }) as unknown as Organization[];
    }

    async findOne(id: string): Promise<Organization | null> {
        return this.prisma.organization.findUnique({
            where: { id, isDeleted: false },
        }) as unknown as Organization | null;
    }

    async update(id: string, updateOrganizationDto: UpdateOrganizationDto): Promise<Organization> {
        return this.prisma.organization.update({
            where: { id },
            data: {
                ...updateOrganizationDto,
                featuredUntil: updateOrganizationDto.featuredUntil ? new Date(updateOrganizationDto.featuredUntil) : undefined,
            },
        }) as unknown as Organization;
    }

    // Find organizations where a user is a member
    async findByUser(userId: string): Promise<Organization[]> {
        return this.prisma.organization.findMany({
            where: {
                users: {
                    some: {
                        employer: {
                            userId: userId,
                        },
                        isDeleted: false,
                    },
                },
                isDeleted: false,
            },
            include: {
                users: {
                    where: {
                        isDeleted: false,
                    },
                    include: {
                        employer: true,
                    },
                },
            },
        }) as unknown as Organization[];
    }

    // Get organization users for team listing
    async getOrganizationUsers(id: string) {
        return this.prisma.employerUser.findMany({
            where: {
                organizationId: id,
                isDeleted: false,
            },
            include: {
                employer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        userId: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async getOrganizationJobs(id: string) {
        return this.prisma.job.findMany({
            where: {
                organizationId: id,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                location: {
                    select: {
                        value: true,
                    },
                },
                employmentType: {
                    select: {
                        value: true,
                    },
                },
                organization: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }

    async getOrganizationEvents(id: string) {
        return this.prisma.event.findMany({
            where: {
                organizationId: id,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findByContactPhone(contactPhone: string): Promise<Organization | null> {
        return this.prisma.organization.findFirst({
            where: {
                contactPhone,
                isDeleted: false,
            },
        }) as unknown as Organization | null;
    }

    async findUserById(userId: string) {
        return this.prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                role: true,
            },
        });
    }
}
