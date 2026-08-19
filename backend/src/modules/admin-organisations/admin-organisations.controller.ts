import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
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
  listUsers(@Param('id') id: string) {
    return this.adminOrganisationsService.listUsers(id);
  }

  @Get(':id/activity')
  listActivity(@Param('id') id: string) {
    return this.adminOrganisationsService.listActivity(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrganisationDto) {
    return this.adminOrganisationsService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrganisationStatusDto,
  ) {
    return this.adminOrganisationsService.updateStatus(id, dto);
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
}
