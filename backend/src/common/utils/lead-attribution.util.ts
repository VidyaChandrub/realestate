/**
 * Pull marketing attribution from a free-form form/data blob (UTM query
 * params, Meta campaign fields, click ids) into structured Lead columns.
 * Keys are accepted in snake_case and camelCase.
 */

export type LeadAttribution = {
  source?: string | null;
  platform?: string | null;
  medium?: string | null;
  campaign?: string | null;
  campaignId?: string | null;
  adSet?: string | null;
  adSetId?: string | null;
  ad?: string | null;
  adId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  landingPageUrl?: string | null;
  landingPage?: string | null;
  referrer?: string | null;
  firstTouchSource?: string | null;
  lastTouchSource?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
};

const ATTR_KEYS: Array<{
  field: keyof LeadAttribution;
  aliases: string[];
}> = [
  { field: 'source', aliases: ['source', 'Source'] },
  { field: 'platform', aliases: ['platform', 'Platform'] },
  { field: 'medium', aliases: ['medium', 'Medium'] },
  {
    field: 'campaign',
    aliases: ['campaign', 'Campaign', 'campaign_name', 'campaignName'],
  },
  {
    field: 'campaignId',
    aliases: ['campaign_id', 'campaignId', 'Campaign ID'],
  },
  {
    field: 'adSet',
    aliases: ['ad_set', 'adSet', 'adset', 'adset_name', 'Ad Set'],
  },
  {
    field: 'adSetId',
    aliases: ['ad_set_id', 'adSetId', 'adset_id', 'Ad Set ID'],
  },
  { field: 'ad', aliases: ['ad', 'ad_name', 'adName', 'Ad'] },
  { field: 'adId', aliases: ['ad_id', 'adId', 'Ad ID'] },
  {
    field: 'utmSource',
    aliases: ['utm_source', 'utmSource', 'UTM Source'],
  },
  {
    field: 'utmMedium',
    aliases: ['utm_medium', 'utmMedium', 'UTM Medium'],
  },
  {
    field: 'utmCampaign',
    aliases: ['utm_campaign', 'utmCampaign', 'UTM Campaign'],
  },
  { field: 'utmTerm', aliases: ['utm_term', 'utmTerm', 'UTM Term'] },
  {
    field: 'utmContent',
    aliases: ['utm_content', 'utmContent', 'UTM Content'],
  },
  {
    field: 'landingPageUrl',
    aliases: [
      'landing_page_url',
      'landingPageUrl',
      'Landing Page URL',
    ],
  },
  {
    field: 'landingPage',
    aliases: ['landing_page', 'landingPage', 'Landing Page'],
  },
  { field: 'referrer', aliases: ['referrer', 'Referrer', 'ref'] },
  {
    field: 'firstTouchSource',
    aliases: ['first_touch_source', 'firstTouchSource', 'First-Touch Source'],
  },
  {
    field: 'lastTouchSource',
    aliases: ['last_touch_source', 'lastTouchSource', 'Last-Touch Source'],
  },
  { field: 'fbclid', aliases: ['fbclid', 'FBCLID'] },
  { field: 'gclid', aliases: ['gclid', 'GCLID'] },
];

