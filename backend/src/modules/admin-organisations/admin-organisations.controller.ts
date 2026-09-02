import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { AdminOrganisationsService } from './admin-organisations.service';
import { OnboardCompanyDto } from './dto/onboard-company.dto';
import { OnboardAdminDto } from './dto/onboard-admin.dto';
import { ActivateOrganisationDto } from './dto/activate-organisation.dto';
import { ListOrganisationsQueryDto } from './dto/list-organisations-query.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { UpdateOrganisationStatusDto } from './dto/update-organisation-status.dto';
import { LogoUploadUrlDto } from './dto/logo-upload-url.dto';
import { CreateOrgUserDto } from '../org-users/dto/create-org-user.dto';
import { UpdateOrgUserStatusDto } from '../org-users/dto/update-org-user-status.dto';
import { ListOrgUsersQueryDto } from '../org-users/dto/list-org-users-query.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/organisations')
export class AdminOrganisationsController {
  constructor(
    private readonly adminOrganisationsService: AdminOrganisationsService,
  ) {}

  @Get()
  list(@Query() query: ListOrganisationsQueryDto) {
    return this.adminOrganisationsService.list(query);
  }

  @Get('summary')
  summary() {
    return this.adminOrganisationsService.summary();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.adminOrganisationsService.getById(id);
  }

  @Get(':id/users')
  listUsers(@Param('id') id: string, @Query() query: ListOrgUsersQueryDto) {
    return this.adminOrganisationsService.listUsers(id, query);
  }

  @Post(':id/users')
  createUser(@Param('id') id: string, @Body() dto: CreateOrgUserDto) {
    return this.adminOrganisationsService.createUser(id, dto);
  }

  @Patch(':id/users/:userId/status')
  updateUserStatus(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateOrgUserStatusDto,
  ) {
    return this.adminOrganisationsService.updateUserStatus(id, userId, dto);
  }

  @Get(':id/activity')
  listActivity(@Param('id') id: string) {
    return this.adminOrganisationsService.listActivity(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrganisationDto) {
    return this.adminOrganisationsService.update(id, dto);
  }

  @Post(':id/logo-upload-url')
  logoUploadUrl(@Param('id') id: string, @Body() dto: LogoUploadUrlDto) {
    return this.adminOrganisationsService.createAssetUploadUrl(id, 'logo', dto);
  }

  @Post(':id/favicon-upload-url')
  faviconUploadUrl(@Param('id') id: string, @Body() dto: LogoUploadUrlDto) {
    return this.adminOrganisationsService.createAssetUploadUrl(id, 'favicon', dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrganisationStatusDto,
  ) {
    return this.adminOrganisationsService.updateStatus(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.adminOrganisationsService.remove(id, actor);
  }

  @Post('onboard/company')
  onboardCompany(@Body() dto: OnboardCompanyDto) {
    return this.adminOrganisationsService.onboardCompany(dto);
  }

  @Post(':orgId/onboard/admin')
  onboardAdmin(@Param('orgId') orgId: string, @Body() dto: OnboardAdminDto) {
    return this.adminOrganisationsService.onboardAdmin(orgId, dto);
  }

  @Post(':orgId/onboard/activate')
  @HttpCode(200)
  activate(
    @Param('orgId') orgId: string,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: ActivateOrganisationDto,
  ) {
    return this.adminOrganisationsService.activate(orgId, actor, dto);
  }

  @Get(':id/templates')
  getTemplates(@Param('id') id: string) {
    return this.adminOrganisationsService.getOrgTemplates(id);
  }

  @Put(':id/templates')
  @HttpCode(200)
  setTemplates(
    @Param('id') id: string,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: { templateIds: string[] },
  ) {
    return this.adminOrganisationsService.setOrgTemplates(id, actor, dto.templateIds);
  }

  @Get(':id/domains')
  getDomains(@Param('id') id: string) {
    return this.adminOrganisationsService.getOrgDomains(id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  approve(
    @Param('id') id: string,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: { planId?: string; billingCycle?: 'monthly' | 'yearly'; templateIds?: string[] },
  ) {
    return this.adminOrganisationsService.approvePending(id, actor, dto);
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(
    @Param('id') id: string,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: { reason?: string },
  ) {
    return this.adminOrganisationsService.rejectPending(id, actor, dto?.reason);
  }
}
