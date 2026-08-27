import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminDomainRequestsService } from './admin-domain-requests.service';
import { AdminDomainRequestsController } from './admin-domain-requests.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminDomainRequestsController],
  providers: [AdminDomainRequestsService],
})
export class AdminDomainRequestsModule {}
