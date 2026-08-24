import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TeamModule } from './modules/team/team.module';
import { AdminOrganisationsModule } from './modules/admin-organisations/admin-organisations.module';
import { OrgSettingsModule } from './modules/org-settings/org-settings.module';
import { OrgUsersModule } from './modules/org-users/org-users.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TeamModule,
    AdminOrganisationsModule,
    OrgSettingsModule,
    OrgUsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
