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
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(host);
}

export function generateVerificationToken(): string {
  return randomBytes(16).toString('hex');
}

export function generateDnsInstructions(domain: string, token: string) {
  const infraIp = process.env.INFRA_IP || '76.76.21.21';
  const infraCname = process.env.INFRA_CNAME_TARGET || 'cname.bigestate.io';
  const infraNs1 = process.env.INFRA_NS1 || 'ns1.bigestate.io';
  const infraNs2 = process.env.INFRA_NS2 || 'ns2.bigestate.io';
  const infraMode = process.env.DNS_MODE || 'cname'; // cname | a | ns
  const records: Array<{ type: string; host: string; value: string; ttl: string; purpose: string }> = [];
  if (infraMode === 'ns') {
    records.push({ type: 'NS', host: '@', value: infraNs1, ttl: 'Auto', purpose: 'Primary nameserver' });
    records.push({ type: 'NS', host: '@', value: infraNs2, ttl: 'Auto', purpose: 'Secondary nameserver' });
  } else if (infraMode === 'a') {
    records.push({ type: 'A', host: '@', value: infraIp, ttl: 'Auto', purpose: 'Website' });
    records.push({ type: 'AAAA', host: '@', value: process.env.INFRA_IPV6 || '::', ttl: 'Auto', purpose: 'Website IPv6' });
    records.push({ type: 'TXT', host: '_bigestate-verify', value: `bigestate-verify=${token}`, ttl: 'Auto', purpose: 'Verification' });
    records.push({ type: 'CNAME', host: 'www', value: domain, ttl: 'Auto', purpose: 'WWW redirect' });
  } else {
    records.push({ type: 'CNAME', host: 'www', value: infraCname, ttl: 'Auto', purpose: 'Website' });
    records.push({ type: 'TXT', host: '@', value: `bigestate-verify=${token}`, ttl: 'Auto', purpose: 'Verification' });
    records.push({ type: 'TXT', host: '_bigestate-verify', value: `bigestate-verify=${token}`, ttl: 'Auto', purpose: 'Verification' });
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
