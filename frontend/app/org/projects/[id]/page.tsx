"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { ProjectPageHead } from "@/components/org/project-tabs";
import "@/app/admin-console/superadmin.css";
import "../projects.css";
import type { ProjectDetail } from "@/lib/types";

function compactRupees(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function managerInitials(name: string | null | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function OrgProjectOverviewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { accessToken } = useAuth();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!accessToken || !id) return;
    setLoading(true);
    setNotFound(false);
    apiFetch<ProjectDetail>(`/org/projects/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setProject)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  if (notFound) {
    return (
      <>
        <ProjectPageHead active="overview" />
        <div className="card"><div className="card-b"><p className="muted">Project not found.</p><Link href="/org/projects" className="btn btn-ghost btn-sm">← Back to projects</Link></div></div>
      </>
    );
  }

  if (loading || !project) {
    return (
      <>
        <ProjectPageHead active="overview" />
        <div className="card"><div className="card-b"><p className="muted">Loading…</p></div></div>
      </>
    );
  }

  const priceRange = project.priceMin != null || project.priceMax != null
    ? `${compactRupees(project.priceMin)} – ${compactRupees(project.priceMax)}`
    : "—";

  const configuration = project.unitTypes.length > 0
    ? project.unitTypes.map((u) => u.name).join(", ")
    : "—";

  const totalLeads = 0;

  const specs: { k: string; v: string; mono?: boolean }[] = [
    { k: "Location", v: project.location || "—" },
    { k: "Configuration", v: configuration },
    { k: "Price range", v: priceRange },
    { k: "Total area", v: project.landArea != null ? `${project.landArea} acres` : "—" },
    { k: "Towers", v: [project.towerCount != null ? `${project.towerCount} towers` : null, project.floorsDescription || null].filter(Boolean).join(" · ") || "—" },
    { k: "Total units", v: String(project.rollup.totalUnitsPlanned) },
    { k: "Available", v: String(project.rollup.unitsAvailable) },
    { k: "Possession", v: project.possession || "—" },
    { k: "RERA", v: project.reraId || "—", mono: true },
  ];

  return (
    <>
      <ProjectPageHead
        active="overview"
        project={{
          name: project.name,
          status: project.status,
          location: project.location,
          reraId: project.reraId,
          manager: project.manager?.name ?? null,
        }}
        actions={
          <>
            <Link href={`/org/projects/${id}/edit`} className="btn btn-ghost">
              ✏️ Edit
            </Link>
            <button className="btn btn-primary" type="button">＋ Add lead</button>
          </>
        }
      />

      <div className="grid g-2-1">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={1}>
            <div className="media" style={{ height: 280 }}>
              <span>🏙️</span>
              <span className="cap">{project.name} — Elevation</span>
            </div>
          </Reveal>

          <Reveal delay={2}>
            <div className="gallery">
              <div className="thumb media"><span>🏢</span></div>
              <div className="thumb media" style={{ background: "linear-gradient(135deg, #86efac, #22c55e)" }}><span>🌳</span></div>
              <div className="thumb media" style={{ background: "linear-gradient(135deg, #93c5fd, #3b82f6)" }}><span>🏊</span></div>
              <div className="thumb media" style={{ background: "linear-gradient(135deg, #fde68a, #f59e0b)" }}><span>🛋️</span></div>
            </div>
          </Reveal>

          <Reveal delay={2}>
            <div className="card">
              <div className="card-h">
                <span className="t">Project details</span>
                <span className={`badge ${project.status === "active" ? "b-green" : "b-gray"}`}>
                  {project.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="card-b">
                <div className="spec-grid">
                  {specs.map((s) => (
                    <div className="sp" key={s.k}>
                      <div className="k">{s.k}</div>
                      <div className={`v${s.mono ? " mono" : ""}`}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={3}>
            <div className="card">
              <div className="card-h">
                <span className="t">Unit types</span>
                <Link className="x" href={`/org/projects/${id}/units`} style={{ color: "var(--brand)" }}>Manage inventory →</Link>
              </div>
              <div className="card-b">
                {project.unitTypes.length === 0 ? (
                  <p className="muted">No unit types yet — add them from the Units tab.</p>
                ) : (
                  <div className="grid g3">
                    {project.unitTypes.map((u) => (
                      <Link key={u.id} href={`/org/projects/${id}/units`} className="utype-card">
                        <div className="cover media plan" style={{ borderRadius: "14px 14px 0 0" }}>
                          <span>📐</span>
                          <span className="cap">{u.name}</span>
                        </div>
                        <div className="info">
                          <b>{u.name}</b>
                          <div className="muted" style={{ fontSize: 12.5 }}>
                            {[u.builtupSqft ? `${u.builtupSqft} sqft` : null, u.price != null ? compactRupees(u.price) : null].filter(Boolean).join(" · ") || "—"}
                          </div>
                          <span className={`badge ${u.availableUnits > 0 ? "b-green" : "b-amber"}`} style={{ marginTop: 8 }}>
                            {u.availableUnits} available
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Amenities</span></div>
              <div className="card-b" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {project.amenities.length === 0 ? (
                  <span className="muted">None added.</span>
                ) : (
                  project.amenities.map((a) => (
                    <span className="chip" key={a.name}>{a.name}</span>
                  ))
                )}
              </div>
            </div>
          </Reveal>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={1}>
            <div className="card">
              <div className="card-h"><span className="t">Enquire / Apply</span></div>
              <div className="card-b">
                <div className="field"><label>Full name</label><input className="inp" placeholder="Customer name" /></div>
                <div className="field"><label>Phone</label><input className="inp" placeholder="+91 " /></div>
                <div className="row2">
                  <div className="field"><label>Configuration</label><select className="inp"><option>Select</option>{project.unitTypes.map((u) => <option key={u.id}>{u.name}</option>)}</select></div>
                  <div className="field"><label>Budget</label><select className="inp"><option>Select range</option><option>Under ₹50 L</option><option>₹50 L – ₹1 Cr</option><option>₹1 Cr+</option></select></div>
                </div>
                <div className="field"><label>Source</label><select className="inp"><option>Walk-in</option><option>Meta Ad</option><option>Google</option><option>Reference</option></select></div>
                <button className="btn btn-primary btn-block">Apply &amp; create lead →</button>
                <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>⬇ Download brochure</button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={2}>
            <div className="card">
              <div className="card-h"><span className="t">Performance</span></div>
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Total leads</span>
                  <b><CountUp value={totalLeads} /></b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Units available</span>
                  <b>{project.rollup.unitsAvailable}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Units booked</span>
                  <b>{project.rollup.unitsBooked}</b>
                </div>
                <div className="divider" />
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                    <span>Inventory sold</span>
                    <b>{project.rollup.unitsCreated > 0 ? Math.round((project.rollup.unitsBooked / project.rollup.unitsCreated) * 100) : 0}%</b>
                  </div>
                  <div className="bar">
                    <i data-w={`${project.rollup.unitsCreated > 0 ? Math.round((project.rollup.unitsBooked / project.rollup.unitsCreated) * 100) : 0}%`} />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Assigned team</span></div>
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {project.manager ? (
                  <div className="u">
                    <span className="av">{managerInitials(project.manager.name)}</span>
                    <span><span className="nm">{project.manager.name}</span><br /><span className="sm">Project Manager</span></span>
                  </div>
                ) : (
                  <span className="muted">No manager assigned.</span>
                )}
                <button className="btn btn-ghost btn-block" style={{ marginTop: 4 }}>✨ AI agent</button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </>
  );
}
