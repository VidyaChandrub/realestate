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
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgProjectCatalogService } from './org-project-catalog.service';
import { CreateCatalogOptionDto } from './dto/create-catalog-option.dto';
import { UpdateCatalogOptionDto } from './dto/update-catalog-option.dto';
import { ListCatalogOptionsQueryDto } from './dto/list-catalog-options-query.dto';

// Every route checks its Projects pill — for the org admin too, whose access
// Super Admin sets in Organisation roles (`enforceForOrgAdmin`).
const ENFORCE = { enforceForOrgAdmin: true } as const;

// Org-managed custom catalogs for the project onboarding wizard. Every route
// derives orgId from the JWT — never from a client-supplied param — so one
// org can never read or touch another org's options.
@UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
@Controller('org/project-catalog')
export class OrgProjectCatalogController {
  constructor(private readonly service: OrgProjectCatalogService) {}

  @RequirePermission('projects', 'view', ENFORCE)
  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListCatalogOptionsQueryDto,
  ) {
    return this.service.list(user.orgId as string, query.category);
  }

  @RequirePermission('projects', 'add', ENFORCE)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCatalogOptionDto) {
    return this.service.create(user.orgId as string, dto);
  }

  @RequirePermission('projects', 'edit', ENFORCE)
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCatalogOptionDto,
  ) {
    return this.service.update(user.orgId as string, id, dto);
  }

  @RequirePermission('projects', 'delete', ENFORCE)
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.orgId as string, id);
  }
}
