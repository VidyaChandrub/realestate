"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import { Seg } from "@/components/superadmin/seg";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  RowActionMenu,
  RowActionItem,
  SwitchRow,
  TeamsSubNav,
  initialsFor,
  useOrgProjectsList,
} from "@/components/org/team-fields";
import { MODULE_DEFS, ROLE_BADGE_CLASS, TEAM_MEMBER_ROLE_LABEL } from "@/lib/teams";
import { ApiError, deleteTeam, getTeam, setTeamMembers, setTeamProjects, updateTeam } from "@/lib/api";
import type { TeamDetail } from "@/lib/types";

const TABS = ["Members", "Access & permissions", "Performance", "Activity"] as const;

const DEFAULT_MODULE_ACCESS: Record<string, boolean> = {
  leads: true,
  calling: true,
  whatsapp: true,
  landing: false,
  reports: true,
};

export default function TeamDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const teamId = params?.id as string;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tabIndex, setTabIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(() => {
    setLoading(true);
    getTeam(teamId)
      .then((t) => {
        setTeam(t);
        setLoadError(null);
      })
      .catch((err) => {
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? "not_found"
            : err instanceof Error
              ? err.message
              : "Failed to load team.",
        );
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  useEffect(() => {
    load();
  }, [load]);

  const { projects, loading: projectsLoading, error: projectsError } = useOrgProjectsList();

  // --- Access tab: module access + lead-routing are preview-only (no
  // backend). Project access is real.
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>(DEFAULT_MODULE_ACCESS);
  const [autoAssign, setAutoAssign] = useState(true);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [savingAccess, setSavingAccess] = useState(false);

  useEffect(() => {
    if (team) setSelectedProjectIds(new Set(team.projects.map((p) => p.id)));
  }, [team?.id]);

  function toggleProject(id: string) {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveProjectAccess() {
    if (!team) return;
    setSavingAccess(true);
    try {
      const rows = await setTeamProjects(team.id, [...selectedProjectIds]);
      setTeam((prev) => (prev ? { ...prev, projects: rows, projectCount: rows.length } : prev));
      notify("Project access saved.");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to save project access.");
    } finally {
      setSavingAccess(false);
    }
  }

  // --- Members tab: real remove ---
  const [memberBusy, setMemberBusy] = useState<string | null>(null);

  async function removeMember(userId: string) {
    if (!team) return;
    setMemberBusy(userId);
    try {
      const next = team.members.filter((m) => m.id !== userId).map((m) => ({ userId: m.id, role: m.role }));
      const rows = await setTeamMembers(team.id, next);
      setTeam((prev) => (prev ? { ...prev, members: rows, memberCount: rows.length } : prev));
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to remove member.");
    } finally {
      setMemberBusy(null);
    }
  }

  // --- Status toggle (Quick actions) — activating is harmless and applies
  // immediately; deactivating hides the team from active-team views, so it
  // confirms first, same as delete.
  const [statusBusy, setStatusBusy] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  async function applyStatus(next: "active" | "inactive") {
    if (!team) return;
    setStatusBusy(true);
    try {
      const updated = await updateTeam(team.id, { status: next });
      setTeam((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusBusy(false);
      setConfirmDeactivate(false);
    }
  }

  function toggleStatus() {
    if (!team) return;
    if (team.status === "active") {
      setConfirmDeactivate(true);
    } else {
      applyStatus("active");
    }
  }

  // --- Delete team ---
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!team) return;
    setDeleting(true);
    try {
      await deleteTeam(team.id);
      router.push("/org/teams");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to delete team.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loadError === "not_found") {
    return (
      <>
        <div className="page-head reveal in">
          <div>
            <div className="eyebrow"><Icon name="team" size={14} /> Teams · Detail</div>
            <h1>Team not found</h1>
            <div className="sub">This team doesn&apos;t exist — it may have been renamed or removed.</div>
          </div>
          <div className="actions">
            <Link className="btn btn-ghost" href="/org/teams"><Icon name="chevron-left" size={14} /> Back to Teams</Link>
          </div>
        </div>
      </>
    );
  }

  if (loading && !team) {
    return (
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="team" size={14} /> Teams · Detail</div>
          <h1>Loading…</h1>
        </div>
      </div>
    );
  }

  if (loadError || !team) {
    return (
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="team" size={14} /> Teams · Detail</div>
          <h1>Couldn&apos;t load this team</h1>
          <div className="sub" style={{ color: "var(--rose)" }}>{loadError}</div>
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href="/org/teams"><Icon name="chevron-left" size={14} /> Back</Link>
          <button type="button" className="btn btn-primary" onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <Link href="/org/teams" style={{ color: "inherit", textDecoration: "none" }}>
              <Icon name="team" size={14} /> Teams
            </Link> · Detail
          </div>
          <h1>
            {team.name}{" "}
            <span className={`badge ${team.status === "active" ? "b-green" : "b-gray"}`}>
              <span className="dot" style={{ background: team.status === "active" ? "var(--green)" : "var(--faint)" }} />
              {team.status === "active" ? "Active" : "Inactive"}
            </span>
          </h1>
          <div className="sub">
            Team lead: {team.teamLead ? team.teamLead.name : "Not assigned"}
            {team.region ? ` · Region: ${team.region}` : ""} · Created{" "}
            {new Date(team.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} ·{" "}
            {team.memberPreviews.length} members
          </div>
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href="/org/teams"><Icon name="chevron-left" size={14} /> Back</Link>
          <Link className="btn btn-ghost" href={`/org/teams/onboard?team=${team.id}`}><Icon name="plus" size={15} /> Add member</Link>
          <Link className="btn btn-primary" href={`/org/teams/${team.id}/edit`}>
            <Icon name="edit" size={14} /> Edit team
          </Link>
        </div>
      </div>

      <TeamsSubNav active="teams" />

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top"><span className="label">Members</span><span className="ic ic-indigo"><Icon name="users" size={17} /></span></div>
            <div className="value"><CountUp value={team.memberCount} /></div>
            <div className="delta">on this team</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top"><span className="label">Active leads</span><span className="ic ic-amber"><Icon name="target" size={17} /></span></div>
            <div className="value"><CountUp value={team.activeLeads} /></div>
            <div className="delta">assigned to this team</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top"><span className="label">Conversion</span><span className="ic ic-violet"><Icon name="sparkles" size={17} /></span></div>
            <div className="value"><CountUp value={team.conversionPct} suf="%" /></div>
            <div className="delta">won ÷ decided</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top"><span className="label">Projects</span><span className="ic ic-sky"><Icon name="building" size={17} /></span></div>
            <div className="value"><CountUp value={team.projectCount} /></div>
            <div className="delta">assigned to this team</div>
          </div>
        </Reveal>
      </div>

      <div className="cgrid">
        <Reveal delay={2}>
          <div className="card"><div className="card-b">
            <div style={{ marginBottom: 18 }}>
              <Seg options={[...TABS]} value={tabIndex} onChange={setTabIndex} />
            </div>

            {tabIndex === 0 ? (
              <div>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr><th>Member</th><th>Role</th><th>Leads</th><th>Conv.</th><th>Joined</th><th></th></tr>
                    </thead>
                    <tbody>
                      {team.members.length === 0 ? (
                        <tr><td colSpan={6} className="muted">No members yet.</td></tr>
                      ) : (
                        team.members.map((m) => (
                          <tr key={m.id}>
                            <td>
                              <div className="u">
                                <span className="av">{initialsFor(m.name)}</span>
                                <span>
                                  <span className="nm">{m.name}</span>
                                  <br />
                                  <span className="sm muted">{m.email}</span>
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${ROLE_BADGE_CLASS[m.role]}`}>
                                {TEAM_MEMBER_ROLE_LABEL[m.role]}
                              </span>
                            </td>
                            <td>{m.activeLeads}</td>
                            <td>{m.conversionPct}%</td>
                            <td className="muted">
                              {new Date(m.joinedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <RowActionMenu label={memberBusy === m.id ? "…" : "⋯"} disabled={memberBusy === m.id}>
                                <RowActionItem onClick={() => router.push(`/org/leads?assignedTo=${m.id}`)}>
                                  View leads
                                </RowActionItem>
                                <RowActionItem danger icon={<Icon name="trash" size={14} />} onClick={() => removeMember(m.id)}>
                                  Remove from team
                                </RowActionItem>
                              </RowActionMenu>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 14 }}>
                  <Link className="btn btn-soft btn-sm" href={`/org/teams/onboard?team=${team.id}`}>＋ Add / onboard member</Link>
                </div>
              </div>
            ) : null}

            {tabIndex === 1 ? (
              <div>
                <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>
                  Module access
                </div>
                <div className="hint" style={{ marginBottom: 10 }}>
                  Preview only — module access isn&apos;t saved yet, these toggles have no effect.
                </div>
                {MODULE_DEFS.map((mod) => (
                  <SwitchRow
                    key={mod.key}
                    title={mod.label}
                    description={mod.description}
                    checked={!!moduleAccess[mod.key]}
                    onToggle={(next) => setModuleAccess((prev) => ({ ...prev, [mod.key]: next }))}
                  />
                ))}

                <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", margin: "18px 0 6px" }}>
                  Project access
                </div>
                {projectsError ? (
                  <div className="hint" style={{ color: "var(--rose)" }}>
                    Couldn&apos;t load projects — {projectsError}
                  </div>
                ) : projectsLoading ? (
                  <div className="hint">Loading projects…</div>
                ) : projects.length === 0 ? (
                  <div className="hint">No projects yet — create one in Projects first.</div>
                ) : (
                  projects.map((p) => (
                    <SwitchRow
                      key={p.id}
                      title={p.name}
                      checked={selectedProjectIds.has(p.id)}
                      onToggle={() => toggleProject(p.id)}
                    />
                  ))
                )}

                <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", margin: "18px 0 6px" }}>
                  Lead routing
                </div>
                <div className="hint" style={{ marginBottom: 10 }}>
                  Preview only — there&apos;s no lead-routing backend yet, this toggle has no effect.
                </div>
                <SwitchRow
                  title="Auto-assign new leads (round-robin)"
                  description="Distribute leads for granted projects evenly across members"
                  checked={autoAssign}
                  onToggle={setAutoAssign}
                />

                <div style={{ marginTop: 14 }}>
                  <button type="button" className="btn btn-primary btn-sm" disabled={savingAccess} onClick={saveProjectAccess}>
                    {savingAccess ? "Saving…" : "Save project access"}
                  </button>
                </div>
              </div>
            ) : null}

            {tabIndex === 2 ? (
              <div className="hint">
                Performance tracking isn&apos;t available yet — there&apos;s no link between teams and leads/site
                visits in the backend.
              </div>
            ) : null}

            {tabIndex === 3 ? (
              <div className="hint">No activity feed yet.</div>
            ) : null}
          </div></div>
        </Reveal>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Team lead</span></div>
              <div className="card-b" style={{ textAlign: "center" }}>
                {team.teamLead ? (
                  <>
                    <span className="av" style={{ width: 56, height: 56, fontSize: 18, borderRadius: 16, margin: "0 auto 8px", display: "inline-flex" }}>
                      {initialsFor(team.teamLead.name)}
                    </span>
                    <div style={{ fontWeight: 700 }}>{team.teamLead.name}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>{team.teamLead.email}</div>
                  </>
                ) : (
                  <>
                    <div className="muted" style={{ marginBottom: 10 }}>No lead assigned</div>
                    <Link className="btn btn-ghost btn-sm" href={`/org/teams/${team.id}/edit`}>Assign a lead</Link>
                  </>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal delay={4}>
            <div className="card">
              <div className="card-h"><span className="t">Quick actions</span></div>
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <Link className="btn btn-primary btn-block" href={`/org/teams/onboard?team=${team.id}`}>
                  <Icon name="users" size={14} /> Onboard member
                </Link>
                <Link className="btn btn-soft btn-block" href={`/org/team-chat?team=${team.id}`}>
                  <Icon name="mail" size={14} /> Open team chat
                </Link>
                <button type="button" className="btn btn-ghost btn-block" onClick={() => notify("Exporting reports isn't available yet.")}>
                  <Icon name="download" size={14} /> Export report
                </button>
                <button type="button" className="btn btn-ghost btn-block" disabled={statusBusy} onClick={toggleStatus}>
                  <Icon name={team.status === "active" ? "alert" : "check"} size={14} />{" "}
                  {statusBusy ? "Updating…" : team.status === "active" ? "Deactivate team" : "Activate team"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  style={{ color: "var(--rose)" }}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Icon name="trash" size={14} /> Delete team
                </button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={5}>
            <div className="card">
              <div className="card-h"><span className="t">Info</span></div>
              <div className="card-b" style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 9 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Region</span><b>{team.region ?? "—"}</b></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Created</span>
                  <b>{new Date(team.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Working hours</span><b>{team.workingHours ?? "—"}</b></div>
                {team.description ? (
                  <div>
                    <span className="muted">Description</span>
                    <div style={{ marginTop: 4 }}>{team.description}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <ConfirmModal
        open={confirmDeactivate}
        title={`Deactivate "${team.name}"?`}
        message="This hides the team from active-team views. Members and project assignments stay intact and you can reactivate it any time."
        confirmLabel="Deactivate team"
        destructive
        busy={statusBusy}
        onConfirm={() => applyStatus("inactive")}
        onClose={() => !statusBusy && setConfirmDeactivate(false)}
      />

      <ConfirmModal
        open={confirmDelete}
        title={`Delete "${team.name}"?`}
        message="This permanently removes the team, its member list and project assignments. This can't be undone."
        confirmLabel="Delete team"
        destructive
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
      />

      {toast ? (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}>
          <div className="card" style={{ padding: "12px 16px", boxShadow: "var(--sh-lg)" }}>{toast}</div>
        </div>
      ) : null}
    </>
  );
}
