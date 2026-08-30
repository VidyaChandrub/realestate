import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { AdminOrgDomainController } from './admin-org-domain.controller';
import { AdminOrgDomainService } from './admin-org-domain.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminOrgDomainController],
  providers: [AdminOrgDomainService, SuperAdminGuard],
  exports: [AdminOrgDomainService],
})
export class AdminOrgDomainModule {}
