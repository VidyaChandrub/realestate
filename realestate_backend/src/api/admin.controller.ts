import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard, SkipRoleCheck } from '../auth/roles.guard';
import { AdminService } from '../admin/services/admin.service';
import { JobsService } from '../jobs/services/jobs.service';
import { AdminListQueryDto } from '../admin/dto/admin-list-query.dto';
import { UpdateUserStatusDto } from '../admin/dto/update-user-status.dto';
import { RejectReasonDto } from '../admin/dto/reject-reason.dto';
import { BulkUserActionDto } from '../admin/dto/bulk-user-action.dto';

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly jobsService: JobsService,
  ) {}

  @Get('users')
  async listUsers(@Query() query: AdminListQueryDto) {
    const result = await this.adminService.listUsers(query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  // BULK ACTIONS — registered before the `users/:id` routes below so the
  // static "bulk" path segment isn't captured by the dynamic :id param.
  @Patch('users/bulk/activate')
  async bulkActivateUsers(@Body() dto: BulkUserActionDto) {
    return this.adminService.bulkUpdateUserStatus(dto.userIds, true);
  }

  @Patch('users/bulk/deactivate')
  async bulkDeactivateUsers(@Body() dto: BulkUserActionDto) {
    return this.adminService.bulkUpdateUserStatus(dto.userIds, false);
  }

  @Get('users/:id')
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.adminService.getUserById(id);
    return { success: true, data };
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    const data = await this.adminService.updateUserStatus(id, dto.isActive);
    return { success: true, data };
  }

  @Get('employers')
  async listOrganizations(@Query() query: AdminListQueryDto) {
    const result = await this.adminService.listOrganizations(query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Patch('employers/:id/approve')
  async approveOrganization(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.adminService.approveOrganization(id);
    return { success: true, data };
  }

  @Patch('employers/:id/suspend')
  async suspendOrganization(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.adminService.suspendOrganization(id);
    return { success: true, data };
  }

  @Get('jobs')
  async listJobs(@Query() query: AdminListQueryDto) {
    const result = await this.adminService.listJobs(query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  // ADMIN: sees inquiries for every property.
  // EMPLOYER (agency): sees inquiries only for properties owned by their organization (jobId required).
  // Skips the controller-level ADMIN role check; AdminService.listApplications()
  // enforces admin/agency ownership authorization itself.
  @SkipRoleCheck()
  @Get('applications')
  async listApplications(@Query() query: any, @Request() req) {
    const result = await this.adminService.listApplications(query, req.user.userId);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Patch('jobs/:id/approve')
  async approveJob(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.adminService.approveJob(id);
    return { success: true, data };
  }

  // ADMIN: can reject any property. EMPLOYER (agency): may reject only a property belonging to
  // their own organization (enforced server-side by JobsService.rejectJob,
  // never from client-supplied input). Skips the controller-level ADMIN role
  // check, same pattern as listApplications() above.
  @SkipRoleCheck()
  @Patch('jobs/:id/reject')
  async rejectJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectReasonDto,
    @Request() req,
  ) {
    const data = await this.jobsService.rejectJob(id, dto.reason, req.user.userId);
    return { success: true, data };
  }

  @Get('campaigns')
  async listCampaigns(@Query() query: AdminListQueryDto) {
    const result = await this.adminService.listCampaigns(query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Patch('campaigns/:id/approve')
  async approveCampaign(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.adminService.approveCampaign(id);
    return { success: true, data };
  }

  @Patch('campaigns/:id/reject')
  async rejectCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectReasonDto,
  ) {
    const data = await this.adminService.rejectCampaign(id, dto.reason);
    return { success: true, data };
  }

  @Get('events')
  async listEvents(@Query() query: AdminListQueryDto) {
    const result = await this.adminService.listEvents(query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Patch('events/:id/approve')
  async approveEvent(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.adminService.approveEvent(id);
    return { success: true, data };
  }

  @Patch('events/:id/cancel')
  async cancelEvent(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.adminService.cancelEvent(id);
    return { success: true, data };
  }

  @Get('dashboard/overview')
  async getDashboardOverview() {
    const data = await this.adminService.getDashboardOverview();
    return { success: true, data };
  }

  @Get('feed/health')
  async getFeedHealth() {
    const data = await this.adminService.getFeedHealth();
    return { success: true, data };
  }
}
