"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { ProjectTabs } from "@/components/org/project-tabs";
import "@/app/org/org.css";
import type { ProjectDetail, Unit, UnitStatus } from "@/lib/types";

const STATUS_BADGE: Record<UnitStatus, string> = {
  available: "b-green",
  booked: "b-rose",
  held: "b-amber",
  sold: "b-gray",
};

const STATUS_DOT: Record<UnitStatus, string> = {
  available: "var(--green)",
  booked: "var(--rose)",
  held: "var(--amber)",
  sold: "var(--slate, #64748b)",
};

const STATUS_LABEL: Record<UnitStatus, string> = {
  available: "Available",
  booked: "Booked",
  held: "Held",
  sold: "Sold",
};

function compactRupees(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1e7) {
    return `₹${(value / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  }
  if (value >= 1e5) {
    return `₹${(value / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

function pricePerSqft(price: number | null, carpetSqft: number | null): string | null {
  if (!price || !carpetSqft) return null;
  return `₹${Math.round(price / carpetSqft).toLocaleString("en-IN")} / sqft`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function OrgProjectUnitDetailPage() {
  const params = useParams<{ id: string; unitId: string }>();
  const id = params?.id ?? "";
  const unitId = params?.unitId ?? "";
  const { accessToken } = useAuth();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<UnitStatus | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !id || !unitId) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [proj, unitRow] = await Promise.all([
        apiFetch<ProjectDetail>(`/org/projects/${id}`, { headers }),
        apiFetch<Unit>(`/org/projects/${id}/units/${unitId}`, { headers }),
      ]);
      setProject(proj);
      setUnit(unitRow);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [accessToken, id, unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(next: UnitStatus) {
    if (!accessToken || !unit || next === unit.status) return;
    setBusyAction(next);
    setError(null);
    try {
      await apiFetch(`/org/projects/${id}/units/${unit.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: next }),
      });
      await load();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update unit status.");
    } finally {
      setBusyAction(null);
    }
  }

  if (notFound) {
    return (
      <>
        <ProjectTabs active="units" />
        <div className="card">
          <div className="card-b">
            <p className="muted">Unit not found.</p>
            <Link
              href={`/org/projects/${id}/units`}
              className="btn btn-ghost btn-sm"
            >
              ← Back to units
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (loading && !project) {
    return (
      <>
        <ProjectTabs active="units" />
        <div className="card">
          <div className="card-b">
            <p className="muted">Loading…</p>
          </div>
        </div>
      </>
    );
  }

  // Planned mix for this configuration — used only as a fallback for
  // display when the unit itself has no carpet/built-up/price set.
  const plannedType =
    project?.unitTypes.find((ut) => ut.name === unit?.configuration) ?? null;
  const effectivePrice = unit?.price ?? plannedType?.price ?? null;
  const carpet = unit?.carpetSqft ?? plannedType?.carpetSqft ?? null;
  const builtup = unit?.builtupSqft ?? plannedType?.builtupSqft ?? null;

  const subParts = [
    unit?.configuration ?? null,
    unit?.variantLabel ?? null,
    unit?.tower ?? null,
    unit?.floor != null ? `Floor ${unit.floor}` : null,
    carpet != null ? `${carpet.toLocaleString("en-IN")} sqft carpet` : null,
    unit?.facing != null ? `${unit.facing} facing` : null,
  ].filter(Boolean) as string[];

  const specs: { k: string; v: string }[] = [
    { k: "Configuration", v: unit?.configuration ?? "—" },
    { k: "Unit type", v: unit?.variantLabel ?? "—" },
    { k: "Carpet area", v: carpet != null ? `${carpet.toLocaleString("en-IN")} sqft` : "—" },
    { k: "Built-up", v: builtup != null ? `${builtup.toLocaleString("en-IN")} sqft` : "—" },
    {
      k: "Floor",
      v:
        unit?.floor != null
          ? [project?.towerCount != null ? `Floor ${unit.floor} of ${project.towerCount}` : null, project?.floorsDescription ?? null]
              .filter(Boolean)
              .join(" · ") || `Floor ${unit.floor}`
          : "—",
    },
    { k: "Facing", v: unit?.facing ?? "—" },
    { k: "Parking", v: unit?.parking ?? "—" },
    { k: "₹/sqft", v: pricePerSqft(effectivePrice, carpet) ?? "—" },
    { k: "Tower", v: unit?.tower ?? "—" },
    { k: "Possession", v: project?.possession ?? "—" },
  ];

  const kvRows: { k: string; v: string }[] = [
    { k: "Base price", v: effectivePrice != null ? compactRupees(effectivePrice) : "—" },
    { k: "Status", v: unit ? STATUS_LABEL[unit.status] : "—" },
    { k: "Tower", v: unit?.tower ?? "—" },
    { k: "Floor", v: unit?.floor != null ? String(unit.floor) : "—" },
    { k: "Possession", v: project?.possession ?? "—" },
    { k: "RERA", v: project?.reraId ?? "—" },
  ];

  const timeline = unit
    ? [
        {
          title: unit.configuration || "Unit",
          text: `Created — added to ${project?.name ?? "project"} sales inventory.`,
          date: formatDate(unit.createdAt),
        },
        {
          title: STATUS_LABEL[unit.status],
          text: `Currently marked ${STATUS_LABEL[unit.status].toLowerCase()} in the availability grid.`,
          date: STATUS_LABEL[unit.status] === "Available" ? "Now" : formatDate(unit.updatedAt),
        },
        {
          title: "Last updated",
          text: "Latest change recorded on this unit.",
          date: formatDate(unit.updatedAt),
        },
      ]
    : [];

  return (
    <>
      <Reveal delay={0}>
        <div className="page-head reveal in">
          <div>
            <div className="eyebrow">
              <Link href={`/org/projects/${id}/units`}>🏠 Units</Link> ·{" "}
              <Link href={`/org/projects/${id}`}>
                {project?.name ?? "Project"}
              </Link>
            </div>
            <h1>
              {unit ? `Unit ${unit.unitNo}` : "Unit"}{" "}
              {unit ? (
                <span className={`badge ${STATUS_BADGE[unit.status]}`}>
                  <span className="dot" style={{ background: STATUS_DOT[unit.status] }} />
                  {STATUS_LABEL[unit.status]}
                </span>
              ) : null}
            </h1>
            <div className="sub">
              {subParts.length > 0 ? subParts.join(" · ") : "Unit workspace"}
            </div>
          </div>
          <div className="actions">
            <Link href={`/org/projects/${id}/units`} className="btn btn-ghost">
              ← Back
            </Link>
            <Link href={`/org/projects/${id}/units`} className="btn btn-ghost">
              ✏️ Edit
            </Link>
          </div>
        </div>
      </Reveal>

      <ProjectTabs active="units" />

      {error ? (
        <Reveal delay={1}>
          <div className="form-alert mb-16">{error}</div>
        </Reveal>
      ) : null}

      {saved ? (
        <Reveal delay={1}>
          <div className="form-alert ok mb-16">✓ Status updated.</div>
        </Reveal>
      ) : null}

      {unit ? (
        <div className="ugrid reveal in" data-delay="1">
          <div className="col gap-18">
            <Reveal delay={1}>
              <div className="media h-280">
                <span>🏙️</span>
                <span className="cap">
                  {project?.name ?? ""} · {unit.unitNo}
                </span>
              </div>
            </Reveal>

            <Reveal delay={2}>
              <div className="gallery">
                <div className="thumb media plan">
                  <span>📐</span>
                </div>
                <div className="thumb media">
                  <span>🛋️</span>
                </div>
                <div className="thumb media g2v">
                  <span>🛏️</span>
                </div>
                <div className="thumb media g3v">
                  <span>🚿</span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={2}>
              <div className="card">
                <div className="card-h">
                  <span className="t">Specifications</span>
                </div>
                <div className="card-b">
                  <div className="unit-spec-grid">
                    {specs.map((s) => (
                      <div className="sp" key={s.k}>
                        <div className="k">{s.k}</div>
                        <div className="v">{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={3}>
              <div className="card">
                <div className="card-h">
                  <span className="t">Status history</span>
                </div>
                <div className="card-b">
                  <ul className="timeline">
                    {timeline.map((t) => (
                      <li key={t.title}>
                        <span className="td" />
                        <b>{t.title}</b> — {t.text}
                        <div className="tt">{t.date}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="col gap-18">
            <Reveal delay={1}>
              <div className="card">
                <div className="card-b">
                  <div className="pricebox">
                    <div className="muted fs-12">Price</div>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>
                      {compactRupees(effectivePrice)}
                    </div>
                    <div className="muted fs-12-5">
                      {pricePerSqft(effectivePrice, carpet) ?? "Price per sqft"} · all-inclusive
                    </div>
                  </div>
                  <div className="kv mt-16">
                    {kvRows.map((r) => (
                      <div className="row" key={r.k}>
                        <span className="k">{r.k}</span>
                        <span className="v">{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={2}>
              <div className="card">
                <div className="card-h">
                  <span className="t">Interested leads</span>
                </div>
                <div className="card-b">
                  <p className="muted fs-12-5">
                    No interested leads linked to this unit yet.
                  </p>
                  <Link
                    href={`/org/projects/${id}/leads`}
                    className="mt-8 btn btn-ghost btn-block"
                  >
                    Open project leads →
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={3}>
              <div className="card">
                <div className="card-h">
                  <span className="t">Actions</span>
                </div>
                <div className="card-b col gap-8">
                  <button
                    className="btn btn-primary btn-block"
                    type="button"
                    disabled={busyAction !== null || unit.status === "booked"}
                    onClick={() => void changeStatus("booked")}
                  >
                    {busyAction === "booked" ? "Saving…" : "✔️ Book unit"}
                  </button>
                  <button
                    className="btn btn-soft btn-block"
                    type="button"
                    disabled={busyAction !== null || unit.status === "held"}
                    onClick={() => void changeStatus("held")}
                  >
                    {busyAction === "held" ? "Saving…" : "🔒 Hold (48h)"}
                  </button>
                  <button
                    className="btn btn-ghost btn-block"
                    type="button"
                    disabled={busyAction !== null || unit.status === "sold"}
                    onClick={() => void changeStatus("sold")}
                  >
                    {busyAction === "sold" ? "Saving…" : "🏷️ Mark as sold"}
                  </button>
                  <button className="btn btn-ghost btn-block" type="button" disabled>
                    🔗 Send unit details
                  </button>
                  <button
                    className="btn btn-ghost btn-block"
                    type="button"
                    disabled
                    title="Floor plan upload is coming soon"
                  >
                    📐 Download floor plan
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      ) : null}
    </>
  );
}