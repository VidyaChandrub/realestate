"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { SiteRenderer } from "@/components/openpage/renderer/SiteRenderer";
import { ensureSiteForms, siteFromLandingPage } from "@/lib/openpage/content";
import type { LandingPageRow } from "@/lib/types";
import type { LandingPageData } from "@/lib/openpage/types";
import type { SectionInstance, SiteConfig } from "@/lib/openpage/types";
import { applyDocumentSeo } from "@/lib/openpage/seo";
import { applyLandingPagePropertyFromConfig } from "@/lib/openpage/data";
import { OpenPageTrackingScripts } from "@/components/openpage/tracking-scripts";
import { bumpTracking } from "@/lib/openpage/tracking";
import "@/app/openpage.css";

interface LandingPageDetail extends LandingPageRow {
  content: { sections: SectionInstance[]; config: SiteConfig; engine?: string; site?: LandingPageData["openPageSite"] };
}

export default function PreviewLandingPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { accessToken } = useAuth();

  const [data, setData] = useState<LandingPageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !accessToken) return;
    setLoading(true);
    setError(null);
    apiFetch<LandingPageDetail>(`/org/landing-pages/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((page) => {
        applyLandingPagePropertyFromConfig(page.content?.config);
        setData(page);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load page."))
      .finally(() => setLoading(false));
  }, [id, accessToken]);

  // Apply SEO per individual landing page — document title/meta/OG/canonical
  useEffect(() => {
    if (!data) return;
    const pageForSeo: LandingPageData = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      status: data.status as LandingPageData["status"],
      template: "",
      domain: "",
      views: "—",
      conversions: "—",
      updated: "",
      updatedAt: data.updatedAt,
      thumbnail: data.thumbnail ?? "",
      sections: data.content.sections,
      config: data.content.config,
      kind: "custom",
      pageType: "landing",
    };
    applyDocumentSeo(pageForSeo);
    bumpTracking(data.id, "view");
  }, [data]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f5f8", color: "var(--muted, #64748b)" }}>
        Loading preview…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f5f8", color: "var(--muted, #64748b)" }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f5f8", color: "var(--muted, #64748b)" }}>
        Page not found.
      </div>
    );
  }

  // Render ONLY the landing page — no dashboard shell, no extra header.
  // SEO and Tracking are per-page via data.content.config
  const previewPage: LandingPageData = {
    id: data.id,
    name: data.name,
    slug: data.slug,
    status: data.status as LandingPageData["status"],
    template: "",
    domain: "",
    views: "—",
    conversions: "—",
    updated: "",
    thumbnail: data.thumbnail ?? "",
    sections: data.content.sections ?? [],
    config: data.content.config,
    openPageSite: data.content.site ?? undefined,
    kind: "custom",
    pageType: "landing",
  };
  const site = ensureSiteForms(siteFromLandingPage(previewPage));
  const previewForms = (site.forms ?? data.content.config?.forms ?? []) as never;

  return (
    <div className="ps-app" style={{ minHeight: "100vh", background: "#fff" }}>
      <SiteRenderer
        site={site}
        live
        pageId={data.id}
        projectName={data.name}
        projectId={
          site.propertyBinding?.kind === "project" ? site.propertyBinding.projectId : undefined
        }
        forms={previewForms}
      />
      <OpenPageTrackingScripts tracking={data.content.config.tracking} />
    </div>
  );
}
