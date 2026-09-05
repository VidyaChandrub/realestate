import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgSettingsService } from './org-settings.service';
import { UpdateOrganisationDto } from '../admin-organisations/dto/update-organisation.dto';
import { AssetUploadUrlDto } from './dto/asset-upload-url.dto';

@UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
@Controller('org/settings')
export class OrgSettingsController {
  constructor(private readonly orgSettingsService: OrgSettingsService) {}

  @RequirePermission('settings', 'view')
  @Get()
  getSettings(@CurrentUser() actor: JwtPayload) {
    // orgId always comes from the JWT, never a client-supplied param —
    // core multi-tenant isolation rule for every /org/* endpoint.
    return this.orgSettingsService.getSettings(actor.orgId as string);
  }

  @RequirePermission('settings', 'edit')
  @Patch()
  updateSettings(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: UpdateOrganisationDto,
  ) {
    return this.orgSettingsService.updateSettings(actor.orgId as string, dto);
  }

  @RequirePermission('settings', 'edit')
  @Post('logo-upload-url')
  logoUploadUrl(@CurrentUser() actor: JwtPayload, @Body() dto: AssetUploadUrlDto) {
    return this.orgSettingsService.createAssetUploadUrl(
      actor.orgId as string,
      'logo',
      dto,
    );
  }

  @RequirePermission('settings', 'edit')
  @Post('favicon-upload-url')
  faviconUploadUrl(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: AssetUploadUrlDto,
  ) {
    return this.orgSettingsService.createAssetUploadUrl(
      actor.orgId as string,
      'favicon',
      dto,
    );
  }
}
