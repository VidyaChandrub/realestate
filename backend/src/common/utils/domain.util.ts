import { randomBytes } from 'crypto';

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

export function isValidDomain(input: string): boolean {
  const host = normalizeDomain(input);
  if (!host || host.length > 253) return false;
  if (host.includes('localhost') || host.includes('127.0.0.1')) return false;
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(
    host,
  );
}

// Normalises a requested subdomain label (single DNS hostname segment, no dots
// or protocol). Lowercases, strips trailing dots, and rejects anything that
// isn't a valid label. Returns the clean value or null when invalid.
export function normalizeSubdomain(input: string): string {
  return input.trim().toLowerCase().replace(/\.+$/, '').replace(/^\.+/, '');
}

export function isValidSubdomain(input: string): boolean {
  const label = normalizeSubdomain(input);
  if (!label || label.length < 2 || label.length > 63) return false;
  // Single DNS label: alphanumeric start/end, hyphens in the middle only.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label)) return false;
  // Reserved / dangerous values.
  if (
    [
      'www',
      'admin',
      'api',
      'mail',
      'ftp',
      'cdn',
      'app',
      'localhost',
      'db',
      'staging',
      'test',
    ].includes(label)
  ) {
    return false;
  }
  return true;
}

// The platform's wildcard base domain (e.g. "ipixxel.in"). Reads the env var
// at call time — the PlatformConfigService patches process.env live from the
// Super Admin console config, so this tracks UI changes without a redeploy.
export function getSubdomainBaseDomain(): string {
  const base = (process.env.SUBDOMAIN_BASE_DOMAIN ?? 'ipixxel.in')
    .trim()
    .toLowerCase()
    .replace(/^\.+/, '')
    .replace(/:\d+$/, '');
  return base;
}

// The fully-qualified host name for an organisation subdomain, based on the
// platform's wildcard base domain (e.g. "<sub>.ipixxel.in"). In local dev
// (SUBDOMAIN_MODE=localhost) it renders "<sub>.localhost" which the OS resolves
// to 127.0.0.1 (works on mac/linux) so the whole flow works offline.
export function subdomainHost(subdomain: string): string {
  const label = normalizeSubdomain(subdomain);
  if (process.env.SUBDOMAIN_MODE === 'localhost') {
    return `${label}.localhost`;
  }
  return `${label}.${getSubdomainBaseDomain()}`;
}

// Given an incoming request host, return the organisation subdomain label if the
// host matches the configured wildcard base (dynamic via env) or ".localhost"
// during local dev. Returns null when the host is not an organisation subdomain.
export function extractSubdomainFromHost(host: string): string | null {
  if (!host) return null;
  const h = host.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  if (h.includes('/')) return null;

  // Local dev: "<sub>.localhost" maps to the local machine.
  if (h.endsWith('.localhost')) {
    const label = h.slice(0, -'.localhost'.length);
    return isValidSubdomain(label) ? label : null;
  }

  const base = getSubdomainBaseDomain();
  if (!base) return null;
  if (!h.endsWith(`.${base}`) || h === base) return null;
  const label = h.slice(0, h.length - base.length - 1);
  // Exclude other first-level labels that share the base's parent domain.
  if (!label || label.includes('.') || !isValidSubdomain(label)) return null;
  return label;
}

export function generateVerificationToken(): string {
  return randomBytes(16).toString('hex');
}

