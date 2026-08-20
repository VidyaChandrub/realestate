import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TeamModule } from './modules/team/team.module';
import { AdminOrganisationsModule } from './modules/admin-organisations/admin-organisations.module';
import { LandingPagesModule } from './modules/landing-pages/landing-pages.module';
import { LeadsModule } from './modules/leads/leads.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TeamModule,
    AdminOrganisationsModule,
    LandingPagesModule,
    LeadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
