import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { AdminEmailController } from './admin-email.controller';
import { OrgEmailController } from './org-email.controller';
import { PrismaModule } from '../../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';

@Global()
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminEmailController, OrgEmailController],
  providers: [EmailService, OrgApprovedGuard, PermissionGuard],
  exports: [EmailService],
})
export class EmailModule {}
