"use client";

import { useMemo, useState } from "react";
import { Copy, ExternalLink, Globe, Plus, ShieldCheck } from "lucide-react";
import type { LandingPageData } from "@/lib/prestate/types";
import { localDomainPreviewPath, localPreviewPath } from "@/lib/prestate/paths";
import { ModuleHeader, StatCard, Table, StatusBadge, RowMenu } from "./shared";
import { Btn, Chip, Modal, TextField } from "@/components/prestate/ui";

export function DomainsModule({
  pages,
  onToast,
  onAssignDomain,
  onPreview,
}: {
  pages: LandingPageData[];
  onToast: (m: string) => void;
  onAssignDomain: (pageId: string, domain: string) => void;
  onPreview: (pageId: string) => void;
}) {
  const [connectOpen, setConnectOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");

  const mapped = useMemo(() => pages.filter((p) => p.domain.trim()), [pages]);
  const unmapped = useMemo(() => pages.filter((p) => !p.domain.trim()), [pages]);

  const connect = () => {
    if (!pageId || !custom.trim()) return;
    onAssignDomain(pageId, custom);
    setConnectOpen(false);
    setCustom("");
  };

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <ModuleHeader
        title="Domain Management"
        description="Assign a hostname to a template. Each template keeps its own domain — mapping one never changes another."
        actions={
          <Btn variant="primary" icon={<Plus size={15} />} onClick={() => { setPageId(pages[0]?.id ?? ""); setConnectOpen(true); }}>
            Assign domain
          </Btn>
        }
      />

      <div className="ps-stats-grid">
        <StatCard label="Assigned domains" value={String(mapped.length)} icon={<Globe size={20} />} />
        <StatCard label="Pages without a domain" value={String(unmapped.length)} icon={<ExternalLink size={20} />} tone="secondary" />
        <StatCard label="Local preview" value="Always on" icon={<ShieldCheck size={20} />} tone="success" />
        <StatCard label="Host mapping" value="/p/host" icon={<Chip tone="primary">Local</Chip>} tone="primary" />
      </div>

      <div style={{ padding: "0 28px 40px" }}>
        {mapped.length === 0 ? (
          <div className="ps-card" style={{ padding: 28, color: "var(--ps-muted)", textAlign: "center" }}>
            No domains assigned yet. Click Assign domain and map something like auroraresidences.com to a page.
          </div>
        ) : (
          <Table
            head={["Domain", "Page", "Local preview", "Status", ""]}
            rows={mapped.map((p) => ({
              cells: [
                <div key="d" style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--ps-primary)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 800 }}>
                    {p.domain[0].toUpperCase()}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", fontFamily: "monospace" }}>{p.domain}</div>
                    <div style={{ fontSize: 10.5, color: "var(--ps-muted)", fontFamily: "monospace" }}>{localDomainPreviewPath(p.domain)}</div>
                  </div>
                </div>,
                <span key="n" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-slate)" }}>{p.name}</span>,
                <span key="l" style={{ fontSize: 12, fontWeight: 700, color: "var(--ps-primary)", fontFamily: "monospace" }}>{localPreviewPath(p)}</span>,
                <div key="s"><StatusBadge status={p.status} /></div>,
                <div key="m" style={{ display: "flex", justifyContent: "flex-end" }}>
                  <RowMenu
                    items={[
                      { label: "Open local preview", onClick: () => onPreview(p.id) },
                      {
                        label: "Open as assigned domain",
                        onClick: () => {
                          const href = localDomainPreviewPath(p.domain);
                          if (href) window.open(href, "_blank", "noopener,noreferrer");
                        },
                      },
                      {
                        label: "Copy domain",
                        onClick: () => {
                          void navigator.clipboard?.writeText(p.domain);
                          onToast("Domain copied");
                        },
                      },
                    ]}
                  />
                </div>,
              ],
            }))}
            rowKey={(i) => mapped[i]?.id ?? String(i)}
          />
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, padding: "12px 16px", background: "var(--ps-success-soft)", borderRadius: 12, fontSize: 12.5, color: "var(--ps-success)", fontWeight: 700 }}>
          <ShieldCheck size={16} />
          These hostnames only resolve inside this app. Point real DNS at a host later — for now, use the local URLs above.
        </div>
      </div>

      <Modal open={connectOpen} onClose={() => setConnectOpen(false)} title="Assign a domain" width={560}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ps-slate)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Domain name</div>
            <TextField value={custom} onChange={setCustom} placeholder="e.g. auroraresidences.com" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ps-slate)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Map to landing page</div>
            <select
              className="ps-input"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              style={{ width: "100%" }}
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({localPreviewPath(p)})
                </option>
              ))}
            </select>
          </div>
          <Btn variant="primary" onClick={connect} disabled={!custom.trim() || !pageId}>
            <Globe size={14} /> Assign to local preview
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
