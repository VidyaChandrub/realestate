"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import { getMarketingDashboard } from "@/lib/api";
import type { MarketingDashboard } from "@/lib/types";
import "@/app/org/org.css";

const COLORS: Record<string, string> = {
  meta: "#1877F2",
  facebook: "#1877F2",
  instagram: "#E1306C",
  google_ads: "#F4B400",
  linkedin: "#0A66C2",
  website: "#3B82F6",
  crm: "#8B5CF6",
};

export default function OrgMarketingSourcesPage() {
  const [data, setData] = useState<MarketingDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMarketingDashboard()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load sources"),
      )
      .finally(() => setLoading(false));
  }, []);

  const sources = data?.leadsBySource ?? [];
  const platforms = data?.leadsByPlatform ?? [];
  const total = sources.reduce((s, r) => s + r.count, 0) || 1;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <Icon name="target" size={14} /> Marketing
          </div>
          <h1>Lead Sources</h1>
          <div className="sub">
            Where leads originated — platform, channel, and CRM source labels.
          </div>
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href="/org/marketing">
            Dashboard
          </Link>
          <Link className="btn btn-primary" href="/org/leads">
            Open Lead Center
          </Link>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ color: "#b91c1c", marginBottom: 14 }}>
          <div className="card-b">{error}</div>
        </div>
      ) : null}

      <div className="mkt-sources-grid">
        <Reveal delay={1}>
          <div className="card">
            <div className="card-h">
              <span className="t">By Source</span>
              <span className="x">{sources.reduce((s, r) => s + r.count, 0)} leads</span>
            </div>
            <div className="card-b">
              {loading ? (
                <div className="muted">Loading…</div>
              ) : sources.length === 0 ? (
                <div className="muted">No source attribution yet.</div>
              ) : (
                <div className="mkt-stub-list">
                  {sources.map((r) => (
                    <div className="mkt-stub-row" key={r.key}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <i
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            background: COLORS[r.key.toLowerCase()] ?? "#64748B",
                          }}
                        />
                        <strong style={{ fontSize: 13 }}>{r.label}</strong>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <strong>{r.count}</strong>
                        <div className="muted" style={{ fontSize: 11 }}>
                          {Math.round((r.count / total) * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Reveal>

        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">By Platform</span>
            </div>
            <div className="card-b">
              {loading ? (
                <div className="muted">Loading…</div>
              ) : platforms.length === 0 ? (
                <div className="muted">No platform data yet.</div>
              ) : (
                <div className="mkt-hbar">
                  {platforms.map((r) => {
                    const max = Math.max(1, ...platforms.map((p) => p.count));
                    const pct = Math.round((r.count / max) * 100);
                    return (
                      <div className="mkt-hbar-row" key={r.key}>
                        <span className="mkt-hbar-label">{r.label}</span>
                        <div className="mkt-hbar-track">
                          <div
                            className="mkt-hbar-fill"
                            style={{
                              width: `${pct}%`,
                              background: COLORS[r.key.toLowerCase()] ?? "#64748B",
                            }}
                          />
                        </div>
                        <span className="mkt-hbar-val">{r.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}
