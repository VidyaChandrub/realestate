import { Module } from '@nestjs/common';
import { ApplicationsService } from './services/applications.service';
import { ApplicationsRepository } from './repositories/applications.repository';
import { PrismaService } from './prisma.service';
import { JobsModule } from '../jobs/jobs.module';
import { UserModule } from '../user/user.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmployersModule } from '../employers/employers.module';

@Module({
    imports: [JobsModule, UserModule, NotificationsModule, EmployersModule],
    controllers: [],
    providers: [
        ApplicationsService,
        ApplicationsRepository,
        PrismaService
    ],
    exports: [ApplicationsService],
})
export class ApplicationsModule { }
