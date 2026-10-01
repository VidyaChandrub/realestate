"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import { getMarketingDashboard } from "@/lib/api";
import type { MarketingDashboard } from "@/lib/types";
import "@/app/org/org.css";

function money(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function OrgMarketingCampaignsPage() {
  const [data, setData] = useState<MarketingDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMarketingDashboard()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load campaigns"),
      )
      .finally(() => setLoading(false));
  }, []);

  const rows = data?.campaignPerformance ?? [];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <Icon name="flag" size={14} /> Marketing
          </div>
          <h1>Campaigns</h1>
          <div className="sub">
            Campaign names from CRM leads. Platform spend and impressions sync
            is not live yet — connect Facebook Lead Ads from Connected Apps to
            capture new leads.
          </div>
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href="/org/marketing">
            Dashboard
          </Link>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ color: "#b91c1c", marginBottom: 14 }}>
          <div className="card-b">{error}</div>
        </div>
      ) : null}

      <Reveal delay={1}>
        <div className="card">
          <div className="card-h">
            <span className="t">All Campaigns</span>
            <span className="x">{rows.length} synced</span>
          </div>
          <div className="card-b" style={{ padding: 0 }}>
            {!loading && rows.length === 0 ? (
              <div className="mkt-empty">
                <div className="mkt-empty-ico">
                  <Icon name="flag" size={22} />
                </div>
                <div className="muted">
                  No campaign rows yet. Connect Facebook from Connected Apps —
                  new Lead Ads bring campaign names into Lead Center. Spend and
                  impressions sync is still upcoming.
                </div>
              </div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Platform</th>
                      <th>Status</th>
                      <th>Spend</th>
                      <th>Clicks</th>
                      <th>Impr.</th>
                      <th>Leads</th>
                      <th>CPL</th>
                      <th>Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="muted">
                          Loading…
                        </td>
                      </tr>
                    ) : (
                      rows.map((c) => (
                        <tr key={c.id}>
                          <td>{c.name}</td>
                          <td>
                            <span className="badge b-gray">{c.platformKey}</span>
                          </td>
                          <td>{c.status ?? "—"}</td>
                          <td>{money(c.spend)}</td>
                          <td>{c.clicks}</td>
                          <td>{c.impressions}</td>
                          <td>{c.leadsCount}</td>
                          <td>{money(c.cpl)}</td>
                          <td>{c.conversion ?? 0}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </>
  );
}
