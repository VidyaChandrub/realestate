"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Globe, Link2, ShieldCheck, Trash2 } from "lucide-react";
import type { LandingPageData } from "@/lib/prestate/types";
import { localDomainPreviewPath, localPreviewPath } from "@/lib/prestate/paths";
import { ensureConfig, siteThemeStyle } from "@/lib/prestate/site-config";
import { ModuleHeader, SiteScopeBar, StatCard, StatusBadge } from "./shared";
import { Btn, Chip, TextField } from "@/components/prestate/ui";

export function DomainsModule({
  site,
  onToast,
  onAssignDomain,
  onClearDomain,
  onPreview,
}: {
  site: LandingPageData;
  onToast: (m: string) => void;
  onAssignDomain: (pageId: string, domain: string) => boolean | void;
  onClearDomain: (pageId: string) => void;
  onPreview: (pageId: string) => void;
}) {
  const cfg = ensureConfig(site);
  const hostPath = site.domain ? localDomainPreviewPath(site.domain) : "";
  const slugPath = localPreviewPath(site);
  const [value, setValue] = useState(site.domain);

  useEffect(() => {
    setValue(site.domain);
  }, [site.id, site.domain]);

  const copyAbs = async (path: string, ok: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    try {
      await navigator.clipboard.writeText(path.startsWith("http") ? path : `${origin}${path}`);
      onToast(ok);
    } catch {
      onToast("Could not copy");
    }
  };

  const save = () => {
    const ok = onAssignDomain(site.id, value);
    if (ok === false) return;
  };

  return (
    <div style={{ overflowY: "auto", height: "100%", ...siteThemeStyle(cfg.brand) }}>
      <ModuleHeader
        title="Domain Management"
        description={`Hostname for “${site.name}” only. Local preview stays at ${slugPath}; an assigned domain also opens at /__host/…`}
        actions={
          <Btn variant="primary" icon={<Globe size={14} />} onClick={save} disabled={!value.trim()}>
            Save domain
          </Btn>
        }
      />
      <SiteScopeBar pages={[site]} activeId={site.id} />

      <div className="ps-form-meta" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, padding: "0 28px 18px" }}>
        <StatCard label="Assigned" value={site.domain ? "Yes" : "No"} icon={<Globe size={20} />} tone={site.domain ? "success" : "neutral"} />
        <StatCard label="Slug preview" value={slugPath} icon={<Link2 size={20} />} />
        <StatCard label="Host preview" value={hostPath || "—"} icon={<ExternalLink size={20} />} tone="secondary" />
        <StatCard label="Status" value={site.status} icon={<ShieldCheck size={20} />} tone="primary" />
      </div>

      <div className="ps-brand-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, padding: "0 28px 48px", alignItems: "start" }}>
        <div className="ps-card" style={{ borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", marginBottom: 12 }}>Assign hostname</div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ps-slate)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Domain</div>
          <TextField value={value} onChange={setValue} placeholder="e.g. auroraresidences.com" />
          <p style={{ fontSize: 12.5, color: "var(--ps-muted)", lineHeight: 1.55, margin: "10px 0 16px" }}>
            No DNS is required here. The hostname is mapped inside this app so local preview can load this template at <span style={{ fontFamily: "ui-monospace, monospace" }}>/__host/yourdomain.com</span>.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn variant="primary" icon={<Globe size={14} />} onClick={save} disabled={!value.trim()}>
              {site.domain ? "Update domain" : "Assign domain"}
            </Btn>
            {site.domain ? (
              <Btn variant="danger" icon={<Trash2 size={14} />} onClick={() => onClearDomain(site.id)}>
                Remove
              </Btn>
            ) : null}
          </div>

          {site.domain ? (
            <div style={{ marginTop: 22, padding: 14, borderRadius: 12, border: "1px solid var(--ps-line)", background: "var(--ps-bg)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, background: cfg.brand.primary, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                  {site.domain[0].toUpperCase()}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "ui-monospace, monospace" }}>{site.domain}</div>
                  <StatusBadge status={site.status} />
                </div>
                <Chip tone="success" style={{ marginLeft: "auto" }}>Mapped locally</Chip>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <UrlRow label="Slug preview" path={slugPath} onOpen={() => onPreview(site.id)} onCopy={() => void copyAbs(slugPath, "Slug preview URL copied")} />
                <UrlRow
                  label="Host preview"
                  path={hostPath}
                  onOpen={() => hostPath && window.open(hostPath, "_blank", "noopener,noreferrer")}
                  onCopy={() => void copyAbs(hostPath, "Host preview URL copied")}
                />
              </div>
            </div>
          ) : (
            <div className="ps-card" style={{ marginTop: 18, padding: 16, color: "var(--ps-muted)", fontSize: 13 }}>
              No hostname yet. This template still previews at <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--ps-ink)" }}>{slugPath}</span>.
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ps-card" style={{ borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", marginBottom: 8 }}>When you go live later</div>
            <p style={{ fontSize: 12.5, color: "var(--ps-muted)", lineHeight: 1.6, margin: "0 0 12px" }}>
              Point DNS at your production host. Until then, only the local URLs above resolve in this app.
            </p>
            <div style={{ fontSize: 12, fontFamily: "ui-monospace, monospace", background: "#0b1020", color: "#b8c2ff", borderRadius: 10, padding: 12, lineHeight: 1.7 }}>
              A     @     → your server{site.domain ? `\nCNAME www → ${site.domain}` : ""}
            </div>
            <Btn
              variant="outline"
              size="sm"
              style={{ marginTop: 10 }}
              icon={<Copy size={12} />}
              onClick={() => {
                void navigator.clipboard.writeText(site.domain || "yourdomain.com").then(
                  () => onToast("Hostname copied"),
                  () => onToast("Could not copy"),
                );
              }}
            >
              Copy hostname
            </Btn>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "var(--ps-success-soft)", borderRadius: 12, fontSize: 12.5, color: "var(--ps-success)", fontWeight: 700, lineHeight: 1.5 }}>
            <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            Saving a domain updates this template only and refreshes its SEO canonical when it was still a localhost URL.
          </div>
        </div>
      </div>
    </div>
  );
}

function UrlRow({
  label,
  path,
  onOpen,
  onCopy,
}: {
  label: string;
  path: string;
  onOpen: () => void;
  onCopy: () => void;
}) {
  if (!path) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: "var(--ps-muted)", width: 92 }}>{label}</span>
      <span style={{ flex: 1, fontSize: 12, fontFamily: "ui-monospace, monospace", color: "var(--ps-primary)", minWidth: 0 }}>{path}</span>
      <Btn variant="ghost" size="sm" onClick={onCopy} icon={<Copy size={12} />}>Copy</Btn>
      <Btn variant="outline" size="sm" onClick={onOpen} icon={<ExternalLink size={12} />}>Open</Btn>
    </div>
  );
}
