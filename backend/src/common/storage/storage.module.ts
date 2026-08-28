import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

// Shared object-storage kernel. Global, same as PrismaModule — import it
// once, inject StorageService anywhere. Only Projects wires an endpoint to
// it for now; Org Settings branding and the Landing Pages builder can adopt
// it next without changing anything here.
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
