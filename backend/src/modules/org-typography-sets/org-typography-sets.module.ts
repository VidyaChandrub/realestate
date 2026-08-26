import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgTypographySetsController } from './org-typography-sets.controller';
import { OrgTypographySetsService } from './org-typography-sets.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgTypographySetsController],
  providers: [OrgTypographySetsService, OrgAdminGuard],
})
export class OrgTypographySetsModule {}
