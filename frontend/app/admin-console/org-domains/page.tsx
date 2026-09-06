"use client";

import { useEffect, useState } from "react";
import {
  getOrgDomainRequests,
  getPlatformConfig,
  reviewOrgDomainRequest,
  updatePlatformConfig,
  verifyOrgDomainRequest,
} from "@/lib/api";
import type {
  AdminOrgDomainRequest,
  DnsRecordSpec,
  PlatformConfig,
  SubdomainVerifyResult,
} from "@/lib/types";

const EMPTY_CONFIG: PlatformConfig = {
  id: null,
  subdomainMode: "production",
  subdomainBase: "",
  dnsMode: "a",
  infraIp: "",
  infraIpv6: "",
  infraCname: "",
  infraNs1: "",
  infraNs2: "",
  updatedAt: null,
};

function DnsRecordTable({ records }: { records?: DnsRecordSpec[] | null }) {
  if (!records || records.length === 0) return null;
  return (
    <div className="tbl-wrap" style={{ marginTop: 8, fontSize: 12 }}>
      <table className="tbl tbl-sm">
        <thead>
          <tr>
            <th>Type</th>
            <th>Host</th>
            <th>Value</th>
            <th>TTL</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={i}>
              <td>
                <span className="badge b-indigo">{r.type}</span>
              </td>
              <td style={{ fontFamily: "monospace" }}>{r.host}</td>
              <td style={{ fontFamily: "monospace" }}>{r.value}</td>
              <td className="muted">{r.ttl}</td>
              <td className="muted sm">{r.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerifyResult({ res }: { res: SubdomainVerifyResult }) {
  const badge =
    res.dns.status === "ok"
      ? "b-green"
      : res.dns.status === "mismatch"
        ? "b-rose"
        : "b-amber";
  const label =
    res.dns.status === "ok"
      ? "DNS OK"
      : res.dns.status === "mismatch"
        ? "Wrong IP"
        : "Not resolving";
  return (
    <div
      className="card"
      style={{
        marginTop: 8,
        padding: "12px 14px",
        border: "1px solid rgba(99,102,241,0.3)",
        background: "rgba(99,102,241,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span className={`badge ${badge}`}>
          <span className="dot" style={{ background: "currentColor" }} />
          {label}
        </span>
        <span style={{ fontFamily: "monospace", fontWeight: 700 }}>
          {res.host}
        </span>
        <span className="muted sm">
          → A: {res.dns.hostIps.length ? res.dns.hostIps.join(", ") : "none"}
          {res.expectedIp ? ` (expected ${res.expectedIp})` : ""}
        </span>
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        Base domain {res.baseDomain} resolves to{" "}
        {res.dns.baseIps.length ? res.dns.baseIps.join(", ") : "nothing"} · DNS
        mode: {res.dnsMode}
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span className={res.landingPage ? "badge b-green" : "badge b-amber"}>
          {res.landingPage
            ? `Site live: ${res.landingPage.name}`
            : "No published landing page"}
        </span>
        {res.live ? (
          <a
            className="btn btn-primary btn-sm"
            href={`https://${res.host}/`}
            target="_blank"
            rel="noreferrer"
          >
            Open {res.host}
          </a>
        ) : (
          <span className="muted sm">
            Not live yet — check the wildcard DNS record and publish a landing
            page.
          </span>
        )}
      </div>
    </div>
  );
}

export default function SuperAdminOrgDomainsPage() {
  const [rows, setRows] = useState<AdminOrgDomainRequest[]>([]);
  const [baseDomain, setBaseDomain] = useState("");
  const [wildcard, setWildcard] = useState<DnsRecordSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [kind, setKind] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [verifyResult, setVerifyResult] = useState<
    Record<string, SubdomainVerifyResult>
  >({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Platform subdomain / DNS config form
  const [config, setConfig] = useState<PlatformConfig>(EMPTY_CONFIG);
  const [configOpen, setConfigOpen] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  async function fetchAll() {
    setLoading(true);
    try {
      const [res, cfg] = await Promise.all([
        getOrgDomainRequests({
          status: filter || undefined,
          kind: kind || undefined,
          limit: 100,
        }),
        getPlatformConfig(),
      ]);
      setRows(res.data ?? []);
      setBaseDomain(res.baseDomain ?? "");
      setWildcard(res.dnsInstructions ?? []);
      setConfig({
        ...EMPTY_CONFIG,
        ...cfg,
        subdomainBase: cfg.subdomainBase ?? "",
        infraIp: cfg.infraIp ?? "",
        infraIpv6: cfg.infraIpv6 ?? "",
        infraCname: cfg.infraCname ?? "",
        infraNs1: cfg.infraNs1 ?? "",
        infraNs2: cfg.infraNs2 ?? "",
      });
    } catch (e) {
      setMsg(
        e instanceof Error ? e.message : "Failed to load domain requests.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchAll();
  }, [filter, kind]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  async function review(id: string, action: "approve" | "reject") {
    if (action === "reject" && !(reason[id] ?? "").trim()) {
      setMsg("Enter a rejection reason first.");
      return;
    }
    try {
      await reviewOrgDomainRequest(id, {
        action,
        reason: action === "reject" ? reason[id] : undefined,
      });
      setMsg(
        action === "approve"
          ? "Domain request approved."
          : "Domain request rejected.",
      );
      void fetchAll();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Review failed.");
    }
  }

  async function verify(id: string) {
    setVerifyingId(id);
    setMsg(null);
    try {
      const res = await verifyOrgDomainRequest(id);
      setVerifyResult((prev) => ({ ...prev, [id]: res }));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setVerifyingId(null);
    }
  }

  async function saveConfig() {
    setConfigSaving(true);
    setMsg(null);
    try {
      const saved = await updatePlatformConfig({
        subdomainMode: config.subdomainMode as "localhost" | "production",
        subdomainBase: config.subdomainBase || undefined,
        dnsMode: config.dnsMode as "a" | "cname" | "ns",
        infraIp: config.infraIp || undefined,
        infraIpv6: config.infraIpv6 || undefined,
        infraCname: config.infraCname || undefined,
        infraNs1: config.infraNs1 || undefined,
        infraNs2: config.infraNs2 || undefined,
      });
      setConfig((prev) => {
        const next = { ...prev, ...saved };
        return {
          ...next,
          subdomainBase: next.subdomainBase ?? "",
          infraIp: next.infraIp ?? "",
          infraIpv6: next.infraIpv6 ?? "",
          infraCname: next.infraCname ?? "",
          infraNs1: next.infraNs1 ?? "",
          infraNs2: next.infraNs2 ?? "",
        };
      });
      setMsg("Platform subdomain settings saved and applied.");
      // Refresh the list so baseDomain / per-row DNS instructions update.
      void fetchAll();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to save settings.");
    } finally {
      setConfigSaving(false);
    }
  }

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">Admin · Domains</div>
          <h1>Organisation Domain Requests</h1>
          <div className="sub">
            Approve organisation subdomains and custom domains. Subdomains
            resolve under{" "}
            {baseDomain ? (
              <b style={{ fontFamily: "monospace" }}>*.{baseDomain}</b>
            ) : (
              "the configured base domain"
            )}
            {
              " — set it below if the org site&apos;s <sub>.<domain> isn&apos;t resolving."
            }
          </div>
        </div>
        <div className="actions">
          <button
            className="btn btn-ghost"
            onClick={() => setConfigOpen((v) => !v)}
          >
            {configOpen ? "Hide" : "Configure"} platform domains
          </button>
        </div>
      </div>

      {msg ? (
        <div
          className="card"
          style={{
            padding: "12px 16px",
            marginBottom: 12,
            background: "#eef6ff",
          }}
        >
          {msg}
        </div>
      ) : null}

      {/* Platform subdomain / DNS settings */}
      {configOpen ? (
        <div className="card reveal in" style={{ marginBottom: 18 }}>
          <div className="card-h">
            <span className="t">Platform subdomain &amp; DNS settings</span>
            <span className="muted" style={{ fontSize: 12 }}>
              Wildcard base for every org subdomain — saved to the DB (no
              SSH/env change needed)
            </span>
          </div>
          <div className="card-b">
            <div className="row2">
              <div className="field">
                <label>Subdomain base domain</label>
                <input
                  className="inp inp-mono"
                  placeholder="ipixxel.in"
                  value={config.subdomainBase ?? ""}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, subdomainBase: e.target.value }))
                  }
                />
                <div className="hint">
                  Org sites will live at{" "}
                  <b style={{ fontFamily: "monospace" }}>
                    {"<sub>." + (config.subdomainBase || "yourdomain.com")}
                  </b>
                </div>
              </div>
              <div className="field">
                <label>Mode</label>
                <select
                  className="inp"
                  value={config.subdomainMode}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, subdomainMode: e.target.value }))
                  }
                >
                  <option value="production">Production</option>
                  <option value="localhost">Local dev (.localhost)</option>
                </select>
              </div>
              <div className="field">
                <label>DNS mode</label>
                <select
                  className="inp"
                  value={config.dnsMode}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, dnsMode: e.target.value }))
                  }
                >
                  <option value="a">A record → server IP (AWS EC2)</option>
                  <option value="cname">CNAME → target</option>
                  <option value="ns">Nameservers</option>
                </select>
              </div>
            </div>
            <div className="row2">
              {config.dnsMode === "a" ? (
                <>
                  <div className="field">
                    <label>Origin IPv4 (AWS server IP)</label>
                    <input
                      className="inp inp-mono"
                      placeholder="203.0.113.10"
                      value={config.infraIp ?? ""}
                      onChange={(e) =>
                        setConfig((p) => ({ ...p, infraIp: e.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Origin IPv6 (optional)</label>
                    <input
                      className="inp inp-mono"
                      placeholder="::"
                      value={config.infraIpv6 ?? ""}
                      onChange={(e) =>
                        setConfig((p) => ({ ...p, infraIpv6: e.target.value }))
                      }
                    />
                  </div>
                </>
              ) : config.dnsMode === "cname" ? (
                <div className="field">
                  <label>CNAME target</label>
                  <input
                    className="inp inp-mono"
                    placeholder="cname.example.com"
                    value={config.infraCname ?? ""}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, infraCname: e.target.value }))
                    }
                  />
                </div>
              ) : (
                <>
                  <div className="field">
                    <label>Primary nameserver</label>
                    <input
                      className="inp inp-mono"
                      value={config.infraNs1 ?? ""}
                      onChange={(e) =>
                        setConfig((p) => ({ ...p, infraNs1: e.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Secondary nameserver</label>
                    <input
                      className="inp inp-mono"
                      value={config.infraNs2 ?? ""}
                      onChange={(e) =>
                        setConfig((p) => ({ ...p, infraNs2: e.target.value }))
                      }
                    />
                  </div>
                </>
              )}
              <div className="field" style={{ alignSelf: "flex-end" }}>
                <button
                  className="btn btn-primary"
                  onClick={() => void saveConfig()}
                  disabled={configSaving}
                >
                  {configSaving ? "Saving..." : "Save settings"}
                </button>
              </div>
            </div>

            {wildcard.length > 0 ? (
              <div style={{ marginTop: 14 }}>
                <div className="card-h" style={{ padding: 0, border: "none" }}>
                  <span className="t" style={{ fontSize: 13 }}>
                    Add this wildcard record in your DNS zone (Hostinger /
                    registrar)
                  </span>
                </div>
                <DnsRecordTable records={wildcard} />
                <div className="hint" style={{ marginTop: 8 }}>
                  One wildcard record (host{" "}
                  <b style={{ fontFamily: "monospace" }}>*</b>) serves every
                  organisation subdomain. Keep{" "}
                  <b style={{ fontFamily: "monospace" }}>
                    {baseDomain || "your base domain"}
                  </b>{" "}
                  itself pointed at the same server too, then subdomains like{" "}
                  <b style={{ fontFamily: "monospace" }}>
                    atomatci.{baseDomain || "yourdomain.com"}
                  </b>{" "}
                  will resolve.
                </div>
              </div>
            ) : (
              <div className="hint" style={{ marginTop: 12 }}>
                {config.dnsMode === "a" && !config.infraIp
                  ? "Enter the server IP above to see the DNS records to add."
                  : "Save settings to see the exact DNS records."}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div
        style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}
      >
        {["", "pending", "approved", "rejected"].map((s) => (
          <button
            key={s || "all"}
            className={`btn ${filter === s ? "btn-primary" : "btn-ghost"} btn-sm`}
            onClick={() => setFilter(s)}
          >
            {s || "All statuses"}
          </button>
        ))}
        {["", "subdomain", "custom_domain"].map((k) => (
          <button
            key={k || "all-kinds"}
            className={`btn ${kind === k ? "btn-primary" : "btn-ghost"} btn-sm`}
            onClick={() => setKind(k)}
          >
            {k === "custom_domain" ? "Custom" : k || "All kinds"}
          </button>
        ))}
        <span
          className="muted"
          style={{ marginLeft: "auto", alignSelf: "center", fontSize: 12 }}
        >
          {loading ? "Loading..." : `${rows.length} requests`}
        </span>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Kind</th>
                <th>Domain</th>
                <th>Landing page</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    No organisation domain requests.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontWeight: 700 }}>
                        {r.organisation?.name ?? "—"}
                      </span>
                      <br />
                      <span className="muted sm">{r.organisation?.slug}</span>
                    </td>
                    <td>
                      <span className="badge b-gray">
                        {r.kind === "custom_domain" ? "Custom" : "Subdomain"}
                      </span>
                    </td>
                    <td style={{ fontFamily: "monospace", fontWeight: 700 }}>
                      {r.kind === "custom_domain" ? (
                        r.customDomain
                      ) : (
                        <>
                          <div>
                            {r.subdomainHost ??
                              (r.subdomain
                                ? `${r.subdomain}.${baseDomain || "?"}`
                                : "—")}
                          </div>
                          {r.dnsInstructions && r.dnsInstructions.length > 0 ? (
                            <details style={{ marginTop: 4, fontSize: 11 }}>
                              <summary
                                className="muted"
                                style={{ cursor: "pointer" }}
                              >
                                DNS records
                              </summary>
                              <DnsRecordTable records={r.dnsInstructions} />
                            </details>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {r.kind === "custom_domain" ? (
                        r.landingPage?.name ?? (
                          <span className="muted">—</span>
                        )
                      ) : (
                        <span className="muted sm" style={{ fontSize: 11 }}>
                          login
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge b-indigo">{r.status}</span>
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {new Date(r.requestedAt).toLocaleDateString()}
                    </td>
                    <td style={{ minWidth: 220 }}>
                      {r.status === "pending" ? (
                        <div
                          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                        >
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => void review(r.id, "approve")}
                          >
                            Approve
                          </button>
                          <input
                            className="inp"
                            placeholder="Reject reason"
                            value={reason[r.id] ?? ""}
                            onChange={(e) =>
                              setReason((prev) => ({
                                ...prev,
                                [r.id]: e.target.value,
                              }))
                            }
                            style={{ width: 120, height: 28, fontSize: 12 }}
                          />
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => void review(r.id, "reject")}
                          >
                            Reject
                          </button>
                        </div>
                      ) : r.rejectionReason ? (
                        <span
                          className="muted"
                          style={{ fontSize: 11, color: "var(--rose)" }}
                        >
                          {r.rejectionReason}
                        </span>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <span className="muted">Reviewed</span>
                          {r.kind === "subdomain" ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              disabled={verifyingId === r.id}
                              onClick={() => void verify(r.id)}
                            >
                              {verifyingId === r.id
                                ? "Checking..."
                                : "Verify live"}
                            </button>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {rows.some((r) => r.kind === "subdomain" && verifyResult[r.id]) ? (
          <div style={{ padding: "0 16px 16px" }}>
            {rows.map((r) =>
              r.kind === "subdomain" && verifyResult[r.id] ? (
                <VerifyResult key={r.id} res={verifyResult[r.id]} />
              ) : null,
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
