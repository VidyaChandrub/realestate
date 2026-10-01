"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import { PlatformBrandIcon } from "@/components/org/platform-brand-icon";
import {
  getMarketingAppsOverview,
  getMarketingConnectUrl,
  syncMarketingPlatform,
} from "@/lib/api";
import type { MarketingAppsOverview, MarketingPlatformCard } from "@/lib/types";
import "@/app/org/org.css";

const HERO_KEYS = ["meta", "instagram", "google_ads", "whatsapp"] as const;

const PLATFORM_COPY: Record<
  string,
  {
    blurb: string;
    primaryLabel: string;
    secondaryLabel: string;
    secondaryHref?: string;
    features: Array<{ icon: "sync" | "target" | "bolt" | "link"; label: string; tip: string }>;
    steps: Array<{ title: string; body: string }>;
    guideHref: string;
    setupHint: string;
  }
> = {
  meta: {
    blurb:
      "Connect your Facebook Page so Lead Ad form submissions flow into Lead Center in realtime, with campaign and UTM attribution.",
    primaryLabel: "Connect with Facebook",
    secondaryLabel: "Connect with Page Token",
    secondaryHref: "/org/marketing/apps/meta?token=1",
    features: [
      { icon: "sync", label: "Lead Ads Capture", tip: "Realtime + Sync import" },
      { icon: "target", label: "Campaign Names", tip: "Ad / ad set / campaign" },
      { icon: "bolt", label: "Webhook Sync", tip: "New leads instantly" },
      { icon: "link", label: "UTM Attribution", tip: "First & last touch" },
    ],
    steps: [
      {
        title: "Create Meta App",
        body: "Ask Super Admin to configure the platform Meta App (or use an existing one).",
      },
      {
        title: "Add Required Permissions",
        body: "Lead Ads needs Page list, metadata, engagement, and leads retrieval permissions.",
      },
      {
        title: "Get App Credentials",
        body: "Super Admin sets META_APP_ID / META_APP_SECRET for the environment.",
      },
      {
        title: "Connect in your dashboard",
        body: "Click Connect with Facebook. Authorised Pages are linked for Lead Ads. Sync Now imports recent form leads into Lead Center.",
      },
    ],
    guideHref: "/org/marketing/apps/meta",
    setupHint:
      "Ask Super Admin to set META_APP_ID / META_APP_SECRET. These credentials are required to connect Facebook, Instagram and WhatsApp.",
  },
  instagram: {
    blurb:
      "Instagram connects through the same Meta Page login as Facebook. Instant Form leads still arrive under Facebook attribution until distinct Instagram labelling ships.",
    primaryLabel: "Connect with Instagram (Meta)",
    secondaryLabel: "Open details",
    secondaryHref: "/org/marketing/apps/instagram",
    features: [
      { icon: "sync", label: "Shared Meta Connect", tip: "Same Page OAuth" },
      { icon: "target", label: "Lead Ads Path", tip: "Via Facebook Page" },
      { icon: "bolt", label: "Realtime Capture", tip: "When forms fire" },
      { icon: "link", label: "Attribution today", tip: "Shows as Facebook" },
    ],
    steps: [
      {
        title: "Configure Meta App",
        body: "Same Meta app used for Facebook Lead Ads.",
      },
      {
        title: "Connect Facebook Page",
        body: "Instagram Lead Ads require a linked Facebook Page.",
      },
      {
        title: "Link Instagram account",
        body: "Ensure the Page is linked to your Instagram professional account.",
      },
      {
        title: "Connect here",
        body: "Use Connect with Instagram — OAuth reuses the Meta Graph flow. Leads appear as Facebook in Lead Center for now.",
      },
    ],
    guideHref: "/org/marketing/apps/instagram",
    setupHint:
      "Ask Super Admin to set META_APP_ID / META_APP_SECRET before connecting Instagram.",
  },
  whatsapp: {
    blurb:
      "WhatsApp connects through the same Meta Page login. This stores the connection for Ads attribution readiness — dedicated WhatsApp lead ingest is not live yet.",
    primaryLabel: "Connect via Meta",
    secondaryLabel: "Open details",
    secondaryHref: "/org/marketing/apps/whatsapp",
    features: [
      { icon: "sync", label: "Meta Connection", tip: "Shared Page token" },
      { icon: "target", label: "Ads Ready", tip: "Connection scaffolding" },
      { icon: "bolt", label: "Not messaging", tip: "No inbox in this module" },
      { icon: "link", label: "Lead ingest", tip: "Coming in a later phase" },
    ],
    steps: [
      {
        title: "Meta App ready",
        body: "Use the same Meta app credentials as Facebook Lead Ads.",
      },
      {
        title: "Connect Page",
        body: "WhatsApp Ads connection rides on the connected Facebook Page.",
      },
      {
        title: "Enable WhatsApp product",
        body: "Confirm WhatsApp is set up on the Meta Business account when you run WhatsApp Ads.",
      },
      {
        title: "Connect here",
        body: "Click Connect via Meta. Expect connection status only — WhatsApp-labelled CRM leads are not live yet.",
      },
    ],
    guideHref: "/org/marketing/apps/whatsapp",
    setupHint:
      "Ask Super Admin to set META_APP_ID / META_APP_SECRET before connecting WhatsApp.",
  },
  google_ads: {
    blurb:
      "Connect Google Ads to store your account securely. Lead forms and campaign spend sync are not live yet — connection prepares the next phase.",
    primaryLabel: "Connect with Google",
    secondaryLabel: "Connect with access token",
    secondaryHref: "/org/marketing/apps/google_ads?token=1",
    features: [
      { icon: "sync", label: "OAuth Connect", tip: "Account linked" },
      { icon: "target", label: "Metrics Sync", tip: "Coming later" },
      { icon: "bolt", label: "Lead Forms", tip: "Coming later" },
      { icon: "link", label: "Website gclid", tip: "Captured on web forms" },
    ],
    steps: [
      {
        title: "Create Google Cloud OAuth client",
        body: "Enable Google Ads API and create OAuth 2.0 client credentials.",
      },
      {
        title: "Set env credentials",
        body: "Super Admin sets GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET.",
      },
      {
        title: "Authorize account",
        body: "Click Connect with Google and approve Ads access for your account.",
      },
      {
        title: "After connect",
        body: "Connection is stored. Sync Now verifies health; campaign metrics and Google lead forms are not imported yet.",
      },
    ],
    guideHref: "/org/marketing/apps/google_ads",
    setupHint:
      "Ask Super Admin to set GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET before connecting Google Ads.",
  },
};

