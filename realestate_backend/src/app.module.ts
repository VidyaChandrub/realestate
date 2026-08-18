import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ApiController } from './api/api.controller';
import { UsersController } from './api/users.controller';
import { FeedController } from './api/feed.controller';
import { JobsController } from './api/jobs.controller';
import { ApplicationsController } from './api/applications.controller';
import { MasterDataController } from './api/master-data.controller';
import { EmployersModule } from './employers/employers.module';
import { JobsModule } from './jobs/jobs.module';
import { ApplicationsModule } from './applications/applications.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EventsModule } from './events/events.module';
import { EmployersController } from './api/employers.controller';
import { NotificationsController } from './api/notifications.controller';
import { EventsController } from './api/events.controller';
import { ProfileController } from './api/profile.controller';
import { AdsModule } from './ads/ads.module';
import { AdsController } from './api/ads.controller';
import { AdvertisementsController } from './api/advertisements.controller';
import { AnalyticsModule } from './analytics/analytics.module';
import { AnalyticsController } from './api/analytics.controller';
import { MasterDataModule } from './master-data/master-data.module';
import { FeedModule } from './feed/feed.module';
import { AdminModule } from './admin/admin.module';
import { ContentModule } from './content/content.module';
import { MenuModule } from './menu/menu.module';
import { ReportsModule } from './reports/reports.module';
import { DeviceTokensModule } from './device-tokens/device-tokens.module';
import { PushNotificationsModule } from './push-notifications/push-notifications.module';
import { BroadcastsModule } from './broadcasts/broadcasts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),

    AuthModule,
    UserModule,
    EmployersModule,
    JobsModule,
    ApplicationsModule,
    NotificationsModule,
    EventsModule,
    AdsModule,
    AnalyticsModule,
    MasterDataModule,
    FeedModule,
    AdminModule,
    ContentModule,
    MenuModule,
    ReportsModule,
    DeviceTokensModule,
    PushNotificationsModule,
    BroadcastsModule,
  ],
  controllers: [
    ApiController,
    UsersController,
    FeedController,
    JobsController,
    ApplicationsController,
    MasterDataController,
    EmployersController,
    NotificationsController,
    EventsController,
    ProfileController,
    AdsController,
    AdvertisementsController,
    AnalyticsController,
  ],
})
export class AppModule {}
