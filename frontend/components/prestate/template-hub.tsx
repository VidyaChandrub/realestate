"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { TemplatesModule } from "@/components/prestate/modules/templates";
import type { LandingPageData, SectionInstance, TemplateData } from "@/lib/prestate/types";
import { TEMPLATES, uid, buildTemplateSections } from "@/lib/prestate/data";
import { loadPages, savePages, seedPages } from "@/lib/prestate/persist";
import { localPreviewPath } from "@/lib/prestate/paths";
import { cloneConfig, defaultSiteConfig, ensureConfig, seedConfigFor } from "@/lib/prestate/site-config";
import { inferDesignId } from "@/lib/prestate/page-templates";

function goToBuilder(pageId: string) {
  window.location.assign(`/prestate?id=${encodeURIComponent(pageId)}`);
}

export function TemplateHub() {
  const [pages, setPages] = useState<LandingPageData[]>(() => seedPages());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setPages(loadPages());
  }, []);

  useEffect(() => {
    savePages(pages);
  }, [pages]);

  const notify = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const openBuilder = useCallback(
    (pageId: string) => {
      savePages(pages);
      goToBuilder(pageId);
    },
    [pages],
  );

  const createFromDesign = useCallback(
    (template: TemplateData, name?: string) => {
      const id = uid("p");
      const label = name?.trim() || (template.id === "tpl-blank" ? "Untitled template" : `${template.name} — New`);
      const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "new-template";
      const page: LandingPageData = {
        id,
        name: label,
        slug,
        status: "draft",
        template: template.name,
        domain: "",
        views: "—",
        conversions: "—",
        updated: "Just now",
        thumbnail: template.thumbnail,
        kind: "custom",
        designId: template.id,
        sections: buildTemplateSections(template.id),
        config: defaultSiteConfig({ name: label, slug, primary: template.accent, accent: "#CDA45E" }),
      };
      const next = [page, ...pages];
      setPages(next);
      savePages(next);
      goToBuilder(id);
    },
    [pages],
  );

  const openPreset = useCallback(
    (designId: string) => {
      const existing =
        pages.find((p) => (p.kind ?? "custom") === "preset" && p.designId === designId) ??
        pages.find((p) => p.designId === designId);
      if (existing) {
        openBuilder(existing.id);
        return;
      }
      const design = TEMPLATES.find((t) => t.id === designId);
      if (!design) return;
      const restored: LandingPageData = {
        id: uid("p"),
        name: design.name,
        slug: design.id.replace(/^tpl-/, ""),
        status: "draft",
        template: design.name,
        domain: "",
        views: "—",
        conversions: "—",
        updated: "Just now",
        thumbnail: design.thumbnail,
        kind: "preset",
        designId: design.id,
        sections: buildTemplateSections(design.id),
      };
      restored.config = seedConfigFor(restored);
      const next = [restored, ...pages];
      setPages(next);
      savePages(next);
      goToBuilder(restored.id);
    },
    [pages, openBuilder],
  );

  return (
    <div className="ps-app" style={{ height: "calc(100vh - 64px)", minHeight: 520, borderRadius: 16, overflow: "hidden", border: "1px solid var(--ps-line)" }}>
      <TemplatesModule
        pages={pages}
        onCreateFromDesign={createFromDesign}
        onOpenBuilder={openBuilder}
        onOpenPreset={openPreset}
        onPreview={(id) => {
          const page = pages.find((p) => p.id === id);
          if (page) window.open(localPreviewPath(page), "_blank", "noopener,noreferrer");
        }}
        onDuplicate={(pageId) => {
          setPages((prev) => {
            const src = prev.find((p) => p.id === pageId);
            if (!src) return prev;
            const copy: LandingPageData = {
              ...src,
              id: uid("p"),
              name: `${src.name} (copy)`,
              slug: `${src.slug}-${uid("c").slice(-6)}`,
              status: "draft",
              domain: "",
              views: "—",
              conversions: "—",
              updated: "Just now",
              sections: JSON.parse(JSON.stringify(src.sections)) as SectionInstance[],
              kind: "custom",
              config: cloneConfig(ensureConfig(src)),
            };
            return [copy, ...prev];
          });
          notify("Template duplicated");
        }}
        onDelete={(pageId) => {
          const target = pages.find((p) => p.id === pageId);
          if (target && (target.kind ?? "custom") === "preset") {
            const designId = target.designId ?? inferDesignId(target.template);
            setPages((prev) =>
              prev.map((p) =>
                p.id === pageId
                  ? {
                      ...p,
                      sections: buildTemplateSections(designId),
                      config: seedConfigFor({ ...p, sections: [], designId, kind: "preset" }),
                      status: "draft",
                      updated: "Just now",
                    }
                  : p,
              ),
            );
            notify("Predefined template reset");
            return;
          }
          setPages((prev) => prev.filter((p) => p.id !== pageId));
          notify("Template deleted");
        }}
        onPublish={(pageId) => {
          setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, status: "published", updated: "Just now" } : p)));
          notify("Published");
        }}
        onUnpublish={(pageId) => {
          setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, status: "unpublished", updated: "Just now" } : p)));
          notify("Unpublished");
        }}
        onSave={() => {
          savePages(pages);
          notify("Saved");
        }}
      />
      {toast ? (
        <div className="ps-toast-stack">
          <div className="ps-fade-in ps-toast">
            <CheckCircle2 size={16} style={{ color: "var(--ps-success)", flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{toast}</span>
            <button type="button" onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
