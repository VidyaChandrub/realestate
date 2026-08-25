import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminLandingPagesController } from './admin-landing-pages.controller';
import { AdminLandingPagesService } from './admin-landing-pages.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminLandingPagesController],
  providers: [AdminLandingPagesService],
})
export class AdminLandingPagesModule {}
