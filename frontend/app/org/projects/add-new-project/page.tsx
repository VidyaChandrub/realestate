"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type {
  CreateProjectInput,
  CreateUnitTypeInput,
  OrgUser,
  OrgUsersListResponse,
  Project,
  ProjectStatus,
} from "@/lib/types";

function userLabel(u: OrgUser): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
}

interface UnitTypeDraft {
  key: number;
  name: string;
  carpetSqft: string;
  builtupSqft: string;
  price: string;
  totalUnits: string;
}

const makeUnitType = (): UnitTypeDraft => ({
  key: Date.now() + Math.random(),
  name: "",
  carpetSqft: "",
  builtupSqft: "",
  price: "",
  totalUnits: "",
});

const AMENITY_OPTIONS = [
  "Swimming pool",
  "Clubhouse & gym",
  "Landscaped garden",
  "2-level parking",
  "Kids play area",
  "24×7 security",
  "Power backup",
  "Sports court",
  "Yoga deck",
];

/** "" → undefined; otherwise a finite number (NaN guarded by the caller). */
function numOrUndef(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="muted"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 11.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        margin: "18px 0 12px",
        color: "var(--muted, #64748b)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: "linear-gradient(135deg, #6d28d9, #db2777)",
          boxShadow: "0 0 0 4px rgba(109, 40, 217, 0.12)",
        }}
      />
      {children}
    </div>
  );
}

