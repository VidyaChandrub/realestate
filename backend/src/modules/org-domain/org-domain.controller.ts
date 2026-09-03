import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgDomainService } from './org-domain.service';
import { RequestCustomDomainDto } from './dto/request-custom-domain.dto';

@UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard, PermissionGuard)
@Controller('org/domain')
export class OrgDomainController {
  constructor(private readonly service: OrgDomainService) {}

  @RequirePermission('domains', 'view')
  @Get()
  getInfo(@CurrentUser() user: JwtPayload) {
    return this.service.getInfo(user.orgId as string);
  }

  @RequirePermission('domains', 'add')
  @Post('custom-domain')
  requestCustomDomain(@CurrentUser() user: JwtPayload, @Body() dto: RequestCustomDomainDto) {
    return this.service.requestCustomDomain(
      user.orgId as string,
      user.sub as string,
      dto.domain,
    );
  }
}
