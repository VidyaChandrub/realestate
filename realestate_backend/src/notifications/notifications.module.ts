import { Module } from '@nestjs/common';
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from '../api/notifications.controller';
import { NotificationsRepository } from './repositories/notifications.repository';
import { PrismaService } from './prisma.service';

@Module({
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationsRepository, PrismaService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
