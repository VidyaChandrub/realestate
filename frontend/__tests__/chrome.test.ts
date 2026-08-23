import { describe, expect, it } from "vitest";
import {
  FOOTER_DESIGNS,
  HEADER_DESIGNS,
  hydrateFooter,
  hydrateHeader,
  linksOf,
} from "@/lib/prestate/chrome-presets";
import { ensureConfig } from "@/lib/prestate/site-config";
import { PAGES } from "@/lib/prestate/data";
import type { FooterDesignId, HeaderDesignId, LandingPageData, SiteConfig } from "@/lib/prestate/types";

const PRESET_IDS = ["p1", "p2", "p3", "p4"];

function page(id: string): LandingPageData {
  const found = PAGES.find((p) => p.id === id);
  if (!found) throw new Error(`missing page ${id}`);
  return JSON.parse(JSON.stringify(found)) as LandingPageData;
}

describe("chrome design registry", () => {
  it("exposes exactly 5 unique header designs and 5 unique footer designs", () => {
    expect(HEADER_DESIGNS).toHaveLength(5);
    expect(new Set(HEADER_DESIGNS.map((d) => d.id)).size).toBe(5);
    expect(FOOTER_DESIGNS).toHaveLength(5);
    expect(new Set(FOOTER_DESIGNS.map((d) => d.id)).size).toBe(5);
  });

  it("gives every design its own editable settings and style defaults", () => {
    const base = ensureConfig(page("p1"));
    for (const d of HEADER_DESIGNS) {
      const h = hydrateHeader({ ...base.header, design: d.id as HeaderDesignId, settings: {}, style: {} });
      expect(Object.keys(h.settings).length).toBeGreaterThan(3);
      expect(h.style.spacing?.padding).toBeDefined();
      expect(h.style.responsive?.hideMobile).toBe(false);
    }
    for (const d of FOOTER_DESIGNS) {
      const f = hydrateFooter({ ...base.footer, design: d.id as FooterDesignId, settings: {}, style: {} });
      expect(Object.keys(f.settings).length).toBeGreaterThan(3);
      expect(f.style.spacing?.padding).toBeDefined();
    }
  });

  it("seeds different default chrome per template", () => {
    const combos = new Set(
      PRESET_IDS.map((id) => {
        const cfg = ensureConfig(page(id));
        return `${cfg.header.design}/${cfg.footer.design}`;
      }),
    );
    expect(combos.size).toBeGreaterThanOrEqual(3);
  });
});

describe("chrome isolation between templates", () => {
  it("keeps header/footer edits scoped to the page that made them", () => {
    const a = page("p1");
    const b = page("p2");
    const ca = ensureConfig(a);
    a.config = { ...ca, header: { ...ca.header, settings: { ...(ca.header.settings ?? {}), brandFontSize: 33 }, design: "overlay" } };
    const cb = ensureConfig(b);
    expect(cb.header.design).not.toBe("overlay");
    expect((cb.header.settings as Record<string, unknown>).brandFontSize).not.toBe(33);
    expect(a.config?.header.design).toBe("overlay");
  });

  it("does not leak menu link edits from one template to another", () => {
    const a = page("p1");
    const b = page("p2");
    const ca = ensureConfig(a);
    a.config = { ...ca, header: { ...ca.header, menuLinks: [{ label: "Only A", href: "#only-a" }] } };
    expect(linksOf(ensureConfig(a).header)[0].label).toBe("Only A");
    expect(linksOf(ensureConfig(b).header)[0].label).not.toBe("Only A");
  });

  it("hydrates legacy configs that predate designs without breaking", () => {
    const cfg = JSON.parse(JSON.stringify(ensureConfig(page("p3")))) as SiteConfig;
    delete (cfg.header as Partial<SiteConfig["header"]>).design;
    delete (cfg.header as Partial<SiteConfig["header"]>).settings;
    delete (cfg.header as Partial<SiteConfig["header"]>).style;
    delete (cfg.footer as Partial<SiteConfig["footer"]>).design;
    delete (cfg.footer as Partial<SiteConfig["footer"]>).settings;
    delete (cfg.footer as Partial<SiteConfig["footer"]>).style;
    const out = ensureConfig({ ...page("p3"), config: cfg });
    expect(out.header.design).toBeTruthy();
    expect(Object.keys(out.header.settings ?? {}).length).toBeGreaterThan(3);
    expect(out.footer.design).toBeTruthy();
    expect(out.footer.style?.spacing?.padding).toBeDefined();
  });

  it("falls back to header menu when the footer list is empty and prefers custom lists otherwise", () => {
    const cfg = ensureConfig(page("p1"));
    const empty = hydrateFooter({ ...cfg.footer, settings: { ...(cfg.footer.settings ?? {}), links: [] } });
    const custom = hydrateFooter({
      ...cfg.footer,
      settings: { ...(cfg.footer.settings ?? {}), links: [{ label: "Custom", href: "#custom" }] },
    });
    const renderedEmpty = empty.settings.links as unknown[];
    const renderedCustom = custom.settings.links as { label: string }[];
    expect(Array.isArray(renderedEmpty)).toBe(true);
    expect(renderedCustom[0].label).toBe("Custom");
  });
});
