"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Globe, PencilRuler } from "lucide-react";
import type { Device, LandingPageData } from "@/lib/prestate/types";
import { Canvas, type DesignBundle } from "@/components/prestate/builder/canvas";
import { ensureConfig, siteThemeStyle } from "@/lib/prestate/site-config";
import { buildDesignCss, effectiveTypography, ensureDesignSystem, loadFonts, loadPublicGlobalSets, type GlobalStyleSet } from "@/lib/prestate/design-system";
import { applyDocumentSeo } from "@/lib/prestate/seo";
import { PrestateTrackingScripts } from "@/components/prestate/tracking-scripts";
import { bumpTracking } from "@/lib/prestate/tracking";
import { findPageByDomain, findPageBySlug } from "@/lib/prestate/store";
import { builderPath, localDomainPreviewPath } from "@/lib/prestate/paths";

function deviceFromWidth(w: number): Device {
  if (w < 700) return "mobile";
  if (w < 1100) return "tablet";
  return "desktop";
}

export function LocalSitePreview({ slug, host }: { slug?: string; host?: string }) {
  const [page, setPage] = useState<LandingPageData | null | undefined>(undefined);
  const [device, setDevice] = useState<Device>("desktop");
  const [gate, setGate] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [globalSets, setGlobalSets] = useState<GlobalStyleSet[]>([]);

  useEffect(() => {
    const sync = () => setDevice(deviceFromWidth(window.innerWidth));
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  // Public/unauthenticated — this route has no session, so only platform
  // sets are ever reachable here (see loadPublicGlobalSets). Fetched once;
  // empty while loading just means template-scoped typography renders
  // until this resolves.
  useEffect(() => {
    let cancelled = false;
    loadPublicGlobalSets().then((sets) => {
      if (!cancelled) setGlobalSets(sets);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
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
  }, [slug, host]);

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
  void ensureDesignSystem(cfg);
  const { typography } = effectiveTypography(cfg, globalSets);
  const fonts = loadFonts();
  const design: { css: string; bundle: DesignBundle } = {
    css: buildDesignCss({ scopeClass: "ps-typo-scope", typography, fonts }),
    bundle: { tokens: typography, fonts },
  };
  const needsPassword = Boolean(cfg.page.password) && !unlocked;

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

  return (
    <div className="ps-app ps-live" style={{ minHeight: "100vh", background: "#fff", ...siteThemeStyle(cfg.brand) }}>
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
      <Canvas
        sections={page.sections}
        selectedId={null}
        device={device}
        readOnly
        live
        design={design}
        theme={{
          primary: cfg.brand.primary,
          accent: cfg.brand.accent,
          font: cfg.brand.bodyFont,
          headingFont: cfg.brand.headingFont,
          name: cfg.brand.name,
          phone: cfg.brand.phone,
          logo: cfg.brand.logo,
        }}
        form={cfg.form}
        chrome={{ header: cfg.header, footer: cfg.footer, brand: cfg.brand }}
        pageId={page.id}
        onSelect={() => {}}
        onMutate={() => {}}
      />
      <PrestateTrackingScripts tracking={cfg.tracking} />
    </div>
  );
}
