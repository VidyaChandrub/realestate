import type { BlockConfig, SiteConfig } from "@/components/openpage/blocks/types";
import { defaultConfig } from "@/components/openpage/store/configStore";
import type { LandingPageData, SectionInstance, SiteConfig as LegacyConfig } from "@/lib/openpage/types";
import { ensureConfig } from "@/lib/openpage/site-config";
import { themePresets } from "@/lib/openpage/theme-presets";
import { buildRealEstateTemplate } from "@/lib/openpage/re-templates";

export function isOpenPageSite(value: unknown): value is SiteConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as SiteConfig;
  return Array.isArray(v.blocks) || (Array.isArray(v.pages) && v.pages.length > 0);
}

function siteBlocks(site: SiteConfig): BlockConfig[] {
  if (Array.isArray(site.blocks) && site.blocks.length) return site.blocks;
  const pageBlocks = site.pages?.[0]?.blocks;
  return Array.isArray(pageBlocks) ? pageBlocks : [];
}

export function normalizeSite(site: SiteConfig, name?: string): SiteConfig {
  const blocks = siteBlocks(site);
  const pages =
    site.pages && site.pages.length
      ? site.pages.map((p, i) => (i === 0 ? { ...p, blocks: p.blocks?.length ? p.blocks : blocks } : p))
      : [{ id: "page-home", name: "Home", path: "/", blocks }];
  return {
    ...site,
    engine: "openpage",
    name: site.name || name,
    blocks: pages[0]?.blocks ?? blocks,
    pages,
  };
}

export function siteFromLandingPage(page: LandingPageData): SiteConfig {
  const raw = page as LandingPageData & {
    openPageSite?: SiteConfig;
    site?: SiteConfig;
    content?: { site?: SiteConfig; config?: { site?: SiteConfig } };
  };
  const candidates = [
    raw.openPageSite,
    raw.site,
    raw.content?.site,
    (raw.config as (LegacyConfig & { site?: SiteConfig }) | undefined)?.site,
    raw.content?.config?.site,
  ];
  for (const stored of candidates) {
    if (stored && isOpenPageSite(stored) && siteBlocks(stored).length) {
      return normalizeSite({ ...stored, name: stored.name || page.name });
    }
  }
  if (page.sections?.length) {
    return migrateLegacySections(page);
  }
  return normalizeSite(buildRealEstateTemplate("premium", page.name || "Landing page"));
}

function migrateLegacySections(page: LandingPageData): SiteConfig {
  const cfg = ensureConfig(page);
  const blocks: BlockConfig[] = page.sections.map((section, i) => sectionToBlock(section, i));
  const ivory = themePresets.find((t) => t.id === "ivory")?.theme;
  return {
    engine: "openpage",
    name: page.name,
    pages: [{ id: "page-home", name: "Home", path: "/", blocks }],
    blocks,
    theme: ivory,
    forms: cfg.forms as SiteConfig["forms"],
    seo: cfg.seo,
    tracking: cfg.tracking,
    property: cfg.property,
  };
}

function sectionToBlock(section: SectionInstance, index: number): BlockConfig {
  const typeMap: Record<string, BlockConfig["type"]> = {
    hero: "project-banner",
    faq: "faq",
    gallery: "gallery",
    video: "video",
    testimonials: "testimonials",
    footer: "footer",
    "lead-form": "lead-form",
    amenities: "amenities",
    "floor-plans": "floor-plans",
    location: "location",
    "cta-banner": "cta",
    cta: "cta",
    pricing: "re-pricing",
  };
  const type = typeMap[section.type] ?? "custom-section";
  return {
    id: section.id || `block-migrated-${index}`,
    type,
    variant: "default",
    props: { ...section.settings, title: section.label || section.settings?.title },
  };
}

export function landingPageFromSite(page: LandingPageData, site: SiteConfig): LandingPageData {
  const cfg = ensureConfig(page);
  return {
    ...page,
    name: site.name || page.name,
    config: {
      ...cfg,
      forms: site.forms ?? cfg.forms,
      seo: {
        ...cfg.seo,
        metaTitle: site.seo?.metaTitle ?? cfg.seo.metaTitle,
        metaDescription: site.seo?.metaDescription ?? cfg.seo.metaDescription,
        keywords: site.seo?.keywords ?? cfg.seo.keywords,
        canonical: site.seo?.canonical ?? cfg.seo.canonical,
        ogTitle: site.seo?.ogTitle ?? cfg.seo.ogTitle,
        ogDescription: site.seo?.ogDescription ?? cfg.seo.ogDescription,
        ogImage: site.seo?.ogImage ?? cfg.seo.ogImage,
      },
      tracking: {
        ...cfg.tracking,
        gaId: site.tracking?.gaId ?? cfg.tracking.gaId,
        gtmId: site.tracking?.gtmId ?? cfg.tracking.gtmId,
        metaPixel: site.tracking?.metaPixel ?? cfg.tracking.metaPixel,
        customScripts: site.tracking?.customScripts ?? cfg.tracking.customScripts,
        utmSource: site.tracking?.utmSource ?? cfg.tracking.utmSource,
        utmMedium: site.tracking?.utmMedium ?? cfg.tracking.utmMedium,
        utmCampaign: site.tracking?.utmCampaign ?? cfg.tracking.utmCampaign,
      },
    },
    openPageSite: { ...normalizeSite(site, page.name), engine: "openpage" },
    sections: [],
  };
}

export function emptyOpenPage(name = "Untitled"): SiteConfig {
  return { ...defaultConfig, engine: "openpage", name };
}
