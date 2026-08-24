import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminTemplatesController } from './admin-templates.controller';
import { AdminTemplatesService } from './admin-templates.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminTemplatesController],
  providers: [AdminTemplatesService],
})
export class AdminTemplatesModule {}
