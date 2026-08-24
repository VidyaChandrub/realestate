"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Icon } from "@/components/icons";
import type { Plan, OrganisationListResponse, OrganisationDetail } from "@/lib/types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts.slice(0,2).map(p=>p[0]?.toUpperCase()).join("");
}

export default function SuperAdminApprovalsPage() {
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuth();

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

  useEffect(() => {
    if (!authLoading && !accessToken) router.replace("/login");
  }, [authLoading, accessToken, router]);

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

  if (authLoading || !accessToken) return null;

  const rows = pending?.data ?? [];
  const totalPending = pending?.total ?? 0;

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="check" size={14} /> Review</div>
          <h1>Organisation Approvals</h1>
          <div className="sub">Organisations registered via <b>/register</b> — super admin approves and assigns package & templates. Super admin edit only.</div>
        </div>
        <div className="actions">
          <span className="badge b-amber">{totalPending} pending</span>
          <Link className="btn btn-ghost" href="/admin-console/organisations">View all →</Link>
        </div>
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
