"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import { getAdminLeads, getAdminLeadsMeta } from "@/lib/api";
import {
  leadDisplayEmail,
  leadDisplayName,
  leadDisplayPhone,
  leadDisplaySource,
} from "@/lib/lead-display";
import {
  DEFAULT_LEAD_STAGES,
  LEAD_STAGE_ORDER,
  stageTint,
} from "@/lib/lead-stages";
import type {
  AdminLead,
  AdminLeadOrganisation,
  AdminLeadsMeta,
  CrmLeadStatus,
} from "@/lib/types";

const PAGE_SIZE = 20;

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const day = String(d.getDate()).padStart(2, "0");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

function StatusPill({ status }: { status: CrmLeadStatus }) {
  const stage = DEFAULT_LEAD_STAGES[status] ?? { label: status, color: "#94a3b8" };
  return (
    <span
      className="badge"
      style={{ background: stageTint(stage.color), color: stage.color }}
    >
      {stage.label}
    </span>
  );
}

function sourceBadgeClass(source: string | null): string {
  switch ((source || "").toLowerCase()) {
    case "meta":
      return "b-indigo";
    case "google":
      return "b-sky";
    case "whatsapp":
      return "b-green";
    default:
      return "b-amber";
  }
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<AdminLead[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [kpi, setKpi] = useState({
    total: 0,
    unassigned: 0,
    new: 0,
    won: 0,
  });
  const [meta, setMeta] = useState<AdminLeadsMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | CrmLeadStatus>("");
  const [orgFilter, setOrgFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, orgFilter, sourceFilter]);

  useEffect(() => {
    let cancelled = false;
    getAdminLeadsMeta()
      .then((m) => {
        if (!cancelled) setMeta(m);
      })
      .catch(() => {
        if (!cancelled) setMeta({ organisations: [], sources: [], statuses: LEAD_STAGE_ORDER });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminLeads({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: statusFilter || undefined,
        orgId: orgFilter || undefined,
        source: sourceFilter || undefined,
      });
      setLeads(res.data);
      setTotal(res.total);
      setKpi({
        total: res.stats?.total ?? res.total,
        unassigned: res.stats?.unassigned ?? 0,
        new: res.stats?.new ?? 0,
        won: res.stats?.won ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads.");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, orgFilter, sourceFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const orgs: AdminLeadOrganisation[] = meta?.organisations ?? [];

  const STAT_TILES = useMemo(
    () => [
      { label: "Total leads", value: kpi.total, ic: "ic-indigo" },
      { label: "Unassigned", value: kpi.unassigned, ic: "ic-amber" },
      { label: "New", value: kpi.new, ic: "ic-sky" },
      { label: "Won", value: kpi.won, ic: "ic-green" },
    ],
    [kpi],
  );

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <Users size={13} /> Product
          </div>
          <h1>All Leads</h1>
          <div className="sub">
            Platform-wide view of leads captured from every organisation. Read-only — manage assignment and stages in each org&apos;s Lead Center.
          </div>
        </div>
      </div>

      <Reveal delay={1} className="grid g4">
        {STAT_TILES.map((s) => (
          <div key={s.label} className="stat">
            <div className="top">
              <span className="label">{s.label}</span>
              <span className={`ic ${s.ic}`}>
                <Icon name="users" size={14} />
              </span>
            </div>
            <div className="value">
              {loading && leads === null ? "—" : <CountUp value={s.value} />}
            </div>
          </div>
        ))}
      </Reveal>

      <Reveal delay={2}>
        <div className="card" style={{ marginTop: 18 }}>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--faint)",
                }}
              />
              <input
                className="inp"
                placeholder="Search name, phone, email…"
                style={{ paddingLeft: 36 }}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <select
              className="inp"
              style={{ width: "auto", minWidth: 140 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter((e.target.value || "") as "" | CrmLeadStatus)}
            >
              <option value="">All statuses</option>
              {LEAD_STAGE_ORDER.map((s) => (
                <option key={s} value={s}>
                  {DEFAULT_LEAD_STAGES[s].label}
                </option>
              ))}
            </select>
            <select
              className="inp"
              style={{ width: "auto", minWidth: 180 }}
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
            >
              <option value="">All organisations</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <select
              className="inp"
              style={{ width: "auto", minWidth: 140 }}
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="">All sources</option>
              {(meta?.sources ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="muted" style={{ fontSize: 12.5, marginLeft: "auto" }}>
              {total} lead{total !== 1 ? "s" : ""}
            </span>
          </div>

          {error ? (
            <div className="muted" style={{ padding: "24px 0", textAlign: "center", color: "var(--rose, #e11d48)" }}>
              {error}
            </div>
          ) : null}

          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Organisation</th>
                  <th>Project</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {loading && !leads ? (
                  <tr>
                    <td colSpan={7} className="muted" style={{ textAlign: "center", padding: 32 }}>
                      Loading leads…
                    </td>
                  </tr>
                ) : !leads?.length ? (
                  <tr>
                    <td colSpan={7} className="muted" style={{ textAlign: "center", padding: 32 }}>
                      No leads match these filters.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const name = leadDisplayName(lead);
                    const phone = leadDisplayPhone(lead);
                    const email = leadDisplayEmail(lead);
                    const source = leadDisplaySource(lead);
                    return (
                      <tr key={lead.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{name || "—"}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {[phone, email].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </td>
                        <td>
                          {lead.organisation?.id === "platform" ? (
                            <span style={{ fontWeight: 600 }}>{lead.organisation.name}</span>
                          ) : lead.organisation ? (
                            <Link
                              href={`/admin-console/organisation-detail/${lead.organisation.id}`}
                              style={{ fontWeight: 600, color: "var(--brand)" }}
                            >
                              {lead.organisation.name}
                            </Link>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>{lead.project?.name || <span className="muted">—</span>}</td>
                        <td>
                          <span className={`badge ${sourceBadgeClass(source)}`}>
                            {source || "Website"}
                          </span>
                        </td>
                        <td>
                          <StatusPill status={lead.status} />
                        </td>
                        <td>
                          {lead.assignedTo?.name || (
                            <span className="muted">Unassigned</span>
                          )}
                        </td>
                        <td className="muted" style={{ whiteSpace: "nowrap", fontSize: 12.5 }}>
                          {formatDateTime(lead.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pageCount > 1 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 14,
                gap: 12,
              }}
            >
              <span className="muted" style={{ fontSize: 12.5 }}>
                Page {page} of {pageCount}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={page >= pageCount || loading}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </Reveal>
    </>
  );
}
