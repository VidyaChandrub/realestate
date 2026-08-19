"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Seg } from "@/components/superadmin/seg";
import type { OrganisationListResponse, OrganisationSummary } from "@/lib/types";

const STATUS_TABS = ["All", "Active", "Trial", "Suspended"] as const;
const DISABLED_TABS = ["Trial", "Suspended"];
const LIMIT = 20;

function statusParamFor(tabIndex: number): "all" | "active" {
  return tabIndex === 1 ? "active" : "all";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function SuperAdminOrganisationsPage() {
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuth();

  const [tabIndex, setTabIndex] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState<OrganisationSummary | null>(null);
  const [result, setResult] = useState<OrganisationListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !accessToken) {
      router.replace("/login");
    }
  }, [authLoading, accessToken, router]);

  // Debounce free-text search before it hits the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<OrganisationSummary>("/admin/organisations/summary", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      status: statusParamFor(tabIndex),
    });
    if (search) params.set("search", search);

    apiFetch<OrganisationListResponse>(`/admin/organisations?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setResult)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load organisations."))
      .finally(() => setLoading(false));
  }, [accessToken, tabIndex, search, page]);

  if (authLoading || !accessToken) {
    return null;
  }

  const rows = result?.data ?? [];
  const total = result?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(page * LIMIT, total);
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">🏢 Manage</div>
          <h1>Organisations</h1>
          <div className="sub">
            Every developer, agency and brokerage on the iPixxel Realty platform.
          </div>
        </div>
        <div className="actions">
          <Link className="btn btn-primary" href="/superadmin/onboarding">
            ✨ Onboard organisation
          </Link>
        </div>
      </div>

      {/* Controls */}
      <Reveal delay={1}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
          <Seg
            options={[...STATUS_TABS]}
            value={tabIndex}
            onChange={(i) => {
              setTabIndex(i);
              setPage(1);
            }}
            disabledOptions={DISABLED_TABS}
            titleFor={(opt) => (DISABLED_TABS.includes(opt) ? "Coming soon" : undefined)}
          />
          <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 340 }}>
            <input
              className="inp"
              placeholder="Search by name, city or email…"
              style={{ paddingLeft: 38 }}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--faint)" }}>
              🔎
            </span>
          </div>
        </div>
      </Reveal>

      {/* Stat tiles */}
      <div style={{ marginBottom: 18 }}>
        <Reveal delay={2} className="grid g4">
          <div className="stat">
            <div className="top">
              <span className="label">Total organisations</span>
              <span className="ic ic-indigo">🏢</span>
            </div>
            <div className="value">
              {summary ? <CountUp value={summary.total} /> : "—"}
            </div>
          </div>
          <div className="stat">
            <div className="top">
              <span className="label">Active</span>
              <span className="ic ic-green">✅</span>
            </div>
            <div className="value">
              {summary ? <CountUp value={summary.active} /> : "—"}
            </div>
          </div>
          <div className="stat">
            <div className="top">
              <span className="label">On trial</span>
              <span className="ic ic-amber">✨</span>
            </div>
            <div className="value">—</div>
            <div className="delta">Coming soon</div>
          </div>
          <div className="stat">
            <div className="top">
              <span className="label">Suspended</span>
              <span className="ic ic-rose">🛑</span>
            </div>
            <div className="value">—</div>
            <div className="delta">Coming soon</div>
          </div>
        </Reveal>
      </div>

      {/* Table */}
      <Reveal delay={3}>
        <div className="card">
          <div className="card-h">
            <span className="t">All organisations</span>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {loading ? "Loading…" : `Showing ${from}–${to} of ${total}`}
            </span>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Plan</th>
                  <th>Users</th>
                  <th>Landing pages</th>
                  <th>MRR</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {error ? (
                  <tr>
                    <td colSpan={8} className="muted">
                      {error}
                    </td>
                  </tr>
                ) : !loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="muted">
                      No organisations match this filter.
                    </td>
                  </tr>
                ) : (
                  rows.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link className="u" href={`/superadmin/organisation-detail/${o.id}`}>
                          <span className="av">{initials(o.name)}</span>
                          <span>
                            <span className="nm">{o.name}</span>
                            <br />
                            <span className="sm">
                              {o.city} · {o.adminEmail ?? "—"}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td>—</td>
                      <td>{o.userCount}</td>
                      <td>—</td>
                      <td>—</td>
                      <td>
                        <span className={`badge ${o.status === "active" ? "b-green" : "b-rose"}`}>
                          <span className="dot" style={{ background: "currentColor" }} />
                          {o.status === "active" ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td>{formatDate(o.createdAt)}</td>
                      <td>
                        <Link className="btn btn-ghost btn-sm" href={`/superadmin/organisation-detail/${o.id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 18px" }}>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <span className="muted" style={{ fontSize: 12.5, alignSelf: "center" }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          ) : null}
        </div>
      </Reveal>
    </>
  );
}
