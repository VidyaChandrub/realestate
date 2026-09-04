import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { AdminDashboardService } from './admin-dashboard.service';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get()
  getDashboard() {
    return this.dashboardService.getDashboard();
  }
}
