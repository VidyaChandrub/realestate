import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MenuController } from '../api/menu.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MenuService } from './menu.service';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [MenuService],
  controllers: [MenuController],
  exports: [MenuService],
})
export class MenuModule {}
