import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgDomainController } from './org-domain.controller';
import { OrgDomainService } from './org-domain.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgDomainController],
  providers: [OrgDomainService, OrgAdminGuard],
})
export class OrgDomainModule {}
