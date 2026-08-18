import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from '../api/content.controller';
import { PrismaService } from '../user/prisma.service';

@Module({
  providers: [ContentService, PrismaService],
  controllers: [ContentController],
  exports: [ContentService],
})
export class ContentModule {}
