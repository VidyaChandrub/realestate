"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { SwitchRow, TeamsSubNav, displayName, useOrgUsersList } from "@/components/org/team-fields";
import { ApiError, getTeam, updateTeam } from "@/lib/api";
import type { TeamDetail, TeamStatus } from "@/lib/types";

export default function EditTeamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const teamId = params?.id as string;

  const { users, loading: usersLoading, error: usersError } = useOrgUsersList();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [status, setStatus] = useState<TeamStatus>("active");
  const [leadId, setLeadId] = useState("");
  const [region, setRegion] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    getTeam(teamId)
      .then((t) => {
        setTeam(t);
        setName(t.name);
        setStatus(t.status);
        setLeadId(t.teamLead?.id ?? "");
        setRegion(t.region ?? "");
        setWorkingHours(t.workingHours ?? "");
        setDescription(t.description ?? "");
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

  async function handleSubmit() {
    if (!name.trim()) {
      setSubmitError("Team name is required.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateTeam(teamId, {
        name: name.trim(),
        status,
        teamLeadId: leadId || null,
        region: region.trim() || null,
        workingHours: workingHours.trim() || null,
        description: description.trim() || null,
      });
      router.push(`/org/teams/${teamId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save changes.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="team" size={14} /> Teams · Edit</div>
          <h1>Loading…</h1>
        </div>
      </div>
    );
  }

  if (loadError || !team) {
    return (
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="team" size={14} /> Teams · Edit</div>
          <h1>{loadError === "not_found" ? "Team not found" : "Couldn't load this team"}</h1>
          {loadError && loadError !== "not_found" ? (
            <div className="sub" style={{ color: "var(--rose)" }}>{loadError}</div>
          ) : null}
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href="/org/teams"><Icon name="chevron-left" size={14} /> Back to Teams</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <Link href={`/org/teams/${teamId}`} style={{ color: "inherit", textDecoration: "none" }}>
              <Icon name="team" size={14} /> {team.name}
            </Link> · Edit
          </div>
          <h1>Edit team</h1>
          <div className="sub">Update the team&apos;s basic details.</div>
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href={`/org/teams/${teamId}`}>✕ Cancel</Link>
          <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
            <Icon name="check" size={14} /> {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <TeamsSubNav active="teams" />

      <div className="cgrid">
        <div className="card" style={{ padding: 26 }}>
          <div className="sec">
            <div className="lbl">🏷️ Basics</div>
            <SwitchRow
              title="Active"
              description={status === "active" ? "Team is active." : "Team is inactive — hidden from active-team views."}
              checked={status === "active"}
              onToggle={(on) => setStatus(on ? "active" : "inactive")}
            />
            <div className="row2" style={{ marginTop: 14 }}>
              <div className="field">
                <label>Team name <span className="req">*</span></label>
                <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field">
                <label>Team lead</label>
                <select value={leadId} onChange={(e) => setLeadId(e.target.value)} disabled={usersLoading || !!usersError}>
                  <option value="">
                    {usersLoading ? "Loading…" : usersError ? "Couldn't load users" : "No lead assigned"}
                  </option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{displayName(u)}</option>
                  ))}
                </select>
                {usersError ? (
                  <div className="hint" style={{ color: "var(--rose)" }}>Couldn&apos;t load org users — {usersError}</div>
                ) : null}
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label>Region / branch</label>
                <input className="inp" value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
              <div className="field">
                <label>Working hours</label>
                <input className="inp" value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Description</label>
              <textarea className="inp" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card">
            <div className="card-h"><span className="t">This team</span></div>
            <div className="card-b" style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Members</span><b>{team.memberCount}</b></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Projects</span><b>{team.projectCount}</b></div>
            </div>
          </div>
          <div className="help">
            💡 Members and project access are managed from the team page, not here.
          </div>
          {submitError ? (
            <div className="help" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "var(--rose)" }}>
              {submitError}
            </div>
          ) : null}
          <button type="button" className="btn btn-primary btn-block" disabled={submitting} onClick={handleSubmit}>
            <Icon name="check" size={14} /> {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </>
  );
}
