import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeviceTokensModule } from '../device-tokens/device-tokens.module';
import { AdminBroadcastsController } from '../api/admin-broadcasts.controller';
import { BroadcastsService } from './services/broadcasts.service';
import { BroadcastRecipientsService } from './services/broadcast-recipients.service';
import { BroadcastsRepository } from './repositories/broadcasts.repository';

@Module({
  imports: [PrismaModule, NotificationsModule, DeviceTokensModule],
  controllers: [AdminBroadcastsController],
  providers: [BroadcastsService, BroadcastRecipientsService, BroadcastsRepository],
})
export class BroadcastsModule {}
