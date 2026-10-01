import { Injectable } from '@nestjs/common';
import { MetaLeadsService } from '../../meta-leads/meta-leads.service';
import type {
  AdapterConnectResult,
  AdapterOAuthResult,
  AdapterSyncResult,
  MarketingConnectionRow,
  PlatformAdapter,
} from './platform-adapter.interface';
import { MetaAdapter } from './meta.adapter';

/** WhatsApp Ads attribution rides Meta Page OAuth. */
@Injectable()
export class WhatsappAdapter implements PlatformAdapter {
  readonly key = 'whatsapp';
  readonly category = 'messaging' as const;
  readonly displayName = 'WhatsApp Ads';

  constructor(
    private readonly meta: MetaLeadsService,
    private readonly metaAdapter: MetaAdapter,
  ) {}

  isConfigured() {
    return this.meta.isConfigured();
  }

  supportsOAuth() {
    return true;
  }

  supportsWebhook() {
    return false;
  }

  supportsCredentials() {
    return true;
  }

  getConnectUrl(orgId: string, userId: string): AdapterConnectResult {
    return this.meta.getConnectUrl(orgId, userId, 'whatsapp');
  }

  handleOAuthCallback(code: string, state: string): Promise<AdapterOAuthResult> {
    return this.metaAdapter.handleOAuthCallback(code, state);
  }

  connectCredentials(
    orgId: string,
    userId: string,
    input: {
      externalAccountId: string;
      externalAccountName?: string;
      accessToken: string;
      projectId?: string | null;
    },
  ) {
    return this.metaAdapter.connectCredentials(orgId, userId, input);
  }

  syncConnection(connection: MarketingConnectionRow): Promise<AdapterSyncResult> {
    return this.metaAdapter.syncConnection({
      ...connection,
      platformKey: 'meta',
    });
  }

  disconnect(connection: MarketingConnectionRow): Promise<void> {
    return this.metaAdapter.disconnect(connection);
  }
}
