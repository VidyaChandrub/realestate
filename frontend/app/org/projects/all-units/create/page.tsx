"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  apiFetch,
  createStandaloneUnit,
  getOrgCatalogOptions,
} from "@/lib/api";
import { parseAmount, parseCount, parseInteger } from "@/lib/parse";
import { formatMoney } from "@/lib/money";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
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
  OrgCatalogOption,
  ProjectsListResponse,
  ProjectListRow,
  Unit,
  UnitStatus,
} from "@/lib/types";

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

export default function UnitCreatePage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [mode, setMode] = useState<"project" | "standalone">("project");
  const [projects, setProjects] = useState<ProjectListRow[]>([]);
  const [projectId, setProjectId] = useState("");
  // The org's unit-type catalog (Settings → Project Catalogs) — the sole
  // source for "Configuration". `null` while loading.
  const [catalog, setCatalog] = useState<OrgCatalogOption[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  // The picked project's units — only to suggest / bound tower names.
  const [projectUnits, setProjectUnits] = useState<Unit[]>([]);
  const [ctxLoading, setCtxLoading] = useState(false);

  const [configuration, setConfiguration] = useState("");
  const [variantLabel, setVariantLabel] = useState("");
  const [unitNo, setUnitNo] = useState("");
  const [carpetSqft, setCarpetSqft] = useState("");
  const [builtupSqft, setBuiltupSqft] = useState("");
  const [tower, setTower] = useState("");
  const [floor, setFloor] = useState("");
  const [facing, setFacing] = useState("");
  const [parking, setParking] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<UnitStatus>("available");
  const [floorPlanUrl, setFloorPlanUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [addressLine, setAddressLine] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load the org's projects + the unit-type catalog (both org-level).
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    apiFetch<ProjectsListResponse>("/org/projects?page=1&limit=100", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!cancelled) setProjects(res.data);
      })
      .catch(() => {
        if (!cancelled)
          setError("Couldn't load your projects. Reload and try again.");
      });
    getOrgCatalogOptions("unit_type")
      .then((rows) => {
        if (cancelled) return;
        setCatalog(
          [...rows].sort(
            (a, b) =>
              a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
          ),
        );
        setCatalogError(null);
      })
      .catch((e) => {
        if (!cancelled)
          setCatalogError(
            e instanceof Error
              ? e.message
              : "Couldn't load configuration options.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const loadProjectUnits = useCallback(
    async (pid: string) => {
      if (!accessToken || !pid) {
        setProjectUnits([]);
        return;
      }
      setCtxLoading(true);
      setError(null);
      try {
        const rows = await apiFetch<Unit[]>(`/org/projects/${pid}/units`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setProjectUnits(rows);
      } catch {
        setProjectUnits([]);
        setError("Couldn't load that project's units.");
      } finally {
        setCtxLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    setTower("");
    void loadProjectUnits(projectId);
  }, [projectId, loadProjectUnits]);

  const selectedProject = projects.find((p) => p.id === projectId) ?? null;
  const currency = selectedProject?.currency ?? "INR";

  const otherTowers = useMemo(() => {
    const set = new Set<string>();
    for (const u of projectUnits) {
      if (u.tower && u.tower.trim()) set.add(u.tower.trim());
    }
    return [...set].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  }, [projectUnits]);

  const psqft = pricePerSqftCarpet(
    parseAmount(price),
    parseCount(carpetSqft),
  );

  const standalone = mode === "standalone";
  const fieldsDisabled = !standalone && projectId === "";

  const canSave =
    !saving &&
    (standalone || projectId !== "") &&
    configuration !== "" &&
    unitNo.trim() !== "";

  async function submit() {
    if (!accessToken || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      // The catalog label goes straight onto the unit as its configuration.
      // The server re-validates it against the org catalog.
      const body: CreateUnitInput = {
        configuration,
        variantLabel: variantLabel.trim() || undefined,
        unitNo: unitNo.trim(),
        carpetSqft: parseCount(carpetSqft),
        builtupSqft: parseCount(builtupSqft),
        // Tower / floor only apply to a project unit.
        tower: standalone ? undefined : tower.trim() || undefined,
        floor: standalone ? undefined : parseInteger(floor),
        facing: facing.trim() || undefined,
        parking: parking.trim() || undefined,
        price: parseAmount(price),
        status,
        floorPlanUrl: floorPlanUrl || undefined,
        galleryUrls: galleryUrls.length ? galleryUrls : undefined,
        addressLine: addressLine.trim() || undefined,
        ownerName: ownerName.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (standalone) {
        const created = await createStandaloneUnit(body);
        router.push(`/org/units/${created.id}`);
      } else {
        await apiFetch(`/org/projects/${projectId}/units`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
        router.push("/org/projects/all-units");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save unit.");
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <Link href="/org/projects/all-units">
              <Icon name="building" size={14} /> Units
            </Link>{" "}
            · Add
          </div>
          <h1>Add a unit</h1>
          <div className="sub">
            Add a unit to an existing project, or a standalone resale / broker
            listing with no project.
          </div>
        </div>
        <div className="actions">
          <Link href="/org/projects/all-units" className="btn btn-ghost">
            ✕ Cancel
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canSave}
            onClick={() => void submit()}
          >
            {saving ? "Saving…" : "💾 Save unit"}
          </button>
        </div>
      </div>

      {error ? (
        <Reveal delay={1}>
          <div className="form-alert mb-14">{error}</div>
        </Reveal>
      ) : null}

      <Reveal delay={1}>
        <div className="cgrid">
          <div className="card pad-26">
            <div className="sec">
              <div className="lbl">📦 How do you want to add this unit?</div>
              <div className="mode">
                <div
                  className={`modecard ${mode === "project" ? "on" : ""}`}
                  onClick={() => setMode("project")}
                >
                  <div className="ic">🏗️</div>
                  <b>Inside a project</b>
                  <small>Attach to an existing development &amp; tower.</small>
                </div>
                <div
                  className={`modecard ${mode === "standalone" ? "on" : ""}`}
                  onClick={() => setMode("standalone")}
                >
                  <div className="ic">🏠</div>
                  <b>Standalone unit</b>
                  <small>Resale / broker listing — no project needed.</small>
                </div>
              </div>
            </div>

            {!standalone ? (
              <div className="sec">
                <div className="lbl">🏗️ Placement</div>
                <div className="grid g3">
                  <div className="field">
                    <label>
                      Project <span className="req">*</span>
                    </label>
                    <select
                      className="inp"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                    >
                      <option value="">Select a project…</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Tower / block</label>
                    {projectId ? (
                      <TowerCombobox
                        value={tower}
                        onChange={setTower}
                        otherTowers={otherTowers}
                        towerCount={selectedProject?.towerCount ?? null}
                        disabled={ctxLoading}
                      />
                    ) : (
                      <input
                        className="inp"
                        disabled
                        placeholder="Pick a project first"
                      />
                    )}
                  </div>
                  <div className="field">
                    <label>Floor</label>
                    <input
                      className="inp"
                      type="number"
                      placeholder="12"
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      disabled={fieldsDisabled}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="sec">
              <div className="lbl">🏠 Unit details</div>
              <div className="grid g3">
                <div className="field">
                  <label>
                    Unit number <span className="req">*</span>
                  </label>
                  <input
                    className="inp mono"
                    placeholder="B-1204"
                    value={unitNo}
                    onChange={(e) => setUnitNo(e.target.value)}
                    disabled={fieldsDisabled}
                  />
                </div>
                <div className="field">
                  <label>
                    Configuration <span className="req">*</span>
                  </label>
                  <ConfigurationSelect
                    catalog={catalog}
                    error={catalogError}
                    value={configuration}
                    onChange={setConfiguration}
                    disabled={fieldsDisabled}
                  />
                </div>
                <div className="field">
                  <label>Unit type</label>
                  <input
                    className="inp"
                    placeholder="e.g. Type A (optional)"
                    value={variantLabel}
                    onChange={(e) => setVariantLabel(e.target.value)}
                    disabled={fieldsDisabled}
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
                    placeholder="1450"
                    value={carpetSqft}
                    onChange={(e) => setCarpetSqft(e.target.value)}
                    disabled={fieldsDisabled}
                  />
                </div>
                <div className="field">
                  <label>Built-up area (sqft)</label>
                  <input
                    className="inp"
                    type="number"
                    min={0}
                    placeholder="1720"
                    value={builtupSqft}
                    onChange={(e) => setBuiltupSqft(e.target.value)}
                    disabled={fieldsDisabled}
                  />
                </div>
                <div className="field">
                  <label>Facing</label>
                  <select
                    className="inp"
                    value={facing}
                    onChange={(e) => setFacing(e.target.value)}
                    disabled={fieldsDisabled}
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
                      className={`opt ${parking === p ? "on" : ""}`}
                      onClick={() =>
                        setParking((cur) => (cur === p ? "" : p))
                      }
                    >
                      <span className="b">{parking === p ? "✓" : ""}</span>
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
                    placeholder="16500000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={fieldsDisabled}
                  />
                </div>
                <div className="field">
                  <label>Price / sqft</label>
                  <input className="inp" placeholder="—" disabled value={psqft} />
                </div>
                <div className="field">
                  <label>Status</label>
                  <select
                    className="inp"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as UnitStatus)}
                    disabled={fieldsDisabled}
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
                floorPlanUrl={floorPlanUrl}
                galleryUrls={galleryUrls}
                onFloorPlanChange={setFloorPlanUrl}
                onGalleryChange={setGalleryUrls}
                ctx={projectId ? { projectId } : undefined}
              />
            </div>

            <div className="sec nb">
              <div className="lbl">
                📋{" "}
                {standalone
                  ? "Listing details"
                  : "For resale / broker listings (optional)"}
              </div>
              <div className="grid g2">
                <div className="field">
                  <label>Location / address</label>
                  <input
                    className="inp"
                    placeholder="SG Highway, Ahmedabad"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Owner / seller name</label>
                  <input
                    className="inp"
                    placeholder="Resale owner"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </div>
              </div>
              <div className="field mb-0">
                <label>Notes</label>
                <textarea
                  className="inp"
                  rows={2}
                  placeholder="Ready to move, semi-furnished, negotiable…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="col gap-18">
            <div className="card">
              <div className="card-h">
                <span className="t">Preview</span>
              </div>
              <div className="card-b">
                <div className="ph-box">📐</div>
                <div className="row between">
                  <b>{unitNo || "New unit"}</b>
                  <span className={`badge ${STATUS_BADGE[status]}`}>
                    {STATUSES.find((s) => s.value === status)?.label}
                  </span>
                </div>
                <div className="muted fs-12-5 mt-4">
                  {standalone
                    ? "Standalone unit"
                    : selectedProject?.name || "Select a project"}
                  {configuration ? ` · ${configuration}` : ""}
                  {variantLabel ? ` · ${variantLabel}` : ""}
                  {tower ? ` · ${tower}` : ""}
                  {floor ? ` · Floor ${floor}` : ""}
                  <br />
                  {[
                    facing || null,
                    carpetSqft
                      ? `${Number(carpetSqft).toLocaleString("en-IN")} sqft carpet`
                      : null,
                    psqft || null,
                    price ? formatMoney(parseAmount(price), currency) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Fill the form to preview."}
                </div>
              </div>
            </div>
            <div className="help">
              💡 Configuration comes from your{" "}
              <Link className="brand-link" href="/org/settings?section=catalogs">
                Project Catalogs
              </Link>
              . The unit stores its own carpet / built-up / price.
            </div>
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={!canSave}
              onClick={() => void submit()}
            >
              {saving ? "Saving…" : "💾 Save unit"}
            </button>
          </div>
        </div>
      </Reveal>
    </>
  );
}
