"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, getOrgCatalogOptions } from "@/lib/api";
import { parseAmount, parseCount, parseInteger } from "@/lib/parse";
import { Reveal } from "@/components/superadmin/reveal";
import { Seg } from "@/components/superadmin/seg";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ProjectPageHead } from "@/components/org/project-tabs";
import {
  ConfigurationSelect,
  FACING_OPTIONS,
  PARKING_OPTIONS,
  TowerCombobox,
  UnitMediaFields,
  pricePerSqftCarpet,
} from "@/components/org/project-form-fields";
import "@/app/org/org.css";
import type {
  CreateUnitInput,
  CreateUnitTypeInput,
  OrgCatalogOption,
  ProjectDetail,
  Unit,
  UnitStatus,
  UnitType,
} from "@/lib/types";

const STATUS_BADGE: Record<UnitStatus, string> = {
  available: "b-green",
  booked: "b-rose",
  held: "b-amber",
  sold: "b-gray",
};

const STATUS_LABEL: Record<UnitStatus, string> = {
  available: "Available",
  booked: "Booked",
  held: "Held",
  sold: "Sold",
};

// Class suffix for the availability-grid pills (see .u-cell.avl/.bkd/.hld/.sld).
const STATUS_CELL: Record<UnitStatus, string> = {
  available: "avl",
  booked: "bkd",
  held: "hld",
  sold: "sld",
};

const STATUS_OPTIONS: UnitStatus[] = ["available", "booked", "held", "sold"];

