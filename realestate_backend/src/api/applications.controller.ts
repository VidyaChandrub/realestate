import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { ApplicationsService } from '../applications/services/applications.service';
import { CreateApplicationDto } from '../applications/dto/create-application.dto';
import { UpdateApplicationDto } from '../applications/dto/update-application.dto';
import { ListApplicationsDto } from '../applications/dto/list-applications.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Application } from '@prisma/client';

/**
 * Applications Controller
 * Handles HTTP requests for job applications
 */
@Controller('api/v1/applications')
export class ApplicationsController {
    constructor(private readonly applicationsService: ApplicationsService) { }

    /**
     * Create a new application
     * POST /api/v1/applications
     * @requires Authentication
     * @requires USER role
     */
    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() createApplicationDto: CreateApplicationDto, @Request() req): Promise<Application> {
        return this.applicationsService.create(
            createApplicationDto,
            req.user.userId,
            req.user.role ? [req.user.role] : []
        );
    }

    /**
     * List applications
     * GET /api/v1/applications
     * @requires Authentication
     * - USER: lists own applications
     * - EMPLOYER: lists all applications (can filter by jobId)
     */
    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(@Query() query: ListApplicationsDto, @Request() req) {
        return this.applicationsService.findAll(query, req.user.userId, req.user.role ? [req.user.role] : []);
    }

    /**
     * Get applications for a specific job
     * GET /api/v1/jobs/:jobId/applications
     * @requires Authentication
     * @requires EMPLOYER role
     * @requires Job ownership
     */
    @UseGuards(JwtAuthGuard)
    @Get('jobs/:jobId')
    findByJob(@Param('jobId', ParseUUIDPipe) jobId: string, @Request() req): Promise<Application[]> {
        return this.applicationsService.findByJob(jobId, req.user.userId, req.user.role ? [req.user.role] : []);
    }

    /**
     * Get a single application
     * GET /api/v1/applications/:id
     * @requires Authentication
     * - USER: can view own applications
     * - EMPLOYER: can view applications for jobs they own
     */
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req): Promise<Application> {
        return this.applicationsService.findOne(id, req.user.userId, req.user.role ? [req.user.role] : []);
    }

    /**
     * Update application status
     * PATCH /api/v1/applications/:id
     * @requires Authentication
     * @requires EMPLOYER role
     * @requires Job ownership
     */
    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateApplicationDto: UpdateApplicationDto,
        @Request() req
    ): Promise<Application> {
        return this.applicationsService.update(id, updateApplicationDto, req.user.userId, req.user.role ? [req.user.role] : []);
    }

    /**
     * Delete an application
     * DELETE /api/v1/applications/:id
     * @requires Authentication
     * @requires USER role
     * @requires Ownership
     */
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req): Promise<{ message: string }> {
        await this.applicationsService.remove(id, req.user.userId, req.user.role ? [req.user.role] : []);
        return { message: 'Application deleted successfully' };
    }
}
