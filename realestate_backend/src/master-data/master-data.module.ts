import { Module } from '@nestjs/common';
import { AdsModule } from '../ads/ads.module';
import { EventsModule } from '../events/events.module';
import { JobsModule } from '../jobs/jobs.module';
import { UserModule } from '../user/user.module';
import { MasterDataDbService } from './prisma.service';
import { MasterDataRepository } from './repositories/master-data.repository';
import { MasterDataReferenceService } from './services/master-data-reference.service';
import { MasterDataService } from './services/master-data.service';

@Module({
  imports: [JobsModule, EventsModule, AdsModule, UserModule],
  providers: [MasterDataDbService, MasterDataRepository, MasterDataReferenceService, MasterDataService],
  exports: [MasterDataService],
})
export class MasterDataModule {}
