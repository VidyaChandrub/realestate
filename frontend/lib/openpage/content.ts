import type { BlockConfig, SiteConfig } from "@/components/openpage/blocks/types";
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
    name: site.name || name || "Untitled",
    blocks: pages[0]?.blocks ?? blocks,
    pages,
  };
}

export function siteFromLandingPage(page: LandingPageData): SiteConfig {
  const raw = page as LandingPageData & {
    openPageSite?: SiteConfig;
    site?: SiteConfig;
    content?: { site?: SiteConfig; config?: { site?: SiteConfig } & Record<string, unknown> };
  };
  const cfg = page.config ?? raw.content?.config;
  const candidates = [
    raw.openPageSite,
    raw.site,
    raw.content?.site,
    (raw.config as (LegacyConfig & { site?: SiteConfig }) | undefined)?.site,
    raw.content?.config?.site,
  ];
  for (const stored of candidates) {
    if (stored && isOpenPageSite(stored) && siteBlocks(stored).length) {
      const site = normalizeSite({ ...stored, name: stored.name || page.name });
      const binding = (cfg as { propertyBinding?: SiteConfig["propertyBinding"] } | undefined)?.propertyBinding
        ?? site.propertyBinding;
      const property = (cfg as { property?: SiteConfig["property"] } | undefined)?.property ?? site.property;
      const vars = (cfg as { vars?: Record<string, string> } | undefined)?.vars ?? site.vars;
      const cfgForms = (cfg as { forms?: SiteConfig["forms"] } | undefined)?.forms;
      const forms =
        Array.isArray(site.forms) && site.forms.length
          ? site.forms
          : Array.isArray(cfgForms) && cfgForms.length
            ? cfgForms
            : site.forms ?? cfgForms ?? [];
      return {
        ...site,
        forms,
        ...(binding ? { propertyBinding: binding } : {}),
        ...(property ? { property } : {}),
        ...(vars ? { vars } : {}),
      };
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
      settings: site.settings ?? cfg.settings,
      page: {
        ...cfg.page,
        favicon: site.settings?.page?.favicon ?? cfg.page.favicon,
        customCss: site.settings?.page?.customCss ?? cfg.page.customCss,
        customJs: site.settings?.page?.customJs ?? cfg.page.customJs,
      },
      forms: site.forms ?? cfg.forms,
      seo: {
        ...cfg.seo,
        metaTitle: site.seo?.metaTitle ?? cfg.seo.metaTitle,
        metaDescription: site.seo?.metaDescription ?? cfg.seo.metaDescription,
        keywords: site.seo?.keywords ?? cfg.seo.keywords,
        canonical: site.seo?.canonical ?? cfg.seo.canonical,
        index: site.seo?.index ?? cfg.seo.index,
        robots: site.seo?.robots ?? cfg.seo.robots,
        ogTitle: site.seo?.ogTitle ?? cfg.seo.ogTitle,
        ogDescription: site.seo?.ogDescription ?? cfg.seo.ogDescription,
        ogImage: site.seo?.ogImage ?? cfg.seo.ogImage,
        twitterCard: site.seo?.twitterCard ?? cfg.seo.twitterCard,
        twitterTitle: site.seo?.twitterTitle ?? cfg.seo.twitterTitle,
        twitterDescription: site.seo?.twitterDescription ?? cfg.seo.twitterDescription,
        twitterImage: site.seo?.twitterImage ?? cfg.seo.twitterImage,
        schema: site.seo?.schema ?? cfg.seo.schema,
      },
      tracking: {
        ...cfg.tracking,
        gaId: site.tracking?.gaId ?? cfg.tracking.gaId,
        gtmId: site.tracking?.gtmId ?? cfg.tracking.gtmId,
        metaPixel: site.tracking?.metaPixel ?? cfg.tracking.metaPixel,
        customScripts: site.tracking?.customScripts ?? cfg.tracking.customScripts,
        headerScripts: site.tracking?.headerScripts ?? cfg.tracking.headerScripts,
        bodyScripts: site.tracking?.bodyScripts ?? cfg.tracking.bodyScripts,
        cookieConsent: site.tracking?.cookieConsent ?? cfg.tracking.cookieConsent,
        consentText: site.tracking?.consentText ?? cfg.tracking.consentText,
        utmSource: site.tracking?.utmSource ?? cfg.tracking.utmSource,
        utmMedium: site.tracking?.utmMedium ?? cfg.tracking.utmMedium,
        utmCampaign: site.tracking?.utmCampaign ?? cfg.tracking.utmCampaign,
        goalForm: site.tracking?.goalForm ?? cfg.tracking.goalForm,
        goalWhatsapp: site.tracking?.goalWhatsapp ?? cfg.tracking.goalWhatsapp,
        goalCall: site.tracking?.goalCall ?? cfg.tracking.goalCall,
        goalBrochure: site.tracking?.goalBrochure ?? cfg.tracking.goalBrochure,
      },
    },
    openPageSite: { ...normalizeSite(site, page.name), engine: "openpage" },
    sections: [],
  };
}

export function emptyOpenPage(name = "Untitled"): SiteConfig {
  return {
    engine: "openpage",
    name,
    pages: [{ id: "page-home", name: "Home", path: "/", blocks: [] }],
    blocks: [],
    forms: [],
    globalWidgets: [],
  };
}
