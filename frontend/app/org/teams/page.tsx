"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import { AvatarStack, TeamsSubNav } from "@/components/org/team-fields";
import { listTeams } from "@/lib/api";
import type { Team } from "@/lib/types";

export default function OrgTeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    listTeams()
      .then((res) => {
        if (mounted) {
          setTeams(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load teams.");
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const totalMembers = teams.reduce((sum, t) => sum + t.memberCount, 0);
  const totalActiveLeads = teams.reduce((sum, t) => sum + t.activeLeads, 0);
  const avgConversion =
    teams.length === 0 ? 0 : Math.round(teams.reduce((sum, t) => sum + t.conversionPct, 0) / teams.length);

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <Icon name="team" size={14} /> Team
          </div>
          <h1>Teams</h1>
          <div className="sub">
            Group members into teams, assign a lead, and grant them project access.
          </div>
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href="/org/teams/onboard">
            <Icon name="users" size={15} /> Onboard member
          </Link>
          <Link className="btn btn-primary" href="/org/teams/create">
            <Icon name="plus" size={15} /> Create team
          </Link>
        </div>
      </div>

      <TeamsSubNav active="teams" />

      {error ? (
        <div className="help" style={{ marginBottom: 20, color: "var(--rose)", borderColor: "#fecaca" }}>
          Couldn&apos;t load teams — {error}
        </div>
      ) : null}

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top">
              <span className="label">Teams</span>
              <span className="ic ic-indigo"><Icon name="team" size={17} /></span>
            </div>
            <div className="value">{loading ? "—" : <CountUp value={teams.length} />}</div>
            <div className="delta">Across the organisation</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top">
              <span className="label">Members</span>
              <span className="ic ic-sky"><Icon name="users" size={17} /></span>
            </div>
            <div className="value">{loading ? "—" : <CountUp value={totalMembers} />}</div>
            <div className="delta">assigned to a team</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top">
              <span className="label">Leads assigned</span>
              <span className="ic ic-amber"><Icon name="target" size={17} /></span>
            </div>
            <div className="value">{loading ? "—" : <CountUp value={totalActiveLeads} />}</div>
            <div className="delta">across teams</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top">
              <span className="label">Avg conversion</span>
              <span className="ic ic-violet"><Icon name="sparkles" size={17} /></span>
            </div>
            <div className="value">{loading ? "—" : <CountUp value={avgConversion} suf="%" />}</div>
            <div className="delta">won ÷ decided, per team</div>
          </div>
        </Reveal>
      </div>

      <div className="grid g3" style={{ marginBottom: 20 }}>
        {loading ? (
          <div className="muted">Loading teams…</div>
        ) : (
          teams.map((team, i) => (
            <Reveal delay={i + 1} key={team.id}>
              <div
                className="card hover"
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/org/teams/${team.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/org/teams/${team.id}`);
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="card-h">
                  <span className="t">{team.name}</span>
                  <span className={`badge ${team.status === "active" ? "b-green" : "b-gray"}`}>
                    <span className="dot" style={{ background: team.status === "active" ? "var(--green)" : "var(--faint)" }} />
                    {team.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <AvatarStack people={team.memberPreviews} />
                    <span className="muted" style={{ fontSize: 13 }}>{team.memberPreviews.length} members</span>
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 80 }}>
                      <div style={{ fontSize: 19, fontWeight: 800 }}>{team.activeLeads}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>Active leads</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 80 }}>
                      <div style={{ fontSize: 19, fontWeight: 800 }}>{team.projectCount}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>Projects</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                    <Link
                      className="btn btn-soft btn-sm"
                      href={`/org/teams/${team.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open team
                    </Link>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/org/teams/onboard?team=${team.id}`);
                      }}
                    >
                      Add member
                    </button>
                  </div>
                </div>
              </div>
            </Reveal>
          ))
        )}
        <Reveal delay={teams.length + 1}>
          <Link
            href="/org/teams/create"
            className="card"
            style={{
              border: "2px dashed var(--line-2)",
              boxShadow: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 220,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ textAlign: "center", color: "var(--muted)" }}>
              <div style={{ fontSize: 34 }}>＋</div>
              <b>Create a new team</b>
              <div style={{ fontSize: 12.5 }}>Group members &amp; set access</div>
            </div>
          </Link>
        </Reveal>
      </div>

      {!loading && teams.length > 0 ? (
        <Reveal delay={teams.length + 2}>
          <div className="card">
            <div className="card-h">
              <span className="t">All teams</span>
              <span className="x">{teams.length} teams</span>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Status</th>
                    <th>Lead</th>
                    <th>Region</th>
                    <th>Members</th>
                    <th>Active leads</th>
                    <th>Conversion</th>
                    <th>Projects</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr key={team.id}>
                      <td>
                        <Link href={`/org/teams/${team.id}`} style={{ fontWeight: 600, color: "var(--brand)" }}>
                          {team.name}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${team.status === "active" ? "b-green" : "b-gray"}`}>
                          {team.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{team.teamLead ? team.teamLead.name : <span className="muted">—</span>}</td>
                      <td>{team.region ?? <span className="muted">—</span>}</td>
                      <td>{team.memberCount}</td>
                      <td>{team.activeLeads}</td>
                      <td>
                        <span className={`badge ${team.conversionPct >= 20 ? "b-green" : "b-amber"}`}>
                          {team.conversionPct}%
                        </span>
                      </td>
                      <td>{team.projectCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      ) : null}

      {!loading && teams.length === 0 && !error ? (
        <Reveal delay={1}>
          <div className="card">
            <div className="card-b" style={{ textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontSize: 34, marginBottom: 10 }}><Icon name="team" size={34} /></div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No teams yet</div>
              <p className="muted">Create your first team to group members and assign projects.</p>
              <Link className="btn btn-primary" href="/org/teams/create" style={{ marginTop: 14, display: "inline-flex" }}>
                <Icon name="plus" size={14} /> Create team
              </Link>
            </div>
          </div>
        </Reveal>
      ) : null}
    </>
  );
}
