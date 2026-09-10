"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SiteRenderer } from "@/components/openpage/renderer/SiteRenderer";
import { ensureSiteForms, siteFromLandingPage } from "@/lib/openpage/content";
import { loadTemplate } from "@/lib/openpage/persist";
import { ensureConfig } from "@/lib/openpage/site-config";
import { applyDocumentSeo } from "@/lib/openpage/seo";
import { OpenPageTrackingScripts } from "@/components/openpage/tracking-scripts";
import { bumpTracking } from "@/lib/openpage/tracking";
import type { LandingPageData } from "@/lib/openpage/types";
import "@/app/openpage.css";

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
  const site = ensureSiteForms(siteFromLandingPage(page));

  return (
    <div className="ps-app" style={{ minHeight: "100vh", background: "#fff" }}>
      <SiteRenderer
        site={site}
        live
        pageId={page.id}
        projectName={page.name}
        forms={(site.forms ?? cfg.forms ?? []) as never}
      />
      <OpenPageTrackingScripts tracking={cfg.tracking} />
    </div>
  );
}
