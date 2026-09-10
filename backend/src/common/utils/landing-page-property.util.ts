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
  brochureUrl: string;
  floorPlans: Array<{
    name: string;
    image: string;
    beds?: string;
    area?: string;
    downloadUrl?: string;
  }>;
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
  const props = { ...((n.props as Record<string, unknown>) ?? {}) };
  const type = n.type;

  // Legacy section widgets
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

  // OpenPage block types
  if (type === 'amenities' && snapshot.amenities.length > 0) {
    props.items = snapshot.amenities.map((title) => ({
      icon: '',
      title,
      description: '',
      image: '',
    }));
  }
  if ((type === 'features' || type === 'project-highlights') && snapshot.features.length > 0) {
    props.items = snapshot.features.map((title) => ({
      icon: '',
      title,
      description: '',
    }));
  }
  if (type === 'location' && snapshot.location) {
    props.address = snapshot.location;
  }
  if (type === 'gallery' && snapshot.gallery.length > 0) {
    props.images = snapshot.gallery.map((src) => ({ src, alt: snapshot.name, caption: '' }));
  }
  if (type === 'floor-plans' && snapshot.floorPlans.length > 0) {
    props.items = snapshot.floorPlans;
    if (props.gateEnabled === undefined) props.gateEnabled = true;
  }
  if (type === 'download-brochure') {
    if (snapshot.brochureUrl) props.pdfUrl = snapshot.brochureUrl;
    if (!props.image && snapshot.gallery[0]) props.image = snapshot.gallery[0];
  }
  if (type === 'project-banner' || type === 'project-overview' || type === 're-pricing') {
    if (snapshot.name && !String(props.title || '').trim()) {
      // keep template titles; vars already rewrite {{property_name}}
    }
    if (type === 're-pricing' && snapshot.startingPrice) {
      props.startingPrice = snapshot.startingPrice;
    }
    if (type === 'project-banner' && snapshot.gallery[0] && !props.image) {
      props.image = snapshot.gallery[0];
    }
  }
  if (type === 'developer' && snapshot.builder) {
    props.name = snapshot.builder;
  }

  const children = Array.isArray(n.children)
    ? overlayInventoryWidgets(n.children, binding, snapshot)
    : n.children;
  const next: Record<string, unknown> = { ...n, settings, children };
  if (n.props && typeof n.props === 'object') next.props = props;
  return next;
}

function overlayOpenPageSite(
  site: unknown,
  binding: PropertyBinding,
  snapshot: PropertySnapshot,
): unknown {
  if (!site || typeof site !== 'object') return site;
  const s = site as Record<string, unknown>;
  const walkBlocks = (blocks: unknown): unknown => {
    if (!Array.isArray(blocks)) return blocks;
    return blocks.map((b) => overlayInventoryNode(b, binding, snapshot));
  };
  const pages = Array.isArray(s.pages)
    ? s.pages.map((page) => {
        if (!page || typeof page !== 'object') return page;
        const p = page as Record<string, unknown>;
        return { ...p, blocks: walkBlocks(p.blocks) };
      })
    : s.pages;
  return {
    ...s,
    blocks: walkBlocks(s.blocks),
    pages,
    property: snapshot,
    propertyBinding: binding,
    vars: varsFromSnapshot(snapshot),
    name: snapshot.name || s.name,
  };
}

export function bindLandingPageContent(
  content: { sections?: unknown; config?: Record<string, unknown>; site?: unknown },
  binding: PropertyBinding,
  snapshot: PropertySnapshot,
): { sections: unknown; config: Record<string, unknown>; site?: unknown } {
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

  let site = content.site;
  if (site) {
    site = applyLandingPageVars(site, vars);
    site = overlayOpenPageSite(site, binding, snapshot);
  }

  return {
    sections,
    site,
    config: {
      ...config,
      brand,
      seo,
      footer,
      propertyBinding: binding,
      vars,
      property: snapshot,
      ...(site ? { site } : {}),
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
    brochureUrl?: string | null;
    floorPlanUrls?: string[];
  };
  unitCount?: number;
  unitTypes?: Array<{
    name?: string | null;
    configuration?: string | null;
    carpetSqft?: number | null;
    floorPlanUrl?: string | null;
  }>;
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

  const fromTypes = (input.unitTypes ?? [])
    .filter((ut) => ut.floorPlanUrl)
    .map((ut) => ({
      name: ut.name || ut.configuration || 'Floor plan',
      beds: ut.configuration || ut.name || '',
      area: ut.carpetSqft != null ? `${ut.carpetSqft.toLocaleString('en-IN')} sq.ft` : '',
      image: ut.floorPlanUrl as string,
      downloadUrl: ut.floorPlanUrl as string,
    }));
  const fromProject = (p.floorPlanUrls ?? []).map((url, i) => ({
    name: `Floor plan ${i + 1}`,
    beds: '',
    area: '',
    image: url,
    downloadUrl: url,
  }));

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
    brochureUrl: p.brochureUrl ?? '',
    floorPlans: fromTypes.length ? fromTypes : fromProject,
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
    floorPlanUrl?: string | null;
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
    brochureUrl: '',
    floorPlans: u.floorPlanUrl
      ? [
          {
            name: u.configuration || 'Floor plan',
            beds: u.configuration || '',
            area: carpet,
            image: u.floorPlanUrl,
            downloadUrl: u.floorPlanUrl,
          },
        ]
      : [],
  };
}
