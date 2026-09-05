import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgDomainRequestsService } from './org-domain-requests.service';
import { CreateDomainRequestDto } from './dto/create-domain-request.dto';

@UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
@Controller('org/domain-requests')
export class OrgDomainRequestsController {
  constructor(private readonly service: OrgDomainRequestsService) {}

  @RequirePermission('domains', 'add')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDomainRequestDto) {
    return this.service.create(user.orgId as string, user.sub as string, dto);
  }

  @RequirePermission('domains', 'view')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.orgId as string);
  }

  @RequirePermission('domains', 'view')
  @Get('page/:landingPageId')
  getByPage(@CurrentUser() user: JwtPayload, @Param('landingPageId') id: string) {
    return this.service.getByPage(user.orgId as string, id);
  }

  @RequirePermission('domains', 'add')
  @Post('page/:landingPageId/verify')
  verify(@CurrentUser() user: JwtPayload, @Param('landingPageId') id: string) {
    return this.service.verify(user.orgId as string, id);
  }
}
