import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { CreateUnitTypeDto } from './dto/create-unit-type.dto';
import { UpdateUnitTypeDto } from './dto/update-unit-type.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto, UpdateUnitStatusDto } from './dto/update-unit.dto';
import { ListUnitsQueryDto } from './dto/list-units-query.dto';

// Every route derives orgId from the JWT — never from a param or body — so
// one org can never read or touch another org's projects, unit types, or
// units. Same guard stack as every other org module: Org Admin only.
@UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard)
@Controller('org/projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  // --- Media uploads ---
  // Returns { uploadUrl, publicUrl, ... }. The browser PUTs the file to
  // uploadUrl, then submits publicUrl as the field value through the normal
  // create/update endpoints (plain string columns — no change there).
  @Post('upload-url')
  createUploadUrl(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateUploadUrlDto,
  ) {
    return this.service.createUploadUrl(user.orgId as string, dto);
  }

  // --- Projects ---

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProjectDto) {
    return this.service.create(user.orgId as string, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListProjectsQueryDto) {
    return this.service.list(user.orgId as string, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getById(user.orgId as string, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.service.update(user.orgId as string, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.orgId as string, id);
  }

  // --- Unit types (nested under a project) ---

  @Post(':projectId/unit-types')
  createUnitType(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: CreateUnitTypeDto,
  ) {
    return this.service.createUnitType(user.orgId as string, projectId, dto);
  }

  @Get(':projectId/unit-types')
  listUnitTypes(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
  ) {
    return this.service.listUnitTypes(user.orgId as string, projectId);
  }

  @Get(':projectId/unit-types/:id')
  getUnitType(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.service.getUnitType(user.orgId as string, projectId, id);
  }

  @Patch(':projectId/unit-types/:id')
  updateUnitType(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUnitTypeDto,
  ) {
    return this.service.updateUnitType(user.orgId as string, projectId, id, dto);
  }

  @Delete(':projectId/unit-types/:id')
  removeUnitType(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.service.removeUnitType(user.orgId as string, projectId, id);
  }

  // --- Units (flat per project; the owning unit type is in the body) ---

  @Post(':projectId/units')
  createUnit(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: CreateUnitDto,
  ) {
    return this.service.createUnit(user.orgId as string, projectId, dto);
  }

  @Get(':projectId/units')
  listUnits(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Query() query: ListUnitsQueryDto,
  ) {
    return this.service.listUnits(user.orgId as string, projectId, query);
  }

  @Get(':projectId/units/:id')
  getUnit(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.service.getUnit(user.orgId as string, projectId, id);
  }

  @Patch(':projectId/units/:id')
  updateUnit(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.service.updateUnit(user.orgId as string, projectId, id, dto);
  }

  @Patch(':projectId/units/:id/status')
  updateUnitStatus(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUnitStatusDto,
  ) {
    return this.service.updateUnitStatus(user.orgId as string, projectId, id, dto);
  }

  @Delete(':projectId/units/:id')
  removeUnit(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.service.removeUnit(user.orgId as string, projectId, id);
  }
}
