"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  deleteStandaloneUnit,
  getOrgCatalogOptions,
  getStandaloneUnit,
  updateStandaloneUnit,
} from "@/lib/api";
import { parseAmount, parseCount } from "@/lib/parse";
import { formatMoney } from "@/lib/money";
import { Reveal } from "@/components/superadmin/reveal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  ConfigurationSelect,
  FACING_OPTIONS,
  PARKING_OPTIONS,
  UnitMediaFields,
  pricePerSqftCarpet,
} from "@/components/org/project-form-fields";
import "@/app/org/org.css";
import type { OrgCatalogOption, Unit, UnitStatus } from "@/lib/types";

const STATUSES: { value: UnitStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "held", label: "Held / Blocked" },
  { value: "booked", label: "Booked" },
  { value: "sold", label: "Sold" },
];
const STATUS_BADGE: Record<UnitStatus, string> = {
  available: "b-green",
  booked: "b-rose",
  held: "b-amber",
  sold: "b-gray",
};

interface Form {
  configuration: string;
  variantLabel: string;
  unitNo: string;
  carpetSqft: string;
  builtupSqft: string;
  facing: string;
  parking: string;
  price: string;
  status: UnitStatus;
  addressLine: string;
  ownerName: string;
  notes: string;
  floorPlanUrl: string;
  galleryUrls: string[];
}

const toForm = (u: Unit): Form => ({
  configuration: u.configuration ?? "",
  variantLabel: u.variantLabel ?? "",
  unitNo: u.unitNo,
  carpetSqft: u.carpetSqft == null ? "" : String(u.carpetSqft),
  builtupSqft: u.builtupSqft == null ? "" : String(u.builtupSqft),
  facing: u.facing ?? "",
  parking: u.parking ?? "",
  price: u.price == null ? "" : String(u.price),
  status: u.status,
  addressLine: u.addressLine ?? "",
  ownerName: u.ownerName ?? "",
  notes: u.notes ?? "",
  floorPlanUrl: u.floorPlanUrl ?? "",
  galleryUrls: u.galleryUrls ?? [],
});

