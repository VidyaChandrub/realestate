import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { leadContactFromData } from '../../common/utils/lead-data.util';

export const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export const DEFAULT_SHEET_HEADERS = [
  'Captured At',
  'Name',
  'Phone',
  'Email',
  'Source',
  'Platform',
  'Campaign',
  'Project',
  'Status',
  'Notes / Message',
  'Lead ID',
];

export interface GoogleSheetMetadata {
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  sheetName?: string;
  autoSync?: boolean;
  googleEmail?: string;
  lastSyncCount?: number;
  [key: string]: unknown;
}

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private frontendUrl(): string {
    return (process.env.FRONTEND_URL ?? 'http://localhost:3001').replace(/\/$/, '');
  }

  private apiPublicUrl(): string {
    return (
      process.env.BACKEND_PUBLIC_URL ??
      `${process.env.FRONTEND_URL ?? 'http://localhost:3001'}/api`
    ).replace(/\/$/, '');
  }

  async getGoogleOAuthClient(): Promise<{ clientId: string; clientSecret: string }> {
    try {
      const rows: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT "google_ads_client_id", "google_ads_client_secret"
        FROM "identity"."marketing_settings"
        WHERE "id" = 'default' LIMIT 1
      `);
      const row = rows && rows.length > 0 ? rows[0] : null;
      const clientId =
        row && typeof row.google_ads_client_id === 'string' && row.google_ads_client_id.trim()
          ? row.google_ads_client_id.trim()
          : (process.env.GOOGLE_ADS_CLIENT_ID ?? '').trim();
      const clientSecret =
        row && typeof row.google_ads_client_secret === 'string' && row.google_ads_client_secret.trim()
          ? row.google_ads_client_secret.trim()
          : (process.env.GOOGLE_ADS_CLIENT_SECRET ?? '').trim();

      return { clientId, clientSecret };
    } catch {
      return {
        clientId: (process.env.GOOGLE_ADS_CLIENT_ID ?? '').trim(),
        clientSecret: (process.env.GOOGLE_ADS_CLIENT_SECRET ?? '').trim(),
      };
    }
  }

  async isConfigured(): Promise<boolean> {
    const { clientId, clientSecret } = await this.getGoogleOAuthClient();
    return Boolean(clientId && clientSecret);
  }

  async getConnectUrl(orgId: string, userId: string) {
    const { clientId } = await this.getGoogleOAuthClient();
    if (!clientId) {
      throw new ServiceUnavailableException(
        'Google OAuth is not configured. Configure Google Client ID & Secret in Connected Apps or Admin Console.',
      );
    }

    const redirectUri = `${this.apiPublicUrl()}/org/marketing/oauth/google/callback`;
    const state = Buffer.from(
      JSON.stringify({
        orgId,
        userId,
        platformKey: 'google_sheets',
        ts: Date.now(),
      }),
      'utf8',
    ).toString('base64url');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SHEETS_SCOPES,
      state,
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state,
    };
  }

  async getValidAccessToken(orgId: string): Promise<{
    accessToken: string;
    connection: any;
    metadata: GoogleSheetMetadata;
  } | null> {
    const connection = await this.prisma.marketingConnection.findFirst({
      where: { orgId, platformKey: 'google_sheets' },
    });
    if (!connection || !connection.accessToken) return null;

    const metadata: GoogleSheetMetadata =
      connection.metadata && typeof connection.metadata === 'object' && !Array.isArray(connection.metadata)
        ? (connection.metadata as GoogleSheetMetadata)
        : {};

    const { clientId, clientSecret } = await this.getGoogleOAuthClient();

    // Verify token validity or refresh proactively using refresh token
    if (connection.refreshToken && clientId && clientSecret) {
      try {
        const testRes = await fetch(
          'https://www.googleapis.com/oauth2/v2/userinfo',
          { headers: { Authorization: `Bearer ${connection.accessToken}` } },
        );
        if (!testRes.ok) {
          // Token expired, refresh it
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: connection.refreshToken,
              grant_type: 'refresh_token',
            }),
          });
          const tokenJson = (await tokenRes.json()) as { access_token?: string };
          if (tokenJson.access_token) {
            await this.prisma.marketingConnection.update({
              where: { id: connection.id },
              data: { accessToken: tokenJson.access_token },
            });
            return {
              accessToken: tokenJson.access_token,
              connection,
              metadata,
            };
          }
        }
      } catch (err) {
        this.logger.warn(`Failed token refresh check for org ${orgId}: ${String(err)}`);
      }
    }

    return { accessToken: connection.accessToken, connection, metadata };
  }

  async handleOAuthCallback(code: string, state: string) {
    let parsed: { orgId?: string; userId?: string; platformKey?: string };
    try {
      parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid Google OAuth state');
    }
    if (!parsed.orgId) throw new BadRequestException('Missing orgId in OAuth state');

    const { clientId, clientSecret } = await this.getGoogleOAuthClient();
    const redirectUri = `${this.apiPublicUrl()}/org/marketing/oauth/google/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      error?: string;
    };

    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new BadRequestException(tokenJson.error ?? 'Google OAuth token exchange failed');
    }

    // Fetch Google user email
    let userEmail = '';
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      if (userRes.ok) {
        const u = (await userRes.json()) as { email?: string };
        userEmail = u.email ?? '';
      }
    } catch {
      // ignore
    }

    // Fetch org details for spreadsheet naming
    const org = await this.prisma.organisation.findUnique({
      where: { id: parsed.orgId },
      select: { name: true },
    });
    const orgName = org?.name ?? 'Lead Center';

    // Check if an existing sheet was already linked
    const existing = await this.prisma.marketingConnection.findFirst({
      where: { orgId: parsed.orgId, platformKey: 'google_sheets' },
    });
    let metadata: GoogleSheetMetadata =
      existing?.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
        ? (existing.metadata as GoogleSheetMetadata)
        : {};

    metadata.googleEmail = userEmail || metadata.googleEmail;
    metadata.autoSync = metadata.autoSync !== false; // default true

    // If no spreadsheet exists yet in metadata, create one in Google Drive automatically!
    if (!metadata.spreadsheetId) {
      try {
        const created = await this.createSpreadsheet(
          tokenJson.access_token,
          `${orgName} - Leads`,
        );
        metadata.spreadsheetId = created.spreadsheetId;
        metadata.spreadsheetUrl = created.spreadsheetUrl;
        metadata.sheetName = created.sheetName;
      } catch (err) {
        this.logger.error(`Could not auto-create Google Sheet for ${parsed.orgId}`, err);
      }
    }

    const externalId = metadata.spreadsheetId || `google_drive:${parsed.orgId}`;
    const externalName = userEmail ? `Google Sheets (${userEmail})` : 'Google Sheets & Drive';

    const connection = await this.prisma.marketingConnection.upsert({
      where: {
        orgId_platformKey_externalAccountId: {
          orgId: parsed.orgId,
          platformKey: 'google_sheets',
          externalAccountId: externalId,
        },
      },
      create: {
        orgId: parsed.orgId,
        platformKey: 'google_sheets',
        externalAccountId: externalId,
        externalAccountName: externalName,
        accessToken: tokenJson.access_token,
        refreshToken: tokenJson.refresh_token ?? existing?.refreshToken ?? null,
        status: 'connected',
        metadata: metadata as any,
      },
      update: {
        externalAccountId: externalId,
        externalAccountName: externalName,
        accessToken: tokenJson.access_token,
        ...(tokenJson.refresh_token ? { refreshToken: tokenJson.refresh_token } : {}),
        status: 'connected',
        metadata: metadata as any,
      },
    });

    return {
      connected: 1,
      redirectTo: `${this.frontendUrl()}/org/marketing/apps/google_sheets?connected=1`,
      connection,
    };
  }

  /**
   * Automatically appends a single lead row to the connected Google Sheet
   * in real time whenever a lead is created in Lead Center.
   */
  async appendLeadRow(orgId: string, lead: any): Promise<boolean> {
    try {
      const auth = await this.getValidAccessToken(orgId);
      if (!auth) return false;
      const { accessToken, metadata, connection } = auth;
      if (metadata.autoSync === false || !metadata.spreadsheetId) return false;

      const sheetName = metadata.sheetName || 'Leads';
      const contact = leadContactFromData(lead.data ?? {});

      let projectName = '';
      if (lead.project?.name) {
        projectName = lead.project.name;
      } else if (lead.projectId) {
        const p = await this.prisma.project.findUnique({
          where: { id: lead.projectId },
          select: { name: true },
        });
        projectName = p?.name ?? '';
      }

      const notesOrMsg =
        lead.data?.notes ||
        lead.data?.message ||
        lead.data?.comments ||
        lead.formName ||
        '';

      const rowValues = [
        lead.createdAt ? new Date(lead.createdAt).toLocaleString() : new Date().toLocaleString(),
        contact.fullName || lead.name || '',
        contact.phone || lead.phone || '',
        contact.email || lead.email || '',
        lead.source || 'website',
        lead.platform || '',
        lead.campaign || lead.utmCampaign || '',
        projectName,
        lead.status || 'New',
        String(notesOrMsg),
        lead.id || '',
      ];

      const range = `'${sheetName}'!A:K`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${metadata.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [rowValues] }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        this.logger.warn(`Google Sheet append failed for lead ${lead.id}: ${JSON.stringify(errJson)}`);
        return false;
      }

      await this.prisma.marketingConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date(), lastError: null },
      });

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Error appending lead to Google Sheet for org ${orgId}: ${msg}`);
      return false;
    }
  }

  /**
   * Backfills or syncs all existing leads from Lead Center to the Google Sheet.
   */
  async syncAllLeadsToSheet(orgId: string) {
    const auth = await this.getValidAccessToken(orgId);
    if (!auth) {
      throw new BadRequestException('Google Sheets is not connected for this organisation');
    }
    const { accessToken, metadata, connection } = auth;
    if (!metadata.spreadsheetId) {
      throw new BadRequestException('No Google Sheet is currently linked');
    }

    const sheetName = metadata.sheetName || 'Leads';

    // 1. Ensure header row exists
    await this.ensureSheetHeaders(accessToken, metadata.spreadsheetId, sheetName);

    // 2. Fetch all leads for this organization
    const leads = await this.prisma.lead.findMany({
      where: { orgId },
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
      take: 5000,
    });

    if (leads.length === 0) {
      return {
        ok: true,
        synced: 0,
        message: 'No leads found in Lead Center to sync',
        spreadsheetUrl: metadata.spreadsheetUrl,
      };
    }

    const rows = leads.map((lead) => {
      const contact = leadContactFromData((lead.data as Record<string, unknown>) ?? {});
      const notes =
        (lead.data as any)?.notes ||
        (lead.data as any)?.message ||
        lead.formName ||
        '';
      return [
        lead.createdAt ? new Date(lead.createdAt).toLocaleString() : '',
        contact.fullName || '',
        contact.phone || '',
        contact.email || '',
        lead.source || '',
        lead.platform || '',
        lead.campaign || lead.utmCampaign || '',
        lead.project?.name || '',
        lead.status || 'New',
        String(notes),
        lead.id,
      ];
    });

    const range = `'${sheetName}'!A:K`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${metadata.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new BadRequestException(
        `Failed to append leads to Google Sheet: ${err.error?.message ?? res.statusText}`,
      );
    }

    const updatedMetadata = {
      ...metadata,
      lastSyncCount: rows.length,
    };

    await this.prisma.marketingConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: new Date(),
        lastError: null,
        metadata: updatedMetadata as any,
      },
    });

    return {
      ok: true,
      synced: rows.length,
      message: `Successfully synced ${rows.length} leads to Google Sheet!`,
      spreadsheetUrl: metadata.spreadsheetUrl,
    };
  }

  /**
   * Creates a new Google Sheet inside user's Google Drive.
   */
  async createNewSheetForOrg(orgId: string, customTitle?: string) {
    const auth = await this.getValidAccessToken(orgId);
    if (!auth) {
      throw new BadRequestException('Google Sheets is not connected for this organisation');
    }
    const { accessToken, metadata, connection } = auth;

    const org = await this.prisma.organisation.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    const title = customTitle || `${org?.name ?? 'Lead Center'} - Leads`;

    const created = await this.createSpreadsheet(accessToken, title);

    const updatedMetadata: GoogleSheetMetadata = {
      ...metadata,
      spreadsheetId: created.spreadsheetId,
      spreadsheetUrl: created.spreadsheetUrl,
      sheetName: created.sheetName,
    };

    await this.prisma.marketingConnection.update({
      where: { id: connection.id },
      data: {
        externalAccountId: created.spreadsheetId,
        metadata: updatedMetadata as any,
      },
    });

    return {
      ok: true,
      spreadsheetId: created.spreadsheetId,
      spreadsheetUrl: created.spreadsheetUrl,
      sheetName: created.sheetName,
    };
  }

  /**
   * Links an existing Google Sheet ID or full Google Drive URL.
   */
  async linkExistingSheet(orgId: string, sheetInput: string, sheetName = 'Leads') {
    const auth = await this.getValidAccessToken(orgId);
    if (!auth) {
      throw new BadRequestException('Google Sheets is not connected for this organisation');
    }
    const { accessToken, metadata, connection } = auth;

    // Parse spreadsheet ID from URL or raw ID
    let spreadsheetId = sheetInput.trim();
    const match = sheetInput.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      spreadsheetId = match[1];
    }

    if (!spreadsheetId) {
      throw new BadRequestException('Invalid Google Spreadsheet ID or URL');
    }

    // Verify access to the sheet
    const verifyRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!verifyRes.ok) {
      throw new BadRequestException(
        'Could not access this Google Sheet. Make sure the connected Google account has Edit access to it.',
      );
    }

    const sheetJson = (await verifyRes.json()) as {
      properties?: { title?: string };
      sheets?: Array<{ properties?: { title?: string } }>;
    };
    const resolvedSheetName =
      sheetName || sheetJson.sheets?.[0]?.properties?.title || 'Sheet1';
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Ensure header row exists
    await this.ensureSheetHeaders(accessToken, spreadsheetId, resolvedSheetName);

    const updatedMetadata: GoogleSheetMetadata = {
      ...metadata,
      spreadsheetId,
      spreadsheetUrl,
      sheetName: resolvedSheetName,
    };

    await this.prisma.marketingConnection.update({
      where: { id: connection.id },
      data: {
        externalAccountId: spreadsheetId,
        metadata: updatedMetadata as any,
      },
    });

    return {
      ok: true,
      spreadsheetId,
      spreadsheetUrl,
      sheetName: resolvedSheetName,
      title: sheetJson.properties?.title ?? 'Google Sheet',
    };
  }

  /**
   * Updates sync settings (e.g. toggle autoSync).
   */
  async updateSettings(orgId: string, dto: { autoSync?: boolean; sheetName?: string }) {
    const connection = await this.prisma.marketingConnection.findFirst({
      where: { orgId, platformKey: 'google_sheets' },
    });
    if (!connection) throw new NotFoundException('Google Sheets connection not found');

    const metadata: GoogleSheetMetadata =
      connection.metadata && typeof connection.metadata === 'object' && !Array.isArray(connection.metadata)
        ? (connection.metadata as GoogleSheetMetadata)
        : {};

    if (dto.autoSync !== undefined) metadata.autoSync = dto.autoSync;
    if (dto.sheetName !== undefined && dto.sheetName.trim()) {
      metadata.sheetName = dto.sheetName.trim();
    }

    await this.prisma.marketingConnection.update({
      where: { id: connection.id },
      data: { metadata: metadata as any },
    });

    return { ok: true, metadata };
  }

  async disconnect(orgId: string) {
    await this.prisma.marketingConnection.deleteMany({
      where: { orgId, platformKey: 'google_sheets' },
    });
    return { ok: true };
  }

  // --- Private Helpers -------------------------------------------------------

  private async createSpreadsheet(
    accessToken: string,
    title: string,
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheetName: string }> {
    const sheetName = 'Leads';
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title },
        sheets: [
          {
            properties: {
              title: sheetName,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new BadRequestException(
        `Failed to create Google Sheet: ${err.error?.message ?? res.statusText}`,
      );
    }

    const json = (await res.json()) as {
      spreadsheetId: string;
      spreadsheetUrl?: string;
    };
    const spreadsheetId = json.spreadsheetId;
    const spreadsheetUrl =
      json.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Add initial header row
    await this.ensureSheetHeaders(accessToken, spreadsheetId, sheetName);

    return { spreadsheetId, spreadsheetUrl, sheetName };
  }

  private async ensureSheetHeaders(
    accessToken: string,
    spreadsheetId: string,
    sheetName: string,
  ): Promise<void> {
    try {
      const range = `'${sheetName}'!A1:K1`;
      const checkRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (checkRes.ok) {
        const json = (await checkRes.json()) as { values?: string[][] };
        if (json.values && json.values.length > 0 && json.values[0].length > 0) {
          // Headers already present
          return;
        }
      }

      // Write header row
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [DEFAULT_SHEET_HEADERS] }),
        },
      );
    } catch (err) {
      this.logger.warn(`Could not ensure headers in Google Sheet ${spreadsheetId}: ${String(err)}`);
    }
  }
}
