/**
 * Template widgets use {{key}} placeholders. These are the keys currently
 * referenced in the builder library (hero, FAQ, property-details, sticky-cta,
 * builder-profile, timeline) plus a few extras used by SiteConfig.
 */
export const LANDING_PAGE_VAR_KEYS = [
  'property_name',
  'builder_name',
  'starting_price',
  'rera_number',
  'possession_date',
  'carpet_area',
  'location',
  'description',
  'tagline',
  'land_area',
  'towers',
  'units',
] as const;

export type LandingPageVarKey = (typeof LANDING_PAGE_VAR_KEYS)[number];

export type LandingPageVars = Record<string, string>;

export type PropertyBinding =
  | { kind: 'project'; projectId: string }
  | { kind: 'unit'; unitId: string };

export type PropertySnapshot = {
  name: string;
  builder: string;
  type: string;
  status: string;
  description: string;
  startingPrice: string;
  carpetArea: string;
  reraNumber: string;
  location: string;
  possession: string;
  amenities: string[];
  features: string[];
  gallery: string[];
  landArea: string;
  towers: string;
  units: string;
};

function formatInr(value: number | null | undefined): string {
  if (value == null) return '';
  if (value >= 1e7) {
    return `₹${(value / 1e7).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  }
  if (value >= 1e5) {
    return `₹${(value / 1e5).toFixed(2).replace(/\.?0+$/, '')} L`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
}

function joinLocation(parts: Array<string | null | undefined>): string {
  return parts.map((p) => p?.trim()).filter(Boolean).join(', ');
}

export function varsFromSnapshot(s: PropertySnapshot): LandingPageVars {
  return {
    property_name: s.name,
    builder_name: s.builder,
    starting_price: s.startingPrice,
    rera_number: s.reraNumber,
    possession_date: s.possession,
    carpet_area: s.carpetArea,
    location: s.location,
    description: s.description,
    tagline: s.description,
    land_area: s.landArea,
    towers: s.towers,
    units: s.units,
  };
}

export function applyLandingPageVars(value: unknown, vars: LandingPageVars): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_m, key: string) =>
      vars[key] != null && vars[key] !== '' ? vars[key] : `{{${key}}}`,
    );
  }
  if (Array.isArray(value)) {
    return value.map((item) => applyLandingPageVars(item, vars));
  }
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      next[k] = applyLandingPageVars(v, vars);
    }
    return next;
  }
  return value;
}

function overlayInventoryWidgets(
  sections: unknown,
  binding: PropertyBinding,
  snapshot: PropertySnapshot,
): unknown {
  if (!Array.isArray(sections)) return sections;
  return sections.map((node) => overlayInventoryNode(node, binding, snapshot));
}

function overlayInventoryNode(
  node: unknown,
  binding: PropertyBinding,
  snapshot: PropertySnapshot,
): unknown {
  if (!node || typeof node !== 'object') return node;
  const n = node as Record<string, unknown>;
  const settings = { ...((n.settings as Record<string, unknown>) ?? {}) };
  const type = n.type;
  if (type === 'project' && binding.kind === 'project') {
    settings.selectedProjectId = binding.projectId;
  }
  if (type === 'amenities' && snapshot.amenities.length > 0) {
    settings.items = snapshot.amenities.map((title) => ({
      icon: 'Sparkles',
      title,
      desc: '',
    }));
  }
  if (type === 'features' && snapshot.features.length > 0) {
    settings.items = snapshot.features.map((title) => ({ title, text: '' }));
  }
  if (type === 'location-advantages' && snapshot.location) {
    settings.address = snapshot.location;
  }
  const children = Array.isArray(n.children)
    ? overlayInventoryWidgets(n.children, binding, snapshot)
    : n.children;
  return { ...n, settings, children };
}

export function bindLandingPageContent(
  content: { sections?: unknown; config?: Record<string, unknown> },
  binding: PropertyBinding,
  snapshot: PropertySnapshot,
): { sections: unknown; config: Record<string, unknown> } {
  const vars = varsFromSnapshot(snapshot);
  const withVars = applyLandingPageVars(content.sections ?? [], vars);
  const sections = overlayInventoryWidgets(withVars, binding, snapshot);
  const config = {
    ...(content.config ?? {}),
  } as Record<string, unknown>;

  const brand = {
    ...((config.brand as Record<string, unknown>) ?? {}),
    name: snapshot.name || (config.brand as { name?: string } | undefined)?.name,
    tagline:
      snapshot.description ||
      (config.brand as { tagline?: string } | undefined)?.tagline,
  };
  const seo = {
    ...((config.seo as Record<string, unknown>) ?? {}),
    metaTitle: snapshot.name
      ? `${snapshot.name} | Real Estate`.slice(0, 60)
      : (config.seo as { metaTitle?: string } | undefined)?.metaTitle,
    metaDescription: snapshot.description || (config.seo as { metaDescription?: string } | undefined)?.metaDescription,
    ogTitle: snapshot.name || (config.seo as { ogTitle?: string } | undefined)?.ogTitle,
    ogDescription: snapshot.description || (config.seo as { ogDescription?: string } | undefined)?.ogDescription,
  };
  const footer = {
    ...((config.footer as Record<string, unknown>) ?? {}),
    rera: snapshot.reraNumber || (config.footer as { rera?: string } | undefined)?.rera,
  };

  return {
    sections,
    config: {
      ...config,
      brand,
      seo,
      footer,
      propertyBinding: binding,
      vars,
      property: snapshot,
    },
  };
}

export function snapshotFromProject(input: {
  orgName: string;
  project: {
    name: string;
    location: string | null;
    reraId: string | null;
    possession: string | null;
    priceMin: number | null;
    carpetRange: string | null;
    tagline: string | null;
    highlights: string | null;
    projectType: string | null;
    constructionStage: string | null;
    landArea: unknown;
    towerCount: number | null;
    addressLine: string | null;
    city: string | null;
    locality: string | null;
    amenities: unknown;
    galleryUrls?: string[];
    connectivity?: string[];
  };
  unitCount?: number;
}): PropertySnapshot {
  const p = input.project;
  const amenityNames = Array.isArray(p.amenities)
    ? p.amenities
        .map((a) =>
          typeof a === 'string'
            ? a
            : a && typeof a === 'object' && 'name' in a
              ? String((a as { name?: string }).name ?? '')
              : '',
        )
        .filter(Boolean)
    : [];
  const land =
    p.landArea != null && p.landArea !== ''
      ? `${String(p.landArea)} Ac`
      : '';
  const location = joinLocation([p.location, p.locality, p.city, p.addressLine]);
  const description = (p.tagline || p.highlights || '').trim();
  return {
    name: p.name,
    builder: input.orgName,
    type: p.projectType ?? '',
    status: p.constructionStage ?? '',
    description,
    startingPrice: formatInr(p.priceMin),
    carpetArea: p.carpetRange ?? '',
    reraNumber: p.reraId ?? '',
    location,
    possession: p.possession ?? '',
    amenities: amenityNames,
    features: p.connectivity ?? [],
    gallery: p.galleryUrls ?? [],
    landArea: land,
    towers: p.towerCount != null ? String(p.towerCount) : '',
    units: input.unitCount != null ? String(input.unitCount) : '',
  };
}

export function snapshotFromStandaloneUnit(input: {
  orgName: string;
  unit: {
    unitNo: string;
    configuration: string | null;
    variantLabel: string | null;
    carpetSqft: number | null;
    builtupSqft: number | null;
    price: number | null;
    addressLine: string | null;
    notes: string | null;
    galleryUrls?: string[];
    status: string;
    floor: number | null;
    tower: string | null;
  };
}): PropertySnapshot {
  const u = input.unit;
  const name = [u.configuration, u.variantLabel, u.unitNo].filter(Boolean).join(' · ') || u.unitNo;
  const carpet =
    u.carpetSqft != null
      ? `${u.carpetSqft.toLocaleString('en-IN')} sq.ft`
      : u.builtupSqft != null
        ? `${u.builtupSqft.toLocaleString('en-IN')} sq.ft`
        : '';
  return {
    name,
    builder: input.orgName,
    type: u.configuration ?? 'Unit',
    status: u.status,
    description: u.notes ?? '',
    startingPrice: formatInr(u.price),
    carpetArea: carpet,
    reraNumber: '',
    location: u.addressLine ?? '',
    possession: '',
    amenities: [],
    features: [u.tower ? `Tower ${u.tower}` : '', u.floor != null ? `Floor ${u.floor}` : ''].filter(Boolean),
    gallery: u.galleryUrls ?? [],
    landArea: '',
    towers: u.tower ?? '',
    units: '1',
  };
}