// Produces a short list of candidate subdomain labels based on a base label,
// used to suggest alternatives when the requested one is taken.
export function generateSubdomainSuggestions(base: string, max = 4): string[] {
  const label = normalizeSubdomain(base)
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
  if (!label) return [];
  const raw = [
    `${label}1`,
    `${label}2`,
    label.endsWith('realty')
      ? label.replace(/realty$/, 'homes')
      : `${label}realty`,
    label.endsWith('homes')
      ? label.replace(/homes$/, 'realty')
      : `${label}homes`,
    `${label}estate`,
    `${label}group`,
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    const clean = s.toLowerCase();
    if (isValidSubdomain(clean) && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
    if (out.length >= max) break;
  }
  return out;
}

export function generateDnsInstructions(domain: string, token: string) {
  const infraIp = process.env.INFRA_IP || '76.76.21.21';
  const infraCname = process.env.INFRA_CNAME_TARGET || 'cname.bigestate.io';
  const infraNs1 = process.env.INFRA_NS1 || 'ns1.bigestate.io';
  const infraNs2 = process.env.INFRA_NS2 || 'ns2.bigestate.io';
  const infraMode = process.env.DNS_MODE || 'cname'; // cname | a | ns
  const records: Array<{
    type: string;
    host: string;
    value: string;
    ttl: string;
    purpose: string;
  }> = [];
  if (infraMode === 'ns') {
    records.push({
      type: 'NS',
      host: '@',
      value: infraNs1,
      ttl: 'Auto',
      purpose: 'Primary nameserver',
    });
    records.push({
      type: 'NS',
      host: '@',
      value: infraNs2,
      ttl: 'Auto',
      purpose: 'Secondary nameserver',
    });
  } else if (infraMode === 'a') {
    records.push({
      type: 'A',
      host: '@',
      value: infraIp,
      ttl: 'Auto',
      purpose: 'Website',
    });
    records.push({
      type: 'AAAA',
      host: '@',
      value: process.env.INFRA_IPV6 || '::',
      ttl: 'Auto',
      purpose: 'Website IPv6',
    });
    records.push({
      type: 'TXT',
      host: '_bigestate-verify',
      value: `bigestate-verify=${token}`,
      ttl: 'Auto',
      purpose: 'Verification',
    });
    records.push({
      type: 'CNAME',
      host: 'www',
      value: domain,
      ttl: 'Auto',
      purpose: 'WWW redirect',
    });
  } else {
    records.push({
      type: 'CNAME',
      host: 'www',
      value: infraCname,
      ttl: 'Auto',
      purpose: 'Website',
    });
    records.push({
      type: 'TXT',
      host: '@',
      value: `bigestate-verify=${token}`,
      ttl: 'Auto',
      purpose: 'Verification',
    });
    records.push({
      type: 'TXT',
      host: '_bigestate-verify',
      value: `bigestate-verify=${token}`,
      ttl: 'Auto',
      purpose: 'Verification',
    });
  }
  return {
    domain: normalizeDomain(domain),
    token,
    mode: infraMode,
    infra: { ip: infraIp, cname: infraCname, ns1: infraNs1, ns2: infraNs2 },
    records,
  };
}

export function getInfraInfo() {
  return {
    ip: process.env.INFRA_IP || '76.76.21.21',
    ipv6: process.env.INFRA_IPV6 || null,
    cname: process.env.INFRA_CNAME_TARGET || 'cname.bigestate.io',
    ns1: process.env.INFRA_NS1 || 'ns1.bigestate.io',
    ns2: process.env.INFRA_NS2 || 'ns2.bigestate.io',
    mode: process.env.DNS_MODE || 'cname',
  };
}

export interface DnsRecordSpec {
  type: string;
  host: string;
  value: string;
  ttl: string;
  purpose: string;
}

// The DNS records a Super Admin must add at their registrar (Hostinger, etc.)
// for an organisation subdomain. Because every org sits under the same
// wildcard base, one wildcard record covers all subdomains. `skipHost` lets
// callers label the record against the platform base directly ("@") while
// still showing the concrete "<sub>.<base>" hostname elsewhere.
export function generateSubdomainDnsInstructions(
  host = '*',
  opts: {
    mode?: string;
    ip?: string;
    ipv6?: string | null;
    cname?: string;
    ns1?: string;
    ns2?: string;
  } = {},
): { mode: string; records: DnsRecordSpec[] } {
  const mode = opts.mode ?? process.env.DNS_MODE ?? 'cname';
  const ip = opts.ip ?? process.env.INFRA_IP ?? '';
  const ipv6 =
    opts.ipv6 !== undefined ? opts.ipv6 : (process.env.INFRA_IPV6 ?? null);
  const cname =
    opts.cname ?? process.env.INFRA_CNAME_TARGET ?? 'cname.bigestate.io';
  const ns1 = opts.ns1 ?? process.env.INFRA_NS1 ?? 'ns1.bigestate.io';
  const ns2 = opts.ns2 ?? process.env.INFRA_NS2 ?? 'ns2.bigestate.io';
  const label = host === '*' ? '*' : normalizeSubdomain(host);
  const records: DnsRecordSpec[] = [];
  if (mode === 'ns') {
    records.push({
      type: 'NS',
      host: '@',
      value: ns1,
      ttl: 'Auto',
      purpose: 'Primary nameserver',
    });
    records.push({
      type: 'NS',
      host: '@',
      value: ns2,
      ttl: 'Auto',
      purpose: 'Secondary nameserver',
    });
  } else if (mode === 'cname') {
    records.push({
      type: 'CNAME',
      host: label,
      value: cname,
      ttl: 'Auto',
      purpose: 'Subdomain website',
    });
  } else {
    if (!ip)
      throw new Error(
        'DNS mode "a" requires an origin IP (configure platform subdomain settings)',
      );
    records.push({
      type: 'A',
      host: label,
      value: ip,
      ttl: 'Auto',
      purpose: 'Subdomain website',
    });
    if (ipv6)
      records.push({
        type: 'AAAA',
        host: label,
        value: ipv6,
        ttl: 'Auto',
        purpose: 'Subdomain website (IPv6)',
      });
  }
  return { mode, records };
}

// The concrete DNS records for ONE organisation subdomain, e.g. the A record
// "atomatci → <AWS IP>" shown next to each approved request in the admin UI.
export function generateSubdomainHostInstructions(
  subdomain: string,
  opts?: {
    mode?: string;
    ip?: string;
    ipv6?: string | null;
    cname?: string;
    ns1?: string;
    ns2?: string;
  },
): DnsRecordSpec[] {
  const label = normalizeSubdomain(subdomain);
  return generateSubdomainDnsInstructions(label, opts).records.map((r) =>
    r.host === '*' ? { ...r, host: label } : r,
  );
}
