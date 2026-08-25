"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Seg } from "@/components/superadmin/seg";
import { Canvas } from "@/components/prestate/builder/canvas";
import { Icon } from "@/components/icons";
import type { Plan, OrganisationListResponse, OrganisationDetail, AdminLandingPageRow, AdminLandingPagesListResponse, LandingPageStatus } from "@/lib/types";
import type { SectionInstance, SiteConfig } from "@/lib/prestate/types";
// Canvas renders using the prestate design system's ps-* classes — every
// rule in prestate.css is ps-prefixed, so importing it here can't leak into
// the rest of admin-console (same pattern app/org/templates already uses).
import "@/app/prestate/prestate.css";

interface AdminLandingPageDetail extends AdminLandingPageRow {
  content: { sections: SectionInstance[]; config: SiteConfig };
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts.slice(0,2).map(p=>p[0]?.toUpperCase()).join("");
}

const TOP_TABS = ["Organisations", "Landing Pages"] as const;

export default function SuperAdminApprovalsPage() {
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuth();

  const [topTab, setTopTab] = useState(0);

  useEffect(() => {
    if (!authLoading && !accessToken) router.replace("/login");
  }, [authLoading, accessToken, router]);

  if (authLoading || !accessToken) return null;

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="check" size={14} /> Review</div>
          <h1>Approvals</h1>
          <div className="sub">Everything awaiting super admin review — organisation sign-ups and submitted landing pages.</div>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <Seg options={[...TOP_TABS]} value={topTab} onChange={setTopTab} />
      </div>

      {topTab === 0 ? <OrganisationApprovalsTab accessToken={accessToken} /> : <LandingPageApprovalsTab accessToken={accessToken} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Organisations tab — the existing pending-registration approval flow,
// moved here unchanged (same endpoints, same behaviour). The team plans to
// retire this in favour of the inline Approve/Reject already on the
// Organisations list, but that hasn't happened yet — kept as a tab so it can
// be dropped later without touching the Landing Pages tab.
// ---------------------------------------------------------------------------
function OrganisationApprovalsTab({ accessToken }: { accessToken: string }) {
  const [pending, setPending] = useState<OrganisationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrganisationDetail | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly"|"yearly">("monthly");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (m:string)=>{ setToast(m); setTimeout(()=>setToast(null),2800); };

  const fetchPending = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await apiFetch<OrganisationListResponse>("/admin/organisations?status=pending&page=1&limit=50", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setPending(res);
      if (res.data.length && !selectedId) setSelectedId(res.data[0].id);
    } catch {}
    finally { setLoading(false); }
  };
  const fetchPlans = async () => {
    if (!accessToken) return;
    try {
      const data = await apiFetch<Plan[]>("/admin/plans", { headers: { Authorization: `Bearer ${accessToken}` } });
      setPlans(data);
    } catch {}
  };
  const fetchTemplates = async () => {
    if (!accessToken) return;
    try {
      const data = await apiFetch<any[]>("/admin/templates", { headers: { Authorization: `Bearer ${accessToken}` } });
      setTemplates(Array.isArray(data) ? data : (data as any).data ?? []);
    } catch {}
  };
  const fetchDetail = async (id:string) => {
    if (!accessToken) return;
    try {
      const d = await apiFetch<OrganisationDetail>(`/admin/organisations/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      setDetail(d);
    } catch {}
  };

  useEffect(()=>{ fetchPending(); fetchPlans(); fetchTemplates(); }, [accessToken]);
  useEffect(()=>{ if(selectedId) fetchDetail(selectedId); }, [selectedId]);

  const selectedPlan = plans.find(p=>p.id===selectedPlanId) ?? null;
  const maxTemplates = (()=>{
    if(!selectedPlan) return 0;
    const raw=(selectedPlan.limits as any)?.templates;
    if(!raw || raw==="All"||raw==="Unlimited") return Infinity;
    const n=parseInt(String(raw),10); return Number.isNaN(n)?Infinity:n;
  })();

  const toggleTemplate = (id:string)=>{
    if(selectedTemplateIds.includes(id)) setSelectedTemplateIds(prev=>prev.filter(x=>x!==id));
    else {
      if(selectedTemplateIds.length>=maxTemplates) return;
      setSelectedTemplateIds(prev=>[...prev,id]);
    }
  };

  const handleApprove = async ()=>{
    if(!selectedId) return;
    if(!selectedPlanId){ notify("Select a package to approve"); return; }
    if(selectedTemplateIds.length===0){ notify("Select at least 1 template"); return; }
    if(selectedTemplateIds.length>maxTemplates){ notify(`Max ${maxTemplates} templates for ${selectedPlan?.name}`); return; }
    setActionLoading(true);
    try {
      await apiFetch(`/admin/organisations/${selectedId}/approve`, {
        method:"POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ planId: selectedPlanId, billingCycle, templateIds: selectedTemplateIds }),
      });
      notify(`Approved ${detail?.name} → ${selectedPlan?.name}`);
      setSelectedPlanId(""); setSelectedTemplateIds([]);
      fetchPending(); setDetail(null);
      setSelectedId(null);
    } catch(e:any){ notify(e.message || "Approve failed"); }
    finally{ setActionLoading(false); }
  };
  const handleReject = async ()=>{
    if(!selectedId) return;
    if(!confirm(`Reject ${detail?.name}? This will disable the organisation.`)) return;
    setActionLoading(true);
    try {
      await apiFetch(`/admin/organisations/${selectedId}/reject`, {
        method:"POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({}),
      });
      notify(`Rejected ${detail?.name}`);
      fetchPending(); setSelectedId(null); setDetail(null);
    } catch(e:any){ notify(e.message || "Reject failed"); }
    finally{ setActionLoading(false); }
  };

  const rows = pending?.data ?? [];
  const totalPending = pending?.total ?? 0;

  return (
    <>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom: 12 }}>
        <span className="badge b-amber">{totalPending} pending</span>
        <Link className="btn btn-ghost" href="/admin-console/organisations" style={{ marginLeft: 10 }}>View all →</Link>
      </div>

      <div className="grid g-2-1">
        <div className="card reveal in">
          <div className="card-h">
            <span className="t">Pending organisations</span>
            <span className="badge b-amber">{totalPending}</span>
          </div>
          <div className="card-b" style={{ padding:8, maxHeight:600, overflow:"auto" }}>
            {loading ? <div style={{ padding:16, color:"var(--muted)"}}>Loading…</div> : rows.length===0 ? <div style={{ padding:16, color:"var(--muted)"}}>No pending organisations <Icon name="check" size={14} /></div> : rows.map((s,i)=>(
              <div key={s.id} onClick={()=>setSelectedId(s.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:14, borderRadius:12, background: selectedId===s.id?"var(--surface-2)":undefined, cursor:"pointer", border: selectedId===s.id?"1px solid var(--brand-100)":"1px solid transparent" }}>
                <span className="av">{initials(s.name)}</span>
                <span style={{ flex:1, minWidth:0 }}>
                  <span className="nm" style={{ fontWeight:600 }}>{s.name}</span><br/>
                  <span className="sm muted" style={{ fontSize:12 }}>{s.city} · {s.adminEmail ?? "—"} · {new Date(s.createdAt).toLocaleDateString("en-IN")}</span>
                </span>
                <span className="badge b-amber">Pending</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card reveal in" data-delay="1">
          {!selectedId || !detail ? (
            <div className="card-b" style={{ padding:32, textAlign:"center", color:"var(--muted)"}}>
              Select a pending organisation to review, assign package & templates, then approve.
            </div>
          ) : (
            <>
              <div className="card-h">
                <span className="t">Review · {detail.name}</span>
                <span className="badge b-amber">Pending</span>
              </div>
              <div className="card-b" style={{ display:"grid", gap:14 }}>
                <div style={{ display:"grid", gap:6, padding:12, border:"1px solid var(--line)", borderRadius:12, background:"var(--surface-2)" }}>
                  <div style={{ fontWeight:700 }}>{detail.name} <span style={{ fontWeight:400, color:"var(--muted)"}}>— {detail.city} · slug {detail.slug}</span></div>
                  <div style={{ fontSize:13, color:"var(--muted)"}}>Admin: {detail.admin?.firstName} {detail.admin?.lastName} · {detail.admin?.email} · {detail.admin?.phoneNumber ?? "—"}</div>
                  <div style={{ fontSize:12, color:"var(--muted)"}}>Created: {new Date(detail.createdAt).toLocaleString("en-IN")} · Users: {detail.userCount}</div>
                </div>

                <div style={{ display:"grid", gap:10 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>1. Choose package</div>
                  <div style={{ display:"flex", gap:6, background:"#eef1f6", borderRadius:999, padding:3, width:"fit-content"}}>
                    {(["monthly","yearly"] as const).map(c=>(
                      <button key={c} onClick={()=>setBillingCycle(c)} style={{ padding:"6px 12px", borderRadius:999, border:"none", background: billingCycle===c?"#fff":"transparent", fontWeight:600, fontSize:12, cursor:"pointer", textTransform:"capitalize" }}>{c}</button>
                    ))}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
                    {plans.map(p=>{
                      const isSel = selectedPlanId===p.id;
                      const price = billingCycle==="monthly"? p.priceMonthly : p.priceYearly;
                      const per = billingCycle==="monthly"? "/mo":"/yr";
                      const tplLimit=(p.limits as any)?.templates ?? "—";
                      return (
                        <div key={p.id} onClick={()=>{ setSelectedPlanId(p.id); setSelectedTemplateIds([]); }} style={{ border:"2px solid", borderColor:isSel?"var(--brand)":"var(--line)", borderRadius:14, padding:12, cursor:"pointer", background:isSel?"var(--brand-050)":"#fff"}}>
                          <div className={`badge ${p.badge}`}>{p.name}</div>
                          <div style={{ fontWeight:800, margin:"6px 0"}}>₹{price.toLocaleString("en-IN")}<span style={{ fontSize:11, color:"var(--muted)"}}>{per}</span></div>
                          <div style={{ fontSize:11, color:"var(--muted)"}}>{p.description}</div>
                          <div style={{ marginTop:6, display:"flex", gap:4, flexWrap:"wrap"}}>
                            <span className="chip" style={{ fontSize:10 }}>{tplLimit} templates</span>
                            <span className="chip" style={{ fontSize:10 }}>{p.limits?.projects} projects</span>
                          </div>
                          <div style={{ fontSize:11, fontWeight:700, color:isSel?"var(--brand)":"var(--muted)", marginTop:6}}>{isSel?" Selected":"Select"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedPlanId ? (
                  <div style={{ borderTop:"1px solid var(--line)", paddingTop:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
                      <div style={{ fontWeight:700, fontSize:13}}>2. Assign templates <span style={{ fontWeight:400, color:"var(--muted)", fontSize:11}}>max {maxTemplates===Infinity?"All":maxTemplates}</span></div>
                      <span className="chip">{selectedTemplateIds.length} selected</span>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10, maxHeight:260, overflow:"auto"}}>
                      {templates.map((tpl:any)=>{
                        const id=tpl.id;
                        const sel=selectedTemplateIds.includes(id);
                        const dis=!sel && selectedTemplateIds.length>=maxTemplates;
                        return (
                          <div key={id} onClick={()=> !dis && toggleTemplate(id)} style={{ border:"1px solid", borderColor:sel?"var(--brand)":"var(--line)", borderRadius:12, overflow:"hidden", cursor: dis?"not-allowed":"pointer", opacity: dis?0.5:1}}>
                            <div style={{ height:80, background: tpl.thumbnail? `url(${tpl.thumbnail}) center/cover`:"#eef1f6", position:"relative"}}>
                              <span style={{ position:"absolute", left:6, top:6, background: sel?"var(--brand)":"rgba(0,0,0,.55)", color:"#fff", fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:999}}>{sel?"":"Select"}</span>
                            </div>
                            <div style={{ padding:8}}>
                              <div style={{ fontWeight:700, fontSize:12}}>{tpl.name}</div>
                              <div style={{ fontSize:10, color:"var(--muted)"}}>{tpl.slug}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ fontSize:11, color:"var(--muted)", marginTop:6}}>
                      {selectedTemplateIds.length===0? "Select at least 1 template to approve.":"Selected within package limit."}
                    </div>
                  </div>
                ) : <div className="help">Select a package to see templates.</div>}

                <div className="divider" />
                <div style={{ display:"flex", gap:10}}>
                  <button className="btn btn-success" style={{ flex:1, justifyContent:"center"}} disabled={actionLoading || !selectedPlanId || selectedTemplateIds.length===0} onClick={handleApprove}>
                    {actionLoading?"Approving…":<><Icon name="check" size={14} /> Approve & activate</>}
                  </button>
                  <button className="btn btn-danger" style={{ flex:1, justifyContent:"center"}} disabled={actionLoading} onClick={handleReject}>
                    <Icon name="close" size={14} /> Reject
                  </button>
                </div>
                <div style={{ fontSize:11, color:"var(--muted)", textAlign:"center"}}>
                  Approve creates subscription + assigns templates and activates the organisation. Reject disables it.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {toast? <div style={{ position:"fixed", right:20, bottom:20, zIndex:500}}><div className="card" style={{ padding:"12px 16px", boxShadow:"var(--sh-lg)"}}>{toast}</div></div>:null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Landing Pages tab — new queue backed by GET /admin/landing-pages.
// ---------------------------------------------------------------------------
const LP_TABS = ["Pending", "Approved", "Rejected", "Published", "All"] as const;

function lpStatusFor(idx: number): LandingPageStatus | undefined {
  switch (idx) {
    case 0: return "pending_approval";
    case 1: return "approved";
    case 2: return "rejected";
    case 3: return "published";
    default: return undefined;
  }
}

function LandingPageApprovalsTab({ accessToken }: { accessToken: string }) {
  const [lpTab, setLpTab] = useState(0);
  const [list, setList] = useState<AdminLandingPagesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminLandingPageDetail | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800); };

  const fetchList = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "50" });
      const status = lpStatusFor(lpTab);
      if (status) params.set("status", status);
      const res = await apiFetch<AdminLandingPagesListResponse>(`/admin/landing-pages?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setList(res);
      if (res.data.length) {
        if (!res.data.some((r) => r.id === selectedId)) setSelectedId(res.data[0].id);
      } else {
        setSelectedId(null);
        setDetail(null);
      }
    } catch {}
    finally { setLoading(false); }
  };

  const fetchDetail = async (id: string) => {
    if (!accessToken) return;
    try {
      const d = await apiFetch<AdminLandingPageDetail>(`/admin/landing-pages/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      setDetail(d);
    } catch {}
  };

  useEffect(() => { fetchList(); }, [accessToken, lpTab]);
  useEffect(() => { if (selectedId) fetchDetail(selectedId); }, [selectedId]);

  const handleApprove = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      await apiFetch(`/admin/landing-pages/${selectedId}/approve`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
      notify(`Approved "${detail?.name}"`);
      fetchList();
    } catch (e: any) { notify(e.message || "Approve failed"); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!selectedId || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await apiFetch(`/admin/landing-pages/${selectedId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      notify(`Rejected "${detail?.name}"`);
      setRejectOpen(false);
      setRejectReason("");
      fetchList();
    } catch (e: any) { notify(e.message || "Reject failed"); }
    finally { setActionLoading(false); }
  };

  const handlePublish = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      await apiFetch(`/admin/landing-pages/${selectedId}/publish`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
      notify(`Published "${detail?.name}"`);
      fetchList();
    } catch (e: any) { notify(e.message || "Publish failed"); }
    finally { setActionLoading(false); }
  };

  const rows = list?.data ?? [];
  const total = list?.total ?? 0;
  // The org's copy always carries a complete config (copied verbatim from an
  // already-valid template), so it's rendered as-is — no need to hydrate
  // defaults the way the builder's own ensureConfig() does for edits-in-progress.
  const previewCfg = detail?.content?.config ?? null;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <Seg options={[...LP_TABS]} value={lpTab} onChange={setLpTab} />
        <span className="badge b-amber">{total} in this view</span>
      </div>

      <div className="grid g-2-1">
        <div className="card reveal in">
          <div className="card-h">
            <span className="t">Landing pages</span>
            <span className="badge b-amber">{total}</span>
          </div>
          <div className="card-b" style={{ padding: 8, maxHeight: 600, overflow: "auto" }}>
            {loading ? (
              <div style={{ padding: 16, color: "var(--muted)" }}>Loading…</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 16, color: "var(--muted)" }}>Nothing here <Icon name="check" size={14} /></div>
            ) : (
              rows.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, background: selectedId === r.id ? "var(--surface-2)" : undefined, cursor: "pointer", border: selectedId === r.id ? "1px solid var(--brand-100)" : "1px solid transparent" }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="nm" style={{ fontWeight: 600 }}>{r.name}</span><br />
                    <span className="sm muted" style={{ fontSize: 12 }}>
                      {r.organisation.name} · {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString("en-IN") : new Date(r.updatedAt).toLocaleDateString("en-IN")}
                    </span>
                  </span>
                  <span className="badge b-amber">{r.status.replace("_", " ")}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card reveal in" data-delay="1">
          {!selectedId || !detail ? (
            <div className="card-b" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
              Select a landing page to review its content and org.
            </div>
          ) : (
            <>
              <div className="card-h">
                <span className="t">Review · {detail.name}</span>
                <span className="badge b-amber">{detail.status.replace("_", " ")}</span>
              </div>
              <div className="card-b" style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gap: 6, padding: 12, border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface-2)" }}>
                  <div style={{ fontWeight: 700 }}>
                    {detail.organisation.name} <span style={{ fontWeight: 400, color: "var(--muted)" }}>— from template {detail.sourceTemplate?.name ?? "—"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    Submitted: {detail.submittedAt ? new Date(detail.submittedAt).toLocaleString("en-IN") : "—"}
                    {detail.reviewedAt ? ` · Reviewed: ${new Date(detail.reviewedAt).toLocaleString("en-IN")}` : ""}
                  </div>
                  {detail.status === "rejected" && detail.rejectionReason ? (
                    <div style={{ fontSize: 12.5, color: "var(--rose)", background: "var(--rose-050)", padding: "6px 10px", borderRadius: 8, marginTop: 4 }}>
                      <strong>Rejection reason:</strong> {detail.rejectionReason}
                    </div>
                  ) : null}
                </div>

                <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", maxHeight: 360, overflowY: "auto", background: "#f4f5f8" }}>
                  {previewCfg ? (
                    <div className="ps-app">
                      <Canvas
                        sections={detail.content.sections}
                        selectedId={null}
                        device="desktop"
                        readOnly
                        live
                        pageId={detail.id}
                        theme={{
                          primary: previewCfg.brand.primary,
                          accent: previewCfg.brand.accent,
                          font: previewCfg.brand.bodyFont,
                          headingFont: previewCfg.brand.headingFont,
                          name: previewCfg.brand.name,
                          phone: previewCfg.brand.phone,
                          logo: previewCfg.brand.logo,
                        }}
                        form={previewCfg.form}
                        chrome={{ header: previewCfg.header, footer: previewCfg.footer, brand: previewCfg.brand }}
                        onSelect={() => {}}
                        onMutate={() => {}}
                      />
                    </div>
                  ) : (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No preview available.</div>
                  )}
                </div>

                <div className="divider" />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {detail.status === "pending_approval" ? (
                    <>
                      <button className="btn btn-success" style={{ flex: 1, justifyContent: "center" }} disabled={actionLoading} onClick={handleApprove}>
                        {actionLoading ? "…" : <><Icon name="check" size={14} /> Approve</>}
                      </button>
                      <button className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }} disabled={actionLoading} onClick={() => setRejectOpen(true)}>
                        <Icon name="close" size={14} /> Reject
                      </button>
                    </>
                  ) : detail.status === "approved" ? (
                    <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={actionLoading} onClick={handlePublish}>
                      {actionLoading ? "…" : "Publish"}
                    </button>
                  ) : (
                    <div className="muted" style={{ fontSize: 12.5 }}>No action available for this status.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {rejectOpen ? (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20 }}
          onClick={() => !actionLoading && setRejectOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 28, width: 460, maxWidth: "100%", boxShadow: "0 24px 80px rgba(15,23,42,.2)" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 800 }}>Reject &quot;{detail?.name}&quot;?</h2>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)" }}>The org will see this reason and can edit and resubmit.</p>
            <textarea
              className="inp"
              rows={4}
              placeholder="e.g. Hero heading is placeholder text, please replace"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: "100%", resize: "vertical" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="btn btn-ghost" type="button" onClick={() => setRejectOpen(false)} disabled={actionLoading}>Cancel</button>
              <button className="btn btn-danger" type="button" onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}>
                {actionLoading ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}><div className="card" style={{ padding: "12px 16px", boxShadow: "var(--sh-lg)" }}>{toast}</div></div> : null}
    </>
  );
}
