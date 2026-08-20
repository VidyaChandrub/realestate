"use client";

import { useState } from "react";
import { BarChart3, Check, Clock, Copy, ExternalLink, Gauge, Link2, MousePointerClick, Radio, Target, TrendingUp } from "lucide-react";
import type { LandingPageData, SiteConfig } from "@/lib/prestate/types";
import { ensureConfig } from "@/lib/prestate/site-config";
import { ModuleHeader, SiteScopeBar, StatCard, Table, Pills } from "./shared";
import { Btn, Chip, Collapse, FieldRow, TextField, Toggle } from "@/components/prestate/ui";

const CHANNELS = [
  { channel: "Google Ads", sessions: "28,412", leads: "1,842", conv: "6.5%", spend: "₹12.4L", roas: "4.8x", trend: "+12%" },
  { channel: "Facebook / Instagram", sessions: "41,903", leads: "2,671", conv: "6.4%", spend: "₹8.2L", roas: "5.1x", trend: "+9%" },
  { channel: "Organic Search", sessions: "18,204", leads: "1,124", conv: "6.2%", spend: "—", roas: "—", trend: "+21%" },
  { channel: "WhatsApp Outreach", sessions: "6,940", leads: "1,030", conv: "14.8%", spend: "₹1.1L", roas: "9.6x", trend: "+5%" },
  { channel: "Email", sessions: "4,210", leads: "411", conv: "9.8%", spend: "₹60K", roas: "6.2x", trend: "+2%" },
];

