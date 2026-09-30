import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MetaLeadsModule } from '../meta-leads/meta-leads.module';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { MarketingService } from './marketing.service';
import { MarketingSyncService } from './marketing-sync.service';
import {
  AdminMarketingController,
  MarketingOAuthController,
  OrgMarketingController,
} from './marketing.controller';
import { PlatformAdapterRegistry } from './adapters/platform-adapter.registry';
import { MetaAdapter } from './adapters/meta.adapter';
import { InstagramAdapter } from './adapters/instagram.adapter';
import { WhatsappAdapter } from './adapters/whatsapp.adapter';
import { GoogleAdsAdapter } from './adapters/google-ads.adapter';

@Module({
  imports: [AuthModule, forwardRef(() => MetaLeadsModule)],
  controllers: [
    AdminMarketingController,
    OrgMarketingController,
    MarketingOAuthController,
  ],
  providers: [
    MarketingService,
    MarketingSyncService,
    OrgApprovedGuard,
    PlatformAdapterRegistry,
    MetaAdapter,
    InstagramAdapter,
    WhatsappAdapter,
    GoogleAdsAdapter,
  ],
  exports: [MarketingService, MarketingSyncService, PlatformAdapterRegistry],
})
export class MarketingModule {}
