import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { PlatformAdapter } from './platform-adapter.interface';
import { MetaAdapter } from './meta.adapter';
import { InstagramAdapter } from './instagram.adapter';
import { WhatsappAdapter } from './whatsapp.adapter';
import { GoogleAdsAdapter } from './google-ads.adapter';
import { GoogleSheetsAdapter } from './google-sheets.adapter';

@Injectable()
export class PlatformAdapterRegistry implements OnModuleInit {
  private readonly logger = new Logger(PlatformAdapterRegistry.name);
  private readonly byKey = new Map<string, PlatformAdapter>();

  constructor(
    private readonly meta: MetaAdapter,
    private readonly instagram: InstagramAdapter,
    private readonly whatsapp: WhatsappAdapter,
    private readonly googleAds: GoogleAdsAdapter,
    private readonly googleSheets: GoogleSheetsAdapter,
  ) {}

  onModuleInit() {
    for (const adapter of [
      this.meta,
      this.instagram,
      this.whatsapp,
      this.googleAds,
      this.googleSheets,
    ]) {
      this.register(adapter);
    }
    this.logger.log(
      `Integration Engine registered ${this.byKey.size} platform adapters`,
    );
  }

  register(adapter: PlatformAdapter) {
    this.byKey.set(adapter.key, adapter);
  }

  get(key: string): PlatformAdapter | undefined {
    return this.byKey.get(key);
  }

  require(key: string): PlatformAdapter {
    const adapter = this.byKey.get(key);
    if (!adapter) {
      throw new Error(`No Integration Engine adapter registered for "${key}"`);
    }
    return adapter;
  }

  all(): PlatformAdapter[] {
    return [...this.byKey.values()];
  }

  isConfigured(key: string): boolean {
    return this.byKey.get(key)?.isConfigured() ?? false;
  }

  category(key: string): string {
    return this.byKey.get(key)?.category ?? 'other';
  }
}
