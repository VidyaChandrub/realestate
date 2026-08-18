import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { EmployersRepository } from '../repositories/employers.repository';
import { EmployerNotFoundException } from '../exceptions/employer-not-found.exception';
import { EmployerUnauthorizedException } from '../exceptions/unauthorized.exception';
import { OrganizationRole } from '@prisma/client';
import { EmployerUsersService } from './employer-users.service';

@Injectable()
export class EmployersService {
    private readonly logger = new Logger(EmployersService.name);

    constructor(
        private readonly employersRepository: EmployersRepository,
        private readonly employerUsersService: EmployerUsersService,
    ) { }

    async create(createOrganizationDto: CreateOrganizationDto, userId: string, userDetails?: { email?: string; firstName?: string; lastName?: string }) {
        this.logger.log(`Creating organization: ${createOrganizationDto.name} by user ${userId}`);
        const organization = await this.employersRepository.create(createOrganizationDto);

        // Add creator as OWNER
        await this.employerUsersService.addUserToOrganization(organization.id, {
            userEmail: userDetails?.email || '',
            role: OrganizationRole.OWNER,
            status: 'ACTIVE' as any, // Creator is immediately active
            isActive: true,
            firstName: userDetails?.firstName,
            lastName: userDetails?.lastName,
        }, userId);

        return organization;
    }

    async findAll() {
        return this.employersRepository.findAll();
    }

    async findOne(id: string) {
        const organization = await this.employersRepository.findOne(id);
        if (!organization) {
            throw new EmployerNotFoundException(id);
        }
        return organization;
    }

    async update(id: string, updateOrganizationDto: UpdateOrganizationDto, userId: string) {
        // Check permission
        const role = await this.employerUsersService.getUserRole(userId, id);
        const user = await this.employersRepository.findUserById(userId);
        const isAdmin = user?.role === 'ADMIN';
        if (role !== OrganizationRole.OWNER && !isAdmin) {
          throw new EmployerUnauthorizedException(
            'Only the OWNER or ADMIN can update the organization',
          );
        }

        const organization = await this.findOne(id); // Ensure exists

        const contactPhone = updateOrganizationDto.contactPhone?.trim();
        if (contactPhone) {
            const existingOrganization = await this.employersRepository.findByContactPhone(contactPhone);
            if (existingOrganization && existingOrganization.id !== id) {
                throw new ConflictException('This mobile number is already taken');
            }
        }

        return this.employersRepository.update(id, updateOrganizationDto);
    }

    async findMyOrganizations(userId: string) {
        return this.employersRepository.findByUser(userId);
    }

    async getOrganizationUsers(id: string) {
        // Validate organization exists
        await this.findOne(id);
        
        // Fetch and return organization users
        const users = await this.employersRepository.getOrganizationUsers(id);
        return {
            success: true,
            data: users,
        };
    }

    async getOrganizationJobs(id: string) {
        await this.findOne(id);
        const jobs = await this.employersRepository.getOrganizationJobs(id);
        return {
            success: true,
            data: jobs.map((job) => ({
                id: job.id,
                title: job.title,
                status: job.status,
                createdAt: job.createdAt,
                publishedAt: job.publishedAt,
                organizationName: job.organization?.name ?? null,
                locationName: job.location?.value ?? null,
                employmentTypeName: job.employmentType?.value ?? null,
            })),
            total: jobs.length,
        };
    }

    async getOrganizationEvents(id: string) {
        await this.findOne(id);
        const events = await this.employersRepository.getOrganizationEvents(id);
        return {
            success: true,
            data: events.map((event) => ({
                id: event.id,
                title: event.title,
                status: event.status,
                startDate: event.startDate,
                endDate: event.endDate,
                mode: event.mode,
                createdAt: event.createdAt,
                bannerImage: event.bannerImage,
            })),
            total: events.length,
        };
    }
}
