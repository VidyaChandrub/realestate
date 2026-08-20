import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { LandingPagesService } from './landing-pages.service';
import { LandingPagesController } from './landing-pages.controller';
import { PublicPagesController } from './public-pages.controller';

@Module({
  imports: [AuthModule],
  controllers: [LandingPagesController, PublicPagesController],
  providers: [LandingPagesService, SuperAdminGuard],
})
export class LandingPagesModule {}
