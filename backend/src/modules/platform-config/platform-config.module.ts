import { Global, Module } from '@nestjs/common';
import { PlatformConfigService } from './platform-config.service';
import { PlatformConfigController } from './platform-config.controller';
import { PrismaModule } from '../../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';

@Global()
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PlatformConfigController],
  providers: [PlatformConfigService, SuperAdminGuard],
  exports: [PlatformConfigService],
})
export class PlatformConfigModule {}
