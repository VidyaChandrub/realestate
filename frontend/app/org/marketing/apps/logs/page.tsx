"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import { getOrgMarketingSyncLogs } from "@/lib/api";
import type { MarketingSyncLog } from "@/lib/types";
import "@/app/org/org.css";

export default function OrgMarketingSyncLogsPage() {
  const [logs, setLogs] = useState<MarketingSyncLog[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrgMarketingSyncLogs(100)
      .then(setLogs)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load logs"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <Icon name="integrations" size={14} /> Connected Apps
          </div>
          <h1>Integration Logs</h1>
          <div className="sub">
            Recent sync and connection events from marketing platforms.
          </div>
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href="/org/marketing/apps">
            Connected Apps
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
            <span className="t">Sync activity</span>
            <span className="x">{logs.length} events</span>
          </div>
          <div className="card-b" style={{ padding: 0 }}>
            {!loading && logs.length === 0 ? (
              <div className="mkt-empty">
                <div className="muted">No sync logs yet.</div>
              </div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Platform</th>
                      <th>Status</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="muted">
                          Loading…
                        </td>
                      </tr>
                    ) : (
                      logs.map((l) => (
                        <tr key={l.id}>
                          <td className="muted">
                            {new Date(l.createdAt).toLocaleString()}
                          </td>
                          <td>
                            <span className="badge b-gray">{l.platformKey}</span>
                          </td>
                          <td>
                            {l.status === "success" ? (
                              <span className="badge b-green">Success</span>
                            ) : (
                              <span className="badge b-rose">Failed</span>
                            )}
                          </td>
                          <td>{l.message ?? "—"}</td>
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
