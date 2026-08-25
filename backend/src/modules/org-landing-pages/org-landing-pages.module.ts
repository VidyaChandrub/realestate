import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgLandingPagesController } from './org-landing-pages.controller';
import { OrgLandingPagesService } from './org-landing-pages.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgLandingPagesController],
  providers: [OrgLandingPagesService, OrgAdminGuard],
})
export class OrgLandingPagesModule {}
