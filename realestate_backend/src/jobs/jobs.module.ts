import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { JobsService } from './services/jobs.service';
import { JobsRepository } from './repositories/jobs.repository';
import { JobExternalClicksRepository } from './repositories/job-external-clicks.repository';
import { PrismaService } from './prisma.service';

@Module({
    imports: [UserModule],
    controllers: [],
    providers: [
        JobsService,
        JobsRepository,
        JobExternalClicksRepository,
        PrismaService
    ],
    exports: [JobsService, JobExternalClicksRepository],
})
export class JobsModule { }
