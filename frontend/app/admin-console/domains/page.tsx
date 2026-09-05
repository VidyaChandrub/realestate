"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

type Status = "pending"|"approved"|"rejected"|"dns_required"|"connected";
export default function AdminDomainsPage(){
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("");
  const [msg,setMsg]=useState<string|null>(null);
  const [reason,setReason]=useState<Record<string,string>>({});
  const fetchAll = async()=>{
    if(!accessToken) return;
    setLoading(true);
    try{
      const params = new URLSearchParams();
      if(filter) params.set("status",filter);
      const r = await apiFetch<any>(`/admin/domain-requests?${params.toString()}`, { headers:{ Authorization:`Bearer ${accessToken}` }});
      setRows(r.data ?? r ?? []);
    } catch(e){ setMsg(e instanceof Error? e.message:"Failed"); }
    finally{ setLoading(false); }
  };
  useEffect(()=>{ fetchAll(); },[accessToken, filter]);
  useEffect(()=>{ if(msg){ const t=setTimeout(()=>setMsg(null),3500); return ()=>clearTimeout(t);} },[msg]);

  const review = async(id:string, action:"approve"|"reject")=>{
    try{
      const body:any={ action };
      if(action==="reject") {
        if(!(reason[id]||"").trim()) { setMsg("Enter a rejection reason first."); return; }
        body.reason = reason[id];
      }
      await apiFetch(`/admin/domain-requests/${id}/review`, { method:"POST", headers:{ Authorization:`Bearer ${accessToken}` }, body: JSON.stringify(body)});
      setMsg(action==="approve"? "Approved — DNS instructions generated":"Rejected");
      fetchAll();
    } catch(e){ setMsg(e instanceof Error? e.message:"Failed"); }
  };
  const recheck = async(id:string)=>{
    try{
      await apiFetch(`/admin/domain-requests/${id}/recheck`, { method:"POST", headers:{ Authorization:`Bearer ${accessToken}` }});
      setMsg("Re-checked DNS");
      fetchAll();
    } catch(e){ setMsg(e instanceof Error? e.message:"Failed"); }
  };

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">Admin · Domains</div>
          <h1>Domain Migration Requests</h1>
          <div className="sub">Approve, reject, re-check DNS and view verification logs. Isolated per Organisation → Template.</div>
        </div>
      </div>
      {msg? <div className="card" style={{ padding:"12px 16px", marginBottom:12, background:"#eef6ff" }}>{msg}</div>:null}
      <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
        {["","pending","dns_required","connected","rejected","verification_failed"].map(s=>(
          <button key={s||"all"} className={`btn ${filter===s?"btn-primary":"btn-ghost"} btn-sm`} onClick={()=>setFilter(s)}>{s||"All"}</button>
        ))}
        <span className="muted" style={{ marginLeft:"auto", alignSelf:"center", fontSize:12 }}>{loading? "Loading...": `${rows.length} requests`}</span>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Organisation</th><th>Website</th><th>Domain</th><th>Status</th><th>DNS</th><th>SSL</th><th>Requested</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.length===0? <tr><td colSpan={8} className="muted">No requests.</td></tr>:
                rows.map((r:any)=>(
                  <tr key={r.id}>
                    <td><span style={{ fontWeight:700 }}>{r.organisation?.name ?? r.orgId?.slice(0,8)}</span><br/><span className="muted sm">{r.organisation?.slug}</span></td>
                    <td>{r.landingPage?.name ?? r.landingPageId?.slice(0,8)}<br/><span className="muted sm">{r.landingPage?.slug}</span></td>
                    <td style={{ fontFamily:"monospace", fontWeight:700 }}>{r.domain}</td>
                    <td><span className="badge b-indigo">{r.status}</span></td>
                    <td><span className="badge b-gray">{r.dnsStatus}</span></td>
                    <td><span className="badge b-gray">{r.sslStatus}</span></td>
                    <td className="muted" style={{ fontSize:12 }}>{new Date(r.createdAt??r.requestedAt).toLocaleDateString()}<br/>{r.requestedBy?.slice(0,8)}</td>
                    <td style={{ minWidth:220 }}>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {r.status==="pending"? <>
                          <button className="btn btn-success btn-sm" onClick={()=>review(r.id,"approve")}>Approve</button>
                          <input className="inp" placeholder="Reject reason" value={reason[r.id]??""} onChange={e=>setReason(prev=>({...prev,[r.id]:e.target.value}))} style={{ width:120, height:28, fontSize:12 }} />
                          <button className="btn btn-danger btn-sm" onClick={()=>review(r.id,"reject")}>Reject</button>
                        </>:null}
                        {["approved","dns_required","verification_pending","verification_failed","connected"].includes(r.status)? <button className="btn btn-ghost btn-sm" onClick={()=>recheck(r.id)}>Re-check DNS</button>:null}
                        {r.status==="rejected" && r.rejectionReason? <span className="muted" style={{ fontSize:11, color:"var(--rose)" }}>{r.rejectionReason}</span>:null}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
