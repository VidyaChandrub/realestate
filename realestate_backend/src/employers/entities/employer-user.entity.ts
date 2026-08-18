import { Organization } from './organization.entity';
import { OrganizationRole, EmployerUserStatus } from '@prisma/client';
import { Employer } from './employer.entity';

export class EmployerUser {
    id: string;

    employerId: string;
    employer?: Employer;

    organizationId: string;
    organization?: Organization;

    role: OrganizationRole;

    status: EmployerUserStatus;   // INVITED | ACTIVE | SUSPENDED
    isActive: boolean;

    invitedById?: string | null;  // employer who invited this user
    invitedAt?: Date | null;

    permissions?: string[];       // optional granular permissions

    joinedAt: Date;

    createdAt: Date;
    updatedAt: Date;

    // Soft delete support
    isDeleted: boolean;
    deletedAt?: Date | null;
}
