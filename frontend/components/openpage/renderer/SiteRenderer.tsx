"use client";

import { useMemo } from "react";
import type { SiteConfig, BlockConfig } from "@/components/openpage/blocks/types";
import { RenderBlock } from "@/components/openpage/blocks/registry";
import { resolveTheme, themeToCSS } from "@/lib/openpage/theme-presets";
import { useGoogleFonts } from "@/lib/openpage/useGoogleFonts";
import { OpenPageRuntimeProvider } from "@/components/openpage/runtime/OpenPageRuntime";
import type { FormDefinition } from "@/lib/openpage/forms-store";
import { PageSettingsChrome } from "@/components/openpage/renderer/PageSettingsChrome";

export function SiteRenderer({
  site,
  live = true,
  pageId,
  projectName,
  forms,
}: {
  site: SiteConfig;
  live?: boolean;
  pageId?: string;
  projectName?: string;
  forms?: FormDefinition[];
}) {
  const pages = site.pages && site.pages.length > 0 ? site.pages : [{ id: "page-home", name: "Home", path: "/", blocks: site.blocks }];
  const blocks: BlockConfig[] = pages[0]?.blocks ?? site.blocks ?? [];
  const { typography, theme: themeOverride } = site.settings ?? {};

  const resolved = useMemo(() => {
    const base = resolveTheme(site.theme);
    return {
      ...base,
      fontSans: typography?.bodyFont || base.fontSans,
      fontDisplay: typography?.headingFont || base.fontDisplay,
      accent: themeOverride?.primary || base.accent,
      text0: themeOverride?.text || base.text0,
      bg1: themeOverride?.bg ?? base.bg1,
      radius: themeOverride?.radius ?? base.radius,
    };
  }, [site.theme, typography?.bodyFont, typography?.headingFont, themeOverride?.primary, themeOverride?.text, themeOverride?.bg, themeOverride?.radius]);
  const cssVars = useMemo(() => {
    const vars = themeToCSS(resolved);
    if (site.settings?.theme?.containerWidth) {
      Object.assign(vars, { "--op-container": `${site.settings.theme.containerWidth}px` });
    }
    return vars;
  }, [resolved, site.settings]);
  useGoogleFonts([resolved.fontSans, resolved.fontDisplay, resolved.fontMono]);
  const library = forms ?? site.forms ?? [];

  return (
    <OpenPageRuntimeProvider
      live={live}
      pageId={pageId}
      projectName={projectName || site.property?.name || site.name}
      forms={library}
      popups={site.popups ?? []}
    >
      <div
        className="op-site @container min-h-screen w-full"
        style={{ ...cssVars, color: "var(--color-text-0)", backgroundColor: "var(--color-bg-1)" } as React.CSSProperties}
      >
        {site.settings ? <PageSettingsChrome settings={site.settings} /> : null}
        {blocks.map((block) => (
          <RenderBlock key={block.id} block={block} />
        ))}
      </div>
    </OpenPageRuntimeProvider>
  );
}