import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgProjectTypesService } from './org-project-types.service';
import {
  CreateProjectTypeDto,
  UpdateProjectTypeDto,
} from './dto/project-type.dto';

// Org project types (layout + field templates). orgId always comes from the
// JWT, never from the client.
@UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
@Controller('org/project-types')
export class OrgProjectTypesController {
  constructor(private readonly service: OrgProjectTypesService) {}

  @RequirePermission('projects', 'view')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.orgId as string);
  }

  @RequirePermission('projects', 'add')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProjectTypeDto) {
    return this.service.create(user.orgId as string, dto);
  }

  @RequirePermission('projects', 'add')
  @Post('common')
  addCommon(@CurrentUser() user: JwtPayload) {
    return this.service.addCommon(user.orgId as string);
  }

  @RequirePermission('projects', 'edit')
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProjectTypeDto,
  ) {
    return this.service.update(user.orgId as string, id, dto);
  }

  @RequirePermission('projects', 'delete')
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.orgId as string, id);
  }
}
