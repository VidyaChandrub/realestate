"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/icons";
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

const STATUS_STYLES: Record<string, { label: string; cls: string; dot: string }> = {
  pending: { label: "Pending", cls: "b-amber", dot: "#f59e0b" },
  approved: { label: "Approved", cls: "b-green", dot: "#10b981" },
  rejected: { label: "Rejected", cls: "b-rose", dot: "#f43f5e" },
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

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line-2)",
        borderRadius: 14,
        padding: "14px 16px",
        minWidth: 0,
      }}
    >
      <div
        style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          fontFamily: "monospace",
          color: accent ?? "var(--ink)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {sub ? (
        <div
          className="muted"
          style={{ fontSize: 11.5, marginTop: 4, wordBreak: "break-word" }}
        >
          {sub}
        </div>
      ) : null}
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
  const scheme = res.host.endsWith(".localhost") ? "http" : "https";
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
        <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{res.host}</span>
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
            href={`${scheme}://${res.host}/`}
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
  const [dnsMode, setDnsMode] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [kind, setKind] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [verifyResult, setVerifyResult] = useState<
    Record<string, SubdomainVerifyResult>
  >({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const [config, setConfig] = useState<PlatformConfig>(EMPTY_CONFIG);
  const [configOpen, setConfigOpen] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  async function fetchAll() {
    setLoading(true);
    try {
      const [res, cfg] = await Promise.all([
        getOrgDomainRequests({ limit: 100 }),
        getPlatformConfig(),
      ]);
      setRows(res.data ?? []);
      setBaseDomain(res.baseDomain ?? "");
      setWildcard(res.dnsInstructions ?? []);
      setDnsMode(res.dnsMode ?? "");
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
      setMsg(e instanceof Error ? e.message : "Failed to load domain requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchAll();
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  const stats = useMemo(() => {
    const s = { total: rows.length, pending: 0, approved: 0, rejected: 0 };
    for (const r of rows) {
      if (r.status === "pending") s.pending++;
      else if (r.status === "approved") s.approved++;
      else if (r.status === "rejected") s.rejected++;
    }
    return s;
  }, [rows]);

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!filter || r.status === filter) && (!kind || r.kind === kind),
      ),
    [rows, filter, kind],
  );

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
        action === "approve" ? "Domain request approved." : "Domain request rejected.",
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
      setConfigOpen(false);
      setMsg("Platform subdomain settings saved and applied.");
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
            Approve organisation subdomains and custom domains. Org sites resolve
            under{" "}
            {baseDomain ? (
              <b style={{ fontFamily: "monospace" }}>*.{baseDomain}</b>
            ) : (
              "the configured base domain"
            )}
            {" — set the base domain and DNS mode to control how they resolve."}
          </div>
        </div>
        <div className="actions">
          <button
            className="btn btn-ghost"
            onClick={() => void fetchAll()}
            disabled={loading}
            title="Refresh"
          >
            <Icon name="refresh" size={16} />
            <span style={{ marginLeft: 6 }}>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={() => setConfigOpen(true)}>
            <Icon name="globe" size={16} />
            <span style={{ marginLeft: 6 }}>Configure platform domains</span>
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

      {/* Summary strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <StatTile
          label="Base domain"
          value={baseDomain ? `*.${baseDomain}` : "Not set"}
          sub={dnsMode ? `DNS mode: ${dnsMode.toUpperCase()}` : "Save settings to define DNS"}
          accent="var(--brand)"
        />
        <StatTile label="Total requests" value={stats.total} />
        <StatTile
          label="Pending review"
          value={stats.pending}
          accent={stats.pending ? "#f59e0b" : "var(--ink)"}
        />
        <StatTile label="Approved" value={stats.approved} accent="#10b981" />
        <StatTile label="Rejected" value={stats.rejected} accent="#f43f5e" />
      </div>

      {/* Filter + sort toolbar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            background: "var(--surface)",
            border: "1px solid var(--line-2)",
            borderRadius: 12,
            padding: 4,
          }}
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
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            background: "var(--surface)",
            border: "1px solid var(--line-2)",
            borderRadius: 12,
            padding: 4,
          }}
        >
          {["", "subdomain", "custom_domain"].map((k) => (
            <button
              key={k || "all-kinds"}
              className={`btn ${kind === k ? "btn-primary" : "btn-ghost"} btn-sm`}
              onClick={() => setKind(k)}
            >
              {k === "custom_domain" ? "Custom" : k || "All kinds"}
            </button>
          ))}
        </div>
        <span
          className="muted"
          style={{ marginLeft: "auto", alignSelf: "center", fontSize: 12 }}
        >
          {loading ? "Loading..." : `${visible.length} of ${rows.length} requests`}
        </span>
      </div>

      {/* Requests table */}
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
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    No organisation domain requests{filter ? ` with status “${filter}”` : ""}.
                  </td>
                </tr>
              ) : (
                visible.map((r) => {
                  const st = STATUS_STYLES[r.status] ?? {
                    label: r.status,
                    cls: "b-gray",
                    dot: "#64748b",
                  };
                  return (
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
                          r.landingPage?.name ?? <span className="muted">—</span>
                        ) : (
                          <span className="muted sm" style={{ fontSize: 11 }}>
                            login
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${st.cls}`}>
                          <span className="dot" style={{ background: st.dot }} />
                          {st.label}
                        </span>
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
                                {verifyingId === r.id ? "Checking..." : "Verify live"}
                              </button>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {visible.some((r) => r.kind === "subdomain" && verifyResult[r.id]) ? (
          <div style={{ padding: "0 16px 16px" }}>
            {visible.map((r) =>
              r.kind === "subdomain" && verifyResult[r.id] ? (
                <VerifyResult key={r.id} res={verifyResult[r.id]} />
              ) : null,
            )}
          </div>
        ) : null}
      </div>

      {/* Configure platform domains — popup */}
      <Modal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        title="Configure platform domains"
        description="Wildcard base domain and DNS mode for every organisation subdomain — saved to the DB, no SSH or env change needed."
        size="lg"
      >
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
            <label>Environment</label>
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
        </div>
        <div className="row2">
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
          <div className="field" style={{ alignSelf: "flex-end" }}>
            <div className="hint" style={{ marginBottom: 0 }}>
              Current live value:{" "}
              <b style={{ fontFamily: "monospace" }}>
                {baseDomain ? `*.${baseDomain}` : "not set"}
              </b>
            </div>
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
        </div>

        <div
          style={{
            marginTop: 16,
            borderTop: "1px solid var(--line-2)",
            paddingTop: 14,
          }}
        >
          <div className="card-h" style={{ padding: 0, border: "none" }}>
            <span className="t" style={{ fontSize: 13 }}>
              Wildcard DNS record (add once in your registrar / Hostinger zone)
            </span>
          </div>
          {wildcard.length > 0 ? (
            <>
              <DnsRecordTable records={wildcard} />
              <div className="hint" style={{ marginTop: 8 }}>
                One wildcard record (host <b style={{ fontFamily: "monospace" }}>*</b>)
                serves every organisation subdomain. Keep{" "}
                <b style={{ fontFamily: "monospace" }}>
                  {baseDomain || "your base domain"}
                </b>{" "}
                pointed at the same server too, and subdomains like{" "}
                <b style={{ fontFamily: "monospace" }}>
                  skylinedev.{baseDomain || "yourdomain.com"}
                </b>{" "}
                will resolve.
              </div>
            </>
          ) : (
            <div className="hint" style={{ marginTop: 8 }}>
              {config.dnsMode === "a" && !config.infraIp
                ? "Enter the server IPv4 above to see the exact DNS records to add."
                : "Save settings to see the exact DNS records."}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 20,
            paddingTop: 14,
            borderTop: "1px solid var(--line-2)",
          }}
        >
          <button
            className="btn btn-ghost"
            onClick={() => setConfigOpen(false)}
            disabled={configSaving}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => void saveConfig()}
            disabled={configSaving}
          >
            {configSaving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </Modal>
    </>
  );
}