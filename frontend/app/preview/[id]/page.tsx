"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Canvas } from "@/components/prestate/builder/canvas";
import type { LandingPageRow } from "@/lib/types";
import type { LandingPageData } from "@/lib/prestate/types";
import type { SectionInstance, SiteConfig } from "@/lib/prestate/types";
import { applyDocumentSeo } from "@/lib/prestate/seo";
import { PrestateTrackingScripts } from "@/components/prestate/tracking-scripts";
import { bumpTracking } from "@/lib/prestate/tracking";
import "@/app/prestate/prestate.css";

interface LandingPageDetail extends LandingPageRow {
  content: { sections: SectionInstance[]; config: SiteConfig };
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
      .then(setData)
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
  return (
    <div className="ps-app" style={{ minHeight: "100vh", background: "#fff" }}>
      <Canvas
        sections={data.content.sections}
        selectedId={null}
        device="desktop"
        readOnly
        live
        pageId={data.id}
        theme={{
          primary: data.content.config.brand.primary,
          accent: data.content.config.brand.accent,
          font: data.content.config.brand.bodyFont,
          headingFont: data.content.config.brand.headingFont,
          name: data.content.config.brand.name,
          phone: data.content.config.brand.phone,
          logo: data.content.config.brand.logo,
        }}
        form={data.content.config.form}
        chrome={{ header: data.content.config.header, footer: data.content.config.footer, brand: data.content.config.brand }}
        onSelect={() => {}}
        onMutate={() => {}}
      />
      <PrestateTrackingScripts tracking={data.content.config.tracking} />
    </div>
  );
}
