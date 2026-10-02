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

/** Instagram Lead Ads share Meta Graph OAuth / Pages. */
@Injectable()
export class InstagramAdapter implements PlatformAdapter {
  readonly key = 'instagram';
  readonly category = 'social' as const;
  readonly displayName = 'Instagram';

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
    return true;
  }

  supportsCredentials() {
    return true;
  }

  getConnectUrl(orgId: string, userId: string): AdapterConnectResult {
    return this.meta.getConnectUrl(orgId, userId, 'instagram');
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
    return this.metaAdapter.connectCredentials(
      orgId,
      userId,
      input,
      'instagram',
    );
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
