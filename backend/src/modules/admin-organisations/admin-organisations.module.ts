import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { AdminOrganisationsController } from './admin-organisations.controller';
import { AdminOrganisationsService } from './admin-organisations.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminOrganisationsController],
  providers: [AdminOrganisationsService, SuperAdminGuard],
})
export class AdminOrganisationsModule {}
