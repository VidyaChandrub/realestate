import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminRolesController } from './admin-roles.controller';
import { AdminPlatformRolesController } from './admin-platform-roles.controller';
import { AdminRolesService } from './admin-roles.service';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';

@Module({
  imports: [AuthModule],
  controllers: [AdminRolesController, AdminPlatformRolesController],
  providers: [AdminRolesService, SuperAdminGuard],
  exports: [AdminRolesService],
})
export class AdminRolesModule {}
