import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { PackageChangeRequestsService } from './package-change-requests.service';
import {
  AdminPackageChangeRequestsController,
  OrgPackageChangeRequestsController,
} from './package-change-requests.controller';

@Module({
  imports: [PrismaModule],
  controllers: [OrgPackageChangeRequestsController, AdminPackageChangeRequestsController],
  providers: [PackageChangeRequestsService],
  exports: [PackageChangeRequestsService],
})
export class PackageChangeRequestsModule {}

