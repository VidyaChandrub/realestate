import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TeamModule } from './modules/team/team.module';
import { AdminOrganisationsModule } from './modules/admin-organisations/admin-organisations.module';
import { OrgSettingsModule } from './modules/org-settings/org-settings.module';
import { OrgUsersModule } from './modules/org-users/org-users.module';
import { AdminTemplatesModule } from './modules/admin-templates/admin-templates.module';
import { OrgTemplatesModule } from './modules/org-templates/org-templates.module';
import { PlansModule } from './modules/plans/plans.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { OrgLandingPagesModule } from './modules/org-landing-pages/org-landing-pages.module';
import { AdminLandingPagesModule } from './modules/admin-landing-pages/admin-landing-pages.module';
import { OrgActivityModule } from './modules/org-activity/org-activity.module';
import { OrgTypographySetsModule } from './modules/org-typography-sets/org-typography-sets.module';
import { AdminTypographySetsModule } from './modules/admin-typography-sets/admin-typography-sets.module';
import { OrgBillingModule } from './modules/org-billing/org-billing.module';
import { ProjectsModule } from './modules/projects/projects.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TeamModule,
    AdminOrganisationsModule,
    OrgSettingsModule,
    OrgUsersModule,
    AdminTemplatesModule,
    OrgTemplatesModule,
    PlansModule,
    SubscriptionsModule,
    OrgLandingPagesModule,
    AdminLandingPagesModule,
    OrgActivityModule,
    OrgTypographySetsModule,
    AdminTypographySetsModule,
    OrgBillingModule,
    ProjectsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
