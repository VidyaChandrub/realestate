import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AddEmployerUserDto } from '../dto/add-employer-user.dto';
import { EmployerUser } from '../entities/employer-user.entity';
import { OrganizationRole } from '@prisma/client';

@Injectable()
export class EmployerUsersRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findOrCreateEmployer(data: { email: string; userId?: string; firstName?: string; lastName?: string }): Promise<string> {
        const employer = await this.prisma.employer.upsert({
            where: { email: data.email },
            update: {
                userId: data.userId,
                firstName: data.firstName,
                lastName: data.lastName,
            },
            create: {
                email: data.email,
                userId: data.userId,
                firstName: data.firstName,
                lastName: data.lastName,
            },
        });
        return employer.id;
    }

    async create(organizationId: string, employerId: string, addEmployerUserDto: AddEmployerUserDto): Promise<EmployerUser> {
        const created = await this.prisma.employerUser.create({
            data: {
                organizationId,
                employerId,
                role: addEmployerUserDto.role,
                status: addEmployerUserDto.status,
                isActive: addEmployerUserDto.isActive,
                invitedById: addEmployerUserDto.invitedById,
                permissions: addEmployerUserDto.permissions,
                invitedAt: addEmployerUserDto.invitedById ? new Date() : undefined,
            },
            include: {
                employer: true,
                organization: true,
            }
        });
        return created as unknown as EmployerUser;
    }

    async findUserRole(userId: string, organizationId: string): Promise<OrganizationRole | null> {
        const membership = await this.prisma.employerUser.findFirst({
            where: {
                organizationId,
                employer: {
                    userId: userId,
                },
                isDeleted: false,
            },
        });
        return membership ? membership.role : null;
    }

    async findByEmployerKeycloakId(userId: string): Promise<EmployerUser[]> {
        const memberships = await this.prisma.employerUser.findMany({
            where: {
                employer: {
                    userId: userId,
                },
                isDeleted: false,
            },
            include: {
                employer: true,
                organization: true,
            },
        });
        return memberships as unknown as EmployerUser[];
    }
}
