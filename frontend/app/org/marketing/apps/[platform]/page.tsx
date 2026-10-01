"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import {
  apiFetch,
  connectMarketingCredentials,
  connectMetaWithToken,
  disconnectMarketingConnection,
  getMarketingConnectUrl,
  getMarketingPlatform,
  syncMarketingConnection,
  syncMarketingPlatform,
  updateMarketingConnection,
} from "@/lib/api";
import type { MarketingPlatformCard, MetaPublicConfig, Project } from "@/lib/types";
import { MetaLeadAdsCard } from "@/components/org/meta-lead-ads-card";
import { PlatformBrandIcon } from "@/components/org/platform-brand-icon";
import "@/app/org/org.css";

type ProjectsListResponse = { data: Project[] };

function PlatformDetailInner() {
  const { platform: routeKey } = useParams<{ platform: string }>();
  const key = Array.isArray(routeKey) ? routeKey[0] : routeKey;
  const search = useSearchParams();
  const [detail, setDetail] = useState<
    (MarketingPlatformCard & {
      metaConfig?: MetaPublicConfig | null;
      oauthConfigured?: boolean;
      webhookUrl?: string | null;
    }) | null
  >(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState({
    pageId: "",
    pageName: "",
    accessToken: "",
    projectId: "",
  });
  const [cred, setCred] = useState({
    externalAccountId: "",
    externalAccountName: "",
    accessToken: "",
    refreshToken: "",
    projectId: "",
  });
  const [showManual, setShowManual] = useState(false);
  const [showCred, setShowCred] = useState(false);

  const load = useCallback(async () => {
    if (!key) return;
    try {
      const [d, proj] = await Promise.all([
        getMarketingPlatform(key),
        apiFetch<ProjectsListResponse>("/org/projects?page=1&limit=100").catch(
          () => ({ data: [] as Project[] }),
        ),
      ]);
      setDetail(d);
      setProjects(proj.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load platform");
    }
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (search.get("meta") === "connected" || search.get("connected") === "1") {
      if (key === "google_ads") {
        setMessage(
          "Google Ads connected. Account is stored; campaign metrics and lead forms are not synced yet.",
        );
      } else if (key === "whatsapp") {
        setMessage(
          "WhatsApp connected via Meta. Connection is ready; dedicated WhatsApp lead ingest is not live yet.",
        );
      } else if (key === "instagram") {
        setMessage(
          "Instagram connected via Meta. Lead ads are labelled Instagram in Lead Center when Meta reports the placement; Lead Ads Testing Tool leads show as Facebook. Use Sync Now to import recent form leads.",
        );
      } else {
        setMessage(
          "Platform connected. New Facebook Lead Ads will appear in Lead Center automatically. Use Sync Now to import recent form leads.",
        );
      }
      void load();
    }
    if (
      search.get("connected") === "0" ||
      search.get("meta") === "error"
    ) {
      setError(search.get("message") || "Connection failed");
    }
    if (search.get("token") === "1") {
      if (key === "meta" || key === "instagram" || key === "whatsapp") {
        setShowManual(true);
      }
      if (key === "google_ads") {
        setShowCred(true);
      }
    }
  }, [search, load, key]);

  const isMetaFamily =
    key === "meta" || key === "instagram" || key === "whatsapp";
  const isGoogleAds = key === "google_ads";

  async function connectOAuth() {
    if (!key) return;
    setBusy(true);
    setError("");
    try {
      const { url } = await getMarketingConnectUrl(key);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed");
      setBusy(false);
      setShowCred(true);
    }
  }

  async function runSync(connectionId?: string) {
    if (!key) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (connectionId) {
        const result = await syncMarketingConnection(connectionId);
        setMessage(
          result.message ||
            (isMetaFamily
              ? "Lead subscription refreshed and recent form leads imported when available."
              : isGoogleAds
                ? "Connection verified. Campaign metrics are not synced yet."
                : "Sync complete"),
        );
      } else {
        const result = await syncMarketingPlatform(key);
        if (!result.ok) {
          setMessage(`Sync finished with ${result.failed} error(s)`);
        } else if (isMetaFamily) {
          const detailMsg = result.results?.find((r) => r.message)?.message;
          setMessage(
            detailMsg ||
              `Synced ${result.synced} connection(s). Recent Lead Ad form submissions were imported into Lead Center.`,
          );
        } else if (isGoogleAds) {
          setMessage(
            `Verified ${result.synced} connection(s). Google Ads metrics and lead forms are not synced yet.`,
          );
        } else {
          setMessage(`Synced ${result.synced} connection(s)`);
        }
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveMetaManual() {
    setBusy(true);
    setError("");
    try {
      const connected = await connectMetaWithToken({
        pageId: manual.pageId.trim(),
        pageName: manual.pageName.trim() || manual.pageId.trim(),
        accessToken: manual.accessToken.trim(),
        projectId: manual.projectId || null,
      });
      setShowManual(false);
      const count =
        typeof connected.imported === "number" ? connected.imported : 0;
      setMessage(
        count > 0
          ? `Page connected. Imported ${count} recent lead(s) into Lead Center.`
          : "Page connected with access token. Use Sync Now if you expect existing form leads.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Token connect failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveCredentials() {
    if (!key) return;
    setBusy(true);
    setError("");
    try {
      await connectMarketingCredentials(key, {
        externalAccountId: cred.externalAccountId.trim(),
        externalAccountName:
          cred.externalAccountName.trim() || cred.externalAccountId.trim(),
        accessToken: cred.accessToken.trim(),
        refreshToken: cred.refreshToken.trim() || undefined,
        projectId: cred.projectId || null,
      });
      setShowCred(false);
      setMessage("Account connected.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <Icon name="integrations" size={14} /> Connected Apps
          </div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {key ? <PlatformBrandIcon platformKey={key} size={36} /> : null}
            {detail?.name ?? key}
          </h1>
          <div className="sub">{detail?.description}</div>
        </div>
        <div className="actions">
          {(detail?.connections.length ?? 0) > 0 ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void runSync()}
            >
              {busy ? "Syncing…" : "Sync Now"}
            </button>
          ) : null}
          <Link className="btn btn-ghost" href="/org/marketing/apps">
            <Icon name="chevron-left" size={14} /> All apps
          </Link>
        </div>
      </div>

      {message ? (
        <div className="badge b-green" style={{ marginBottom: 12 }}>
          {message}
        </div>
      ) : null}
      {error ? (
        <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>
      ) : null}

      <Reveal delay={1}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-h">
            <span className="t">Connection</span>
            <span className="x">
              {detail?.status === "connected" ? (
                <span className="badge b-green">Connected</span>
              ) : (
                <span className="badge b-gray">Not connected</span>
              )}
            </span>
          </div>
          <div className="card-b">
            {isMetaFamily ? (
              <>
                <p className="muted" style={{ marginTop: 0 }}>
                  {key === "whatsapp"
                    ? "Connect via Meta Page OAuth to store this connection. Dedicated WhatsApp lead ingest is not live yet — Facebook Lead Ads remain the production capture path."
                    : key === "instagram"
                      ? "Connect via Meta Page OAuth (same as Facebook). Lead ads are labelled Instagram in Lead Center when Meta reports the placement; Lead Ads Testing Tool leads show as Facebook. Sync Now imports recent form leads."
                      : "Connect a Facebook Page so Lead Ad form submissions flow into Lead Center in realtime. Sync Now re-subscribes the Page and imports recent form leads so you can see them in Lead Center."}
                </p>
                {detail?.metaConfig && !detail.metaConfig.configured ? (
                  <div className="badge b-amber" style={{ marginBottom: 12 }}>
                    Ask Super Admin to set META_APP_ID / META_APP_SECRET
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy || !detail?.metaConfig?.configured}
                    onClick={() => void connectOAuth()}
                  >
                    {key === "instagram"
                      ? "Connect with Instagram (Meta)"
                      : key === "whatsapp"
                        ? "Connect via Meta"
                        : "Connect with Facebook"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowManual((v) => !v)}
                  >
                    {showManual ? "Hide token form" : "Connect with Page token"}
                  </button>
                </div>
                {showManual ? (
                  <div style={{ marginTop: 14 }}>
                    <div className="field">
                      <label>Page ID</label>
                      <input
                        className="inp"
                        value={manual.pageId}
                        onChange={(e) =>
                          setManual((m) => ({ ...m, pageId: e.target.value }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Page name</label>
                      <input
                        className="inp"
                        value={manual.pageName}
                        onChange={(e) =>
                          setManual((m) => ({ ...m, pageName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Page access token</label>
                      <input
                        className="inp"
                        type="password"
                        value={manual.accessToken}
                        onChange={(e) =>
                          setManual((m) => ({
                            ...m,
                            accessToken: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Default project (optional)</label>
                      <select
                        className="inp"
                        value={manual.projectId}
                        onChange={(e) =>
                          setManual((m) => ({
                            ...m,
                            projectId: e.target.value,
                          }))
                        }
                      >
                        <option value="">No project mapping</option>
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
                      disabled={
                        busy ||
                        !manual.pageId.trim() ||
                        !manual.accessToken.trim()
                      }
                      onClick={() => void saveMetaManual()}
                    >
                      Save
                    </button>
                  </div>
                ) : null}
              </>
            ) : isGoogleAds ? (
              <>
                <p className="muted" style={{ marginTop: 0 }}>
                  Connect Google Ads via OAuth when Super Admin has configured
                  credentials, or paste a customer ID and access token below.
                  Connection is stored today; campaign metrics and Google lead
                  forms are not synced yet.
                </p>
                {!detail?.oauthConfigured && !detail?.configured ? (
                  <div className="badge b-amber" style={{ marginBottom: 12 }}>
                    Ask Super Admin to set GOOGLE_ADS_CLIENT_ID /
                    GOOGLE_ADS_CLIENT_SECRET.
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy || !detail?.oauthConfigured}
                    onClick={() => void connectOAuth()}
                  >
                    Connect with Google
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowCred((v) => !v)}
                  >
                    {showCred ? "Hide token form" : "Connect with access token"}
                  </button>
                </div>
              </>
            ) : (
              <p className="muted" style={{ marginTop: 0 }}>
                This platform is not available.
              </p>
            )}

            {showCred && isGoogleAds ? (
              <div style={{ marginTop: 14 }}>
                <div className="field">
                  <label>Account / Customer ID</label>
                  <input
                    className="inp"
                    value={cred.externalAccountId}
                    onChange={(e) =>
                      setCred((c) => ({
                        ...c,
                        externalAccountId: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Account name</label>
                  <input
                    className="inp"
                    value={cred.externalAccountName}
                    onChange={(e) =>
                      setCred((c) => ({
                        ...c,
                        externalAccountName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Access token</label>
                  <input
                    className="inp"
                    type="password"
                    value={cred.accessToken}
                    onChange={(e) =>
                      setCred((c) => ({ ...c, accessToken: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Refresh token (optional)</label>
                  <input
                    className="inp"
                    type="password"
                    value={cred.refreshToken}
                    onChange={(e) =>
                      setCred((c) => ({ ...c, refreshToken: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Default project</label>
                  <select
                    className="inp"
                    value={cred.projectId}
                    onChange={(e) =>
                      setCred((c) => ({ ...c, projectId: e.target.value }))
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
                  disabled={
                    busy ||
                    !cred.externalAccountId.trim() ||
                    !cred.accessToken.trim()
                  }
                  onClick={() => void saveCredentials()}
                >
                  Save connection
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </Reveal>

      {(detail?.connections.length ?? 0) > 0 ? (
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">Accounts</span>
            </div>
            <div className="card-b" style={{ padding: 0 }}>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Default project</th>
                      <th>Last sync</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {detail!.connections.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <b>{c.externalAccountName}</b>
                          <div className="muted mono" style={{ fontSize: 12 }}>
                            {c.externalAccountId}
                          </div>
                        </td>
                        <td>
                          <select
                            className="inp"
                            value={c.projectId ?? ""}
                            onChange={(e) =>
                              void updateMarketingConnection(c.id, {
                                projectId: e.target.value || null,
                              }).then(() => load())
                            }
                          >
                            <option value="">Unassigned</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="muted">
                          {c.lastSyncAt
                            ? new Date(c.lastSyncAt).toLocaleString()
                            : "—"}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={busy}
                              onClick={() => void runSync(c.id)}
                            >
                              Sync
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() =>
                                void disconnectMarketingConnection(c.id).then(
                                  () => load(),
                                )
                              }
                            >
                              Disconnect
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Reveal>
      ) : null}

      {isMetaFamily ? (
        <div style={{ marginTop: 18 }}>
          <MetaLeadAdsCard />
        </div>
      ) : null}
    </>
  );
}

export default function OrgMarketingPlatformPage() {
  return (
    <Suspense fallback={<div className="muted">Loading…</div>}>
      <PlatformDetailInner />
    </Suspense>
  );
}
