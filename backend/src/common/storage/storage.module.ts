import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalUploadController } from './local-upload.controller';

// Shared object-storage kernel. Global, same as PrismaModule — import it
// once, inject StorageService anywhere.
@Global()
@Module({
  controllers: [LocalUploadController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
