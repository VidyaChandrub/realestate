import type { Prisma } from '@prisma/client';

export type AdapterConnectResult = {
  url: string;
  state?: string;
  webhookUrl?: string;
};

export type AdapterOAuthResult = {
  redirectTo: string;
  connected?: number;
};

export type AdapterSyncResult = {
  ok: boolean;
  message: string;
  campaignsUpserted?: number;
  leadsIngested?: number;
  detail?: Prisma.InputJsonValue;
};

export type MarketingConnectionRow = {
  id: string;
  orgId: string;
  platformKey: string;
  status: string;
  externalAccountId: string;
  externalAccountName: string;
  accessToken: string | null;
  refreshToken: string | null;
  projectId: string | null;
  metadata: Prisma.JsonValue | null;
  lastSyncAt: Date | null;
};

/**
 * Integration Engine contract — every marketing platform plugs in here.
 * MarketingService / SyncService / WebhookController only talk to adapters.
 */
export interface PlatformAdapter {
  readonly key: string;
  readonly category: 'paid_ads' | 'social' | 'website' | 'messaging' | 'other';
  readonly displayName: string;

  /** Whether env credentials / platform readiness is available. */
  isConfigured(): boolean;

  supportsOAuth(): boolean;
  supportsWebhook(): boolean;
  supportsCredentials(): boolean;

  getConnectUrl?(
    orgId: string,
    userId: string,
  ): Promise<AdapterConnectResult> | AdapterConnectResult;

  handleOAuthCallback?(
    code: string,
    state: string,
  ): Promise<AdapterOAuthResult>;

  connectCredentials?(
    orgId: string,
    userId: string,
    input: {
      externalAccountId: string;
      externalAccountName?: string;
      accessToken: string;
      refreshToken?: string;
      projectId?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<{ connectionId: string }>;

  /** Inbound webhook for this platform (org-scoped or platform-scoped). */
  handleWebhook?(
    orgId: string,
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
    rawBody?: Buffer,
  ): Promise<{ ok: boolean; ingested?: number; message?: string }>;

  /** Periodic / manual sync for one connection. */
  syncConnection?(
    connection: MarketingConnectionRow,
  ): Promise<AdapterSyncResult>;

  disconnect?(connection: MarketingConnectionRow): Promise<void>;
}
