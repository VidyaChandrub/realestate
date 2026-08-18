import { Injectable, Logger } from '@nestjs/common';
import { AddEmployerUserDto } from '../dto/add-employer-user.dto';
import { EmployerUsersRepository } from '../repositories/employer-users.repository';
import { OrganizationRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class EmployerUsersService {
    private readonly logger = new Logger(EmployerUsersService.name);

    constructor(
        private readonly employerUsersRepository: EmployerUsersRepository,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Add a user to an organization by email
     */
    async addUserToOrganization(organizationId: string, addEmployerUserDto: AddEmployerUserDto, userId?: string) {
        this.logger.log(`Adding user with email ${addEmployerUserDto.userEmail} to organization ${organizationId} with role ${addEmployerUserDto.role}`);

        let resolvedUserId = userId;
        let firstName = addEmployerUserDto.firstName;
        let lastName = addEmployerUserDto.lastName;

        // 1. If userId not provided, find user profile by email
        if (!resolvedUserId) {
            const profile = await this.prisma.profile.findUnique({
                where: { email: addEmployerUserDto.userEmail },
            });
            resolvedUserId = profile?.userId || undefined;
            firstName = firstName || profile?.firstName || undefined;
            lastName = lastName || profile?.lastName || undefined;
        }

        const syncData = {
            email: addEmployerUserDto.userEmail,
            userId: resolvedUserId,
            firstName,
            lastName,
        };

        // 2. Find or create the Employer profile
        const employerId = await this.employerUsersRepository.findOrCreateEmployer({
            email: syncData.email,
            userId: syncData.userId,
            firstName: syncData.firstName,
            lastName: syncData.lastName,
        });

        // 3. Create organization membership
        return this.employerUsersRepository.create(organizationId, employerId, addEmployerUserDto);
    }

    /**
     * Check if a user has a specific role or higher in an organization
     */
    async checkUserRole(userId: string, organizationId: string, requiredRole: OrganizationRole): Promise<boolean> {
        const role = await this.employerUsersRepository.findUserRole(userId, organizationId);
        if (!role) return false;

        if (requiredRole === OrganizationRole.OWNER) return role === OrganizationRole.OWNER;
        if (requiredRole === OrganizationRole.HR) return role === OrganizationRole.OWNER || role === OrganizationRole.HR;
        if (requiredRole === OrganizationRole.RECRUITER) return true; // Any role covers agent-level access usually

        return false;
    }

    async getUserRole(userId: string, organizationId: string): Promise<OrganizationRole | null> {
        return this.employerUsersRepository.findUserRole(userId, organizationId);
    }

    async getMe(userId: string) {
        const memberships = await this.employerUsersRepository.findByEmployerKeycloakId(userId);

        // Select default organization
        const activeMembership = memberships.find(m => m.isActive && !m.isDeleted);
        const defaultMembership = activeMembership || memberships[0];
        const defaultOrganization = defaultMembership?.organization;
        const defaultOrganizationId = defaultOrganization?.id;

        return {
            memberships,
            defaultOrganization,
            defaultOrganizationId,
        };
    }
}
