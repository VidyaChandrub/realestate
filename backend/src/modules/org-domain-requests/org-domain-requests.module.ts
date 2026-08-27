import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgDomainRequestsService } from './org-domain-requests.service';
import { OrgDomainRequestsController } from './org-domain-requests.controller';

@Module({
  imports: [AuthModule],
  controllers: [OrgDomainRequestsController],
  providers: [OrgDomainRequestsService],
  exports: [OrgDomainRequestsService],
})
export class OrgDomainRequestsModule {}
