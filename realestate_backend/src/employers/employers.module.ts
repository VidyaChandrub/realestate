import { Module } from '@nestjs/common';
import { EmployersService } from './services/employers.service';
import { EmployerUsersService } from './services/employer-users.service';

import { EmployersRepository } from './repositories/employers.repository';
import { EmployerUsersRepository } from './repositories/employer-users.repository';
import { PrismaService } from './prisma.service';
import { StorageService } from '../ads/services/storage.service';

@Module({
    controllers: [],
    providers: [
        EmployersService,
        EmployerUsersService,
        EmployersRepository,
        EmployerUsersRepository,
        PrismaService,
        StorageService,
    ],
    exports: [EmployersService, EmployerUsersService, StorageService], // Export if other modules need to read org data
})
export class EmployersModule { }
