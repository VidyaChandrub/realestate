import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminTemplatesController, PublicTemplatesController } from './admin-templates.controller';
import { AdminTemplatesService } from './admin-templates.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminTemplatesController, PublicTemplatesController],
  providers: [AdminTemplatesService],
})
export class AdminTemplatesModule {}
