import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { TeamModule } from './modules/team/team.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
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
import { LeadsModule } from './modules/leads/leads.module';
import { SalesAgentsModule } from './modules/sales-agents/sales-agents.module';
import { OrgDomainRequestsModule } from './modules/org-domain-requests/org-domain-requests.module';
import { AdminDomainRequestsModule } from './modules/admin-domain-requests/admin-domain-requests.module';
import { OrgDomainModule } from './modules/org-domain/org-domain.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrgTrackingModule } from './modules/org-tracking/org-tracking.module';
import { PublicSiteModule } from './modules/public-site/public-site.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { OrgProjectCatalogModule } from './modules/org-project-catalog/org-project-catalog.module';
import { OrgPermissionsModule } from './modules/org-permissions/org-permissions.module';
import { AdminRolesModule } from './modules/admin-roles/admin-roles.module';
import { OrgDashboardModule } from './modules/org-dashboard/org-dashboard.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    AuthModule,
    TeamModule,
    OnboardingModule,
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
    LeadsModule,
    SalesAgentsModule,
    ProjectsModule,
    OrgProjectCatalogModule,
    OrgPermissionsModule,
    AdminRolesModule,
    OrgDashboardModule,
    OrgDomainRequestsModule,
    AdminDomainRequestsModule,
    OrgDomainModule,
    NotificationsModule,
    OrgTrackingModule,
    PublicSiteModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
