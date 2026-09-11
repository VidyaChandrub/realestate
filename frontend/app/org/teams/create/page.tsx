"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import {
  SwitchRow,
  TeamsSubNav,
  ToggleChips,
  displayName,
  useOrgProjectsList,
  useOrgUsersList,
} from "@/components/org/team-fields";
import { MODULE_DEFS } from "@/lib/teams";
import { createTeam, setTeamMembers, setTeamProjects } from "@/lib/api";

export default function CreateTeamPage() {
  const router = useRouter();
  const { users, loading: usersLoading, error: usersError } = useOrgUsersList();
  const { projects, loading: projectsLoading, error: projectsError } = useOrgProjectsList();

  const [name, setName] = useState("");
  const [leadId, setLeadId] = useState("");
  const [region, setRegion] = useState("");
  const [workingHours, setWorkingHours] = useState("10:00 AM – 7:00 PM");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  // Preview only — TeamModuleAccess has no backend yet, so these toggles
  // aren't sent anywhere on submit.
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({
    leads: true,
    calling: true,
    whatsapp: true,
    landing: false,
    reports: true,
  });
  const [projectIds, setProjectIds] = useState<Set<string>>(new Set());
  const [autoAssign, setAutoAssign] = useState(true);
  const [createChatChannel, setCreateChatChannel] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const userOptions = useMemo(
    () => users.map((u) => ({ id: u.id, label: displayName(u) })),
    [users],
  );
  const projectOptions = useMemo(
    () => projects.map((p) => ({ id: p.id, label: p.name })),
    [projects],
  );

  const modulesEnabled = Object.values(moduleAccess).filter(Boolean).length;

  function toggleMember(id: string) {
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleProject(id: string) {
    setProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setSubmitError("Team name is required.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const team = await createTeam({
        name: name.trim(),
        teamLeadId: leadId || undefined,
        region: region.trim() || undefined,
        workingHours: workingHours.trim() || undefined,
        description: description.trim() || undefined,
      });

      // Members added here have no per-member role picker (that's the
      // onboarding flow's job) — default everyone to Sales Agent; roles can
      // be changed individually from the team detail page later.
      if (memberIds.size > 0) {
        await setTeamMembers(
          team.id,
          [...memberIds].map((userId) => ({ userId, role: "sales_agent" as const })),
        );
      }
      if (projectIds.size > 0) {
        await setTeamProjects(team.id, [...projectIds]);
      }

      router.push(`/org/teams/${team.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create team.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <Link href="/org/teams" style={{ color: "inherit", textDecoration: "none" }}>
              <Icon name="team" size={14} /> Teams
            </Link> · Create
          </div>
          <h1>Create a team</h1>
          <div className="sub">
            Name the team, set its lead, choose members, and grant project access.
          </div>
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href="/org/teams">✕ Cancel</Link>
          <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
            <Icon name="check" size={14} /> {submitting ? "Creating…" : "Create team"}
          </button>
        </div>
      </div>

      <TeamsSubNav active="teams" />

      <div className="cgrid">
        <div className="card" style={{ padding: 26 }}>
          <div className="sec">
            <div className="lbl">🏷️ Basics</div>
            <div className="row2">
              <div className="field">
                <label>Team name <span className="req">*</span></label>
                <input className="inp" placeholder="e.g. Sales Team West" value={name} onChange={(e) => setName(e.target.value)} />
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
                <input className="inp" placeholder="Ahmedabad West" value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
              <div className="field">
                <label>Working hours</label>
                <input className="inp" value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Description</label>
              <textarea className="inp" rows={2} placeholder="What this team handles…" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="sec">
            <div className="lbl">🧑‍💼 Members</div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Add members</label>
              <ToggleChips
                options={userOptions}
                selected={memberIds}
                onToggle={toggleMember}
                loading={usersLoading}
                error={usersError}
                loadingLabel="Loading org users…"
                emptyLabel="No org users yet — add users in Users first."
              />
              <div className="hint">
                Added as Sales Agent by default — change a member&apos;s role from the team page, or onboard
                someone directly with a specific role from the Onboarding tab.
              </div>
            </div>
          </div>

          <div className="sec">
            <div className="lbl">🔐 Module access</div>
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
          </div>

          <div className="sec">
            <div className="lbl">🏗️ Project access</div>
            <div className="field" style={{ marginBottom: 0 }}>
              <ToggleChips
                options={projectOptions}
                selected={projectIds}
                onToggle={toggleProject}
                loading={projectsLoading}
                error={projectsError}
                loadingLabel="Loading projects…"
                emptyLabel="No projects yet — create one in Projects first."
              />
            </div>
          </div>

          <div className="sec">
            <div className="lbl">🔄 Lead routing</div>
            <div className="hint" style={{ marginBottom: 10 }}>
              Preview only — there&apos;s no lead-routing or Team Chat backend yet, these toggles have no effect.
            </div>
            <SwitchRow
              title="Auto-assign new leads"
              description="Round-robin across members"
              checked={autoAssign}
              onToggle={setAutoAssign}
            />
            <SwitchRow
              title="Create internal chat channel"
              description={`Opens #${slugify(name) || "team-name"} in Team Chat`}
              checked={createChatChannel}
              onToggle={setCreateChatChannel}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card">
            <div className="card-h"><span className="t">Summary</span></div>
            <div className="card-b" style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Members</span><b>{memberIds.size} selected</b></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Modules (preview)</span><b>{modulesEnabled} enabled</b></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Projects</span><b>{projectIds.size}</b></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Chat channel (preview)</span><b>{createChatChannel ? "Yes" : "No"}</b></div>
            </div>
          </div>
          {submitError ? (
            <div className="help" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "var(--rose)" }}>
              {submitError}
            </div>
          ) : null}
          <button type="button" className="btn btn-primary btn-block" disabled={submitting} onClick={handleSubmit}>
            <Icon name="check" size={14} /> {submitting ? "Creating…" : "Create team"}
          </button>
        </div>
      </div>
    </>
  );
}

function slugify(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
