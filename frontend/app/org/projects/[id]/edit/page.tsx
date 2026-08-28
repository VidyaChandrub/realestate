"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { AmenityChips } from "@/components/org/amenity-chips";
import type {
  Amenity,
  OrgUser,
  OrgUsersListResponse,
  ProjectDetail,
  ProjectStatus,
  UpdateProjectInput,
} from "@/lib/types";

function userLabel(u: OrgUser): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
}

function numOrUndef(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function toField(value: number | null): string {
  return value == null ? "" : String(value);
}

export default function OrgProjectEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { accessToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [projectName, setProjectName] = useState("");

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [reraId, setReraId] = useState("");
  const [possession, setPossession] = useState("");
  const [managerId, setManagerId] = useState("");
  const [managers, setManagers] = useState<OrgUser[]>([]);
  // The project's existing manager, kept so the option still shows even if
  // they've since dropped off the active-managers list (role change, >100).
  const [currentManager, setCurrentManager] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [baseRate, setBaseRate] = useState("");
  const [landArea, setLandArea] = useState("");
  const [towerCount, setTowerCount] = useState("");
  const [floorsDescription, setFloorsDescription] = useState("");
  const [amenities, setAmenities] = useState<Amenity[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!accessToken || !id) return;
    apiFetch<ProjectDetail>(`/org/projects/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((p) => {
        setProjectName(p.name);
        setName(p.name);
        setLocation(p.location ?? "");
        setReraId(p.reraId ?? "");
        setPossession(p.possession ?? "");
        setManagerId(p.managerId ?? "");
        setCurrentManager(
          p.manager ? { id: p.manager.id, name: p.manager.name } : null,
        );
        setStatus(p.status);
        setPriceMin(toField(p.priceMin));
        setPriceMax(toField(p.priceMax));
        setBaseRate(toField(p.baseRate));
        setLandArea(toField(p.landArea));
        setTowerCount(toField(p.towerCount));
        setFloorsDescription(p.floorsDescription ?? "");
        setAmenities(p.amenities);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<OrgUsersListResponse>("/org/users?role=manager&limit=100&status=active", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => setManagers(res.data))
      .catch(() => setManagers([]));
  }, [accessToken]);

  async function save() {
    if (!accessToken) return;
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: UpdateProjectInput = {
        name: name.trim(),
        location: location.trim() || undefined,
        reraId: reraId.trim() || undefined,
        possession: possession.trim() || undefined,
        managerId: managerId || null,
        status,
        priceMin: numOrUndef(priceMin),
        priceMax: numOrUndef(priceMax),
        baseRate: numOrUndef(baseRate),
        landArea: numOrUndef(landArea),
        towerCount: numOrUndef(towerCount),
        floorsDescription: floorsDescription.trim() || undefined,
        amenities,
      };
      await apiFetch(`/org/projects/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      router.push(`/org/projects/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
      setSaving(false);
    }
  }

  async function remove() {
    if (!accessToken) return;
    setDeleting(true);
    try {
      await apiFetch(`/org/projects/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      router.push("/org/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project.");
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (notFound) {
    return (
      <div className="card">
        <div className="card-b">
          <p className="muted">Project not found.</p>
          <Link href="/org/projects" className="btn btn-ghost btn-sm">
            ← Back to projects
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-b">
          <p className="muted">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">Projects</div>
          <h1>Edit {projectName}</h1>
          <div className="sub">Update the project profile and pricing.</div>
        </div>
        <div className="actions">
          <Link href={`/org/projects/${id}`} className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </div>

      <Reveal delay={1}>
        <div className="card">
          <div className="card-h">
            <span className="t">Project details</span>
          </div>
          <div className="card-b">
            {error ? <div className="form-alert">{error}</div> : null}

            <div className="row2">
              <div className="field">
                <label>Project name *</label>
                <input
                  className="inp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Location</label>
                <input
                  className="inp"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="row2">
              <div className="field">
                <label>RERA ID</label>
                <input
                  className="inp mono"
                  value={reraId}
                  onChange={(e) => setReraId(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Possession</label>
                <input
                  className="inp"
                  placeholder="e.g. Dec 2027"
                  value={possession}
                  onChange={(e) => setPossession(e.target.value)}
                />
              </div>
            </div>

            <div className="row2">
              <div className="field">
                <label>Project manager</label>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {currentManager &&
                  !managers.some((u) => u.id === currentManager.id) ? (
                    <option value={currentManager.id}>
                      {currentManager.name} (current)
                    </option>
                  ) : null}
                  {managers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {userLabel(u)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="row2">
              <div className="field">
                <label>Price from (₹)</label>
                <input
                  className="inp"
                  type="number"
                  min={0}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Price to (₹)</label>
                <input
                  className="inp"
                  type="number"
                  min={0}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </div>
            </div>

            <div className="row2">
              <div className="field">
                <label>Base rate (₹/sqft)</label>
                <input
                  className="inp"
                  type="number"
                  min={0}
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Land area (acres)</label>
                <input
                  className="inp"
                  type="number"
                  min={0}
                  step="0.01"
                  value={landArea}
                  onChange={(e) => setLandArea(e.target.value)}
                />
              </div>
            </div>

            <div className="row2">
              <div className="field">
                <label>Tower count</label>
                <input
                  className="inp"
                  type="number"
                  min={0}
                  value={towerCount}
                  onChange={(e) => setTowerCount(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Floors</label>
                <input
                  className="inp"
                  placeholder="e.g. G+22"
                  value={floorsDescription}
                  onChange={(e) => setFloorsDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>Amenities</label>
              <AmenityChips
                value={amenities}
                onChange={setAmenities}
                projectId={id}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 20,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                style={{ color: "var(--rose)" }}
                onClick={() => setDeleteOpen(true)}
                disabled={saving || deleting}
              >
                Delete project
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <Link
                  href={`/org/projects/${id}`}
                  className="btn btn-ghost"
                >
                  Cancel
                </Link>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {deleteOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 400,
            padding: 20,
          }}
          onClick={() => {
            if (!deleting) setDeleteOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 28,
              width: 420,
              maxWidth: "100%",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800 }}>
              Delete project?
            </h2>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-2)" }}>
              <strong>&quot;{projectName}&quot;</strong> and all its unit types
              and units will be permanently deleted. This cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 22,
              }}
            >
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => void remove()}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
