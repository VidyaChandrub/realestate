// src/events/events.module.ts
import { Module } from '@nestjs/common';
import { EventsService } from './services/events.service';
import { EventsRepository } from './repositories/events.repository';
import { EventRegistrationsRepository } from './repositories/event-registrations.repository';
import { EventExternalClicksRepository } from './repositories/event-external-clicks.repository';
import { PrismaService } from './prisma.service';
import { EmployersModule } from '../employers/employers.module';
import { UserModule } from '../user/user.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [EmployersModule, UserModule, NotificationsModule],
    providers: [
        EventsService,
        EventsRepository,
        EventRegistrationsRepository,
        EventExternalClicksRepository,
        PrismaService,
    ],
    exports: [EventsService, EventExternalClicksRepository],
})
export class EventsModule { }
