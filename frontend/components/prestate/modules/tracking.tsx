"use client";

import { useEffect, useState } from "react";
import { BarChart3, Check, Clock, Copy, Gauge, Link2, Radio, Target, TrendingUp } from "lucide-react";
import type { LandingPageData, SiteConfig } from "@/lib/prestate/types";
import { ensureConfig, siteThemeStyle } from "@/lib/prestate/site-config";
import { buildTrackingSnippet, buildUtmUrl, idStatus, loadTrackingCounts, type TrackingCounts } from "@/lib/prestate/tracking";
import { localPreviewPath } from "@/lib/prestate/paths";
import { ModuleHeader, SiteScopeBar, StatCard } from "./shared";
import { Btn, Chip, Collapse, FieldRow, TextField, Toggle } from "@/components/prestate/ui";

function Code2Icon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

const STATUS_CHIP: Record<"ok" | "warn" | "empty", { label: string; tone: "success" | "warn" | "neutral" }> = {
  ok: { label: "Ready", tone: "success" },
  warn: { label: "Check ID", tone: "warn" },
  empty: { label: "Not set", tone: "neutral" },
};

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
  const patchTracking = (partial: Partial<SiteConfig["tracking"]>) => onPatch((c) => ({ ...c, tracking: { ...c.tracking, ...partial } }));
  const snippet = buildTrackingSnippet(tracking);
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
      onToast("Could not copy");
    }
  };

  const pixels: { name: string; id: string; status: "ok" | "warn" | "empty" }[] = [
    { name: "Google Analytics 4", id: tracking.gaId || "Not set", status: idStatus("ga", tracking.gaId) },
    { name: "Google Tag Manager", id: tracking.gtmId || "Not set", status: idStatus("gtm", tracking.gtmId) },
    { name: "Meta Pixel", id: tracking.metaPixel || "Not set", status: idStatus("pixel", tracking.metaPixel) },
    { name: "Custom scripts", id: tracking.customScripts.trim() ? "Attached" : "Empty", status: tracking.customScripts.trim() ? "ok" : "empty" },
  ];

  return (
    <div style={{ overflowY: "auto", height: "100%", ...siteThemeStyle(brand) }}>
      <ModuleHeader
        title="Tracking Center"
        description={`Pixels and UTMs for “${site.name}”. Tags fire on this template’s local preview. Counts are stored locally.`}
        actions={<Btn variant="primary" icon={<Radio size={14} />} onClick={() => onToast(`Tracking saved for ${site.name}`)}>Save tracking</Btn>}
      />
      <SiteScopeBar pages={pages} activeId={site.id} />

      <div className="ps-form-meta" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, padding: "0 28px 18px" }}>
        <StatCard label="Preview views" value={String(counts.view)} icon={<BarChart3 size={20} />} />
        <StatCard label="Form submits" value={String(counts.form)} icon={<Target size={20} />} tone="primary" />
        <StatCard label="Conv. (local)" value={`${conv}%`} icon={<TrendingUp size={20} />} tone="success" />
        <StatCard label="WhatsApp clicks" value={String(counts.whatsapp)} icon={<Gauge size={20} />} tone="secondary" />
      </div>

      <div className="ps-brand-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, padding: "0 28px 48px", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <Collapse title="Connected pixels & tags" icon={<Radio size={14} />} defaultOpen>
              {pixels.map((p) => {
                const chip = STATUS_CHIP[p.status];
                return (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--ps-line)" }}>
                    <span style={{ width: 30, height: 30, borderRadius: 9, background: p.status === "ok" ? "var(--ps-success-soft)" : p.status === "warn" ? "var(--ps-warn-soft)" : "var(--ps-bg)", color: p.status === "ok" ? "var(--ps-success)" : p.status === "warn" ? "var(--ps-warn)" : "var(--ps-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {p.status === "ok" ? <Check size={14} /> : <Clock size={14} />}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-ink)" }}>{p.name}</div>
                      <div style={{ fontSize: 10.5, color: "var(--ps-muted)", fontFamily: "monospace" }}>{p.id}</div>
                    </div>
                    <Chip tone={chip.tone}>{chip.label}</Chip>
                  </div>
                );
              })}
            </Collapse>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <Collapse title="IDs & custom scripts" icon={<Code2Icon />} defaultOpen>
              <FieldRow label="GA4 ID">
                <TextField value={tracking.gaId} onChange={(v) => patchTracking({ gaId: v.trim() })} placeholder="G-XXXXXXXX" />
              </FieldRow>
              <FieldRow label="GTM ID">
                <TextField value={tracking.gtmId} onChange={(v) => patchTracking({ gtmId: v.trim() })} placeholder="GTM-XXXX" />
              </FieldRow>
              <FieldRow label="Meta Pixel">
                <TextField value={tracking.metaPixel} onChange={(v) => patchTracking({ metaPixel: v.trim() })} placeholder="1234567890" />
              </FieldRow>
              <FieldRow label="Custom scripts">
                <textarea className="ps-input" value={tracking.customScripts} onChange={(e) => patchTracking({ customScripts: e.target.value })} style={{ minHeight: 80, fontFamily: "monospace", fontSize: 11 }} placeholder="Optional extra JS for this template only" />
              </FieldRow>
              <pre style={{ background: "#0b1020", color: "#b8c2ff", borderRadius: 10, padding: 12, fontSize: 11, lineHeight: 1.6, overflowX: "auto", fontFamily: "monospace", margin: "6px 0 10px", whiteSpace: "pre-wrap" }}>
                {snippet}
              </pre>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="outline" size="sm" icon={<Copy size={12} />} onClick={() => void copyText(snippet, "Snippet copied")}>Copy snippet</Btn>
                <Btn variant="ghost" size="sm" onClick={() => onToast(`Scripts saved on ${site.name}`)}>Save to this template</Btn>
              </div>
            </Collapse>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <Collapse title="UTM builder" icon={<Link2 size={14} />} defaultOpen>
              <FieldRow label="Page URL">
                <TextField value={localPreviewPath(site)} onChange={() => {}} disabled />
              </FieldRow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FieldRow label="Source"><TextField value={tracking.utmSource} onChange={(v) => patchTracking({ utmSource: v })} /></FieldRow>
                <FieldRow label="Medium"><TextField value={tracking.utmMedium} onChange={(v) => patchTracking({ utmMedium: v })} /></FieldRow>
              </div>
              <FieldRow label="Campaign"><TextField value={tracking.utmCampaign} onChange={(v) => patchTracking({ utmCampaign: v })} /></FieldRow>
              <div style={{ fontSize: 11.5, color: "var(--ps-muted)", fontFamily: "ui-monospace, monospace", wordBreak: "break-all", margin: "4px 0 10px" }}>{utm}</div>
              <Btn variant="primary" size="sm" style={{ width: "100%" }} onClick={() => void copyText(utm, "UTM link copied")}>
                <Link2 size={13} /> Copy tracking link
              </Btn>
            </Collapse>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <Collapse title="Conversion goals" icon={<Target size={14} />} defaultOpen>
              {[
                ["Form submitted", counts.form, tracking.goalForm, (v: boolean) => patchTracking({ goalForm: v })],
                ["WhatsApp clicked", counts.whatsapp, tracking.goalWhatsapp, (v: boolean) => patchTracking({ goalWhatsapp: v })],
                ["Call clicked", counts.call, tracking.goalCall, (v: boolean) => patchTracking({ goalCall: v })],
                ["Brochure downloaded", counts.brochure, tracking.goalBrochure, (v: boolean) => patchTracking({ goalBrochure: v })],
              ].map(([g, n, on, set]) => (
                <div key={g as string} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--ps-line)" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-slate)", flex: 1 }}>{g as string}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ps-primary)" }}>{n as number}</span>
                  <Toggle on={on as boolean} onChange={set as (v: boolean) => void} />
                </div>
              ))}
              <p style={{ fontSize: 11.5, color: "var(--ps-muted)", lineHeight: 1.5, margin: "10px 0 0" }}>
                Open local preview to record views. Submitting the lead form records a conversion for this template only.
              </p>
            </Collapse>
          </div>
        </div>
      </div>
    </div>
  );
}
