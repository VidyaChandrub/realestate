import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { AdminOrgDomainService } from './admin-org-domain.service';
import { ReviewOrgDomainRequestDto } from './dto/review-org-domain-request.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/org-domain-requests')
export class AdminOrgDomainController {
  constructor(private readonly service: AdminOrgDomainService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('kind') kind?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      status,
      kind,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post(':id/review')
  review(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReviewOrgDomainRequestDto,
  ) {
    if (dto.action === 'approve') return this.service.approve(id, user.sub as string);
    if (dto.action === 'reject') return this.service.reject(id, user.sub as string, dto.reason);
    throw new Error('Unsupported action');
  }
}