export default function AddNewProjectPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [reraId, setReraId] = useState("");
  const [possession, setPossession] = useState("");
  const [managerId, setManagerId] = useState("");
  const [managers, setManagers] = useState<OrgUser[]>([]);
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [baseRate, setBaseRate] = useState("");
  const [landArea, setLandArea] = useState("");
  const [towerCount, setTowerCount] = useState("");
  const [floorsDescription, setFloorsDescription] = useState("");

  const [amenities, setAmenities] = useState<string[]>([]);
  const [amenityDraft, setAmenityDraft] = useState("");
  const [unitTypes, setUnitTypes] = useState<UnitTypeDraft[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Manager dropdown is populated from the org's Users list, filtered to the
  // `manager` role — the same endpoint Organisation > Users already uses.
  useEffect(() => {
    if (!accessToken) return;
    apiFetch<OrgUsersListResponse>("/org/users?role=manager&limit=100&status=active", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => setManagers(res.data))
      .catch(() => setManagers([]));
  }, [accessToken]);

  const unitRollup = useMemo(() => {
    const total = unitTypes.reduce(
      (s, u) => s + (parseInt(u.totalUnits, 10) || 0),
      0,
    );
    return { total };
  }, [unitTypes]);

  function addAmenity(value: string) {
    const v = value.trim();
    if (!v) return;
    setAmenities((prev) =>
      prev.some((a) => a.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v],
    );
    setAmenityDraft("");
  }

  function updateUnitType(key: number, patch: Partial<UnitTypeDraft>) {
    setUnitTypes((prev) =>
      prev.map((u) => (u.key === key ? { ...u, ...patch } : u)),
    );
  }

  async function submit() {
    if (!accessToken) return;
    if (!name.trim()) {
      setError("Give the project a name.");
      return;
    }
    for (const u of unitTypes) {
      if (!u.name.trim()) {
        setError("Every unit type needs a name (or remove the empty row).");
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const body: CreateProjectInput = {
        name: name.trim(),
        location: location.trim() || undefined,
        reraId: reraId.trim() || undefined,
        possession: possession.trim() || undefined,
        managerId: managerId || undefined,
        status,
        priceMin: numOrUndef(priceMin),
        priceMax: numOrUndef(priceMax),
        baseRate: numOrUndef(baseRate),
        landArea: numOrUndef(landArea),
        towerCount: numOrUndef(towerCount),
        floorsDescription: floorsDescription.trim() || undefined,
        amenities: amenities.map((a) => ({ name: a, iconUrl: null })),
      };

      const project = await apiFetch<Project>("/org/projects", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });

      // Unit types are created one by one against the nested endpoint —
      // matches the backend contract (project first, then its types).
      for (const u of unitTypes) {
        const utBody: CreateUnitTypeInput = {
          name: u.name.trim(),
          carpetSqft: numOrUndef(u.carpetSqft),
          builtupSqft: numOrUndef(u.builtupSqft),
          price: numOrUndef(u.price),
          totalUnits: numOrUndef(u.totalUnits),
        };
        await apiFetch(`/org/projects/${project.id}/unit-types`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(utBody),
        });
      }

      router.push(`/org/projects/${project.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create the project.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          borderRadius: 22,
          overflow: "hidden",
          border: "1px solid rgba(148, 163, 184, 0.22)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            padding: "22px 26px 18px",
            background:
              "linear-gradient(135deg, #1f2937 0%, #3b0a5c 35%, #8b1b5d 70%, #f59e0b 100%)",
            color: "#fff",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              ✦ New project
            </div>
            <h1
              style={{
                margin: "12px 0 0",
                fontSize: 28,
                lineHeight: 1.2,
                color: "#fff",
              }}
            >
              Create a project
            </h1>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>
              Property details, unit mix and pricing. Media and amenity icons
              come later.
            </div>
          </div>
        </div>

        <div
          style={{
            background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
            padding: 22,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.8fr) minmax(280px, 0.95fr)",
              gap: 20,
              alignItems: "start",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <SectionLabel>Basics</SectionLabel>
              <div className="grid g3">
                <div className="field">
                  <label>Project name *</label>
                  <input
                    className="inp"
                    placeholder="e.g. Riverside Heights"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Location</label>
                  <input
                    className="inp"
                    placeholder="e.g. SG Highway, Ahmedabad"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>RERA ID</label>
                  <input
                    className="inp mono"
                    placeholder="PR/GJ/AHM/2026/00842"
                    value={reraId}
                    onChange={(e) => setReraId(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid g3" style={{ marginTop: 12 }}>
                <div className="field">
                  <label>Possession</label>
                  <input
                    className="inp"
                    placeholder="e.g. Dec 2027"
                    value={possession}
                    onChange={(e) => setPossession(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Project manager</label>
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                  >
                    <option value="">Unassigned</option>
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
                    onChange={(e) =>
                      setStatus(e.target.value as ProjectStatus)
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <SectionLabel>Pricing &amp; scale</SectionLabel>
              <div className="grid g4">
                <div className="field">
                  <label>Price from (₹)</label>
                  <input
                    className="inp"
                    type="number"
                    min={0}
                    placeholder="6800000"
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
                    placeholder="24000000"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Base rate (₹/sqft)</label>
                  <input
                    className="inp"
                    type="number"
                    min={0}
                    placeholder="5800"
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
                    placeholder="6.2"
                    value={landArea}
                    onChange={(e) => setLandArea(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid g3" style={{ marginTop: 12 }}>
                <div className="field">
                  <label>Tower count</label>
                  <input
                    className="inp"
                    type="number"
                    min={0}
                    placeholder="4"
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

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <SectionLabel>Unit types</SectionLabel>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setUnitTypes((prev) => [...prev, makeUnitType()])
                  }
                  style={{ borderRadius: 10, padding: "8px 12px", minHeight: 0 }}
                >
                  ＋ Add unit type
                </button>
              </div>

              {unitTypes.length === 0 ? (
                <div
                  style={{
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: 16,
                    padding: 16,
                    background: "rgba(15, 23, 42, 0.02)",
                  }}
                >
                  <div className="muted" style={{ fontSize: 13 }}>
                    No unit types yet — add one per configuration (e.g. 2 BHK —
                    Type A). You can also add them later from the project.
                  </div>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {unitTypes.map((u, index) => (
                    <div
                      key={u.key}
                      style={{
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        borderRadius: 16,
                        padding: 14,
                        background: "rgba(15, 23, 42, 0.02)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 12,
                        }}
                      >
                        <strong style={{ fontSize: 14 }}>
                          {u.name.trim() || `Unit type ${index + 1}`}
                        </strong>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() =>
                            setUnitTypes((prev) =>
                              prev.filter((x) => x.key !== u.key),
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid g3">
                        <div className="field">
                          <label>Name</label>
                          <input
                            className="inp"
                            placeholder="2 BHK — Type A"
                            value={u.name}
                            onChange={(e) =>
                              updateUnitType(u.key, { name: e.target.value })
                            }
                          />
                        </div>
                        <div className="field">
                          <label>Carpet (sqft)</label>
                          <input
                            className="inp"
                            type="number"
                            min={0}
                            placeholder="742"
                            value={u.carpetSqft}
                            onChange={(e) =>
                              updateUnitType(u.key, {
                                carpetSqft: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="field">
                          <label>Built-up (sqft)</label>
                          <input
                            className="inp"
                            type="number"
                            min={0}
                            placeholder="1180"
                            value={u.builtupSqft}
                            onChange={(e) =>
                              updateUnitType(u.key, {
                                builtupSqft: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid g3" style={{ marginTop: 12 }}>
                        <div className="field">
                          <label>Price (₹)</label>
                          <input
                            className="inp"
                            type="number"
                            min={0}
                            placeholder="6800000"
                            value={u.price}
                            onChange={(e) =>
                              updateUnitType(u.key, { price: e.target.value })
                            }
                          />
                        </div>
                        <div className="field">
                          <label>Total units</label>
                          <input
                            className="inp"
                            type="number"
                            min={0}
                            placeholder="96"
                            value={u.totalUnits}
                            onChange={(e) =>
                              updateUnitType(u.key, {
                                totalUnits: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: "1px dashed rgba(148, 163, 184, 0.22)",
                        }}
                      >
                        <div
                          className="muted"
                          style={{ fontSize: 12, display: "flex", gap: 8 }}
                        >
                          <span>📐 Floor plan</span>
                          <span>🎬 Video</span>
                          <span>📄 Brochure</span>
                          <span className="badge b-gray">Coming soon</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <SectionLabel>Amenities</SectionLabel>
              {amenities.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {amenities.map((a) => (
                    <span
                      key={a}
                      className="chip"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {a}
                      <button
                        type="button"
                        aria-label={`Remove ${a}`}
                        onClick={() =>
                          setAmenities((prev) => prev.filter((x) => x !== a))
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "inherit",
                          cursor: "pointer",
                          fontWeight: 700,
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="muted" style={{ fontSize: 13 }}>
                  No amenities yet — pick from the quick list or add your own.
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input
                  className="inp"
                  placeholder="Custom amenity — e.g. Tennis court"
                  value={amenityDraft}
                  onChange={(e) => setAmenityDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAmenity(amenityDraft);
                    }
                  }}
                />
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => addAmenity(amenityDraft)}
                >
                  ＋ Add
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {AMENITY_OPTIONS.filter((o) => !amenities.includes(o)).map(
                  (o) => (
                    <button
                      key={o}
                      type="button"
                      className="chip"
                      style={{ cursor: "pointer" }}
                      onClick={() => addAmenity(o)}
                    >
                      ＋ {o}
                    </button>
                  ),
                )}
              </div>
            </div>

            <aside
              style={{
                position: "sticky",
                top: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  border: "1px solid rgba(109, 40, 217, 0.14)",
                  borderRadius: 18,
                  padding: 18,
                  background:
                    "linear-gradient(180deg, rgba(109,40,217,0.08), rgba(219,39,119,0.04))",
                }}
              >
                <div
                  className="eyebrow"
                  style={{ marginBottom: 8, fontSize: 11 }}
                >
                  Project snapshot
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 22,
                    lineHeight: 1.2,
                    color: "var(--fg)",
                  }}
                >
                  {name.trim() || "Untitled project"}
                </h3>
                <div
                  className="muted"
                  style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5 }}
                >
                  {location.trim() || "Location not added yet"}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  <span className="chip" style={{ borderColor: "var(--line)" }}>
                    {status === "active" ? "Active" : "Inactive"}
                  </span>
                  <span className="chip" style={{ borderColor: "var(--line)" }}>
                    {unitTypes.length} unit type
                    {unitTypes.length === 1 ? "" : "s"}
                  </span>
                  <span className="chip" style={{ borderColor: "var(--line)" }}>
                    {unitRollup.total} units planned
                  </span>
                </div>
              </div>

              <div
                style={{
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: 18,
                  padding: 18,
                  background: "rgba(15, 23, 42, 0.02)",
                }}
              >
                <div
                  className="muted"
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Quick checklist
                </div>
                <ul
                  style={{
                    margin: "10px 0 0",
                    paddingLeft: 18,
                    display: "grid",
                    gap: 8,
                    color: "var(--fg)",
                  }}
                >
                  <li>{name.trim() ? "✓ Name captured" : "• Add project name"}</li>
                  <li>
                    {location.trim() ? "✓ Location captured" : "• Add location"}
                  </li>
                  <li>
                    {managerId ? "✓ Manager assigned" : "• Assign manager"}
                  </li>
                  <li>
                    {unitTypes.length > 0
                      ? "✓ Unit types added"
                      : "• Add at least one unit type"}
                  </li>
                </ul>
              </div>
            </aside>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              marginTop: 18,
              paddingTop: 18,
              borderTop: "1px solid rgba(148, 163, 184, 0.18)",
            }}
          >
            <span className="muted" style={{ fontSize: 12.5 }}>
              {error ? (
                <span style={{ color: "var(--rose)" }}>⚠️ {error}</span>
              ) : (
                "Inventory (individual units) is added from the project once it exists."
              )}
            </span>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                className="btn btn-ghost"
                type="button"
                disabled={submitting}
                onClick={() => router.push("/org/projects")}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={submitting}
                onClick={() => void submit()}
                style={{
                  background: "linear-gradient(135deg,#6d28d9,#db2777)",
                  border: "none",
                  boxShadow: "0 12px 24px rgba(109, 40, 217, 0.25)",
                }}
              >
                {submitting ? "Creating…" : "Create project"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
