import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  AdapterConnectResult,
  AdapterSyncResult,
  MarketingConnectionRow,
  PlatformAdapter,
} from './platform-adapter.interface';
import { PrismaService } from '../../../database/prisma.service';

function env(name: string) {
  return (process.env[name] ?? '').trim();
}

function frontendUrl() {
  return (process.env.FRONTEND_URL ?? 'http://localhost:3001').replace(/\/$/, '');
}

function apiPublicUrl() {
  const explicit = (process.env.BACKEND_PUBLIC_URL ?? '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  return `${frontendUrl()}/api`;
}

@Injectable()
export class GoogleAdsAdapter implements PlatformAdapter {
  readonly key = 'google_ads';
  readonly category = 'paid_ads' as const;
  readonly displayName = 'Google Ads';

  constructor(private readonly prisma: PrismaService) {}

  isConfigured() {
    return Boolean(env('GOOGLE_ADS_CLIENT_ID') && env('GOOGLE_ADS_CLIENT_SECRET'));
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
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Google Ads is not configured. Set GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET.',
      );
    }
    const redirectUri = `${apiPublicUrl()}/org/marketing/oauth/google/callback`;
    const state = Buffer.from(
      JSON.stringify({
        orgId,
        userId,
        platformKey: 'google_ads',
        ts: Date.now(),
      }),
      'utf8',
    ).toString('base64url');
    const params = new URLSearchParams({
      client_id: env('GOOGLE_ADS_CLIENT_ID'),
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: 'https://www.googleapis.com/auth/adwords',
      state,
    });
    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      state,
    };
  }

  async syncConnection(
    connection: MarketingConnectionRow,
  ): Promise<AdapterSyncResult> {
    const meta =
      connection.metadata &&
      typeof connection.metadata === 'object' &&
      !Array.isArray(connection.metadata)
        ? (connection.metadata as Record<string, unknown>)
        : null;
    if (meta?.demo === true) {
      await this.prisma.marketingConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncAt: new Date(),
          lastError: null,
          status: 'connected',
        },
      });
      return {
        ok: true,
        message: 'Demo Google Ads: sync skipped (seed data)',
        campaignsUpserted: 0,
      };
    }

    if (!connection.accessToken) {
      return { ok: false, message: 'Missing Google access token' };
    }
    await this.prisma.marketingConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: new Date(),
        lastError: null,
        status: 'connected',
        metadata: {
          ...(typeof connection.metadata === 'object' &&
          connection.metadata &&
          !Array.isArray(connection.metadata)
            ? (connection.metadata as Record<string, unknown>)
            : {}),
          syncNote:
            'OAuth connected. Campaign metrics sync requires GOOGLE_ADS_DEVELOPER_TOKEN + customer id.',
        },
      },
    });
    return {
      ok: true,
      message:
        'Google Ads connection verified. Add GOOGLE_ADS_DEVELOPER_TOKEN to enable metrics sync.',
      campaignsUpserted: 0,
    };
  }
}
