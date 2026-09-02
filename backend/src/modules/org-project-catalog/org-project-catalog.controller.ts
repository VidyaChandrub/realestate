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
import { OrgProjectCatalogService } from './org-project-catalog.service';
import { CreateCatalogOptionDto } from './dto/create-catalog-option.dto';
import { UpdateCatalogOptionDto } from './dto/update-catalog-option.dto';
import { ListCatalogOptionsQueryDto } from './dto/list-catalog-options-query.dto';

// Org-managed custom catalogs for the project onboarding wizard. Every route
// derives orgId from the JWT — never from a client-supplied param — so one
// org can never read or touch another org's options.
@UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard)
@Controller('org/project-catalog')
export class OrgProjectCatalogController {
  constructor(private readonly service: OrgProjectCatalogService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListCatalogOptionsQueryDto,
  ) {
    return this.service.list(user.orgId as string, query.category);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCatalogOptionDto) {
    return this.service.create(user.orgId as string, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCatalogOptionDto,
  ) {
    return this.service.update(user.orgId as string, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.orgId as string, id);
  }
}