const FILTERS = ["All", "Available", "Booked", "Held", "Sold"] as const;

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
  configuration: string;
  variantLabel: string;
  unitNo: string;
  carpetSqft: string;
  builtupSqft: string;
  tower: string;
  floor: string;
  facing: string;
  parking: string;
  price: string;
  status: UnitStatus;
  floorPlanUrl: string;
  galleryUrls: string[];
}
const emptyUnitForm = (): UnitForm => ({
  configuration: "",
  variantLabel: "",
  unitNo: "",
  carpetSqft: "",
  builtupSqft: "",
  tower: "",
  floor: "",
  facing: "",
  parking: "",
  price: "",
  status: "available",
  floorPlanUrl: "",
  galleryUrls: [],
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

  // Org-managed "Unit types" catalog (Settings → Project Catalogs). Same
  // source the wizard's Step 2 chip-selector reads — the unit-type name is
  // picked from here, never free-typed, so labels stay consistent. `null`
  // = not loaded yet. "Copy, don't reference": the chosen label is just
  // written to UnitType.name; there's no FK to the catalog.
  const [unitTypeCatalog, setUnitTypeCatalog] = useState<
    OrgCatalogOption[] | null
  >(null);
  const [unitTypeCatalogError, setUnitTypeCatalogError] = useState<
    string | null
  >(null);

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

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getOrgCatalogOptions("unit_type")
      .then((rows) => {
        if (cancelled) return;
        setUnitTypeCatalog(
          [...rows].sort(
            (a, b) =>
              a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
          ),
        );
        setUnitTypeCatalogError(null);
      })
      .catch((e) => {
        if (!cancelled) {
          setUnitTypeCatalogError(
            e instanceof Error ? e.message : "Couldn't load unit type options.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

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
      setUtError("Pick a unit type from the list.");
      return;
    }
    setUtBusy(true);
    setUtError(null);
    try {
      const body: CreateUnitTypeInput = {
        name: utForm.name.trim(),
        carpetSqft: parseCount(utForm.carpetSqft),
        builtupSqft: parseCount(utForm.builtupSqft),
        price: parseAmount(utForm.price),
        totalUnits: parseCount(utForm.totalUnits),
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
    setUnitMode("create");
    setUnitEditingId(null);
    setUnitForm(emptyUnitForm());
    setUnitError(null);
  }
  function openUnitEdit(unit: Unit) {
    setUnitMode("edit");
    setUnitEditingId(unit.id);
    setUnitForm({
      configuration: unit.configuration ?? "",
      variantLabel: unit.variantLabel ?? "",
      unitNo: unit.unitNo,
      carpetSqft: unit.carpetSqft == null ? "" : String(unit.carpetSqft),
      builtupSqft: unit.builtupSqft == null ? "" : String(unit.builtupSqft),
      tower: unit.tower ?? "",
      floor: unit.floor == null ? "" : String(unit.floor),
      facing: unit.facing ?? "",
      parking: unit.parking ?? "",
      price: unit.price == null ? "" : String(unit.price),
      status: unit.status,
      floorPlanUrl: unit.floorPlanUrl ?? "",
      galleryUrls: unit.galleryUrls ?? [],
    });
    setUnitError(null);
  }
  async function submitUnit() {
    if (!accessToken) return;
    if (!unitForm.configuration) {
      setUnitError("Pick a configuration for this unit.");
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
          configuration: unitForm.configuration,
          variantLabel: unitForm.variantLabel.trim() || undefined,
          unitNo: unitForm.unitNo.trim(),
          carpetSqft: parseCount(unitForm.carpetSqft),
          builtupSqft: parseCount(unitForm.builtupSqft),
          tower: unitForm.tower.trim() || undefined,
          floor: parseInteger(unitForm.floor),
          facing: unitForm.facing.trim() || undefined,
          parking: unitForm.parking.trim() || undefined,
          price: parseAmount(unitForm.price),
          status: unitForm.status,
          floorPlanUrl: unitForm.floorPlanUrl || undefined,
          galleryUrls: unitForm.galleryUrls.length
            ? unitForm.galleryUrls
            : undefined,
        };
        await apiFetch(`/org/projects/${id}/units`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
      } else if (unitEditingId) {
        // PATCH: nullable fields sent explicitly so they can be cleared.
        const body = {
          configuration: unitForm.configuration,
          variantLabel: unitForm.variantLabel.trim() || null,
          unitNo: unitForm.unitNo.trim(),
          carpetSqft: parseCount(unitForm.carpetSqft) ?? null,
          builtupSqft: parseCount(unitForm.builtupSqft) ?? null,
          tower: unitForm.tower.trim() || null,
          floor: parseInteger(unitForm.floor) ?? null,
          facing: unitForm.facing.trim() || null,
          parking: unitForm.parking.trim() || null,
          price: parseAmount(unitForm.price) ?? null,
          status: unitForm.status,
          floorPlanUrl: unitForm.floorPlanUrl || null,
          galleryUrls: unitForm.galleryUrls,
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
  const catalogEmpty =
    unitTypeCatalog !== null && unitTypeCatalog.length === 0;

  // One card per configuration = the union of the planned mix (UnitType rows,
  // from the wizard / "Add unit type") and the configurations actually
  // present on units (from the server's live unit.groupBy). A wizard-made
  // project has no planned mix, so without the union its real units would
  // show no per-config cards at all.
  const plannedByName = new Map(unitTypes.map((ut) => [ut.name, ut]));
  const actualByLabel = new Map(
    (project?.configurations ?? []).map((c) => [c.label, c]),
  );
  const configCards = [
    ...new Set([...plannedByName.keys(), ...actualByLabel.keys()]),
  ].sort((a, b) => a.localeCompare(b));

  const filter = FILTERS[filterIndex];
  const visibleUnits =
    filter === "All"
      ? units
      : units.filter((u) => u.status === filter.toLowerCase());

  // Distinct tower names in use by units OTHER than the one being edited —
  // feeds the tower combobox + its towerCount limit (server is authoritative).
  const otherTowers = (() => {
    const set = new Set<string>();
    for (const u of units) {
      if (u.id === unitEditingId) continue;
      if (u.tower && u.tower.trim()) set.add(u.tower.trim());
    }
    return [...set].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  })();

  // Live ₹/sqft for the modal (carpet basis) — never stored, blank when
  // either input is missing.
  const modalPricePerSqft = pricePerSqftCarpet(
    parseAmount(unitForm.price),
    parseCount(unitForm.carpetSqft),
  );

  // Can a unit be created at all? Only when the org has ≥1 unit_type catalog
  // option (or the form already carries a legacy configuration value).
  const canPickConfiguration =
    (unitTypeCatalog?.length ?? 0) > 0 || unitForm.configuration !== "";

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
              disabled={catalogEmpty}
              title={
                catalogEmpty
                  ? "Add unit configurations in Settings → Project Catalogs first"
                  : undefined
              }
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
          {configCards.length === 0 ? (
            <div className="card">
              <div className="card-b">
                <p className="muted">
                  No configurations yet — add a unit, or a planned unit mix
                  with “＋ Add unit type”.
                </p>
              </div>
            </div>
          ) : (
            configCards.map((label) => {
              const ut = plannedByName.get(label);
              const act = actualByLabel.get(label);
              const available = act?.available ?? 0;
              const total = act?.total ?? 0;
              return (
                <div className="card" key={label}>
                  <div className="pad-18">
                    <div className="row between">
                      <b className="fs-16">{label}</b>
                      <span
                        className={`badge ${available > 0 ? "b-green" : "b-amber"}`}
                      >
                        {available} available
                      </span>
                    </div>
                    <div className="uspec">
                      <div>
                        <div className="k">Carpet</div>
                        <div className="v">
                          {ut?.carpetSqft != null
                            ? `${ut.carpetSqft} sqft`
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="k">Built-up</div>
                        <div className="v">
                          {ut?.builtupSqft != null
                            ? `${ut.builtupSqft} sqft`
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="k">Price</div>
                        <div className="v">
                          {compactRupees(ut?.price ?? null)}
                        </div>
                      </div>
                      <div>
                        <div className="k">₹/sqft</div>
                        <div className="v">
                          {pricePerSqft(ut?.price ?? null, ut?.carpetSqft ?? null) ??
                            "—"}
                        </div>
                      </div>
                    </div>
                    <div className="badge-row">
                      <span className="badge">Total {total}</span>
                      <span className="badge b-green">{available} Available</span>
                      <span className="badge b-rose">
                        {act?.booked ?? 0} Booked
                      </span>
                      <span className="badge b-amber">{act?.held ?? 0} Held</span>
                      <span className="badge b-gray">{act?.sold ?? 0} Sold</span>
                      {ut && ut.totalUnits > 0 ? (
                        <span className="badge b-gray">
                          Planned: {ut.totalUnits}
                        </span>
                      ) : null}
                    </div>
                    <div className="row gap-8 mt-10">
                      {ut ? (
                        <>
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            onClick={() => openUtEdit(ut)}
                          >
                            ✏️ Edit planned mix
                          </button>
                          <button
                            className="btn btn-ghost btn-sm text-rose"
                            type="button"
                            onClick={() =>
                              setPendingDelete({
                                kind: "unitType",
                                id: ut.id,
                                label: ut.name,
                                extra:
                                  total > 0
                                    ? `The ${total} unit(s) with this configuration are kept.`
                                    : "",
                              })
                            }
                          >
                            🗑 Remove from planned mix
                          </button>
                        </>
                      ) : (
                        <span className="muted fs-12">
                          Derived from units — not in the planned mix.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
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
                    <span>
                      <i className="dot-sl" /> Sold
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
                  <th>Config</th>
                  <th>Carpet</th>
                  <th>Floor</th>
                  <th>Facing</th>
                  <th>Parking</th>
                  <th>Price ₹</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUnits.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="muted">
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
                      <td>{row.configuration ?? "—"}</td>
                      <td>
                        {row.carpetSqft != null
                          ? `${row.carpetSqft.toLocaleString("en-IN")}`
                          : "—"}
                      </td>
                      <td>{row.floor ?? "—"}</td>
                      <td>{row.facing ?? "—"}</td>
                      <td>{row.parking ?? "—"}</td>
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
              <label>Unit type *</label>
              {unitTypeCatalogError ? (
                <div className="hint text-rose">{unitTypeCatalogError}</div>
              ) : unitTypeCatalog === null ? (
                <div className="hint">Loading unit types…</div>
              ) : unitTypeCatalog.length === 0 ? (
                <div className="hint">
                  No unit types configured yet.{" "}
                  <Link
                    className="brand-link"
                    href="/org/settings?section=catalogs"
                  >
                    Add them in Settings →
                  </Link>
                </div>
              ) : (
                <select
                  className="inp"
                  value={utForm.name}
                  onChange={(e) =>
                    setUtForm((f) => ({ ...f, name: e.target.value }))
                  }
                >
                  <option value="">Select a unit type…</option>
                  {unitTypeCatalog.map((o) => (
                    <option key={o.id} value={o.label}>
                      {o.label}
                    </option>
                  ))}
                  {/* Existing row whose name predates the current catalog:
                      keep it selectable so edit doesn't silently rename it. */}
                  {utForm.name &&
                  !unitTypeCatalog.some((o) => o.label === utForm.name) ? (
                    <option value={utForm.name}>
                      {utForm.name} (not in catalog)
                    </option>
                  ) : null}
                </select>
              )}
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
              disabled={
                utBusy ||
                (utMode === "create" &&
                  (unitTypeCatalog?.length ?? 0) === 0)
              }
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
              <div className="lbl">🏗️ Placement</div>
              <div className="grid g3">
                <div className="field">
                  <label>Configuration <span className="req">*</span></label>
                  <ConfigurationSelect
                    catalog={unitTypeCatalog}
                    error={unitTypeCatalogError}
                    value={unitForm.configuration}
                    onChange={(v) =>
                      setUnitForm((f) => ({ ...f, configuration: v }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Tower / block</label>
                  <TowerCombobox
                    value={unitForm.tower}
                    onChange={(v) => setUnitForm((f) => ({ ...f, tower: v }))}
                    otherTowers={otherTowers}
                    towerCount={project?.towerCount ?? null}
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
              <div className="grid g3">
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
                  <label>Unit type</label>
                  <input
                    className="inp"
                    placeholder="e.g. Type A (optional)"
                    value={unitForm.variantLabel}
                    onChange={(e) =>
                      setUnitForm((f) => ({
                        ...f,
                        variantLabel: e.target.value,
                      }))
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
                    {FACING_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid g3">
                <div className="field">
                  <label>Carpet area (sqft)</label>
                  <input
                    className="inp"
                    type="number"
                    min={0}
                    placeholder="1450"
                    value={unitForm.carpetSqft}
                    onChange={(e) =>
                      setUnitForm((f) => ({ ...f, carpetSqft: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Built-up area (sqft)</label>
                  <input
                    className="inp"
                    type="number"
                    min={0}
                    placeholder="1720"
                    value={unitForm.builtupSqft}
                    onChange={(e) =>
                      setUnitForm((f) => ({
                        ...f,
                        builtupSqft: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Parking</label>
                  <select
                    className="inp"
                    value={unitForm.parking}
                    onChange={(e) =>
                      setUnitForm((f) => ({ ...f, parking: e.target.value }))
                    }
                  >
                    <option value="">Not set</option>
                    {PARKING_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid g3">
                <div className="field mb-0">
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
                    <option value="sold">Sold</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="sec">
              <div className="lbl">💰 Pricing</div>
              <div className="grid g2">
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
                    placeholder="—"
                    disabled
                    value={modalPricePerSqft}
                  />
                </div>
              </div>
            </div>

            <div className="sec nb">
              <div className="lbl">🖼️ Media &amp; documents</div>
              <UnitMediaFields
                floorPlanUrl={unitForm.floorPlanUrl}
                galleryUrls={unitForm.galleryUrls}
                onFloorPlanChange={(v) =>
                  setUnitForm((f) => ({ ...f, floorPlanUrl: v }))
                }
                onGalleryChange={(urls) =>
                  setUnitForm((f) => ({ ...f, galleryUrls: urls }))
                }
                ctx={{ projectId: id }}
              />
            </div>
          </div>

          <div className="col gap-18">
            <div className="card">
              <div className="card-h"><span className="t">Preview</span></div>
              <div className="card-b">
                <div className="ph-box">📐</div>
                <div className="row between">
                  <b>{unitForm.unitNo || "New unit"}</b>
                  <span className={`badge ${STATUS_BADGE[unitForm.status]}`}>
                    {STATUS_LABEL[unitForm.status]}
                  </span>
                </div>
                <div className="muted fs-12-5 mt-4">
                  {unitForm.configuration || "Select a configuration"}
                  {unitForm.variantLabel ? ` · ${unitForm.variantLabel}` : ""}
                  {unitForm.tower ? ` · ${unitForm.tower}` : ""}
                  {unitForm.floor ? ` · Floor ${unitForm.floor}` : ""}
                  <br />
                  {[
                    unitForm.facing || null,
                    unitForm.carpetSqft
                      ? `${Number(unitForm.carpetSqft).toLocaleString("en-IN")} sqft carpet`
                      : null,
                    modalPricePerSqft || null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Fill the form to preview."}
                </div>
              </div>
            </div>
            <div className="help">💡 Configuration comes from your Project Catalogs. Tower / floor drive the availability grid.</div>
          </div>
        </div>

        <div className="row gap-10 mt-18 pt-18 b-top">
          <button
            className="btn btn-primary"
            type="button"
            disabled={unitBusy || !canPickConfiguration}
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
