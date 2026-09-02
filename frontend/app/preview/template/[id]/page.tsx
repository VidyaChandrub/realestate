"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Canvas } from "@/components/prestate/builder/canvas";
import { loadTemplate } from "@/lib/prestate/persist";
import { migrateSections } from "@/lib/prestate/persist";
import { ensureConfig } from "@/lib/prestate/site-config";
import { applyDocumentSeo } from "@/lib/prestate/seo";
import { PrestateTrackingScripts } from "@/components/prestate/tracking-scripts";
import { bumpTracking } from "@/lib/prestate/tracking";
import type { LandingPageData } from "@/lib/prestate/types";
import "@/app/prestate/prestate.css";

// Super Admin template preview — resolves the template from the backend by id
// (GET /admin/templates/:id via loadTemplate), not from the /p/:slug route
// which only knows seeded/localStorage pages. Same render path as the org
// builder's /preview/:id: Canvas only, no dashboard shell.
export default function TemplatePreviewPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [page, setPage] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    loadTemplate(id, "template")
      .then((t) => {
        if (cancelled) return;
        if (!t) {
          setError("Template not found.");
          return;
        }
        setPage(t);
        applyDocumentSeo(t);
        bumpTracking(t.id, "view");
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load template.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f5f8", color: "var(--muted, #64748b)" }}>
        Loading preview…
      </div>
    );
  }

  if (error || !page) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f5f8", color: "var(--muted, #64748b)" }}>
        {error ?? "Template not found."}
      </div>
    );
  }

  const cfg = ensureConfig(page);
  const sections = migrateSections(page.sections);

  return (
    <div className="ps-app" style={{ minHeight: "100vh", background: "#fff" }}>
      <Canvas
        sections={sections}
        selectedId={null}
        device="desktop"
        readOnly
        live
        pageId={page.id}
        theme={{
          primary: cfg.brand.primary,
          accent: cfg.brand.accent,
          font: cfg.brand.bodyFont,
          headingFont: cfg.brand.headingFont,
          name: cfg.brand.name,
          phone: cfg.brand.phone,
          logo: cfg.brand.logo,
          layoutTheme: cfg.brand.layoutTheme,
        }}
        form={cfg.form}
        chrome={{ header: cfg.header, footer: cfg.footer, brand: cfg.brand }}
        onSelect={() => {}}
        onMutate={() => {}}
      />
      <PrestateTrackingScripts tracking={cfg.tracking} />
    </div>
  );
}
