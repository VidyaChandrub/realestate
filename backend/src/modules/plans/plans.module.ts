import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlansController, PublicPlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [AuthModule],
  controllers: [PlansController, PublicPlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