function StatusPill({
  connected,
  configured,
}: {
  connected: boolean;
  configured: boolean;
}) {
  if (connected) {
    return <span className="mkt-hub-status is-on">Connected</span>;
  }
  if (!configured) {
    return <span className="mkt-hub-status is-warn">Not configured</span>;
  }
  return <span className="mkt-hub-status is-off">Not connected</span>;
}

function FeatureIcon({ name }: { name: "sync" | "target" | "bolt" | "link" }) {
  const map = {
    sync: "integrations" as const,
    target: "target" as const,
    bolt: "sparkles" as const,
    link: "link" as const,
  };
  return <Icon name={map[name]} size={16} />;
}

export default function OrgMarketingAppsPage() {
  const [data, setData] = useState<MarketingAppsOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [syncKey, setSyncKey] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    getMarketingAppsOverview()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load apps"),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const platforms = data?.platforms ?? [];
  const byKey = new Map(platforms.map((p) => [p.key, p]));
  const ordered: MarketingPlatformCard[] = HERO_KEYS.map((key) => {
    const existing = byKey.get(key);
    if (existing) return existing;
    return {
      key,
      name:
        key === "meta"
          ? "Facebook / Meta"
          : key === "google_ads"
            ? "Google Ads"
            : key === "whatsapp"
              ? "WhatsApp Ads"
              : "Instagram",
      description: PLATFORM_COPY[key]?.blurb ?? null,
      supportsOAuth: true,
      supportsWebhook: key === "meta" || key === "instagram",
      ready: false,
      configured: false,
      connections: [],
      connectionCount: 0,
      lastSyncAt: null,
      status: "disconnected",
    };
  }).filter((p) => byKey.has(p.key) || loading);

  async function connect(p: MarketingPlatformCard) {
    setBusyKey(p.key);
    setError("");
    try {
      const { url } = await getMarketingConnectUrl(p.key);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed");
      window.location.href = `/org/marketing/apps/${p.key}`;
    } finally {
      setBusyKey(null);
    }
  }

  async function sync(p: MarketingPlatformCard) {
    setSyncKey(p.key);
    setError("");
    try {
      const result = await syncMarketingPlatform(p.key);
      if (!result.ok && result.failed > 0) {
        setError(
          `Sync finished with ${result.failed} error(s). Check Integration Logs.`,
        );
      }
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncKey(null);
    }
  }

  return (
    <>
      <div className="page-head mkt-hub-head">
        <div>
          <div className="eyebrow">
            <Icon name="integrations" size={14} /> Marketing
          </div>
          <h1>Connected Apps</h1>
          <div className="sub">
            Connect ad platforms so Facebook Lead Ads flow into Lead Center.
            Instagram and WhatsApp share Meta login; Google Ads connect is ready
            with metrics sync still upcoming.
          </div>
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href="/org/marketing/apps/logs">
            <Icon name="document" size={14} /> View Integration Logs
          </Link>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ color: "#b91c1c", marginBottom: 14 }}>
          <div className="card-b">{error}</div>
        </div>
      ) : null}

      <Reveal delay={1}>
        <div className="mkt-hub-hero">
          <div className="mkt-hub-orbit" aria-hidden>
            <span className="mkt-hub-orbit-ring" />
            <span className="mkt-hub-orbit-ring r2" />
            <div className="mkt-hub-orbit-core">
              <Icon name="integrations" size={22} />
            </div>
            {HERO_KEYS.map((key, i) => (
              <div
                key={key}
                className={`mkt-hub-orbit-node n${i + 1}`}
                title={key}
              >
                <PlatformBrandIcon platformKey={key} size={36} />
              </div>
            ))}
          </div>
          <div className="mkt-hub-hero-card">
            <div className="mkt-hub-hero-card-top">
              <span className="mkt-hub-hero-badge">Integration Hub</span>
              <div className="mkt-hub-mini-chart" aria-hidden>
                <i style={{ height: "38%" }} />
                <i style={{ height: "62%" }} />
                <i style={{ height: "48%" }} />
                <i style={{ height: "78%" }} />
                <i style={{ height: "55%" }} />
              </div>
            </div>
            <h2>Connected Apps for Lead Capture</h2>
            <p>
              Facebook Lead Ads are live into CRM with attribution. Instagram and
              WhatsApp connect via the same Meta login; Google Ads stores the
              account for the next metrics phase.
            </p>
            <div className="mkt-hub-hero-stats">
              <div>
                <b>{loading ? "…" : data?.kpis.connectedApps ?? 0}</b>
                <span>Connected</span>
              </div>
              <div>
                <b>{loading ? "…" : data?.kpis.totalLeads ?? 0}</b>
                <span>Leads</span>
              </div>
              <div>
                <b>
                  {loading
                    ? "…"
                    : `₹${Math.round(data?.kpis.spend ?? 0).toLocaleString("en-IN")}`}
                </b>
                <span>Spend</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="mkt-hub-list">
        {ordered.map((p, i) => {
            const copy = PLATFORM_COPY[p.key];
            if (!copy) return null;
            const connected = p.status === "connected";
            const configured = Boolean(p.configured);
            return (
              <Reveal key={p.key} delay={Math.min(i + 2, 6)}>
                <article className="card mkt-hub-card">
                  <div className="mkt-hub-card-main">
                    <div className="mkt-hub-card-top">
                      <div className="mkt-hub-card-brand">
                        <PlatformBrandIcon platformKey={p.key} size={48} />
                        <div>
                          <div className="mkt-hub-card-name-row">
                            <h3>{p.name}</h3>
                            <StatusPill
                              connected={connected}
                              configured={configured}
                            />
                          </div>
                          <p className="mkt-hub-card-desc">
                            {p.description || copy.blurb}
                          </p>
                        </div>
                      </div>
                      <div className="mkt-hub-card-links">
                        <Link href={copy.guideHref}>View Documentation</Link>
                        <Link href="/org/marketing/apps/logs">Need Help?</Link>
                      </div>
                    </div>

                    <p className="mkt-hub-card-blurb">{copy.blurb}</p>

                    {!configured ? (
                      <div className="mkt-hub-alert">{copy.setupHint}</div>
                    ) : null}

                    <div className="mkt-hub-actions">
                      {connected ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={syncKey === p.key}
                            onClick={() => void sync(p)}
                          >
                            {syncKey === p.key ? "Syncing…" : "Sync Now"}
                          </button>
                          <Link
                            className="btn btn-ghost"
                            href={`/org/marketing/apps/${p.key}`}
                          >
                            View Details
                          </Link>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={busyKey === p.key || !configured}
                            onClick={() => void connect(p)}
                          >
                            {busyKey === p.key ? "Connecting…" : copy.primaryLabel}
                          </button>
                          <Link
                            className="btn btn-ghost"
                            href={copy.secondaryHref ?? copy.guideHref}
                          >
                            {copy.secondaryLabel}
                          </Link>
                        </>
                      )}
                    </div>

                    <div className="mkt-hub-features">
                      {copy.features.map((f) => (
                        <div key={f.label} className="mkt-hub-feature">
                          <span className="mkt-hub-feature-ico">
                            <FeatureIcon name={f.icon} />
                          </span>
                          <div>
                            <b>{f.label}</b>
                            <span>{f.tip}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <aside className="mkt-hub-howto">
                    <div className="mkt-hub-howto-title">How to Connect</div>
                    <ol className="mkt-hub-steps">
                      {copy.steps.map((s, idx) => (
                        <li key={s.title}>
                          <span className="mkt-hub-step-num">{idx + 1}</span>
                          <div>
                            <b>{s.title}</b>
                            <p>{s.body}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <Link className="mkt-hub-guide" href={copy.guideHref}>
                      View Step by Step Guide →
                    </Link>
                  </aside>
                </article>
              </Reveal>
            );
          })}
        {!loading && ordered.length === 0 ? (
          <div className="muted">No marketing platforms available.</div>
        ) : null}
      </div>
    </>
  );
}