export default function StandaloneUnitPage() {
  const params = useParams<{ unitId: string }>();
  const unitId = params?.unitId ?? "";
  const router = useRouter();
  const { accessToken } = useAuth();

  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<OrgCatalogOption[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !unitId) return;
    setLoading(true);
    try {
      const u = await getStandaloneUnit(unitId);
      setUnit(u);
      setForm(toForm(u));
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [accessToken, unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!accessToken) return;
    getOrgCatalogOptions("unit_type")
      .then((rows) =>
        setCatalog(
          [...rows].sort(
            (a, b) =>
              a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
          ),
        ),
      )
      .catch((e) =>
        setCatalogError(
          e instanceof Error ? e.message : "Couldn't load configurations.",
        ),
      );
  }, [accessToken]);

  function patch(p: Partial<Form>) {
    setForm((f) => (f ? { ...f, ...p } : f));
  }

  async function save() {
    if (!form) return;
    if (!form.configuration) {
      setError("Pick a configuration.");
      return;
    }
    if (!form.unitNo.trim()) {
      setError("Unit number is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateStandaloneUnit(unitId, {
        configuration: form.configuration,
        variantLabel: form.variantLabel.trim() || null,
        unitNo: form.unitNo.trim(),
        carpetSqft: parseCount(form.carpetSqft) ?? null,
        builtupSqft: parseCount(form.builtupSqft) ?? null,
        facing: form.facing.trim() || null,
        parking: form.parking.trim() || null,
        price: parseAmount(form.price) ?? null,
        status: form.status,
        addressLine: form.addressLine.trim() || null,
        ownerName: form.ownerName.trim() || null,
        notes: form.notes.trim() || null,
        floorPlanUrl: form.floorPlanUrl || null,
        galleryUrls: form.galleryUrls,
      });
      setUnit(updated);
      setForm(toForm(updated));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function runDelete() {
    setDeleting(true);
    try {
      await deleteStandaloneUnit(unitId);
      router.push("/org/projects/all-units");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (notFound) {
    return (
      <div className="card">
        <div className="card-b">
          <p className="muted">Standalone unit not found.</p>
          <Link href="/org/projects/all-units" className="btn btn-ghost btn-sm">
            ← Back to all units
          </Link>
        </div>
      </div>
    );
  }
  if (loading || !unit || !form) {
    return (
      <div className="card">
        <div className="card-b">
          <p className="muted">Loading…</p>
        </div>
      </div>
    );
  }

  const psqft = pricePerSqftCarpet(
    parseAmount(form.price),
    parseCount(form.carpetSqft),
  );

  const specs: { k: string; v: string }[] = [
    { k: "Configuration", v: unit.configuration ?? "—" },
    { k: "Unit type", v: unit.variantLabel ?? "—" },
    {
      k: "Carpet area",
      v: unit.carpetSqft != null ? `${unit.carpetSqft.toLocaleString("en-IN")} sqft` : "—",
    },
    {
      k: "Built-up",
      v: unit.builtupSqft != null ? `${unit.builtupSqft.toLocaleString("en-IN")} sqft` : "—",
    },
    { k: "Facing", v: unit.facing ?? "—" },
    { k: "Parking", v: unit.parking ?? "—" },
    { k: "Price", v: unit.price != null ? formatMoney(unit.price, "INR") : "—" },
    {
      k: "₹/sqft",
      v: pricePerSqftCarpet(unit.price, unit.carpetSqft) || "—",
    },
    { k: "Location / address", v: unit.addressLine ?? "—" },
    { k: "Owner / seller", v: unit.ownerName ?? "—" },
  ];

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <Link href="/org/projects/all-units">🏠 Units</Link> · Standalone
          </div>
          <h1>
            {unit.unitNo}{" "}
            <span className={`badge ${STATUS_BADGE[unit.status]}`}>
              {STATUSES.find((s) => s.value === unit.status)?.label}
            </span>
          </h1>
          <div className="sub">
            Resale / broker listing — not attached to a project.
          </div>
        </div>
        <div className="actions">
          {editing ? (
            <>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setForm(toForm(unit));
                  setEditing(false);
                  setError(null);
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void save()}
                disabled={saving}
              >
                {saving ? "Saving…" : "💾 Save"}
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-ghost text-rose"
                type="button"
                onClick={() => setConfirmDelete(true)}
              >
                🗑 Delete
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => setEditing(true)}
              >
                ✏️ Edit
              </button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <Reveal delay={1}>
          <div className="form-alert mb-14">{error}</div>
        </Reveal>
      ) : null}

      <Reveal delay={1}>
        {editing ? (
          <div className="card pad-26">
            <div className="sec">
              <div className="lbl">🏠 Unit details</div>
              <div className="grid g3">
                <div className="field">
                  <label>
                    Unit number <span className="req">*</span>
                  </label>
                  <input
                    className="inp mono"
                    value={form.unitNo}
                    onChange={(e) => patch({ unitNo: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>
                    Configuration <span className="req">*</span>
                  </label>
                  <ConfigurationSelect
                    catalog={catalog}
                    error={catalogError}
                    value={form.configuration}
                    onChange={(v) => patch({ configuration: v })}
                  />
                </div>
                <div className="field">
                  <label>Unit type</label>
                  <input
                    className="inp"
                    placeholder="e.g. Type A (optional)"
                    value={form.variantLabel}
                    onChange={(e) => patch({ variantLabel: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid g3">
                <div className="field">
                  <label>Carpet area (sqft)</label>
                  <input
                    className="inp"
                    type="number"
                    min={0}
                    value={form.carpetSqft}
                    onChange={(e) => patch({ carpetSqft: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Built-up area (sqft)</label>
                  <input
                    className="inp"
                    type="number"
                    min={0}
                    value={form.builtupSqft}
                    onChange={(e) => patch({ builtupSqft: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Facing</label>
                  <select
                    className="inp"
                    value={form.facing}
                    onChange={(e) => patch({ facing: e.target.value })}
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
              <div className="field mb-0" style={{ marginTop: 4 }}>
                <label>Parking</label>
                <div className="opts">
                  {PARKING_OPTIONS.map((p) => (
                    <span
                      key={p}
                      className={`opt ${form.parking === p ? "on" : ""}`}
                      onClick={() =>
                        patch({ parking: form.parking === p ? "" : p })
                      }
                    >
                      <span className="b">{form.parking === p ? "✓" : ""}</span>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="sec">
              <div className="lbl">💰 Pricing &amp; status</div>
              <div className="grid g3">
                <div className="field">
                  <label>Price</label>
                  <input
                    className="inp"
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => patch({ price: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Price / sqft</label>
                  <input className="inp" disabled placeholder="—" value={psqft} />
                </div>
                <div className="field">
                  <label>Status</label>
                  <select
                    className="inp"
                    value={form.status}
                    onChange={(e) =>
                      patch({ status: e.target.value as UnitStatus })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="sec">
              <div className="lbl">🖼️ Media &amp; documents</div>
              <UnitMediaFields
                floorPlanUrl={form.floorPlanUrl}
                galleryUrls={form.galleryUrls}
                onFloorPlanChange={(v) => patch({ floorPlanUrl: v })}
                onGalleryChange={(urls) => patch({ galleryUrls: urls })}
              />
            </div>

            <div className="sec nb">
              <div className="lbl">📋 Listing details</div>
              <div className="grid g2">
                <div className="field">
                  <label>Location / address</label>
                  <input
                    className="inp"
                    value={form.addressLine}
                    onChange={(e) => patch({ addressLine: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Owner / seller name</label>
                  <input
                    className="inp"
                    value={form.ownerName}
                    onChange={(e) => patch({ ownerName: e.target.value })}
                  />
                </div>
              </div>
              <div className="field mb-0">
                <label>Notes</label>
                <textarea
                  className="inp"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="cgrid">
            <div className="card">
              <div className="card-h">
                <span className="t">Details</span>
              </div>
              <div className="card-b">
                <div className="rev">
                  {specs.map((r) => (
                    <div className="sp" key={r.k}>
                      <span className="k">{r.k}</span>
                      <span className="v">{r.v}</span>
                    </div>
                  ))}
                </div>
                {unit.notes ? (
                  <p className="muted fs-12-5 mt-12" style={{ whiteSpace: "pre-line" }}>
                    {unit.notes}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="col gap-18">
              <div className="card">
                <div className="card-h">
                  <span className="t">Media</span>
                </div>
                <div className="card-b">
                  {unit.floorPlanUrl ? (
                    <a href={unit.floorPlanUrl} target="_blank" rel="noreferrer">
                      <img
                        src={unit.floorPlanUrl}
                        alt="Floor plan"
                        style={{ width: "100%", borderRadius: 10 }}
                      />
                    </a>
                  ) : (
                    <p className="muted fs-12-5">No floor plan.</p>
                  )}
                  {unit.galleryUrls.length > 0 ? (
                    <div className="row wrap gap-8 mt-8">
                      {unit.galleryUrls.map((g) => (
                        <a key={g} href={g} target="_blank" rel="noreferrer">
                          <img
                            src={g}
                            alt=""
                            style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }}
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </Reveal>

      <ConfirmModal
        open={confirmDelete}
        title="Delete standalone unit?"
        message={
          <>
            <strong>{unit.unitNo}</strong> will be permanently deleted. This
            can&apos;t be undone.
          </>
        }
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={() => void runDelete()}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
