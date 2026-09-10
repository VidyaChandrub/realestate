"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import {
  exportAdminAuditLogs,
  getAdminAuditLogs,
  getAdminAuditLogsMeta,
} from "@/lib/api";
import type {
  AdminAuditLogActor,
  AdminAuditLogEntry,
  AdminAuditLogsMeta,
  AdminAuditLogsParams,
} from "@/lib/types";

const PAGE_SIZE = 20;

const AV_TONES = ["", "a2", "a3", "a4", "a5"];

const ACTION_BADGES = [
  "b-gray",
  "b-indigo",
  "b-green",
  "b-amber",
  "b-rose",
  "b-violet",
];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const day = String(d.getDate()).padStart(2, "0");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${months[d.getMonth()]} ${yyyy}, ${hh}:${mm}`;
}

function actorInitials(actor: AdminAuditLogActor | null): { initials: string; tone: string } {
  if (actor) {
    const first = actor.firstName?.[0] ?? "";
    const last = actor.lastName?.[0] ?? "";
    const initials = (first + last) || actor.email.slice(0, 2).toUpperCase();
    return {
      initials: initials.toUpperCase(),
      tone: AV_TONES[hashString(actor.email || actor.id) % AV_TONES.length],
    };
  }
  return { initials: "—", tone: "a5" };
}

function moduleBadge(entry: AdminAuditLogEntry): string {
  const b = ACTION_BADGES[hashString(entry.action || entry.moduleKey || "x") % ACTION_BADGES.length];
  return b;
}

function displayModuleKey(moduleKey: string | null): string {
  if (!moduleKey) return "system";
  return moduleKey.replace(/^admin_/, "").replace(/_/g, " ");
}

function csvCell(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, rows: AdminAuditLogEntry[]) {
  const header = [
    "Timestamp",
    "Actor",
    "Actor email",
    "Organisation",
    "Module",
    "Action",
    "Entity",
    "Entity ID",
    "Metadata",
  ];
  const lines = rows.map((r) => [
    r.createdAt,
    r.actor
      ? [r.actor.firstName, r.actor.lastName].filter(Boolean).join(" ")
      : "",
    r.actor?.email ?? "",
    r.organisation?.name ?? "",
    r.moduleKey ?? "",
    r.action,
    r.entity ?? "",
    r.entityId ?? "",
    r.metadata === null || r.metadata === undefined ? "" : JSON.stringify(r.metadata),
  ]);
  const csv = [header, ...lines].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function SuperAdminAuditLogsPage() {
  const [rows, setRows] = useState<AdminAuditLogEntry[]>([]);
  const [meta, setMeta] = useState<AdminAuditLogsMeta | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [moduleKey, setModuleKey] = useState("");
  const [orgId, setOrgId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    getAdminAuditLogsMeta()
      .then(setMeta)
      .catch(() => setMeta(null));
  }, []);

  const params: AdminAuditLogsParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      actorId: actorId || undefined,
      action: action || undefined,
      moduleKey: moduleKey || undefined,
      orgId: orgId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [page, search, actorId, action, moduleKey, orgId, dateFrom, dateTo],
  );

  const fetchList = useCallback(() => {
    setLoading(true);
    setError(null);
    getAdminAuditLogs(params)
      .then((res) => {
        setRows(res.data ?? []);
        setTotal(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load audit logs."),
      )
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    void fetchList();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [fetchList]);

  const hasFilters =
    Boolean(search) ||
    Boolean(actorId) ||
    Boolean(action) ||
    Boolean(moduleKey) ||
    Boolean(orgId) ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setActorId("");
    setAction("");
    setModuleKey("");
    setOrgId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const res = await exportAdminAuditLogs(params);
      downloadCsv(res.filename || "audit-logs.csv", res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <Icon name="shield" size={14} /> System
          </div>
          <h1>Audit Logs</h1>
          <div className="sub">
            Live platform activity from the API — every significant action across organisations.
          </div>
        </div>
        <div className="actions">
          <button
            className="btn btn-ghost"
            onClick={() => void fetchList()}
            disabled={loading}
            title="Refresh"
          >
            <Icon name="refresh" size={16} />
            <span style={{ marginLeft: 6 }}>Refresh</span>
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => void handleExport()}
            disabled={exporting}
            title="Export CSV"
          >
            <Icon name="download" size={16} />
            <span style={{ marginLeft: 6 }}>
              {exporting ? "Exporting…" : "Export CSV"}
            </span>
          </button>
        </div>
      </div>

      <div className="card reveal" style={{ marginBottom: 18 }}>
        <div
          className="card-b"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <input
              className="inp"
              placeholder="Search actions, entities, actor names, orgs…"
              style={{ paddingLeft: 38 }}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <span
              style={{
                position: "absolute",
                left: 13,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--faint)",
              }}
            >
              <Icon name="search" size={14} />
            </span>
          </div>
          <select
            className="inp"
            style={{ maxWidth: 200 }}
            value={actorId}
            onChange={(e) => {
              setActorId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All actors</option>
            {(meta?.actors ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name || a.email}
              </option>
            ))}
          </select>
          <select
            className="inp"
            style={{ maxWidth: 220 }}
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All actions</option>
            {(meta?.actions ?? []).map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <select
            className="inp"
            style={{ maxWidth: 200 }}
            value={moduleKey}
            onChange={(e) => {
              setModuleKey(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All modules</option>
            {(meta?.modules ?? []).map((m) => (
              <option key={m.key} value={m.key}>
                {m.key.replace(/^admin_/, "").replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            className="inp"
            style={{ maxWidth: 200 }}
            value={orgId}
            onChange={(e) => {
              setOrgId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All organisations</option>
            {(meta?.organisations ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <input
            className="inp"
            type="date"
            style={{ maxWidth: 170 }}
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
          <input
            className="inp"
            type="date"
            style={{ maxWidth: 170 }}
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
          {hasFilters ? (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div
          className="card"
          style={{ marginBottom: 12, padding: "12px 16px", color: "var(--rose)" }}
        >
          {error}
        </div>
      ) : null}

      <div className="card reveal">
        <div className="card-h">
          <span className="t">Activity</span>
          <span className="muted" style={{ fontSize: 12 }}>
            {loading ? "Loading…" : `${total.toLocaleString()} event${total === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Organisation</th>
                <th>Module</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="muted">
                    No audit log entries match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((l) => {
                  const av = actorInitials(l.actor);
                  return (
                    <tr key={l.id}>
                      <td>
                        <span className="mono">{formatDateTime(l.createdAt)}</span>
                      </td>
                      <td>
                        <span className="u">
                          <span className={`av ${av.tone}`}>{av.initials}</span>
                          <span className="nm">
                            {l.actor
                              ? [l.actor.firstName, l.actor.lastName]
                                  .filter(Boolean)
                                  .join(" ") || l.actor.email
                              : "System"}
                            {l.actor ? (
                              <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>
                                {l.actor.email}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </td>
                      <td>{l.organisation?.name ?? <span className="muted">—</span>}</td>
                      <td>
                        <span className="badge b-gray">
                          {displayModuleKey(l.moduleKey)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${moduleBadge(l)}`}>
                          {l.actionLabel}
                        </span>
                      </td>
                      <td>
                        {l.entity ? (
                          <>
                            <div style={{ fontWeight: 600, fontSize: 12.5 }}>
                              {l.entity}
                            </div>
                            {l.entityId ? (
                              <div className="muted mono" style={{ fontSize: 11 }}>
                                {l.entityId}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        {l.metadata &&
                        typeof l.metadata === "object" &&
                        Object.keys(l.metadata as object).length > 0 ? (
                          <details style={{ fontSize: 11.5 }}>
                            <summary
                              className="muted"
                              style={{ cursor: "pointer" }}
                            >
                              View
                            </summary>
                            <pre
                              className="mono"
                              style={{
                                margin: "6px 0 0",
                                padding: 8,
                                borderRadius: 8,
                                background: "var(--surface-2, #f1f5f9)",
                                fontSize: 11,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {JSON.stringify(l.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              padding: "14px 18px",
            }}
          >
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Prev
            </button>
            <span
              className="muted"
              style={{ fontSize: 12.5, alignSelf: "center" }}
            >
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}