"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Globe, PencilRuler } from "lucide-react";
import type { LandingPageData } from "@/lib/prestate/types";
import { SiteRenderer } from "@/components/openpage/renderer/SiteRenderer";
import { siteFromLandingPage } from "@/lib/openpage/content";
import { ensureConfig } from "@/lib/prestate/site-config";
import { applyDocumentSeo } from "@/lib/prestate/seo";
import { PrestateTrackingScripts } from "@/components/prestate/tracking-scripts";
import { bumpTracking } from "@/lib/prestate/tracking";
import { findPageByDomain, findPageBySlug } from "@/lib/prestate/store";
import { applyLandingPagePropertyFromConfig } from "@/lib/prestate/data";
import { builderPath, localDomainPreviewPath } from "@/lib/prestate/paths";

export function LocalSitePreview({
  slug,
  host,
  page: serverPage,
  publicLive = false,
}: {
  slug?: string;
  host?: string;
  page?: LandingPageData | null;
  publicLive?: boolean;
}) {
  const [page, setPage] = useState<LandingPageData | null | undefined>(serverPage ?? undefined);
  const [gate, setGate] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (serverPage) {
      if (serverPage) {
        applyDocumentSeo(serverPage);
        bumpTracking(serverPage.id, "view");
      }
      return;
    }
    let cancelled = false;
    (async () => {
      const found = host ? await findPageByDomain(host) : slug ? await findPageBySlug(slug) : undefined;
      if (cancelled) return;
      setPage(found ?? null);
      setUnlocked(false);
      setGate("");
      if (found) {
        applyDocumentSeo(found);
        bumpTracking(found.id, "view");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, host, serverPage]);

  if (page === undefined) {
    return <div style={{ minHeight: "100vh", background: "#fff", padding: 40, color: "#64748b" }}>Loading local preview…</div>;
  }

  if (!page) {
    return (
      <div style={{ minHeight: "100vh", background: "#0c0e14", color: "#f4f1ea", display: "flex", alignItems: "center", justifyContent: "center", padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <Globe size={28} style={{ marginBottom: 12, color: "#c9a56a" }} />
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Nothing published here</h1>
          <p style={{ color: "#8b92a5", lineHeight: 1.6, margin: "0 0 18px" }}>
            No landing page is mapped to this local preview{host ? ` or domain (${host})` : slug ? ` /${slug}` : ""}. Assign a domain from Pages or Domains in the builder.
          </p>
          <Link href="/admin-console/templates" style={{ color: "#7a6bff", fontWeight: 700 }}>Open Templates</Link>
        </div>
      </div>
    );
  }

  const assigned = page.domain.trim();
  const hostHref = assigned ? localDomainPreviewPath(assigned) : "";
  const cfg = ensureConfig(page);
  applyLandingPagePropertyFromConfig(cfg);
  const needsPassword = Boolean(cfg.page.password) && !unlocked;
  const openPageSite = siteFromLandingPage(page);

  if (needsPassword) {
    return (
      <div style={{ minHeight: "100vh", background: "#0c0e14", color: "#f4f1ea", display: "flex", alignItems: "center", justifyContent: "center", padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (gate === cfg.page.password) setUnlocked(true);
          }}
          style={{ maxWidth: 360, width: "100%", textAlign: "center" }}
        >
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Password protected</h1>
          <p style={{ color: "#8b92a5", margin: "0 0 16px" }}>This local preview is locked from SEO Center.</p>
          <input
            value={gate}
            onChange={(e) => setGate(e.target.value)}
            type="password"
            placeholder="Enter password"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "#12151c", color: "#fff", marginBottom: 12 }}
          />
          <button type="submit" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: "#6D5DFC", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
            Unlock
          </button>
        </form>
      </div>
    );
  }

  const pageShell = (
    <div
      className="op-live-root"
      style={{ minHeight: "100vh", background: "var(--color-bg-1, #fff)" }}
    >
      <SiteRenderer
        site={openPageSite}
        live
        pageId={page.id}
        projectName={page.name}
        forms={(openPageSite.forms ?? cfg.forms) as never}
      />
      <PrestateTrackingScripts tracking={cfg.tracking} />
    </div>
  );

  if (publicLive) {
    return pageShell;
  }

  return (
    <div className="ps-app ps-live" style={{ minHeight: "100vh", background: "#fff" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 80,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          padding: "8px 14px",
          background: "#0c0e14",
          color: "#f4f1ea",
          fontSize: 12,
          borderBottom: "1px solid rgba(255,255,255,.08)",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <span style={{ fontWeight: 800, letterSpacing: 0.4, color: "#c9a56a" }}>LOCAL PREVIEW</span>
        <span style={{ opacity: 0.45 }}>|</span>
        <span style={{ fontFamily: "ui-monospace, monospace", color: "#c4c8d4" }}>
          {assigned || "no domain assigned"} · /p/{page.slug}
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: 999,
            background: page.status === "published" ? "rgba(52,211,153,.15)" : "rgba(251,191,36,.15)",
            color: page.status === "published" ? "#34d399" : "#fbbf24",
          }}
        >
          {page.status}
        </span>
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={builderPath(page.id)} style={{ color: "#a5b4fc", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <PencilRuler size={13} /> Edit in builder
          </Link>
          {hostHref ? (
            <Link href={hostHref} style={{ color: "#8b92a5", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
              <ExternalLink size={13} /> Open as {assigned}
            </Link>
          ) : null}
        </span>
      </div>
      <SiteRenderer
        site={openPageSite}
        live
        pageId={page.id}
        projectName={page.name}
        forms={(openPageSite.forms ?? cfg.forms) as never}
      />
      <PrestateTrackingScripts tracking={cfg.tracking} />
    </div>
  );
}
