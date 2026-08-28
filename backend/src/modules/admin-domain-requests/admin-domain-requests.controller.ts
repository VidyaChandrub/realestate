import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { AdminDomainRequestsService } from './admin-domain-requests.service';
import { ReviewDomainRequestDto } from './dto/review-domain-request.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/domain-requests')
export class AdminDomainRequestsController {
  constructor(private readonly service: AdminDomainRequestsService) {}

  @Get()
  list(@Query('status') status?: string, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.list({ status, search, page: page ? parseInt(page, 10) : undefined, limit: limit ? parseInt(limit, 10) : undefined });
  }

  @Get('infra')
  infra() {
    return this.service.getInfra();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post(':id/review')
  review(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: ReviewDomainRequestDto) {
    if (dto.action === 'approve') return this.service.approve(id, user.sub as string);
    if (dto.action === 'reject') return this.service.reject(id, user.sub as string, dto.reason);
    throw new Error('Unsupported action');
  }

  @Post(':id/recheck')
  recheck(@Param('id') id: string) {
    return this.service.recheckDns(id);
  }
}
