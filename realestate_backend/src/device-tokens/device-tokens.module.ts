import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DeviceTokensController } from './device-tokens.controller';
import { DeviceTokensService } from './services/device-tokens.service';
import { DeviceTokensRepository } from './repositories/device-tokens.repository';

@Module({
  imports: [PrismaModule],
  controllers: [DeviceTokensController],
  providers: [DeviceTokensService, DeviceTokensRepository],
  exports: [DeviceTokensService],
})
export class DeviceTokensModule {}
