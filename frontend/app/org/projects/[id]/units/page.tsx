"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { Seg } from "@/components/superadmin/seg";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ProjectPageHead } from "@/components/org/project-tabs";
import "@/app/org/org.css";
import type {
  CreateUnitInput,
  CreateUnitTypeInput,
  ProjectDetail,
  Unit,
  UnitStatus,
  UnitType,
} from "@/lib/types";

const STATUS_BADGE: Record<UnitStatus, string> = {
  available: "b-green",
  booked: "b-rose",
  held: "b-amber",
};

const STATUS_LABEL: Record<UnitStatus, string> = {
  available: "Available",
  booked: "Booked",
  held: "Held",
};

// Class suffix for the availability-grid pills (see .u-cell.avl/.bkd/.hld).
const STATUS_CELL: Record<UnitStatus, string> = {
  available: "avl",
  booked: "bkd",
  held: "hld",
};

const STATUS_OPTIONS: UnitStatus[] = ["available", "booked", "held"];

const FILTERS = ["All", "Available", "Booked", "Held"] as const;

// Bucket key for units with no tower set — grouped together as "All units".
const NO_TOWER = "__NO_TOWER__";

/** Derived ₹/sqft — never stored, so it can't drift from the real price. */
function pricePerSqft(
  price: number | null,
  carpetSqft: number | null,
): string | null {
  if (!price || !carpetSqft) return null;
  return `₹${Math.round(price / carpetSqft).toLocaleString("en-IN")}/sqft`;
}

