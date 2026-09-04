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
import { ListOrgUnitsQueryDto } from './dto/list-org-units-query.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

// The "All Units" screen — a flat, cross-project view of the org's whole
// inventory (GET). Also the home of *standalone* units: resale / broker
// listings with no project (POST / GET :id / PATCH / DELETE here). Units
// that belong to a project are still created/edited through the nested
// /org/projects/:projectId/units routes. Same guard stack (Org Admin only),
// orgId always from the JWT.
@UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard)
@Controller('org/units')
export class OrgUnitsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListOrgUnitsQueryDto) {
    return this.service.listAllUnits(user.orgId as string, query);
  }

  @Post()
  createStandalone(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateUnitDto,
  ) {
    return this.service.createStandaloneUnit(user.orgId as string, dto);
  }

  @Get(':id')
  getStandalone(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getStandaloneUnit(user.orgId as string, id);
  }

  @Patch(':id')
  updateStandalone(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.service.updateStandaloneUnit(user.orgId as string, id, dto);
  }

  @Delete(':id')
  removeStandalone(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.removeStandaloneUnit(user.orgId as string, id);
  }
}
