import { describe, expect, it } from "vitest";
import { WIDGETS } from "@/lib/prestate/data";
import { buildThankYouSections } from "@/lib/prestate/page-templates";
import type { SectionInstance } from "@/lib/prestate/types";

describe("widget library integrity", () => {
  it("has unique ids across the registry", () => {
    const ids = WIDGETS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains no duplicate/alias widgets — merged ids are gone", () => {
    const ids = new Set(WIDGETS.map((w) => w.id));
    for (const removed of [
      "slider",
      "accordion",
      "row-2",
      "enquiry-form",
      "multistep-form",
      "whatsapp-form",
      "sticky-footer-bar",
      "whatsapp-cta",
      "offer-banner",
      "map",
      "nearby",
    ]) {
      expect(ids.has(removed)).toBe(false);
    }
  });

  it("every widget produces a valid section instance with a unique id per call", () => {
    for (const w of WIDGETS) {
      const s = w.make();
      expect(s.id).toBeTruthy();
      const s2 = w.make();
      expect(s2.id).not.toBe(s.id);
      expect(s.style.responsive).toBeTypeOf("object");
    }
  });

  it("merged primary widgets expose their configuration knobs", () => {
    const byId = Object.fromEntries(WIDGETS.map((w) => [w.id, w]));
    // Carousel keeps autoplay toggle (absorbed slider)
    expect(byId.carousel.make().settings.autoplay).toBe(true);
    // Form (absorbed enquiry/multistep/whatsapp forms) starts simple
    expect(byId["lead-form"].make().settings.fields).toEqual(["name", "phone"]);
    // Contact CTA exposes mode
    expect(byId["call-cta"].make().settings.mode).toBe("call");
    // CTA Banner exposes layout
    expect(byId["cta-banner"].make().settings.layout).toBe("banner");
  });
});

describe("thank-you template", () => {
  const sections = buildThankYouSections();

  it("uses only current (non-migrated) widget ids", () => {
    const removed = ["slider", "accordion", "row-2", "enquiry-form", "multistep-form", "whatsapp-form", "sticky-footer-bar", "whatsapp-cta", "offer-banner", "map", "nearby"];
    for (const s of sections) expect(removed).not.toContain(s.type);
  });

  it("contains a gated-off brochure download pointing at the sample kit", () => {
    const brochure = sections.find((s: SectionInstance) => s.type === "brochure");
    expect(brochure).toBeDefined();
    expect(brochure!.settings.gateEnabled).toBe(false);
    expect(brochure!.settings.file).toBe("/brochure/project.pdf");
  });

  it("has no empty image slots — art slugs are used until media is uploaded", () => {
    const images = sections.filter((s) => s.type === "image");
    expect(images.length).toBeGreaterThan(0);
    for (const img of images) expect(String(img.settings.src ?? "")).not.toBe("");
  });
});