function numOrUndef(value: string): number | undefined {
  const t = value.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function compactRupees(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

interface UnitTypeForm {
  name: string;
  carpetSqft: string;
  builtupSqft: string;
  price: string;
  totalUnits: string;
}
const EMPTY_UT_FORM: UnitTypeForm = {
  name: "",
  carpetSqft: "",
  builtupSqft: "",
  price: "",
  totalUnits: "",
};

interface UnitForm {
  unitTypeId: string;
  unitNo: string;
  tower: string;
  floor: string;
  facing: string;
  price: string;
  status: UnitStatus;
}
const emptyUnitForm = (unitTypeId = ""): UnitForm => ({
  unitTypeId,
  unitNo: "",
  tower: "",
  floor: "",
  facing: "",
  price: "",
  status: "available",
});

type PendingDelete =
  | { kind: "unitType"; id: string; label: string; extra: string }
  | { kind: "unit"; id: string; label: string; extra: string };

export default function OrgProjectUnitsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { accessToken } = useAuth();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterIndex, setFilterIndex] = useState(0);

  const [utMode, setUtMode] = useState<"create" | "edit" | null>(null);
  const [utEditingId, setUtEditingId] = useState<string | null>(null);
  const [utForm, setUtForm] = useState<UnitTypeForm>(EMPTY_UT_FORM);
  const [utError, setUtError] = useState<string | null>(null);
  const [utBusy, setUtBusy] = useState(false);

  const [unitMode, setUnitMode] = useState<"create" | "edit" | null>(null);
  const [unitEditingId, setUnitEditingId] = useState<string | null>(null);
  const [unitForm, setUnitForm] = useState<UnitForm>(emptyUnitForm());
  const [unitError, setUnitError] = useState<string | null>(null);
  const [unitBusy, setUnitBusy] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Per-row status-dropdown feedback (auto-save, no separate button).
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [statusSavedId, setStatusSavedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [proj, unitRows] = await Promise.all([
        apiFetch<ProjectDetail>(`/org/projects/${id}`, { headers }),
        apiFetch<Unit[]>(`/org/projects/${id}/units`, { headers }),
      ]);
      setProject(proj);
      setUnits(unitRows);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    void load();
  }, [load]);

  // --- unit type handlers ---
  function openUtCreate() {
    setUtMode("create");
    setUtEditingId(null);
    setUtForm(EMPTY_UT_FORM);
    setUtError(null);
  }
  function openUtEdit(ut: UnitType) {
    setUtMode("edit");
    setUtEditingId(ut.id);
    setUtForm({
      name: ut.name,
      carpetSqft: ut.carpetSqft == null ? "" : String(ut.carpetSqft),
      builtupSqft: ut.builtupSqft == null ? "" : String(ut.builtupSqft),
      price: ut.price == null ? "" : String(ut.price),
      totalUnits: String(ut.totalUnits),
    });
    setUtError(null);
  }
  async function submitUt() {
    if (!accessToken) return;
    if (!utForm.name.trim()) {
      setUtError("Unit type name is required.");
      return;
    }
    setUtBusy(true);
    setUtError(null);
    try {
      const body: CreateUnitTypeInput = {
        name: utForm.name.trim(),
        carpetSqft: numOrUndef(utForm.carpetSqft),
        builtupSqft: numOrUndef(utForm.builtupSqft),
        price: numOrUndef(utForm.price),
        totalUnits: numOrUndef(utForm.totalUnits),
      };
      if (utMode === "create") {
        await apiFetch(`/org/projects/${id}/unit-types`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
      } else if (utEditingId) {
        await apiFetch(`/org/projects/${id}/unit-types/${utEditingId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
      }
      setUtMode(null);
      await load();
    } catch (err) {
      setUtError(
        err instanceof Error ? err.message : "Failed to save unit type.",
      );
    } finally {
      setUtBusy(false);
    }
  }

  // --- unit handlers ---
  function openUnitCreate() {
    const firstType = project?.unitTypes[0]?.id ?? "";
    setUnitMode("create");
    setUnitEditingId(null);
    setUnitForm(emptyUnitForm(firstType));
    setUnitError(null);
  }
  function openUnitEdit(unit: Unit) {
    setUnitMode("edit");
    setUnitEditingId(unit.id);
    setUnitForm({
      unitTypeId: unit.unitTypeId,
      unitNo: unit.unitNo,
      tower: unit.tower ?? "",
      floor: unit.floor == null ? "" : String(unit.floor),
      facing: unit.facing ?? "",
      price: unit.price == null ? "" : String(unit.price),
      status: unit.status,
    });
    setUnitError(null);
  }
  async function submitUnit() {
    if (!accessToken) return;
    if (!unitForm.unitTypeId) {
      setUnitError("Pick a unit type for this unit.");
      return;
    }
    if (!unitForm.unitNo.trim()) {
      setUnitError("Unit number is required.");
      return;
    }
    setUnitBusy(true);
    setUnitError(null);
    try {
      if (unitMode === "create") {
        const body: CreateUnitInput = {
          unitTypeId: unitForm.unitTypeId,
          unitNo: unitForm.unitNo.trim(),
          tower: unitForm.tower.trim() || undefined,
          floor: numOrUndef(unitForm.floor),
          facing: unitForm.facing.trim() || undefined,
          price: numOrUndef(unitForm.price),
          status: unitForm.status,
        };
        await apiFetch(`/org/projects/${id}/units`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
      } else if (unitEditingId) {
        // PATCH: send `tower` explicitly (null clears it) since it's optional.
        const body = {
          unitTypeId: unitForm.unitTypeId,
          unitNo: unitForm.unitNo.trim(),
          tower: unitForm.tower.trim() || null,
          floor: numOrUndef(unitForm.floor) ?? null,
          facing: unitForm.facing.trim() || null,
          price: numOrUndef(unitForm.price) ?? null,
          status: unitForm.status,
        };
        await apiFetch(`/org/projects/${id}/units/${unitEditingId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
      }
      setUnitMode(null);
      await load();
    } catch (err) {
      setUnitError(err instanceof Error ? err.message : "Failed to save unit.");
    } finally {
      setUnitBusy(false);
    }
  }

  // Direct status pick — auto-saves on change, no separate Save button.
  async function changeStatus(unit: Unit, next: UnitStatus) {
    if (!accessToken || next === unit.status) return;
    setStatusSavingId(unit.id);
    setStatusSavedId(null);
    setError(null);
    setUnits((prev) =>
      prev.map((u) => (u.id === unit.id ? { ...u, status: next } : u)),
    );
    try {
      await apiFetch(`/org/projects/${id}/units/${unit.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: next }),
      });
      await load();
      setStatusSavedId(unit.id);
      setTimeout(
        () => setStatusSavedId((cur) => (cur === unit.id ? null : cur)),
        2000,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change status.");
      await load();
    } finally {
      setStatusSavingId(null);
    }
  }

  async function runDelete() {
    if (!accessToken || !pendingDelete) return;
    setDeleteBusy(true);
    setError(null);
    const path =
      pendingDelete.kind === "unitType"
        ? `/org/projects/${id}/unit-types/${pendingDelete.id}`
        : `/org/projects/${id}/units/${pendingDelete.id}`;
    try {
      await apiFetch(path, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
      setPendingDelete(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  if (notFound) {
    return (
      <>
        <ProjectPageHead active="units" />
        <div className="card">
          <div className="card-b">
            <p className="muted">Project not found.</p>
            <Link href="/org/projects" className="btn btn-ghost btn-sm">
              ← Back to projects
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (loading && !project) {
    return (
      <>
        <ProjectPageHead active="units" />
        <div className="card">
          <div className="card-b">
            <p className="muted">Loading…</p>
          </div>
        </div>
      </>
    );
  }

  const unitTypes = project?.unitTypes ?? [];
  const filter = FILTERS[filterIndex];
  const visibleUnits =
    filter === "All"
      ? units
      : units.filter((u) => u.status === filter.toLowerCase());

  // Availability grid: units grouped by the explicit `tower` field. Units
  // with no tower fall into one "All units" bucket. Floor range per tower
  // is the min/max of `floor` across the units that actually exist.
  const towers = (() => {
    const byTower = new Map<string, Unit[]>();
    for (const u of units) {
      const key = u.tower && u.tower.trim() ? u.tower.trim() : NO_TOWER;
      const bucket = byTower.get(key);
      if (bucket) bucket.push(u);
      else byTower.set(key, [u]);
    }
    return [...byTower.entries()]
      .sort(([a], [b]) => {
        if (a === NO_TOWER) return 1;
        if (b === NO_TOWER) return -1;
        return a.localeCompare(b, undefined, { numeric: true });
      })
      .map(([tower, rows]) => {
        const floors = rows
          .map((u) => u.floor)
          .filter((f): f is number => f != null);
        return {
          key: tower,
          label: tower === NO_TOWER ? "All units" : `Tower ${tower}`,
          units: [...rows].sort(
            (a, b) =>
              (a.floor ?? 0) - (b.floor ?? 0) ||
              a.unitNo.localeCompare(b.unitNo, undefined, { numeric: true }),
          ),
          floorMin: floors.length ? Math.min(...floors) : null,
          floorMax: floors.length ? Math.max(...floors) : null,
        };
      });
  })();

  function floorBadge(min: number | null, max: number | null): string {
    const range =
      min != null && max != null
        ? min === max
          ? `Floor ${min}`
          : `Floors ${min}–${max}`
        : null;
    return [range, project?.floorsDescription].filter(Boolean).join(" · ");
  }

  return (
    <>
      <ProjectPageHead
        active="units"
        project={
          project
            ? {
                name: project.name,
                status: project.status,
                location: project.location,
                reraId: project.reraId,
                manager: project.manager?.name ?? null,
              }
            : undefined
        }
        actions={
          <>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={openUtCreate}
            >
              ＋ Add unit type
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={openUnitCreate}
              disabled={unitTypes.length === 0}
            >
              ＋ Add unit
            </button>
          </>
        }
      />

      {error ? (
        <Reveal delay={1}>
          <div className="form-alert mb-14">
            {error}
          </div>
        </Reveal>
      ) : null}

      <Reveal delay={1}>
        <div className="grid g2">
          {unitTypes.length === 0 ? (
            <div className="card">
              <div className="card-b">
                <p className="muted">
                  No unit types yet — add one to start building inventory.
                </p>
              </div>
            </div>
          ) : (
            unitTypes.map((u) => (
              <div className="card" key={u.id}>
                <div className="pad-18">
                  <div className="row between">
                    <b className="fs-16">{u.name}</b>
                    <span
                      className={`badge ${u.availableUnits > 0 ? "b-green" : "b-amber"}`}
                    >
                      {u.availableUnits} available
                    </span>
                  </div>
                  <div className="uspec">
                    <div>
                      <div className="k">Carpet</div>
                      <div className="v">
                        {u.carpetSqft != null ? `${u.carpetSqft} sqft` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="k">Built-up</div>
                      <div className="v">
                        {u.builtupSqft != null ? `${u.builtupSqft} sqft` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="k">Price</div>
                      <div className="v">{compactRupees(u.price)}</div>
                    </div>
                    <div>
                      <div className="k">₹/sqft</div>
                      <div className="v">
                        {pricePerSqft(u.price, u.carpetSqft) ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="badge-row">
                    <span className="badge">
                      Total {u.availableUnits + u.bookedUnits + u.heldUnits}
                    </span>
                    <span className="badge b-green">{u.availableUnits} Available</span>
                    <span className="badge b-rose">{u.bookedUnits} Booked</span>
                    <span className="badge b-amber">{u.heldUnits} Held</span>
                    {u.totalUnits > 0 ? (
                      <span className="badge b-gray">Planned: {u.totalUnits}</span>
                    ) : null}
                  </div>
                  <div className="row gap-8 mt-10">
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => openUtEdit(u)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      disabled
                      title="Floor plan upload is coming soon"
                    >
                      📐 View floor plan
                    </button>
                    <button
                      className="btn btn-ghost btn-sm text-rose"
                      type="button"
                      onClick={() =>
                        setPendingDelete({
                          kind: "unitType",
                          id: u.id,
                          label: u.name,
                          extra: `Its ${u.unitCount} unit(s) will be deleted too.`,
                        })
                      }
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Reveal>

      {units.length > 0 ? (
        <Reveal delay={2}>
          <div className="col gap-18 mt-18">
            {towers.map((t) => (
              <div className="card" key={t.key}>
                <div className="card-h">
                  <span className="t">Availability — {t.label}</span>
                  {floorBadge(t.floorMin, t.floorMax) ? (
                    <span className="badge b-green">
                      {floorBadge(t.floorMin, t.floorMax)}
                    </span>
                  ) : null}
                </div>
                <div className="card-b">
                  <div className="avail">
                    {t.units.map((u) => (
                      <div
                        key={u.id}
                        className={`u-cell ${STATUS_CELL[u.status]}`}
                        title={`${u.unitNo} · ${STATUS_LABEL[u.status]}${
                          u.floor != null ? ` · Floor ${u.floor}` : ""
                        }`}
                      >
                        {u.unitNo}
                      </div>
                    ))}
                  </div>
                  <div className="legend">
                    <span>
                      <i className="dot-av" /> Available
                    </span>
                    <span>
                      <i className="dot-bk" /> Booked
                    </span>
                    <span>
                      <i className="dot-hl" /> Held
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      ) : null}

      <Reveal delay={2}>
        <div className="my-18">
          <Seg
            options={[...FILTERS]}
            value={filterIndex}
            onChange={setFilterIndex}
          />
        </div>
      </Reveal>

      <Reveal delay={2}>
        <div className="card">
          <div className="card-h">
            <span className="t">All units</span>
            <span className="x muted">
              {visibleUnits.length} of {units.length}
            </span>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Unit No</th>
                  <th>Tower</th>
                  <th>Type</th>
                  <th>Floor</th>
                  <th>Facing</th>
                  <th>Price ₹</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUnits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="muted">
                      {units.length === 0
                        ? "No units yet — add one with “＋ Add unit”."
                        : "No units match this filter."}
                    </td>
                  </tr>
                ) : (
                  visibleUnits.map((row) => (
                    <tr key={row.id}>
                      <td className="mono">{row.unitNo}</td>
                      <td>{row.tower ?? "—"}</td>
                      <td>{row.unitType.name}</td>
                      <td>{row.floor ?? "—"}</td>
                      <td>{row.facing ?? "—"}</td>
                      <td>
                        {row.price != null
                          ? row.price.toLocaleString("en-IN")
                          : "—"}
                      </td>
                      <td>
                        <div className="row gap-6">
                          <select
                            className={`badge ${STATUS_BADGE[row.status]} nb`}
                            value={row.status}
                            disabled={statusSavingId === row.id}
                            onChange={(e) =>
                              void changeStatus(
                                row,
                                e.target.value as UnitStatus,
                              )
                            }
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABEL[s]}
                              </option>
                            ))}
                          </select>
                          {statusSavingId === row.id ? (
                            <span className="muted fs-11">
                              …
                            </span>
                          ) : statusSavedId === row.id ? (
                            <span className="text-green fs-12">
                              ✓
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div className="row gap-6 wrap">
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            onClick={() => openUnitEdit(row)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-ghost btn-sm text-rose"
                            type="button"
                            onClick={() =>
                              setPendingDelete({
                                kind: "unit",
                                id: row.id,
                                label: `unit ${row.unitNo}`,
                                extra: "",
                              })
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      {/* --- Unit type create/edit --- */}
      <Modal
        open={utMode !== null}
        onClose={() => setUtMode(null)}
        title={utMode === "create" ? "Add unit type" : "Edit unit type"}
        size="lg"
      >
        <div className="org">
          {utError ? (
            <div className="form-alert mb-12">
              {utError}
            </div>
          ) : null}
          <div className="row2">
            <div className="field">
              <label>Name *</label>
              <input
                className="inp"
                placeholder="3 BHK — Type B"
                value={utForm.name}
                onChange={(e) =>
                  setUtForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label>Planned units</label>
              <input
                className="inp"
                type="number"
                min={0}
                value={utForm.totalUnits}
                onChange={(e) =>
                  setUtForm((f) => ({ ...f, totalUnits: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Carpet (sqft)</label>
              <input
                className="inp"
                type="number"
                min={0}
                value={utForm.carpetSqft}
                onChange={(e) =>
                  setUtForm((f) => ({ ...f, carpetSqft: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label>Built-up (sqft)</label>
              <input
                className="inp"
                type="number"
                min={0}
                value={utForm.builtupSqft}
                onChange={(e) =>
                  setUtForm((f) => ({ ...f, builtupSqft: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="field">
            <label>Base price (₹)</label>
            <input
              className="inp"
              type="number"
              min={0}
              value={utForm.price}
              onChange={(e) =>
                setUtForm((f) => ({ ...f, price: e.target.value }))
              }
            />
          </div>
          <div className="muted fs-12 row gap-8 mb-14">
            <span>📐 Floor plan</span>
            <span>🎬 Video</span>
            <span>📄 Brochure</span>
            <span className="badge b-gray">Coming soon</span>
          </div>
          <div className="row gap-10">
            <button
              className="btn btn-primary"
              type="button"
              disabled={utBusy}
              onClick={() => void submitUt()}
            >
              {utBusy
                ? "Saving…"
                : utMode === "create"
                  ? "Add unit type"
                  : "Save"}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setUtMode(null)}
              disabled={utBusy}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* --- Unit create/edit --- */}
      <Modal
        open={unitMode !== null}
        onClose={() => setUnitMode(null)}
        title={unitMode === "create" ? "Add unit" : "Edit unit"}
        size="xl"
      >
        <div className="org">
        <div className="cgrid">
          <div>
            {unitError ? (
              <div className="form-alert mb-12">
                {unitError}
              </div>
            ) : null}

            <div className="sec">
              <div className="lbl">🏗️ Project placement</div>
              <div className="g3">
                <div className="field">
                  <label>Unit type <span className="req">*</span></label>
                  <select
                    className="inp"
                    value={unitForm.unitTypeId}
                    onChange={(e) =>
                      setUnitForm((f) => ({ ...f, unitTypeId: e.target.value }))
                    }
                  >
                    <option value="">Select…</option>
                    {unitTypes.map((ut) => (
                      <option key={ut.id} value={ut.id}>
                        {ut.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Tower / block</label>
                  <input
                    className="inp"
                    placeholder="e.g. Tower B"
                    value={unitForm.tower}
                    onChange={(e) =>
                      setUnitForm((f) => ({ ...f, tower: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Floor</label>
                  <input
                    className="inp"
                    type="number"
                    placeholder="12"
                    value={unitForm.floor}
                    onChange={(e) =>
                      setUnitForm((f) => ({ ...f, floor: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="sec">
              <div className="lbl">🏠 Unit details</div>
              <div className="g3">
                <div className="field">
                  <label>Unit number <span className="req">*</span></label>
                  <input
                    className="inp mono"
                    placeholder="B-1204"
                    value={unitForm.unitNo}
                    onChange={(e) =>
                      setUnitForm((f) => ({ ...f, unitNo: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Facing</label>
                  <select
                    className="inp"
                    value={unitForm.facing}
                    onChange={(e) =>
                      setUnitForm((f) => ({ ...f, facing: e.target.value }))
                    }
                  >
                    <option value="">Select…</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="North-East">North-East</option>
                    <option value="North-West">North-West</option>
                    <option value="South-East">South-East</option>
                    <option value="South-West">South-West</option>
                    <option value="Sea">Sea</option>
                    <option value="Garden">Garden</option>
                  </select>
                </div>
                <div className="field">
                  <label>Status</label>
                  <select
                    className="inp"
                    value={unitForm.status}
                    onChange={(e) =>
                      setUnitForm((f) => ({
                        ...f,
                        status: e.target.value as UnitStatus,
                      }))
                    }
                  >
                    <option value="available">Available</option>
                    <option value="booked">Booked</option>
                    <option value="held">Held / Blocked</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="sec nb">
              <div className="lbl">💰 Pricing</div>
              <div className="g2">
                <div className="field">
                  <label>Price (₹)</label>
                  <input
                    className="inp"
                    type="number"
                    min={0}
                    placeholder="16500000"
                    value={unitForm.price}
                    onChange={(e) =>
                      setUnitForm((f) => ({ ...f, price: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Price / sqft</label>
                  <input
                    className="inp"
                    placeholder="Auto-calculated"
                    disabled
                    value={
                      unitForm.price && unitTypes.find((ut) => ut.id === unitForm.unitTypeId)?.carpetSqft
                        ? `₹${Math.round(Number(unitForm.price) / unitTypes.find((ut) => ut.id === unitForm.unitTypeId)!.carpetSqft!).toLocaleString("en-IN")}`
                        : ""
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="col gap-18">
            <div className="card">
              <div className="card-h"><span className="t">Preview</span></div>
              <div className="card-b">
                <div className="ph-box">📐</div>
                <div className="row between">
                  <b>{unitForm.unitNo || "New unit"}</b>
                  <span className={`badge ${unitForm.status === "available" ? "b-green" : unitForm.status === "booked" ? "b-rose" : "b-amber"}`}>
                    {unitForm.status === "available" ? "Available" : unitForm.status === "booked" ? "Booked" : "Held"}
                  </span>
                </div>
                <div className="muted fs-12-5 mt-4">
                  {unitTypes.find((ut) => ut.id === unitForm.unitTypeId)?.name || "Select unit type"}
                  {unitForm.tower ? ` · ${unitForm.tower}` : ""}
                  {unitForm.floor ? ` · Floor ${unitForm.floor}` : ""}
                  <br />
                  {unitForm.facing || "Facing not set"}
                </div>
              </div>
            </div>
            <div className="help">💡 Add the unit number, type and price to get started. Tower and floor help organize the availability grid.</div>
          </div>
        </div>

        <div className="row gap-10 mt-18 pt-18 b-top">
          <button
            className="btn btn-primary"
            type="button"
            disabled={unitBusy}
            onClick={() => void submitUnit()}
          >
            {unitBusy
              ? "Saving…"
              : unitMode === "create"
                ? "Add unit"
                : "Save"}
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setUnitMode(null)}
            disabled={unitBusy}
          >
            Cancel
          </button>
        </div>
        </div>
      </Modal>

      <ConfirmModal
        open={pendingDelete !== null}
        title={
          pendingDelete?.kind === "unitType"
            ? "Delete unit type?"
            : "Delete unit?"
        }
        message={
          pendingDelete ? (
            <>
              <strong>{pendingDelete.label}</strong> will be permanently
              deleted.
              {pendingDelete.extra ? ` ${pendingDelete.extra}` : ""} This
              can&apos;t be undone.
            </>
          ) : null
        }
        confirmLabel="Delete"
        destructive
        busy={deleteBusy}
        onConfirm={() => void runDelete()}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
