import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { AdminOrganisationsController } from './admin-organisations.controller';
import { AdminOrganisationsService } from './admin-organisations.service';
import { AdminOrgDomainModule } from '../admin-org-domain/admin-org-domain.module';

@Module({
  imports: [AuthModule, AdminOrgDomainModule],
  controllers: [AdminOrganisationsController],
  providers: [AdminOrganisationsService, SuperAdminGuard],
})
export class AdminOrganisationsModule {}
