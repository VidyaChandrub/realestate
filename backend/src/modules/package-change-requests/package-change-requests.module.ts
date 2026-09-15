import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PackageChangeRequestsService } from './package-change-requests.service';
import {
  AdminPackageChangeRequestsController,
  OrgPackageChangeRequestsController,
} from './package-change-requests.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [OrgPackageChangeRequestsController, AdminPackageChangeRequestsController],
  providers: [PackageChangeRequestsService],
  exports: [PackageChangeRequestsService],
})
export class PackageChangeRequestsModule {}

