"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { orgBuilderPath } from "@/lib/prestate/paths";

type ReqStatus = "pending"|"approved"|"rejected"|"dns_required"|"verification_pending"|"verified"|"ssl_pending"|"connected"|"verification_failed"|"connection_failed";
interface DomainRow {
  id: string;
  domain: string;
  status: ReqStatus;
  dnsStatus: string;
  sslStatus: string;
  requestedAt: string;
  landingPage: { id:string; name:string; slug:string } | null;
  organisation?: { name:string };
  rejectionReason?: string | null;
}

const STATUS_LABEL: Record<string,string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  dns_required: "DNS Required",
  verification_pending: "Verifying DNS",
  verified: "Verified",
  ssl_pending: "SSL Pending",
  connected: "Connected",
  verification_failed: "Verification Failed",
  connection_failed: "Connection Failed",
};

export default function OrgDomainsPage(){
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);

  const fetchAll = async()=>{
    if(!accessToken) return;
    setLoading(true);
    try{
      const r = await apiFetch<{data: DomainRow[]}|DomainRow[]|any>(`/org/domain-requests`, { headers:{ Authorization:`Bearer ${accessToken}` }});
      const data = Array.isArray(r) ? r : (r as any).data ?? [];
      setRows(data);
      const p = await apiFetch<{data:any[]}|any>(`/org/landing-pages?limit=100`, { headers:{ Authorization:`Bearer ${accessToken}` }});
      setPages(p.data ?? []);
    } catch(e){ setError(e instanceof Error? e.message: "Failed to load"); }
    finally{ setLoading(false); }
  };
  useEffect(()=>{ fetchAll(); }, [accessToken]);
  useEffect(()=>{ if(msg){ const t=setTimeout(()=>setMsg(null),3000); return ()=>clearTimeout(t);} },[msg]);

  const submit = async()=>{
    if(!selectedPage || !domainInput.trim()){ setMsg("Select a website and enter domain"); return;}
    setSubmitting(true);
    try{
      await apiFetch(`/org/domain-requests`, { method:"POST", headers:{ Authorization:`Bearer ${accessToken}` }, body: JSON.stringify({ landingPageId: selectedPage, domain: domainInput.trim()})});
      setMsg("Migration request submitted — awaiting admin approval");
      setDomainInput(""); setSelectedPage("");
      fetchAll();
    } catch(e){ setMsg(e instanceof Error? e.message: "Failed"); }
    finally{ setSubmitting(false); }
  };

  const verify = async(id:string, pageId:string)=>{
    try{
      await apiFetch(`/org/domain-requests/page/${pageId}/verify`, { method:"POST", headers:{ Authorization:`Bearer ${accessToken}` }});
      setMsg("Verification triggered");
      fetchAll();
    } catch(e){ setMsg(e instanceof Error? e.message:"Verify failed"); }
  };

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">Website · Domain</div>
          <h1>Domain Migration</h1>
          <div className="sub">Request a domain per website (template). Each request is isolated to its website.</div>
        </div>
      </div>
      <Reveal delay={1}>
        <div className="card" style={{ padding:20, marginBottom:18 }}>
          <div style={{ fontWeight:800, marginBottom:8 }}>Request domain migration</div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <select value={selectedPage} onChange={e=>setSelectedPage(e.target.value)} style={{ flex:1, minWidth:200 }}>
              <option value="">Select website / pages</option>
              {pages.filter((p:any)=>p.pageType==="landing").map((p:any)=><option key={p.id} value={p.id}>{p.name} — {p.slug}</option>)}
            </select>
            <input className="inp" placeholder="example.com" value={domainInput} onChange={e=>setDomainInput(e.target.value)} style={{ flex:1, minWidth:200 }} />
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>{submitting?"Submitting...":"Request Migration"}</button>
          </div>
          <div className="muted" style={{ fontSize:12, marginTop:8 }}>Flow: Request → Admin Review → Approved → DNS Required → Verification → SSL → Connected. One domain per website, globally unique.</div>
        </div>
      </Reveal>
      {msg? <div className="card" style={{ padding:"12px 16px", marginBottom:12, background:"#eef6ff", border:"1px solid #cfe0ff" }}>{msg}</div>:null}
      <Reveal delay={2}>
        <div className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Website</th><th>Domain</th><th>Status</th><th>DNS</th><th>SSL</th><th>Requested</th><th>Actions</th></tr></thead>
              <tbody>
                {loading? <tr><td colSpan={7} className="muted">Loading...</td></tr> :
                 error? <tr><td colSpan={7} className="muted">{error}</td></tr> :
                 rows.length===0? <tr><td colSpan={7} className="muted">No domain requests yet. Use the form above.</td></tr> :
                 rows.map(r=>(
                  <tr key={r.id}>
                    <td>{r.landingPage? <Link href={orgBuilderPath(r.landingPage.id)} style={{ fontWeight:700, color:"var(--primary)" }}>{r.landingPage.name}</Link>: "—"}<br/><span className="muted sm">{r.landingPage?.slug}</span></td>
                    <td style={{ fontFamily:"monospace", fontWeight:700 }}>{r.domain}</td>
                    <td><span className="badge b-indigo">{STATUS_LABEL[r.status]??r.status}</span>{r.status==="rejected" && r.rejectionReason? <div style={{ fontSize:11, color:"var(--rose)", maxWidth:200 }}>{r.rejectionReason}</div>:null}</td>
                    <td><span className="badge b-gray">{r.dnsStatus}</span></td>
                    <td><span className="badge b-gray">{r.sslStatus}</span></td>
                    <td className="muted" style={{ fontSize:12 }}>{new Date(r.requestedAt).toLocaleDateString()}</td>
                    <td>
                      {["dns_required","verification_pending","verification_failed","approved"].includes(r.status) && r.landingPage? <button className="btn btn-ghost btn-sm" onClick={()=>verify(r.id, r.landingPage!.id)}>Verify DNS</button>:null}
                      {r.status==="connected"? <span style={{ fontSize:12, color:"var(--success)", fontWeight:700 }}>● Live</span>:null}
                      {r.landingPage? <Link className="btn btn-ghost btn-sm" href={`/org/domains/${r.landingPage.id}`}>View DNS</Link>:null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </>
  );
}
