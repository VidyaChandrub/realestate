"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, getProjectSalesAgents } from "@/lib/api";
import { formatMoney, formatMoneyRange } from "@/lib/money";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { ProjectPageHead } from "@/components/org/project-tabs";
import "@/app/org/org.css";
import type { ProjectDetail, ProjectSalesAgent } from "@/lib/types";

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
  const [salesAgents, setSalesAgents] = useState<ProjectSalesAgent[]>([]);
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

  useEffect(() => {
    if (!accessToken || !id) return;
    getProjectSalesAgents(id)
      .then(setSalesAgents)
      .catch(() => setSalesAgents([]));
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

  const priceRange = formatMoneyRange(
    project.priceMin,
    project.priceMax,
    project.currency,
  );

  // Piece A/C preference blobs — loosely typed, may be null or partial.
  const spec = (project.specifications ?? {}) as {
    flooring?: string; kitchen?: string; doorsWindows?: string;
    fittings?: string; notes?: string;
  };
  const specRows: [string, string | undefined][] = [
    ["Flooring", spec.flooring],
    ["Kitchen", spec.kitchen],
    ["Doors & windows", spec.doorsWindows],
    ["Fittings", spec.fittings],
  ].filter(([, v]) => v) as [string, string][];

  const mkt = (project.marketing ?? {}) as {
    adSources?: string[];
    monthlyBudget?: number | null;
    targetCpl?: number | null;
    leadGoal?: number | null;
    landingPageChoice?: string;
    aiCallingEnabled?: boolean;
    whatsappWelcomeEnabled?: boolean;
    roundRobinEnabled?: boolean;
    aiKnowledgeBaseEnabled?: boolean;
  };
  const hasMarketing = project.marketing != null;
  const onOff = (v: boolean | undefined) => (
    <span className={`badge ${v ? "b-green" : "b-gray"}`}>{v ? "On" : "Off"}</span>
  );

  // A labelled free-text block (landmarks, spec notes) — separated from the
  // chips/tiles above it so it doesn't read as stray grey text.
  const noteBlock = (label: string, text: string, divided: boolean) => (
    <div style={divided ? { marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)" } : undefined}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
        {label}
      </div>
      <p style={{ whiteSpace: "pre-line", margin: 0, fontSize: 13, lineHeight: 1.6 }}>{text}</p>
    </div>
  );

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
    // Derived from real UnitType/Unit records — "—" until inventory is set up
    // in the Units section (the wizard never creates unit types).
    { k: "Total units", v: project.unitTypes.length === 0 ? "—" : String(project.rollup.totalUnitsPlanned) },
    { k: "Available", v: project.unitTypes.length === 0 ? "—" : String(project.rollup.unitsAvailable) },
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
        <div className="col gap-18">
          <Reveal delay={1}>
            <div className="media h-280">
              {project.coverImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={project.coverImageUrl}
                  alt={`${project.name} cover`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <>
                  <span>🏙️</span>
                  <span className="cap">{project.name} — Elevation</span>
                </>
              )}
            </div>
          </Reveal>

          {project.galleryUrls.length > 0 ? (
            <Reveal delay={2}>
              <div className="gallery">
                {project.galleryUrls.map((url) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img key={url} src={url} alt="" className="thumb media" style={{ objectFit: "cover" }} />
                ))}
              </div>
            </Reveal>
          ) : null}

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
                <Link className="x brand-link" href={`/org/projects/${id}/units`}>Manage inventory →</Link>
              </div>
              <div className="card-b">
                {project.unitTypes.length === 0 ? (
                  <p className="muted">No unit types yet — add them from the Units tab.</p>
                ) : (
                  <div className="grid g3">
                    {project.unitTypes.map((u) => (
                      <Link key={u.id} href={`/org/projects/${id}/units`} className="utype-card">
                        <div className="cover media plan">
                          <span>📐</span>
                          <span className="cap">{u.name}</span>
                        </div>
                        <div className="info">
                          <b>{u.name}</b>
                          <div className="muted fs-12-5">
                            {[u.builtupSqft ? `${u.builtupSqft} sqft` : null, u.price != null ? formatMoney(u.price, project.currency) : null].filter(Boolean).join(" · ") || "—"}
                          </div>
                          <span className={`badge ${u.availableUnits > 0 ? "b-green" : "b-amber"} mt-8`}>
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
              <div className="card-b row wrap gap-8">
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

          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Connectivity &amp; landmarks</span></div>
              <div className="card-b">
                <div className="row wrap gap-8">
                  {project.connectivity.length === 0 ? (
                    <span className="muted">None added.</span>
                  ) : (
                    project.connectivity.map((c) => (
                      <span className="chip" key={c}>{c}</span>
                    ))
                  )}
                </div>
                {project.landmarks
                  ? noteBlock("Key landmarks", project.landmarks, project.connectivity.length > 0)
                  : null}
              </div>
            </div>
          </Reveal>

          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Specifications</span></div>
              <div className="card-b">
                {specRows.length === 0 && !spec.notes ? (
                  <span className="muted">None added.</span>
                ) : (
                  <>
                    {specRows.length > 0 ? (
                      <div className="spec-grid">
                        {specRows.map(([k, v]) => (
                          <div className="sp" key={k}><div className="k">{k}</div><div className="v">{v}</div></div>
                        ))}
                      </div>
                    ) : null}
                    {spec.notes
                      ? noteBlock("Additional notes", spec.notes, specRows.length > 0)
                      : null}
                  </>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Marketing</span></div>
              <div className="card-b">
                {!hasMarketing ? (
                  <span className="muted">Not configured.</span>
                ) : (
                  <div className="spec-grid">
                    <div className="sp"><div className="k">Ad sources</div><div className="v">{mkt.adSources?.length ? mkt.adSources.join(", ") : "—"}</div></div>
                    <div className="sp"><div className="k">Monthly budget</div><div className="v">{formatMoney(mkt.monthlyBudget ?? null, project.currency)}</div></div>
                    <div className="sp"><div className="k">Target CPL</div><div className="v">{formatMoney(mkt.targetCpl ?? null, project.currency)}</div></div>
                    <div className="sp"><div className="k">Monthly lead goal</div><div className="v">{mkt.leadGoal ?? "—"}</div></div>
                    <div className="sp"><div className="k">Landing page</div><div className="v">{mkt.landingPageChoice || "—"}</div></div>
                    <div className="sp"><div className="k">AI voice calling</div><div className="v">{onOff(mkt.aiCallingEnabled)}</div></div>
                    <div className="sp"><div className="k">WhatsApp auto-welcome</div><div className="v">{onOff(mkt.whatsappWelcomeEnabled)}</div></div>
                    <div className="sp"><div className="k">Round-robin assignment</div><div className="v">{onOff(mkt.roundRobinEnabled)}</div></div>
                    <div className="sp"><div className="k">AI knowledge base</div><div className="v">{onOff(mkt.aiKnowledgeBaseEnabled)}</div></div>
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </div>

        <div className="col gap-18">
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
                {project.brochureUrl ? (
                  <a href={project.brochureUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-block mt-8">⬇ Download brochure</a>
                ) : (
                  <button className="btn btn-ghost btn-block mt-8" disabled>Brochure not uploaded</button>
                )}
                {project.reraCertificateUrl ? (
                  <a href={project.reraCertificateUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-block mt-8">🏛️ RERA certificate</a>
                ) : null}
              </div>
            </div>
          </Reveal>

          <Reveal delay={2}>
            <div className="card">
              <div className="card-h"><span className="t">Performance</span></div>
              <div className="card-b col gap-14">
                <div className="row between">
                  <span className="muted">Total leads</span>
                  <b><CountUp value={totalLeads} /></b>
                </div>
                <div className="row between">
                  <span className="muted">Units available</span>
                  <b>{project.rollup.unitsAvailable}</b>
                </div>
                <div className="row between">
                  <span className="muted">Units booked</span>
                  <b>{project.rollup.unitsBooked}</b>
                </div>
                <div className="divider" />
                <div>
                  <div className="row between fs-13 mb-5">
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
              <div className="card-b col gap-12">
                {project.manager ? (
                  <div className="u">
                    <span className="av">{managerInitials(project.manager.name)}</span>
                    <span><span className="nm">{project.manager.name}</span><br /><span className="sm">Project Manager</span></span>
                  </div>
                ) : (
                  <span className="muted">No manager assigned.</span>
                )}
                {salesAgents.map((a) => (
                  <div className="u" key={a.id}>
                    <span className="av">{managerInitials(a.name)}</span>
                    <span><span className="nm">{a.name}</span><br /><span className="sm">Sales Agent</span></span>
                  </div>
                ))}
                {salesAgents.length === 0 ? (
                  <span className="muted fs-12-5">No sales agents assigned.</span>
                ) : null}
                <button className="btn btn-ghost btn-block mt-4">✨ AI agent</button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Access</span></div>
              <div className="card-b">
                <div className="spec-grid">
                  <div className="sp"><div className="k">Booking approval</div><div className="v">{onOff(project.requireBookingApproval)}</div></div>
                  <div className="sp"><div className="k">Visible to telecallers</div><div className="v">{onOff(project.visibleToTelecallers)}</div></div>
                  <div className="sp"><div className="k">Published to website</div><div className="v">{onOff(project.publishedToWebsite)}</div></div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </>
  );
}
