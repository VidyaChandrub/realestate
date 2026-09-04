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
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgLandingPagesService } from './org-landing-pages.service';
import { CreateLandingPageDto } from './dto/create-landing-page.dto';
import { UpdateLandingPageDto } from './dto/update-landing-page.dto';
import { ListLandingPagesQueryDto } from './dto/list-landing-pages-query.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';

// Every route derives orgId from the JWT — never from a client-supplied
// param — so one org can never read or touch another org's pages.
@UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard, PermissionGuard)
@Controller('org/landing-pages')
export class OrgLandingPagesController {
  constructor(private readonly service: OrgLandingPagesService) {}

  @RequirePermission('websites', 'add')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateLandingPageDto) {
    return this.service.create(user.orgId as string, dto);
  }

  @RequirePermission('websites', 'view')
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListLandingPagesQueryDto) {
    return this.service.list(user.orgId as string, query);
  }

  @RequirePermission('websites', 'view')
  @Get('seo/sitemap.xml')
  sitemap(@CurrentUser() user: JwtPayload) {
    return this.service.sitemap(user.orgId as string);
  }

  @RequirePermission('websites', 'view')
  @Get('seo/robots.txt')
  robots(@CurrentUser() user: JwtPayload) {
    return this.service.robots(user.orgId as string);
  }

  @RequirePermission('websites', 'view')
  @Get(':id')
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getById(user.orgId as string, id);
  }

  @RequirePermission('websites', 'edit')
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLandingPageDto,
  ) {
    return this.service.update(user.orgId as string, id, dto);
  }

  @RequirePermission('websites', 'edit')
  @Post(':id/publish')
  @Put(':id/publish')
  @HttpCode(200)
  publish(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.publish(user.orgId as string, id);
  }

  @RequirePermission('websites', 'edit')
  @Post(':id/unpublish')
  @Put(':id/unpublish')
  @HttpCode(200)
  unpublish(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.unpublish(user.orgId as string, id);
  }

  @RequirePermission('websites', 'delete')
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.orgId as string, id);
  }

  @RequirePermission('websites', 'add')
  @Post(':id/duplicate')
  duplicate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.duplicate(user.orgId as string, id);
  }

  // Presigned URL for a builder image upload — the browser PUTs straight to
  // R2, then stores the returned publicUrl in `content` (no base64).
  @RequirePermission('websites', 'edit')
  @Post(':id/upload-url')
  createUploadUrl(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateUploadUrlDto,
  ) {
    return this.service.createUploadUrl(user.orgId as string, id, dto);
  }
}
