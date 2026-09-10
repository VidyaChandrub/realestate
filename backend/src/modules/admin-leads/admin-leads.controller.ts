import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { AdminLeadsService } from './admin-leads.service';
import { ListAdminLeadsQueryDto } from './dto/list-admin-leads-query.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/leads')
export class AdminLeadsController {
  constructor(private readonly leads: AdminLeadsService) {}

  @Get()
  list(@Query() query: ListAdminLeadsQueryDto) {
    return this.leads.list(query);
  }

  @Get('meta')
  meta() {
    return this.leads.meta();
  }
}
