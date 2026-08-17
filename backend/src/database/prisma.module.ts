import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Place this at: src/database/prisma.module.ts
// Import PrismaModule once in AppModule — every other module can then
// inject PrismaService directly without importing this again.

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
