import {
  BadRequestException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PlatformConfig } from '@prisma/client';
import { normalizeDomain } from '../../common/utils/domain.util';
import { UpdatePlatformConfigDto } from './dto/update-platform-config.dto';

// The single global config row id. Only one row is ever used.
const PLATFORM_CONFIG_ID = 'platform';

// Environment keys patched live from the DB row so the existing sync
// domain.utils (subdomainHost / extractSubdomainFromHost / DNS generators)
// pick up Super Admin console changes without a redeploy or process restart.
function patchEnv(patch: Record<string, string | null>) {
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === '') {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

@Injectable()
export class PlatformConfigService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlatformConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Prod installs often never ran migrations (same situation as EmailConfig) —
  // create the table at runtime so GET/PUT never 500s.
  private async ensureTable() {
    await this.prisma.$executeRawUnsafe(
      `CREATE SCHEMA IF NOT EXISTS "identity";`,
    );
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "identity"."platform_configs" (
        "id" TEXT NOT NULL,
        "subdomain_mode" TEXT NOT NULL DEFAULT 'production',
        "subdomain_base" TEXT,
        "dns_mode" TEXT NOT NULL DEFAULT 'a',
        "infra_ip" TEXT,
        "infra_ipv6" TEXT,
        "infra_cname" TEXT,
        "infra_ns1" TEXT,
        "infra_ns2" TEXT,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "platform_configs_pkey" PRIMARY KEY ("id")
      );
    `);
  }

  async onApplicationBootstrap() {
    try {
      await this.ensureTable();
      await this.applySavedConfigToEnv();
    } catch (err: any) {
      this.logger.warn(`Could not load PlatformConfig on boot: ${err.message}`);
    }
  }

  // Load the saved row (if any) and patch process.env so the whole app uses it.
  private async applySavedConfigToEnv() {
    let row: PlatformConfig | null = null;
    try {
      row = await this.prisma.platformConfig.findUnique({
        where: { id: PLATFORM_CONFIG_ID },
      });
    } catch (err: any) {
      this.logger.warn(`Could not read PlatformConfig row: ${err.message}`);
    }
    if (!row) return;
    patchEnv({
      SUBDOMAIN_MODE: row.subdomainMode || null,
      SUBDOMAIN_BASE_DOMAIN: row.subdomainBase
        ? normalizeDomain(row.subdomainBase)
        : null,
      DNS_MODE: row.dnsMode || null,
      INFRA_IP: row.infraIp || null,
      INFRA_IPV6: row.infraIpv6 || null,
      INFRA_CNAME_TARGET: row.infraCname || null,
      INFRA_NS1: row.infraNs1 || null,
      INFRA_NS2: row.infraNs2 || null,
    });
  }

  async getConfig() {
    let config: PlatformConfig | null = null;
    try {
      config = await this.prisma.platformConfig.findUnique({
        where: { id: PLATFORM_CONFIG_ID },
      });
      if (config) {
        return this.toView(config);
      }
    } catch (err: any) {
      this.logger.warn(`Could not read PlatformConfig from DB: ${err.message}`);
    }

    // Fallback from environment variables (what local dev / pre-console deploys use).
    return {
      id: null,
      subdomainMode:
        process.env.SUBDOMAIN_MODE === 'localhost' ? 'localhost' : 'production',
      subdomainBase: process.env.SUBDOMAIN_BASE_DOMAIN || null,
      dnsMode: process.env.DNS_MODE || 'cname',
      infraIp: process.env.INFRA_IP || null,
      infraIpv6: process.env.INFRA_IPV6 || null,
      infraCname: process.env.INFRA_CNAME_TARGET || null,
      infraNs1: process.env.INFRA_NS1 || null,
      infraNs2: process.env.INFRA_NS2 || null,
      updatedAt: null,
    };
  }

  async updateConfig(dto: UpdatePlatformConfigDto) {
    await this.ensureTable();

    const where = { id: PLATFORM_CONFIG_ID };
    const data = {
      subdomainMode: dto.subdomainMode ?? 'production',
      subdomainBase: dto.subdomainBase?.trim()
        ? normalizeDomain(dto.subdomainBase)
        : null,
      dnsMode: dto.dnsMode ?? 'a',
      infraIp: dto.infraIp?.trim() || null,
      infraIpv6: dto.infraIpv6?.trim() || null,
      infraCname: dto.infraCname?.trim() || null,
      infraNs1: dto.infraNs1?.trim() || null,
      infraNs2: dto.infraNs2?.trim() || null,
    };

    if (data.dnsMode === 'a' && !data.infraIp) {
      throw new BadRequestException(
        'DNS mode "A record" requires the server IP (infraIp).',
      );
    }

    let saved: PlatformConfig;
    try {
      const existing = await this.prisma.platformConfig.findUnique({ where });
      saved = existing
        ? await this.prisma.platformConfig.update({ where, data })
        : await this.prisma.platformConfig.create({
            data: { id: PLATFORM_CONFIG_ID, ...data },
          });
    } catch (err: any) {
      this.logger.warn(`PlatformConfig upsert failed: ${err.message}`);
      throw err;
    }

    // Live-apply so subdomainHost()/extractSubdomainFromHost()/DNS helpers
    // immediately reflect the new base domain / origin without a redeploy.
    patchEnv({
      SUBDOMAIN_MODE: saved.subdomainMode || null,
      SUBDOMAIN_BASE_DOMAIN: saved.subdomainBase || null,
      DNS_MODE: saved.dnsMode || null,
      INFRA_IP: saved.infraIp || null,
      INFRA_IPV6: saved.infraIpv6 || null,
      INFRA_CNAME_TARGET: saved.infraCname || null,
      INFRA_NS1: saved.infraNs1 || null,
      INFRA_NS2: saved.infraNs2 || null,
    });

    return this.toView(saved);
  }

  private toView(config: PlatformConfig) {
    return {
      id: config.id,
      subdomainMode: config.subdomainMode,
      subdomainBase: config.subdomainBase,
      dnsMode: config.dnsMode,
      infraIp: config.infraIp,
      infraIpv6: config.infraIpv6,
      infraCname: config.infraCname,
      infraNs1: config.infraNs1,
      infraNs2: config.infraNs2,
      updatedAt: config.updatedAt,
    };
  }
}
