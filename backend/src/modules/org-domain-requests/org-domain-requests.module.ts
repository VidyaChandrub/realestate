import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { OrgDomainRequestsService } from './org-domain-requests.service';
import { OrgDomainRequestsController } from './org-domain-requests.controller';

@Module({
  imports: [AuthModule],
  controllers: [OrgDomainRequestsController],
  providers: [OrgDomainRequestsService, OrgApprovedGuard, PermissionGuard],
  exports: [OrgDomainRequestsService],
})
export class OrgDomainRequestsModule {}
