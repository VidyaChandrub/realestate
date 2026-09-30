"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Icon } from "@/components/icons";
import { PlatformBrandIcon } from "@/components/org/platform-brand-icon";
import {
  createAdminMarketingPlatform,
  deleteAdminMarketingPlatform,
  getAdminAttributionLabels,
  getAdminMarketingPlatforms,
  getAdminMarketingSyncLogs,
  getAdminMetaConfig,
  updateAdminAttributionLabel,
  updateAdminMarketingPlatform,
} from "@/lib/api";
import type {
  AttributionLabel,
  MarketingPlatformAdmin,
  MarketingSyncLog,
  MetaPublicConfig,
} from "@/lib/types";

type Tab = "platforms" | "labels" | "logs" | "meta" | "settings";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "platforms", label: "Platforms" },
  { id: "labels", label: "Attribution Labels" },
  { id: "logs", label: "Sync Logs" },
  { id: "meta", label: "Meta App" },
  { id: "settings", label: "Settings" },
];

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function SuperAdminMarketingPage() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("platforms");
  const [platforms, setPlatforms] = useState<MarketingPlatformAdmin[]>([]);
  const [labels, setLabels] = useState<AttributionLabel[]>([]);
  const [logs, setLogs] = useState<MarketingSyncLog[]>([]);
  const [meta, setMeta] = useState<MetaPublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    key: "",
    name: "",
    description: "",
  });
  const [editing, setEditing] = useState<MarketingPlatformAdmin | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, l, s, m] = await Promise.all([
        getAdminMarketingPlatforms(),
        getAdminAttributionLabels(),
        getAdminMarketingSyncLogs({ limit: 50 }),
        getAdminMetaConfig(),
      ]);
      setPlatforms(p);
      setLabels(l);
      setLogs(s);
      setMeta(m);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken || user?.role !== "super_admin") {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, accessToken, user, load]);

  const filteredPlatforms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return platforms;
    return platforms.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
    );
  }, [platforms, query]);

  async function togglePlatform(row: MarketingPlatformAdmin) {
    setSavingId(row.id);
    setFeedback(null);
    try {
      const updated = await updateAdminMarketingPlatform(row.id, {
        enabled: !row.enabled,
      });
      setPlatforms((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
      );
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleLabel(label: AttributionLabel) {
    setSavingId(label.id);
    try {
      const updated = await updateAdminAttributionLabel(label.id, {
        enabled: !label.enabled,
      });
      setLabels((prev) =>
        prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
      );
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  async function addPlatform() {
    setAdding(true);
    setFeedback(null);
    try {
      const created = await createAdminMarketingPlatform({
        key: draft.key.trim().toLowerCase(),
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        enabled: true,
      });
      setPlatforms((prev) =>
        [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder),
      );
      setDraft({ key: "", name: "", description: "" });
      setShowAdd(false);
      setOkMsg("Platform added");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Create failed");
    } finally {
      setAdding(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSavingId(editing.id);
    try {
      const updated = await updateAdminMarketingPlatform(editing.id, {
        name: editDraft.name.trim(),
        description: editDraft.description.trim() || null,
      });
      setPlatforms((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
      );
      setEditing(null);
      setOkMsg("Platform updated");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  async function removePlatform(row: MarketingPlatformAdmin) {
    if (!window.confirm(`Delete platform “${row.name}”?`)) return;
    setSavingId(row.id);
    setFeedback(null);
    try {
      await deleteAdminMarketingPlatform(row.id);
      setPlatforms((prev) => prev.filter((p) => p.id !== row.id));
      setOkMsg("Platform deleted");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSavingId(null);
    }
  }

  const enabledCount = platforms.filter((p) => p.enabled).length;

  return (
    <>
      <div className="page-head mkt-admin-hero reveal in">
        <div>
          <div className="eyebrow">
            <Icon name="trending" size={14} /> Marketing
          </div>
          <h1>Marketing Platforms</h1>
          <div className="sub">
            Enable platforms, Organisation Labels, Meta App config, and monitor
            sync logs.
          </div>
        </div>
        <div className="mkt-admin-hero-art" aria-hidden>
          <div className="mkt-admin-hero-hub">
            <Icon name="server" size={22} />
          </div>
          <div className="mkt-admin-hero-orbit">
            {[
              "meta",
              "instagram",
              "google_ads",
              "linkedin",
              "tiktok",
              "whatsapp",
              "website",
            ].map((k) => (
              <span key={k} className="mkt-admin-hero-plat">
                <PlatformBrandIcon platformKey={k} size={26} />
              </span>
            ))}
          </div>
          <div className="mkt-admin-hero-card">
            <b>Connect All Your Marketing Channels</b>
            <span className="mkt-admin-hero-bars" />
          </div>
        </div>
      </div>

      <div className="mkt-admin-tabs reveal in">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`mkt-admin-tab${tab === t.id ? " on" : ""}`}
            onClick={() => {
              setTab(t.id);
              setFeedback(null);
              setOkMsg(null);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {feedback ? (
        <div className="card" style={{ marginBottom: 14, color: "#b91c1c" }}>
          <div className="card-b">{feedback}</div>
        </div>
      ) : null}
      {okMsg ? (
        <div className="card" style={{ marginBottom: 14, color: "#15803d" }}>
          <div className="card-b">{okMsg}</div>
        </div>
      ) : null}

      {tab === "platforms" ? (
        <div className="card reveal in">
          <div className="card-h mkt-admin-table-head">
            <span className="t" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <Icon name="shield" size={16} /> Marketing Platforms
              <span className="badge b-green">{enabledCount} enabled</span>
            </span>
            <div className="mkt-admin-tools">
              <div className="mkt-admin-search">
                <Icon name="search" size={14} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search platform..."
                />
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm mkt-admin-icon-btn"
                title="Filter"
              >
                <Icon name="filter" size={14} />
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setShowAdd(true);
                  setOkMsg(null);
                }}
              >
                <Icon name="plus" size={14} /> Add Platform
              </button>
            </div>
          </div>

          {showAdd ? (
            <div className="mkt-admin-add">
              <div className="field">
                <label>Key</label>
                <input
                  className="inp mono"
                  placeholder="e.g. youtube"
                  value={draft.key}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                    }))
                  }
                />
              </div>
              <div className="field">
                <label>Name</label>
                <input
                  className="inp"
                  placeholder="Display name"
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label>Description</label>
                <input
                  className="inp"
                  placeholder="Short description"
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, description: e.target.value }))
                  }
                />
              </div>
              <div className="mkt-admin-add-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={adding || !draft.key.trim() || !draft.name.trim()}
                  onClick={() => void addPlatform()}
                >
                  {adding ? "Saving…" : "Save Platform"}
                </button>
              </div>
            </div>
          ) : null}

          {editing ? (
            <div className="mkt-admin-add">
              <div className="field">
                <label>Name</label>
                <input
                  className="inp"
                  value={editDraft.name}
                  onChange={(e) =>
                    setEditDraft((d) => ({ ...d, name: e.target.value }))
                  }
                />
              </div>
              <div className="field" style={{ gridColumn: "span 2" }}>
                <label>Description</label>
                <input
                  className="inp"
                  value={editDraft.description}
                  onChange={(e) =>
                    setEditDraft((d) => ({ ...d, description: e.target.value }))
                  }
                />
              </div>
              <div className="mkt-admin-add-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={savingId === editing.id || !editDraft.name.trim()}
                  onClick={() => void saveEdit()}
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : null}

          <div className="card-b" style={{ padding: 0 }}>
            <div className="tbl-wrap">
              <table className="tbl mkt-admin-tbl">
                <thead>
                  <tr>
                    <th style={{ width: 48 }}>#</th>
                    <th>Platform</th>
                    <th>Description</th>
                    <th>Key</th>
                    <th>Status</th>
                    <th style={{ width: 180 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlatforms.map((p, idx) => (
                    <tr key={p.id}>
                      <td className="muted">{idx + 1}</td>
                      <td>
                        <div className="mkt-admin-plat-cell">
                          <PlatformBrandIcon platformKey={p.key} size={32} />
                          <b>{p.name}</b>
                        </div>
                      </td>
                      <td className="muted" style={{ fontSize: 13 }}>
                        {p.description || "—"}
                      </td>
                      <td>
                        <span className="mkt-admin-key">{p.key}</span>
                      </td>
                      <td>
                        {p.enabled ? (
                          <span className="badge b-green mkt-admin-status">
                            <i /> Enabled
                          </span>
                        ) : (
                          <span className="badge b-gray">Disabled</span>
                        )}
                      </td>
                      <td>
                        <div className="mkt-admin-actions">
                          <button
                            type="button"
                            className={`switch${p.enabled ? " on" : ""}`}
                            disabled={savingId === p.id}
                            aria-label={p.enabled ? "Disable" : "Enable"}
                            onClick={() => void togglePlatform(p)}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm mkt-admin-icon-btn"
                            title="Edit"
                            disabled={savingId === p.id}
                            onClick={() => {
                              setEditing(p);
                              setEditDraft({
                                name: p.name,
                                description: p.description ?? "",
                              });
                              setShowAdd(false);
                            }}
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          <Link
                            className="btn btn-ghost btn-sm mkt-admin-icon-btn"
                            href="/admin-console/attribution"
                            title="Attribution settings"
                          >
                            <Icon name="settings" size={14} />
                          </Link>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm mkt-admin-icon-btn is-danger"
                            title="Delete"
                            disabled={savingId === p.id}
                            onClick={() => void removePlatform(p)}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        Loading…
                      </td>
                    </tr>
                  ) : null}
                  {!loading && filteredPlatforms.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        No platforms match your search.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "labels" ? (
        <div className="card reveal in">
          <div className="card-h">
            <span className="t">Organisation Labels</span>
            <Link className="x" href="/admin-console/attribution" style={{ textDecoration: "none" }}>
              Open full editor →
            </Link>
          </div>
          <div className="card-b" style={{ padding: 0 }}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Key</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {labels.map((label) => (
                    <tr key={label.id}>
                      <td>{label.label}</td>
                      <td>
                        <span className="mkt-admin-key">{label.key}</span>
                      </td>
                      <td>
                        {label.enabled !== false ? (
                          <span className="badge b-green">Enabled</span>
                        ) : (
                          <span className="badge b-gray">Disabled</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`switch${label.enabled !== false ? " on" : ""}`}
                          disabled={savingId === label.id}
                          onClick={() => void toggleLabel(label)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "logs" ? (
        <div className="card reveal in">
          <div className="card-h">
            <span className="t">API / webhook sync logs</span>
            <span className="x">{logs.length} recent</span>
          </div>
          <div className="card-b" style={{ padding: 0 }}>
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
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                      <td>
                        <div className="mkt-admin-plat-cell">
                          <PlatformBrandIcon
                            platformKey={log.platformKey}
                            size={22}
                          />
                          <span className="mkt-admin-key">{log.platformKey}</span>
                        </div>
                      </td>
                      <td>
                        {log.status === "success" ? (
                          <span className="badge b-green">success</span>
                        ) : (
                          <span className="badge b-amber">failed</span>
                        )}
                      </td>
                      <td>{log.message || "—"}</td>
                    </tr>
                  ))}
                  {!loading && logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">
                        No sync activity yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "meta" ? (
        <div className="card reveal in mkt-admin-meta">
          <div className="mkt-admin-meta-head">
            <div className="mkt-admin-plat-cell">
              <PlatformBrandIcon platformKey="meta" size={36} />
              <div>
                <b>Facebook Lead Ads (platform)</b>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  Shared Meta App for Facebook, Instagram and WhatsApp Ads.
                </div>
              </div>
            </div>
            {meta?.configured ? (
              <span className="badge b-green mkt-admin-status">
                <i /> Active
              </span>
            ) : (
              <span className="badge b-amber">Env vars required</span>
            )}
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            Set <code>META_APP_ID</code>, <code>META_APP_SECRET</code>, and{" "}
            <code>META_WEBHOOK_VERIFY_TOKEN</code> on the API.
          </p>
          {meta ? (
            <div className="mkt-admin-meta-fields">
              {[
                ["App ID", meta.appId || "—"],
                ["Webhook", meta.webhookCallbackUrl],
                ["OAuth redirect", meta.oauthRedirectUri],
              ].map(([label, value]) => (
                <div className="field" key={label}>
                  <label>{label}</label>
                  <div className="mkt-admin-copy-field">
                    <input className="inp mono" readOnly value={value} />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm mkt-admin-icon-btn"
                      title="Copy"
                      onClick={() =>
                        void copyText(value).then((ok) =>
                          setOkMsg(ok ? `${label} copied` : "Copy failed"),
                        )
                      }
                    >
                      <Icon name="document" size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="card reveal in">
          <div className="card-h">
            <span className="t">Marketing settings</span>
          </div>
          <div className="card-b">
            <p className="muted" style={{ marginTop: 0 }}>
              Platform OAuth credentials are configured via API environment
              variables. Organisation Page connections happen in each org’s
              Marketing → Connected Apps.
            </p>
            <div className="mkt-admin-settings-grid">
              <div className="mkt-admin-settings-card">
                <Icon name="key" size={18} />
                <b>Meta</b>
                <span className="muted">META_APP_ID / META_APP_SECRET</span>
              </div>
              <div className="mkt-admin-settings-card">
                <Icon name="key" size={18} />
                <b>Google Ads</b>
                <span className="muted">GOOGLE_ADS_CLIENT_ID / SECRET</span>
              </div>
              <div className="mkt-admin-settings-card">
                <Icon name="key" size={18} />
                <b>LinkedIn</b>
                <span className="muted">LINKEDIN_CLIENT_ID / SECRET</span>
              </div>
              <div className="mkt-admin-settings-card">
                <Icon name="key" size={18} />
                <b>TikTok</b>
                <span className="muted">TIKTOK_CLIENT_KEY / SECRET</span>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <Link className="btn btn-primary btn-sm" href="/admin-console/attribution">
                <Icon name="target" size={14} /> Lead Attribution
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
