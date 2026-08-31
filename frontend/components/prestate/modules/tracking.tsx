"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Layers,
  Link2,
  Radio,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { LandingPageData, SiteConfig } from "@/lib/prestate/types";
import { ensureConfig, siteThemeStyle } from "@/lib/prestate/site-config";
import { buildTrackingSnippet, buildUtmUrl, idStatus, loadTrackingCounts, type TrackingCounts } from "@/lib/prestate/tracking";
import { localPreviewPath } from "@/lib/prestate/paths";

export function TrackingModule({
  site,
  pages,
  onPatch,
  onToast,
}: {
  site: LandingPageData;
  pages: LandingPageData[];
  onSelectSite: (id: string) => void;
  onPatch: (fn: (c: SiteConfig) => SiteConfig) => void;
  onToast: (m: string) => void;
}) {
  const cfg = ensureConfig(site);
  const { tracking, brand } = cfg;
  const [counts, setCounts] = useState<TrackingCounts>(() => loadTrackingCounts(site.id));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"pixels" | "utm" | "scripts">("pixels");

  const patchTracking = (partial: Partial<SiteConfig["tracking"]>) =>
    onPatch((c) => ({ ...c, tracking: { ...c.tracking, ...partial } }));

  const snippet = buildTrackingSnippet(tracking);
  const isLandingPage = site.kind === "custom" || (site.pageType === "landing" && site.id.includes("-"));
  const pagePreviewPath = isLandingPage && site.id ? `/preview/${encodeURIComponent(site.id)}` : localPreviewPath(site);
  const utm = buildUtmUrl(site, tracking);

  const conv = counts.view ? Math.round((counts.form / counts.view) * 1000) / 10 : 0;

  useEffect(() => {
    const sync = () => setCounts(loadTrackingCounts(site.id));
    sync();
    const onEvt = (e: Event) => {
      const id = (e as CustomEvent).detail?.pageId;
      if (!id || id === site.id) sync();
    };
    window.addEventListener("prestate:track", onEvt);
    return () => window.removeEventListener("prestate:track", onEvt);
  }, [site.id]);

  const copyText = async (text: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast(ok);
    } catch {
      onToast("Could not copy to clipboard");
    }
  };

  const handleSave = () => {
    setSavedSuccess(true);
    onToast(`Tracking & pixel configurations saved for ${site.name}`);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--ps-bg)", color: "var(--ps-ink)", overflow: "hidden", ...siteThemeStyle(brand) }}>
      {/* Top Action Ribbon */}
      <div
        style={{
          background: "var(--ps-panel)",
          borderBottom: "1px solid var(--ps-line-strong)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 7 }}>
            <Radio size={16} style={{ color: "var(--ps-primary)" }} /> Tracking & Analytics Center
          </span>
          <span style={{ fontSize: 11, color: "var(--ps-muted)", borderLeft: "1px solid var(--ps-line-strong)", paddingLeft: 12 }}>
            GA4, GTM, Meta Pixel & UTM tracking for {site.name}
          </span>
        </div>

        {/* Center Tabs Switcher */}
        <div style={{ display: "inline-flex", background: "rgba(0, 0, 0, 0.35)", borderRadius: 10, padding: 3, border: "1px solid var(--ps-line-strong)" }}>
          {[
            { key: "pixels", label: "Pixels & Tags", icon: Activity },
            { key: "utm", label: "UTM Campaign Builder", icon: Link2 },
            { key: "scripts", label: "Custom Scripts", icon: Code2 },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 8,
                border: "none",
                background: activeTab === tab.key ? "var(--ps-primary)" : "transparent",
                color: activeTab === tab.key ? "#fff" : "var(--ps-slate)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <tab.icon size={13} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 18px",
            borderRadius: 9,
            border: "none",
            background: savedSuccess ? "var(--ps-success)" : "var(--ps-primary)",
            color: "#fff",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
            transition: "background 0.2s",
          }}
        >
          {savedSuccess ? <Check size={15} /> : <Save size={15} />}
          <span>{savedSuccess ? "Saved!" : "Save Tracking"}</span>
        </button>
      </div>

      {/* Main 2-Panel Studio Layout */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Left Settings Sidebar */}
        <div
          style={{
            width: 440,
            background: "var(--ps-panel)",
            borderRight: "1px solid var(--ps-line)",
            overflowY: "auto",
            padding: "20px 20px 60px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            flexShrink: 0,
          }}
        >
          {activeTab === "pixels" ? (
            <>
              {/* Section 1: Standard Ad & Analytics Pixels */}
              <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line-strong)", borderRadius: 14, padding: "16px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Activity size={16} style={{ color: "var(--ps-primary)" }} /> Marketing & Ad Pixels
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", display: "block", marginBottom: 4 }}>Google Analytics 4 (Measurement ID)</label>
                    <input
                      className="ps-input"
                      value={tracking.gaId || ""}
                      placeholder="e.g. G-XXXXXXXXXX"
                      onChange={(e) => patchTracking({ gaId: e.target.value })}
                      style={{ width: "100%", fontSize: 12.5, background: "var(--ps-bg)", color: "#fff" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", display: "block", marginBottom: 4 }}>Google Tag Manager (Container ID)</label>
                    <input
                      className="ps-input"
                      value={tracking.gtmId || ""}
                      placeholder="e.g. GTM-XXXXXXX"
                      onChange={(e) => patchTracking({ gtmId: e.target.value })}
                      style={{ width: "100%", fontSize: 12.5, background: "var(--ps-bg)", color: "#fff" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", display: "block", marginBottom: 4 }}>Meta / Facebook Pixel ID</label>
                    <input
                      className="ps-input"
                      value={tracking.metaPixel || ""}
                      placeholder="e.g. 123456789012345"
                      onChange={(e) => patchTracking({ metaPixel: e.target.value })}
                      style={{ width: "100%", fontSize: 12.5, background: "var(--ps-bg)", color: "#fff" }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === "utm" ? (
            <>
              {/* Section 2: UTM Campaign URL Builder */}
              <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line-strong)", borderRadius: 14, padding: "16px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Link2 size={16} style={{ color: "var(--ps-primary)" }} /> UTM Campaign Parameters
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", display: "block", marginBottom: 4 }}>Campaign Source (utm_source)</label>
                    <input
                      className="ps-input"
                      value={tracking.utmSource || ""}
                      placeholder="e.g. google / facebook / email"
                      onChange={(e) => patchTracking({ utmSource: e.target.value })}
                      style={{ width: "100%", fontSize: 12.5, background: "var(--ps-bg)", color: "#fff" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", display: "block", marginBottom: 4 }}>Campaign Medium (utm_medium)</label>
                    <input
                      className="ps-input"
                      value={tracking.utmMedium || ""}
                      placeholder="e.g. cpc / paid-social / banner"
                      onChange={(e) => patchTracking({ utmMedium: e.target.value })}
                      style={{ width: "100%", fontSize: 12.5, background: "var(--ps-bg)", color: "#fff" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", display: "block", marginBottom: 4 }}>Campaign Name (utm_campaign)</label>
                    <input
                      className="ps-input"
                      value={tracking.utmCampaign || ""}
                      placeholder="e.g. launch-phase1 / festive-offer"
                      onChange={(e) => patchTracking({ utmCampaign: e.target.value })}
                      style={{ width: "100%", fontSize: 12.5, background: "var(--ps-bg)", color: "#fff" }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Section 3: Custom Head/Body Scripts */}
              <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line-strong)", borderRadius: 14, padding: "16px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Code2 size={16} style={{ color: "var(--ps-primary)" }} /> Custom Tracking Scripts
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", display: "block", marginBottom: 4 }}>
                    Custom Head HTML / JS Snippets
                  </label>
                  <textarea
                    className="ps-input"
                    rows={8}
                    value={tracking.customScripts || ""}
                    placeholder="<!-- Paste TikTok, Hotjar, or custom tracking tags here -->"
                    onChange={(e) => patchTracking({ customScripts: e.target.value })}
                    style={{ width: "100%", fontFamily: "monospace", fontSize: 11.5, background: "var(--ps-bg)", color: "#fff", resize: "none" }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Live Stage & Inspector */}
        <div
          className="ps-canvas-dots"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 36px 80px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          {/* Performance Stats Strip */}
          <div style={{ width: 680, maxWidth: "100%", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 18px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>Total Page Views</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginTop: 4 }}>{counts.view}</div>
            </div>

            <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 18px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>Form Submissions</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#818cf8", marginTop: 4 }}>{counts.form}</div>
            </div>

            <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 18px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>Conversion Rate</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#34d399", marginTop: 4 }}>{conv}%</div>
            </div>
          </div>

          {/* Active UTM URL Card */}
          <div
            style={{
              width: 680,
              maxWidth: "100%",
              background: "#0f172a",
              borderRadius: 16,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 25px 70px rgba(0, 0, 0, 0.65)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 6 }}>
                <Link2 size={14} style={{ color: "#818cf8" }} /> Generated Campaign URL (with UTM tags)
              </span>
              <button
                type="button"
                onClick={() => copyText(utm, "UTM Campaign URL copied to clipboard")}
                style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                <Copy size={12} /> Copy URL
              </button>
            </div>
            <div style={{ padding: "16px 20px", color: "#a5b4fc", fontSize: 12, fontFamily: "monospace", wordBreak: "break-all" }}>
              {utm}
            </div>
          </div>

          {/* Generated HTML Injection Inspector */}
          <div
            style={{
              width: 680,
              maxWidth: "100%",
              background: "#0f172a",
              borderRadius: 16,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 25px 70px rgba(0, 0, 0, 0.65)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 6 }}>
                <Code2 size={14} style={{ color: "#34d399" }} /> Live Injected Tracking Snippet
              </span>
              <button
                type="button"
                onClick={() => copyText(snippet, "Injected tracking snippet copied")}
                style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                <Copy size={12} /> Copy Code
              </button>
            </div>
            <pre style={{ margin: 0, padding: "20px 24px", color: "#38bdf8", fontSize: 11.5, lineHeight: 1.6, overflowX: "auto", fontFamily: "monospace" }}>
              {snippet || "<!-- No active pixel IDs or custom scripts configured -->"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