export function TrackingModule({
  site,
  pages,
  onSelectSite,
  onPatch,
  onToast,
}: {
  site: LandingPageData;
  pages: LandingPageData[];
  onSelectSite: (id: string) => void;
  onPatch: (fn: (c: SiteConfig) => SiteConfig) => void;
  onToast: (m: string) => void;
}) {
  const [range, setRange] = useState("Last 30 days");
  const cfg = ensureConfig(site);
  const { tracking } = cfg;
  const patchTracking = (partial: Partial<SiteConfig["tracking"]>) => onPatch((c) => ({ ...c, tracking: { ...c.tracking, ...partial } }));
  const snippet = [
    tracking.gtmId ? `<!-- GTM ${tracking.gtmId} -->` : "",
    tracking.gaId ? `gtag('config', '${tracking.gaId}');` : "",
    tracking.metaPixel ? `fbq('init', '${tracking.metaPixel}');` : "",
    tracking.customScripts,
  ].filter(Boolean).join("\n") || "// Add GTM, GA or custom scripts for this template";

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <ModuleHeader
        title="Tracking Center"
        description={`Pixels, GTM and custom scripts for “${site.name}” only. They never deploy to other templates.`}
        actions={
          <div style={{ display: "flex", gap: 9 }}>
            <Btn variant="primary" icon={<Radio size={14} />} onClick={() => onToast(`Tracking saved for ${site.name} only`)}>Save tracking</Btn>
          </div>
        }
      />
      <SiteScopeBar pages={pages} activeId={site.id} onChange={onSelectSite} />

      <div style={{ padding: "0 28px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <Pills options={["Last 7 days", "Last 30 days", "Last quarter", "This year"]} value={range} onChange={setRange} />
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          {["Pixel", "UTM builder", "Goals", "Reports"].map((t, i) => (
            <button key={t} type="button" style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: i === 1 ? "var(--ps-primary)" : "#fff", color: i === 1 ? "#fff" : "var(--ps-slate)", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 3px rgba(17,24,39,.1)" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, padding: "0 28px 18px" }}>
        <StatCard label="Sessions" value="99,669" delta="+18%" icon={<BarChart3 size={20} />} />
        <StatCard label="Leads" value="7,078" delta="+11%" icon={<Target size={20} />} tone="primary" />
        <StatCard label="Conversion rate" value="7.1%" delta="+0.8%" icon={<TrendingUp size={20} />} tone="success" />
        <StatCard label="Avg. cost / lead" value="₹3,104" delta="-6%" icon={<Gauge size={20} />} tone="secondary" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, padding: "0 28px 48px", alignItems: "start" }}>
        {/* LEFT — channel table */}
        <div>
          <Table
            head={["Channel", "Sessions", "Leads", "Conv.", "Spend", "ROAS", "Trend", ""]}
            rows={CHANNELS.map((c, i) => ({
              cells: [
                <div key="c" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {[<MousePointerClick key="g" size={15} />, <Radio key="f" size={15} />, <BarChart3 key="o" size={15} />, <Clock key="w" size={15} />, <ExternalLink key="e" size={15} />][i]}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-ink)" }}>{c.channel}</span>
                </div>,
                <span key="s" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-slate)" }}>{c.sessions}</span>,
                <span key="l" style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ps-primary)" }}>{c.leads}</span>,
                <span key="v" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-slate)" }}>{c.conv}</span>,
                <span key="sp" style={{ fontSize: 12, color: "var(--ps-muted)" }}>{c.spend}</span>,
                <span key="r" style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ps-success)" }}>{c.roas}</span>,
                <span key="t" style={{ fontSize: 11.5, fontWeight: 800, color: "var(--ps-success)" }}>{c.trend}</span>,
                <span key="b" style={{ display: "inline-flex", gap: 3, justifyContent: "flex-end" }}>
                  {[0, 1, 2, 3, 4].map((b) => (
                    <span key={b} style={{ width: 12, height: 14, borderRadius: 3, background: b < (i % 5) + 1 ? "var(--ps-primary)" : "#e9ebf2" }} />
                  ))}
                </span>,
              ],
            }))}
          />
        </div>

        {/* RIGHT — pixels, UTM, goals */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <Collapse title="Connected pixels & tags" icon={<Radio size={14} />} defaultOpen>
              {[
                { name: "Google Analytics 4", id: tracking.gaId || "Not set", ok: !!tracking.gaId },
                { name: "Google Tag Manager", id: tracking.gtmId || "Not set", ok: !!tracking.gtmId },
                { name: "Meta Pixel", id: tracking.metaPixel || "Not set", ok: !!tracking.metaPixel },
                { name: "Custom scripts", id: tracking.customScripts ? "Attached" : "Empty", ok: !!tracking.customScripts },
              ].map((p) => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--ps-line)" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: p.ok ? "var(--ps-success-soft)" : "var(--ps-warn-soft)", color: p.ok ? "var(--ps-success)" : "var(--ps-warn)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {p.ok ? <Check size={14} /> : <Clock size={14} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-ink)" }}>{p.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--ps-muted)", fontFamily: "monospace" }}>{p.id}</div>
                  </div>
                  <Chip tone={p.ok ? "success" : "warn"}>{p.ok ? "Active" : "Verify"}</Chip>
                </div>
              ))}
            </Collapse>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <Collapse title="IDs & custom scripts" icon={<Code2Icon />} defaultOpen>
              <FieldRow label="GA4 ID">
                <TextField value={tracking.gaId} onChange={(v) => patchTracking({ gaId: v })} placeholder="G-XXXX" />
              </FieldRow>
              <FieldRow label="GTM ID">
                <TextField value={tracking.gtmId} onChange={(v) => patchTracking({ gtmId: v })} placeholder="GTM-XXXX" />
              </FieldRow>
              <FieldRow label="Meta Pixel">
                <TextField value={tracking.metaPixel} onChange={(v) => patchTracking({ metaPixel: v })} />
              </FieldRow>
              <FieldRow label="Custom scripts">
                <textarea className="ps-input" value={tracking.customScripts} onChange={(e) => patchTracking({ customScripts: e.target.value })} style={{ minHeight: 80, fontFamily: "monospace", fontSize: 11 }} />
              </FieldRow>
              <pre style={{ background: "#0b1020", color: "#b8c2ff", borderRadius: 10, padding: 12, fontSize: 11, lineHeight: 1.6, overflowX: "auto", fontFamily: "monospace", margin: "6px 0 10px" }}>
{snippet}
              </pre>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="outline" size="sm" icon={<Copy size={12} />} onClick={() => onToast("Snippet copied")}>Copy</Btn>
                <Btn variant="ghost" size="sm" onClick={() => onToast(`Scripts saved on ${site.name} only`)}>Save to this template</Btn>
              </div>
            </Collapse>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <Collapse title="UTM builder" icon={<Link2 size={14} />} defaultOpen>
              <FieldRow label="Page URL">
                <TextField value={`${site.domain || "localhost"}/${site.slug}`} onChange={() => {}} />
              </FieldRow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FieldRow label="Source"><TextField value="facebook" onChange={() => {}} /></FieldRow>
                <FieldRow label="Medium"><TextField value="cpc" onChange={() => {}} /></FieldRow>
              </div>
              <FieldRow label="Campaign"><TextField value="festive_launch" onChange={() => {}} /></FieldRow>
              <Btn variant="primary" size="sm" style={{ width: "100%" }} onClick={() => onToast("UTM link generated & copied")}>
                <Link2 size={13} /> Generate tracking link
              </Btn>
            </Collapse>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <Collapse title="Conversion goals" icon={<Target size={14} />} defaultOpen>
              {[
                ["Form submitted", "7,078", true],
                ["WhatsApp clicked", "3,412", true],
                ["Call clicked", "1,886", true],
                ["Brochure downloaded", "982", false],
              ].map(([g, n, on]) => (
                <div key={g as string} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--ps-line)" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-slate)", flex: 1 }}>{g as string}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ps-primary)" }}>{n as string}</span>
                  <Toggle on={on as boolean} onChange={() => {}} />
                </div>
              ))}
            </Collapse>
          </div>
        </div>
      </div>
    </div>
  );
}

function Code2Icon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}