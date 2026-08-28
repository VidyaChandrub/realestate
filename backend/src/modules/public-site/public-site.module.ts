import { Module } from '@nestjs/common';
import { PublicSiteService } from './public-site.service';
import { PublicSiteController } from './public-site.controller';

@Module({
  controllers: [PublicSiteController],
  providers: [PublicSiteService],
})
export class PublicSiteModule {}
