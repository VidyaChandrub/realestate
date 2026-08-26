import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { AdminLandingPagesService } from './admin-landing-pages.service';
import { ListAdminLandingPagesQueryDto } from './dto/list-admin-landing-pages-query.dto';

// Read-only visibility into org landing pages — orgs publish their own
// pages directly (see OrgLandingPagesController), there is no approval gate
// here anymore. Kept so Super Admin can still see what's out there.
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/landing-pages')
export class AdminLandingPagesController {
  constructor(private readonly service: AdminLandingPagesService) {}

  @Get()
  list(@Query() query: ListAdminLandingPagesQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }
}
