import { Module } from '@nestjs/common';
import { StorageModule } from '../../common/storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { UploadsController } from './uploads.controller';
import { AdminUploadsController } from './admin-uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [StorageModule, AuthModule],
  controllers: [UploadsController, AdminUploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
