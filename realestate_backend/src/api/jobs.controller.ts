import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ParseUUIDPipe, HttpCode, HttpStatus, Header } from '@nestjs/common';
import { JobsService } from '../jobs/services/jobs.service';
import { UpdateJobDto } from '../jobs/dto/update-job.dto';
import { JobSearchQueryDto } from '../jobs/dto/job-search-query.dto';
import { ListJobExternalClicksDto } from '../jobs/dto/list-job-external-clicks.dto';
import { BulkJobActionDto, BulkRejectJobDto } from '../jobs/dto/bulk-job-action.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/jobs')
export class JobsController {
    constructor(private readonly jobsService: JobsService) { }

    @Get()
    findAll(@Query() query: JobSearchQueryDto) {
        return this.jobsService.findAll(query);
    }

    @UseGuards(JwtAuthGuard)
    @Get('saved')
    getSavedJobs(@Request() req) {
        return this.jobsService.getSavedJobs(req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // BULK ACTIONS — registered before the `:id` routes below so static
    // "bulk" path segments aren't captured by the dynamic :id param.
    // ──────────────────────────────────────────────────────────────────────────
    @UseGuards(JwtAuthGuard)
    @Patch('bulk/publish')
    bulkPublish(@Body() dto: BulkJobActionDto, @Request() req) {
        return this.jobsService.bulkPublish(dto.jobIds, req.user.userId);
    }

    // Admins may reject any job in the batch; employers may only reject jobs
    // belonging to their own organization. Ownership is verified server-side in
    // JobsService.bulkReject() per job, from the authenticated user.
    @UseGuards(JwtAuthGuard)
    @Patch('bulk/reject')
    bulkReject(@Body() dto: BulkRejectJobDto, @Request() req) {
        return this.jobsService.bulkReject(dto.jobIds, dto.reason, req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('bulk')
    bulkRemove(@Body() dto: BulkJobActionDto, @Request() req) {
        return this.jobsService.bulkRemove(dto.jobIds, req.user.userId);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.jobsService.findOne(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/save')
    saveJob(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        return this.jobsService.saveJob(id, req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id/save')
    unsaveJob(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        return this.jobsService.unsaveJob(id, req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateJobDto: UpdateJobDto,
        @Request() req
    ) {
        return this.jobsService.update(id, updateJobDto, req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        return this.jobsService.remove(id, req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/publish')
    publish(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        return this.jobsService.publish(id, req.user.userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TRACK EXTERNAL CLICK — authenticated user (external jobs only)
    // ──────────────────────────────────────────────────────────────────────────
    @UseGuards(JwtAuthGuard)
    @Post(':id/external-click')
    @HttpCode(HttpStatus.OK)
    async trackExternalClick(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        await this.jobsService.trackExternalClick(id, req.user.userId);
        return { success: true };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET EXTERNAL CLICKS — employer only
    // ──────────────────────────────────────────────────────────────────────────
    @UseGuards(JwtAuthGuard)
    @Get(':id/external-clicks')
    getExternalClicks(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: ListJobExternalClicksDto,
        @Request() req,
    ) {
        return this.jobsService.getExternalClicks(id, req.user.userId, query);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // EXPORT EXTERNAL CLICKS — employer only (CSV)
    // ──────────────────────────────────────────────────────────────────────────
    @UseGuards(JwtAuthGuard)
    @Get(':id/external-clicks/export')
    @Header('Content-Type', 'text/csv')
    @Header('Content-Disposition', 'attachment; filename="job-external-clicks.csv"')
    exportExternalClicks(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        return this.jobsService.exportExternalClicksCsv(id, req.user.userId);
    }
}
