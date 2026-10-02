"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  connectMetaWithToken,
  disconnectMetaConnection,
  getMetaConnectUrl,
  getMetaConnections,
  getOrgMetaConfig,
  getOrgProjects,
  updateMetaConnection,
} from "@/lib/api";
import type { MetaPageConnection, MetaPublicConfig, Project } from "@/lib/types";

export function MetaLeadAdsCard() {
  const search = useSearchParams();
  const [config, setConfig] = useState<MetaPublicConfig | null>(null);
  const [connections, setConnections] = useState<MetaPageConnection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({
    pageId: "",
    pageName: "",
    accessToken: "",
    projectId: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, conns, projRes] = await Promise.all([
        getOrgMetaConfig(),
        getMetaConnections(),
        getOrgProjects({ limit: 100 }).catch(() => ({ data: [] as Project[] })),
      ]);
      setConfig(cfg);
      setConnections(conns);
      setProjects(projRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Meta settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const meta = search.get("meta");
    if (meta === "connected") {
      setMessage("Facebook Page(s) connected. New Lead Ads will sync into Lead Center.");
      void load();
    } else if (meta === "error") {
      setError(search.get("message") || "Facebook connection failed");
    }
  }, [search, load]);

  async function connectOAuth() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await getMetaConnectUrl();
      if (!url) throw new Error("Facebook OAuth URL unavailable");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Facebook connect");
      setBusy(false);
    }
  }

  async function saveManual() {
    setBusy(true);
    setError(null);
    try {
      const connected = await connectMetaWithToken({
        pageId: manual.pageId.trim(),
        pageName: manual.pageName.trim() || manual.pageId.trim(),
        accessToken: manual.accessToken.trim(),
        projectId: manual.projectId || null,
      });
      setShowManual(false);
      setManual({ pageId: "", pageName: "", accessToken: "", projectId: "" });
      const count =
        typeof connected.imported === "number" ? connected.imported : 0;
      setMessage(
        count > 0
          ? `Facebook Page connected. Imported ${count} recent lead(s) into Lead Center.`
          : "Facebook Page connected with access token. New Lead Ads will sync automatically.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Token connect failed");
    } finally {
      setBusy(false);
    }
  }

  async function onProjectChange(id: string, projectId: string) {
    try {
      await updateMetaConnection(id, {
        projectId: projectId || null,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update project mapping");
    }
  }

  async function onDisconnect(id: string) {
    if (!window.confirm("Disconnect this Facebook Page?")) return;
    try {
      await disconnectMetaConnection(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    }
  }

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-h">
        <span className="t">Facebook &amp; Instagram Lead Ads</span>
        <span className="x">
          {config?.configured ? (
            <span className="badge b-green">Platform ready</span>
          ) : (
            <Link href="/org/marketing/apps/meta" className="badge b-amber" style={{ textDecoration: "none" }}>
              Configure Meta App Credentials →
            </Link>
          )}
        </span>
      </div>
      <div className="card-b">
        <p className="muted" style={{ marginTop: 0 }}>
          Connect a Facebook Page so Lead Ads form submissions sync into Lead Center
          with campaign, ad set, ad, and UTM attribution. Prefer{" "}
          <Link href="/org/marketing/apps">Marketing → Connected Apps</Link> as the
          primary path; this card remains for quick CRM setup.
        </p>

        {message ? (
          <div className="badge b-green" style={{ marginBottom: 12, display: "inline-block" }}>
            {message}
          </div>
        ) : null}
        {error ? (
          <div style={{ color: "#b91c1c", marginBottom: 12, fontSize: 13 }}>{error}</div>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy || !config?.configured}
            onClick={() => void connectOAuth()}
          >
            Connect with Facebook
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() => setShowManual((v) => !v)}
          >
            {showManual ? "Hide token form" : "Connect with Page token"}
          </button>
        </div>

        {showManual ? (
          <div
            style={{
              border: "1px solid var(--border, #e2e8f0)",
              borderRadius: 8,
              padding: 12,
              marginBottom: 14,
            }}
          >
            <div className="field">
              <label>Page ID</label>
              <input
                className="inp"
                value={manual.pageId}
                onChange={(e) => setManual((m) => ({ ...m, pageId: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Page name</label>
              <input
                className="inp"
                value={manual.pageName}
                onChange={(e) => setManual((m) => ({ ...m, pageName: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Page access token</label>
              <input
                className="inp"
                type="password"
                value={manual.accessToken}
                onChange={(e) =>
                  setManual((m) => ({ ...m, accessToken: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label>Default project (optional)</label>
              <select
                className="inp"
                value={manual.projectId}
                onChange={(e) =>
                  setManual((m) => ({ ...m, projectId: e.target.value }))
                }
              >
                <option value="">Unassigned</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy || !manual.pageId.trim() || !manual.accessToken.trim()}
              onClick={() => void saveManual()}
            >
              Save Page connection
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="muted">Loading connections…</div>
        ) : connections.length === 0 ? (
          <div className="muted">No Facebook Pages connected yet.</div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Default project</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {connections.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <b>{c.pageName}</b>
                      <div className="muted mono" style={{ fontSize: 12 }}>
                        {c.pageId}
                      </div>
                    </td>
                    <td>
                      <select
                        className="inp"
                        value={c.projectId ?? ""}
                        onChange={(e) => void onProjectChange(c.id, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => void onDisconnect(c.id)}
                      >
                        Disconnect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
