// src/ads/ads.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdsService } from './services/ads.service';
import { StorageService } from './services/storage.service';
import { AdvertisementsService } from './services/advertisements.service';
import { CampaignsRepository } from './repositories/campaigns.repository';
import { CreativesRepository } from './repositories/creatives.repository';
import { TargetingRulesRepository } from './repositories/targeting-rules.repository';
import { DeliveryStatsRepository } from './repositories/delivery-stats.repository';
import { AdvertisementsRepository } from './repositories/advertisements.repository';
import { AdvertisementTargetingRepository } from './repositories/advertisement-targeting.repository';
import { AdvertisementClickRepository } from './repositories/advertisement-click.repository';
import { AdsDbService } from './prisma.service';
import { EmployersModule } from '../employers/employers.module';
import { JobsModule } from '../jobs/jobs.module';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [
        ConfigModule,
        EmployersModule, // for EmployerUsersService (org membership)
        JobsModule,      // for JobsService (SPONSORED_JOB ownership validation)
        EventsModule,    // for EventsService (SPONSORED_EVENT ownership validation)
    ],
    providers: [
        AdsService,
        StorageService,
        AdvertisementsService,
        CampaignsRepository,
        CreativesRepository,
        TargetingRulesRepository,
        DeliveryStatsRepository,
        AdvertisementsRepository,
        AdvertisementTargetingRepository,
        AdvertisementClickRepository,
        AdsDbService,
    ],
    exports: [AdsService, AdvertisementsService, StorageService],
})
export class AdsModule { }
