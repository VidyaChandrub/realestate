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
            <div className="media h-280" style={{ position: "relative", overflow: "hidden", borderRadius: "14px" }}>
              {project.coverImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={project.coverImageUrl}
                  alt={`${project.name} cover`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "#fff" }}>
                  <span style={{ fontSize: 42 }}>🏙️</span>
                  <span className="cap" style={{ marginTop: 8, fontSize: 16, fontWeight: 700 }}>{project.name}</span>
                </div>
              )}
              <div style={{ position: "absolute", bottom: 12, left: 16, right: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className={`badge ${project.status === "active" ? "b-green" : "b-gray"}`} style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                  {project.status === "active" ? "● Active Project" : "○ Inactive"}
                </span>
                {project.reraId ? (
                  <span className="badge b-violet" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4)", fontFamily: "monospace" }}>
                    RERA: {project.reraId}
                  </span>
                ) : null}
              </div>
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

          {/* Dynamic Inventory & Availability Performance Widget */}
          <Reveal delay={2}>
            <div className="card">
              <div className="card-h">
                <span className="t" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  📊 Inventory &amp; Availability Metrics
                </span>
                <Link className="x brand-link" href={`/org/projects/${id}/units`}>Manage Unit Inventory →</Link>
              </div>
              <div className="card-b col gap-16">
                {/* 4 Key Inventory Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface-2, #f8fafc)", border: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 11.5, color: "var(--muted, #64748b)", fontWeight: 600 }}>Total Units</div>
                    <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
                      {project.rollup.totalUnitsPlanned || project.rollup.unitsCreated || "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      {project.rollup.unitsCreated} configured
                    </div>
                  </div>

                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                    <div style={{ fontSize: 11.5, color: "var(--green, #10b981)", fontWeight: 600 }}>Available</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green, #10b981)", marginTop: 4 }}>
                      {project.rollup.unitsAvailable}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Ready for booking</div>
                  </div>

                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                    <div style={{ fontSize: 11.5, color: "var(--indigo, #6366f1)", fontWeight: 600 }}>Booked / Sold</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--indigo, #6366f1)", marginTop: 4 }}>
                      {project.rollup.unitsBooked}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Confirmed sales</div>
                  </div>

                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                    <div style={{ fontSize: 11.5, color: "var(--amber, #f59e0b)", fontWeight: 600 }}>Blocked / Held</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--amber, #f59e0b)", marginTop: 4 }}>
                      {project.rollup.unitsHeld}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Under token / token lock</div>
                  </div>
                </div>

                {/* Multi-segment Progress Bar */}
                <div>
                  {(() => {
                    const total = project.rollup.unitsCreated > 0 ? project.rollup.unitsCreated : project.rollup.totalUnitsPlanned;
                    const soldPct = total > 0 ? Math.round((project.rollup.unitsBooked / total) * 100) : 0;
                    const heldPct = total > 0 ? Math.round((project.rollup.unitsHeld / total) * 100) : 0;
                    const availPct = Math.max(0, 100 - soldPct - heldPct);
                    return (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
                          <span>
                            <strong>{soldPct}%</strong> Sold · <strong>{heldPct}%</strong> Held · <strong>{availPct}%</strong> Available
                          </span>
                          <span style={{ color: "var(--muted)" }}>Total Capacity: {total} Units</span>
                        </div>
                        <div style={{ height: 10, borderRadius: 5, background: "var(--surface-2, #e2e8f0)", overflow: "hidden", display: "flex" }}>
                          <div style={{ width: `${soldPct}%`, background: "var(--indigo, #6366f1)", transition: "width 0.4s" }} title={`Sold: ${soldPct}%`} />
                          <div style={{ width: `${heldPct}%`, background: "var(--amber, #f59e0b)", transition: "width 0.4s" }} title={`Held: ${heldPct}%`} />
                          <div style={{ width: `${availPct}%`, background: "var(--green, #10b981)", transition: "width 0.4s" }} title={`Available: ${availPct}%`} />
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Project Details & Dimensions Widget */}
          <Reveal delay={2}>
            <div className="card">
              <div className="card-h">
                <span className="t">Overview &amp; Physical Specifications</span>
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

          {/* Unit Types & Floor Plan Breakdown Widget */}
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h">
                <span className="t">Unit Configurations &amp; BHK Inventory</span>
                <Link className="x brand-link" href={`/org/projects/${id}/units`}>Manage inventory →</Link>
              </div>
              <div className="card-b">
                {project.unitTypes.length === 0 ? (
                  <p className="muted">No unit types configured yet — add them from the Units tab.</p>
                ) : (
                  <div className="grid g3">
                    {project.unitTypes.map((u) => (
                      <Link key={u.id} href={`/org/projects/${id}/units`} className="utype-card" style={{ textDecoration: "none", color: "inherit" }}>
                        <div className="cover media plan" style={{ position: "relative" }}>
                          <span>📐</span>
                          <span className="cap">{u.name}</span>
                          {u.carpetSqft ? (
                            <span style={{ position: "absolute", top: 8, right: 8, fontSize: 10.5, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>
                              {u.carpetSqft} sqft carpet
                            </span>
                          ) : null}
                        </div>
                        <div className="info">
                          <b>{u.name}</b>
                          <div className="muted fs-12-5" style={{ marginTop: 2 }}>
                            {[
                              u.builtupSqft ? `${u.builtupSqft} sqft super` : null,
                              u.price != null ? formatMoney(u.price, project.currency) : null,
                            ].filter(Boolean).join(" · ") || "—"}
                          </div>
                          {u.price && u.builtupSqft ? (
                            <div style={{ fontSize: 11, color: "var(--indigo, #4f46e5)", fontWeight: 600, marginTop: 3 }}>
                              ₹{Math.round(u.price / u.builtupSqft).toLocaleString("en-IN")}/sqft
                            </div>
                          ) : null}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                            <span className={`badge ${u.availableUnits > 0 ? "b-green" : "b-amber"}`}>
                              {u.availableUnits} available
                            </span>
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>
                              {u.bookedUnits} booked / {u.totalUnits || u.unitCount}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          {/* Pricing, Commercials & Inclusions Widget */}
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h">
                <span className="t">Commercials, Pricing &amp; Schemes</span>
              </div>
              <div className="card-b col gap-14">
                <div className="spec-grid">
                  <div className="sp">
                    <div className="k">Price Range</div>
                    <div className="v">{priceRange}</div>
                  </div>
                  <div className="sp">
                    <div className="k">Base Rate</div>
                    <div className="v">{project.baseRate ? `₹${project.baseRate.toLocaleString("en-IN")}/sqft` : "—"}</div>
                  </div>
                  <div className="sp">
                    <div className="k">Booking Token</div>
                    <div className="v">{project.bookingAmount ? formatMoney(project.bookingAmount, project.currency) : "—"}</div>
                  </div>
                  <div className="sp">
                    <div className="k">Payment Plan</div>
                    <div className="v">{project.paymentPlan || "Standard Milestone"}</div>
                  </div>
                </div>

                {project.priceIncludes && project.priceIncludes.length > 0 ? (
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
                      Price Inclusions
                    </div>
                    <div className="row wrap gap-8">
                      {project.priceIncludes.map((inc) => (
                        <span className="chip" key={inc} style={{ background: "rgba(99, 102, 241, 0.08)", borderColor: "rgba(99, 102, 241, 0.2)", color: "var(--indigo, #4f46e5)" }}>
                          ✓ {inc}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {project.offers ? (
                  noteBlock("Special Offers & Incentives", project.offers, true)
                ) : null}
              </div>
            </div>
          </Reveal>

          {/* Location & Connectivity Hub Widget */}
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Location &amp; Connectivity Hub</span></div>
              <div className="card-b col gap-12">
                {project.addressLine || project.locality || project.city ? (
                  <div style={{ fontSize: 13, color: "var(--fg)", lineHeight: 1.5 }}>
                    📍 {[project.addressLine, project.locality, project.city, project.pincode].filter(Boolean).join(", ")}
                  </div>
                ) : null}

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
                    Transit &amp; Highway Connectivity
                  </div>
                  <div className="row wrap gap-8">
                    {project.connectivity.length === 0 ? (
                      <span className="muted fs-13">No connectivity details entered.</span>
                    ) : (
                      project.connectivity.map((c) => (
                        <span className="chip" key={c}>🚗 {c}</span>
                      ))
                    )}
                  </div>
                </div>

                {project.landmarks
                  ? noteBlock("Key landmarks nearby", project.landmarks, true)
                  : null}
              </div>
            </div>
          </Reveal>

          {/* Amenities Widget */}
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Amenities &amp; Lifestyle Features</span></div>
              <div className="card-b row wrap gap-8">
                {project.amenities.length === 0 ? (
                  <span className="muted">None added.</span>
                ) : (
                  project.amenities.map((a) => (
                    <span className="chip" key={a.name}>✨ {a.name}</span>
                  ))
                )}
              </div>
            </div>
          </Reveal>

          {/* Specifications Widget */}
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Construction Finishes &amp; Specifications</span></div>
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
                      ? noteBlock("Architectural & engineering notes", spec.notes, specRows.length > 0)
                      : null}
                  </>
                )}
              </div>
            </div>
          </Reveal>

          {/* Marketing & Automation Widget */}
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Marketing &amp; Lead Automation</span></div>
              <div className="card-b">
                {!hasMarketing ? (
                  <span className="muted">Not configured.</span>
                ) : (
                  <div className="spec-grid">
                    <div className="sp"><div className="k">Ad sources</div><div className="v">{mkt.adSources?.length ? mkt.adSources.join(", ") : "—"}</div></div>
                    <div className="sp"><div className="k">Monthly budget</div><div className="v">{formatMoney(mkt.monthlyBudget ?? null, project.currency)}</div></div>
                    <div className="sp"><div className="k">Target CPL</div><div className="v">{formatMoney(mkt.targetCpl ?? null, project.currency)}</div></div>
                    <div className="sp"><div className="k">Monthly lead goal</div><div className="v">{mkt.leadGoal ? `${mkt.leadGoal} leads` : "—"}</div></div>
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

        {/* Right Column / Side Widgets */}
        <div className="col gap-18">
          <Reveal delay={1}>
            <div className="card">
              <div className="card-h"><span className="t">Direct Lead Entry</span></div>
              <div className="card-b">
                <div className="field"><label>Full name</label><input className="inp" placeholder="Customer name" /></div>
                <div className="field"><label>Phone</label><input className="inp" placeholder="+91 " /></div>
                <div className="row2">
                  <div className="field">
                    <label>Configuration</label>
                    <select className="inp">
                      <option>Select</option>
                      {project.unitTypes.map((u) => <option key={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Budget</label>
                    <select className="inp">
                      <option>Select range</option>
                      <option>Under ₹50 L</option>
                      <option>₹50 L – ₹1 Cr</option>
                      <option>₹1 Cr – ₹2.5 Cr</option>
                      <option>₹2.5 Cr+</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Source</label>
                  <select className="inp">
                    <option>Walk-in / Site Visit</option>
                    <option>Meta Ad</option>
                    <option>Google Search</option>
                    <option>Direct Referral</option>
                    <option>Channel Partner</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-block">Submit &amp; Create Lead →</button>
                {project.brochureUrl ? (
                  <a href={project.brochureUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-block mt-8">⬇ Download Brochure</a>
                ) : null}
                {project.reraCertificateUrl ? (
                  <a href={project.reraCertificateUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-block mt-8">🏛️ RERA Certificate</a>
                ) : null}
              </div>
            </div>
          </Reveal>

          {/* Assigned Sales Team Widget */}
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Assigned Project Team</span></div>
              <div className="card-b col gap-12">
                {project.manager ? (
                  <div className="u" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="av" style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--indigo, #4f46e5)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                      {managerInitials(project.manager.name)}
                    </span>
                    <div>
                      <span className="nm" style={{ fontWeight: 600 }}>{project.manager.name}</span>
                      <br />
                      <span className="sm" style={{ fontSize: 11.5, color: "var(--muted)" }}>Project Manager</span>
                    </div>
                  </div>
                ) : (
                  <span className="muted fs-13">No project manager assigned.</span>
                )}
                {salesAgents.map((a) => (
                  <div className="u" key={a.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="av" style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--surface-2, #f1f5f9)", color: "var(--fg)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                      {managerInitials(a.name)}
                    </span>
                    <div>
                      <span className="nm" style={{ fontWeight: 600 }}>{a.name}</span>
                      <br />
                      <span className="sm" style={{ fontSize: 11.5, color: "var(--muted)" }}>Sales Agent</span>
                    </div>
                  </div>
                ))}
                {salesAgents.length === 0 ? (
                  <span className="muted fs-12-5">No sales agents assigned to this project.</span>
                ) : null}
              </div>
            </div>
          </Reveal>

          {/* Access & Governance Controls */}
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Governance &amp; Access</span></div>
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
