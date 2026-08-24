import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgUsersController } from './org-users.controller';
import { OrgUsersService } from './org-users.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgUsersController],
  providers: [OrgUsersService, OrgAdminGuard],
})
export class OrgUsersModule {}