function pickString(
  data: Record<string, unknown>,
  aliases: string[],
): string | null {
  for (const key of aliases) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

/** Extract attribution fields present in a form/data payload. */
export function extractAttributionFromData(
  data: Record<string, unknown> | null | undefined,
): LeadAttribution {
  if (!data || typeof data !== 'object') return {};
  const out: LeadAttribution = {};
  for (const { field, aliases } of ATTR_KEYS) {
    const value = pickString(data, aliases);
    if (value) out[field] = value;
  }
  return out;
}

/**
 * Merge explicit attribution overrides with values mined from `data`.
 * Explicit non-empty values win. Also derives platform / first / last touch
 * when missing.
 */
export function resolveAttribution(
  data: Record<string, unknown> | null | undefined,
  overrides: LeadAttribution = {},
): LeadAttribution {
  const fromData = extractAttributionFromData(data);
  const out: LeadAttribution = { ...fromData };
  for (const key of Object.keys(overrides) as Array<keyof LeadAttribution>) {
    const value = overrides[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      out[key] = String(value).trim();
    } else if (value === null) {
      out[key] = null;
    }
  }

  const touch =
    out.source ||
    out.utmSource ||
    out.platform ||
    null;
  if (!out.platform) {
    if (out.fbclid) out.platform = 'meta';
    else if (out.gclid) out.platform = 'google_ads';
    else if (out.utmSource) out.platform = inferPlatformKey(out.utmSource);
    else if (out.source) out.platform = inferPlatformKey(out.source);
  }
  if (!out.firstTouchSource && touch) out.firstTouchSource = touch;
  if (touch) out.lastTouchSource = touch;
  return out;
}

/** Map free-text source labels to stable platform keys. */
export function inferPlatformKey(source: string | null | undefined): string {
  const s = (source ?? '').trim().toLowerCase();
  if (!s) return 'website';
  if (s.includes('facebook') || s.includes('meta') || s === 'instagram') {
    return s.includes('instagram') ? 'instagram' : 'meta';
  }
  if (s.includes('google')) return 'google_ads';
  if (s.includes('linkedin')) return 'linkedin';
  if (s.includes('tiktok')) return 'tiktok';
  if (s.includes('whatsapp')) return 'whatsapp';
  if (s === 'crm' || s.includes('csv')) return 'crm';
  if (s.includes('webhook')) return 'webhook';
  return 'website';
}

/** Human label for Lead Center Source column. */
export function platformDisplayLabel(
  platform: string | null | undefined,
  source?: string | null,
): string {
  const key = (platform ?? '').trim().toLowerCase();
  const map: Record<string, string> = {
    meta: 'Facebook',
    facebook: 'Facebook',
    instagram: 'Instagram',
    google_ads: 'Google Ads',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok',
    whatsapp: 'WhatsApp Ads',
    ga: 'Google Analytics',
    website: 'Website',
    webhook: 'Webhook',
    crm: 'CRM',
  };
  if (key && map[key]) return map[key];
  const src = (source ?? '').trim();
  if (/csv/i.test(src)) return 'CSV import';
  if (/landing/i.test(src)) return 'Landing Page';
  return src || map.website;
}

/** Prisma create/update fragment for attribution columns (skips undefined). */
export function attributionToPrismaData(
  attr: LeadAttribution,
): Record<string, string | null> {
  const data: Record<string, string | null> = {};
  const map: Array<[keyof LeadAttribution, string]> = [
    ['platform', 'platform'],
    ['medium', 'medium'],
    ['campaign', 'campaign'],
    ['campaignId', 'campaignId'],
    ['adSet', 'adSet'],
    ['adSetId', 'adSetId'],
    ['ad', 'ad'],
    ['adId', 'adId'],
    ['utmSource', 'utmSource'],
    ['utmMedium', 'utmMedium'],
    ['utmCampaign', 'utmCampaign'],
    ['utmTerm', 'utmTerm'],
    ['utmContent', 'utmContent'],
    ['landingPageUrl', 'landingPageUrl'],
    ['landingPage', 'landingPage'],
    ['referrer', 'referrer'],
    ['firstTouchSource', 'firstTouchSource'],
    ['lastTouchSource', 'lastTouchSource'],
    ['fbclid', 'fbclid'],
    ['gclid', 'gclid'],
  ];
  for (const [attrKey, prismaKey] of map) {
    if (attr[attrKey] !== undefined) {
      data[prismaKey] = attr[attrKey] ?? null;
    }
  }
  return data;
}

/** Default Organisation Labels seeded / used as the platform catalog. */
export const DEFAULT_ATTRIBUTION_LABELS: Array<{
  key: string;
  label: string;
  sortOrder: number;
  enabled: boolean;
}> = [
  { key: 'platform', label: 'Platform', sortOrder: 5, enabled: true },
  { key: 'source', label: 'Source', sortOrder: 10, enabled: true },
  { key: 'medium', label: 'Medium', sortOrder: 20, enabled: true },
  { key: 'campaign', label: 'Campaign', sortOrder: 30, enabled: true },
  { key: 'campaign_id', label: 'Campaign ID', sortOrder: 40, enabled: true },
  { key: 'ad_set', label: 'Ad Set', sortOrder: 50, enabled: true },
  { key: 'ad', label: 'Ad', sortOrder: 60, enabled: true },
  { key: 'utm_source', label: 'UTM Source', sortOrder: 70, enabled: true },
  { key: 'utm_medium', label: 'UTM Medium', sortOrder: 80, enabled: true },
  { key: 'utm_campaign', label: 'UTM Campaign', sortOrder: 90, enabled: true },
  { key: 'utm_term', label: 'UTM Term', sortOrder: 100, enabled: true },
  { key: 'utm_content', label: 'UTM Content', sortOrder: 110, enabled: true },
  { key: 'landing_page', label: 'Landing Page', sortOrder: 115, enabled: true },
  {
    key: 'landing_page_url',
    label: 'Landing Page URL',
    sortOrder: 120,
    enabled: true,
  },
  { key: 'referrer', label: 'Referrer', sortOrder: 125, enabled: true },
  { key: 'fbclid', label: 'Facebook Click ID', sortOrder: 130, enabled: false },
  { key: 'gclid', label: 'Google Click ID', sortOrder: 140, enabled: false },
  {
    key: 'first_touch_source',
    label: 'First-Touch Source',
    sortOrder: 150,
    enabled: true,
  },
  {
    key: 'last_touch_source',
    label: 'Last-Touch Source',
    sortOrder: 160,
    enabled: true,
  },
];

export const DEFAULT_MARKETING_PLATFORMS: Array<{
  key: string;
  name: string;
  description: string;
  sortOrder: number;
  enabled: boolean;
  supportsOAuth: boolean;
  supportsWebhook: boolean;
}> = [
  {
    key: 'meta',
    name: 'Facebook / Meta',
    description:
      'Facebook Lead Ads — realtime form submissions into Lead Center',
    sortOrder: 10,
    enabled: true,
    supportsOAuth: true,
    supportsWebhook: true,
  },
  {
    key: 'instagram',
    name: 'Instagram',
    description:
      'Connect via Meta Page OAuth; Instant Form leads currently attributed as Facebook',
    sortOrder: 20,
    enabled: true,
    supportsOAuth: true,
    supportsWebhook: true,
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp Ads',
    description:
      'Connect via Meta Page OAuth; dedicated WhatsApp lead ingest not live yet',
    sortOrder: 30,
    enabled: true,
    supportsOAuth: true,
    supportsWebhook: false,
  },
  {
    key: 'google_ads',
    name: 'Google Ads',
    description:
      'OAuth connect ready; lead forms and campaign metrics sync coming later',
    sortOrder: 40,
    enabled: true,
    supportsOAuth: true,
    supportsWebhook: false,
  },
];

/** Platforms retained in Connected Apps / Integration Engine. */
export const ACTIVE_MARKETING_PLATFORM_KEYS = DEFAULT_MARKETING_PLATFORMS.map(
  (p) => p.key,
);
