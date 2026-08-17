import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TeamModule } from './modules/team/team.module';

@Module({
  imports: [PrismaModule, AuthModule, TeamModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
