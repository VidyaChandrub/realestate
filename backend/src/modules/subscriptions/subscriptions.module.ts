import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionLifecycleSweeper } from './subscription-lifecycle.sweeper';

@Module({
  imports: [AuthModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionLifecycleSweeper],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
