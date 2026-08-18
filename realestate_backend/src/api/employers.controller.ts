import {
    Controller, Get, Post, Body, Patch, Param, UseGuards, Request, ParseUUIDPipe,
    UseInterceptors, UploadedFile, BadRequestException, InternalServerErrorException, Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmployersService } from '../employers/services/employers.service';
import { EmployerUsersService } from '../employers/services/employer-users.service';
import { StorageService } from '../ads/services/storage.service';
import { CreateOrganizationDto } from '../employers/dto/create-organization.dto';
import { UpdateOrganizationDto } from '../employers/dto/update-organization.dto';
import { AddEmployerUserDto } from '../employers/dto/add-employer-user.dto';
import { OrganizationRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmployerUnauthorizedException } from '../employers/exceptions/unauthorized.exception';

const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_LOGO_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
];

@Controller('api/v1/employers')
export class EmployersController {
    private readonly logger = new Logger(EmployersController.name);

    constructor(
        private readonly employersService: EmployersService,
        private readonly employerUsersService: EmployerUsersService,
        private readonly storageService: StorageService,
    ) { }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Request() req) {
        const data = await this.employerUsersService.getMe(req.user.userId);
        return {
            success: true,
            data,
        };
    }

    /**
     * Upload an organization logo to Cloudflare R2.
     * Accepts multipart/form-data with a single file field named "file".
     * Returns { url: string } to be passed as `logoUrl` on create/update.
     */
    @UseGuards(JwtAuthGuard)
    @Post('upload-logo')
    @UseInterceptors(FileInterceptor('file'))
    async uploadLogo(@UploadedFile() file?: Express.Multer.File) {
        if (!file || !file.buffer || file.buffer.length === 0) {
            throw new BadRequestException('Image file is required');
        }

        if (!ALLOWED_LOGO_MIME_TYPES.includes(file.mimetype)) {
            throw new BadRequestException(
                `Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_LOGO_MIME_TYPES.join(', ')}`,
            );
        }

        if (file.size > MAX_LOGO_FILE_SIZE) {
            throw new BadRequestException(
                `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed: ${MAX_LOGO_FILE_SIZE / 1024 / 1024} MB`,
            );
        }

        try {
            const url = await this.storageService.uploadFile(
                file.buffer,
                file.originalname,
                file.mimetype,
                'organization-logos',
            );

            return { url };
        } catch (error) {
            this.logger.error(
                `Failed to upload organization logo "${file.originalname}"`,
                error instanceof Error ? error.stack : error,
            );
            throw new InternalServerErrorException(
                'Failed to upload image. Please try again in a moment.',
            );
        }
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() createOrganizationDto: CreateOrganizationDto, @Request() req) {
        return this.employersService.create(createOrganizationDto, req.user.userId, {
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
        });
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(@Request() req) {
        return this.employersService.findMyOrganizations(req.user.userId);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.employersService.findOne(id);
    }

    @Get(':id/jobs')
    getOrganizationJobs(@Param('id', ParseUUIDPipe) id: string) {
        return this.employersService.getOrganizationJobs(id);
    }

    @Get(':id/events')
    getOrganizationEvents(@Param('id', ParseUUIDPipe) id: string) {
        return this.employersService.getOrganizationEvents(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateOrganizationDto: UpdateOrganizationDto,
        @Request() req
    ) {
        return this.employersService.update(id, updateOrganizationDto, req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id/users')
    async getOrganizationUsers(@Param('id', ParseUUIDPipe) id: string) {
        return this.employersService.getOrganizationUsers(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/users')
    async addUser(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() addEmployerUserDto: AddEmployerUserDto,
        @Request() req
    ) {
        const requesterRole = await this.employerUsersService.getUserRole(req.user.userId, id);
        if (requesterRole !== OrganizationRole.OWNER) {
            throw new EmployerUnauthorizedException('Only the OWNER can add users to the organization');
        }

        return this.employerUsersService.addUserToOrganization(id, addEmployerUserDto);
    }
}
