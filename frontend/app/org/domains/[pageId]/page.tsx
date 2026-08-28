"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

export default function DomainDetailPage(){
  const params = useParams() as { pageId:string };
  const pageId = params.pageId;
  const { accessToken } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [msg, setMsg] = useState<string|null>(null);

  const fetchDetail = async()=>{
    if(!accessToken) return;
    setLoading(true);
    try{
      const r = await apiFetch<any>(`/org/domain-requests/page/${pageId}`, { headers:{ Authorization:`Bearer ${accessToken}` }});
      setData(r);
      setError(null);
    } catch(e){ setError(e instanceof Error? e.message: "Not found"); setData(null); }
    finally{ setLoading(false); }
  };
  useEffect(()=>{ fetchDetail(); }, [accessToken, pageId]);
  useEffect(()=>{ if(msg){ const t=setTimeout(()=>setMsg(null),3500); return ()=>clearTimeout(t);} },[msg]);

  const verify = async()=>{
    try{
      const res = await apiFetch<any>(`/org/domain-requests/page/${pageId}/verify`, { method:"POST", headers:{ Authorization:`Bearer ${accessToken}` }});
      setMsg(res.verificationResult?.message ?? "Verification triggered");
      fetchDetail();
    } catch(e){ setMsg(e instanceof Error? e.message:"Verify failed"); }
  };
  const copy = async(v:string)=>{
    try{ await navigator.clipboard.writeText(v); setMsg("Copied"); } catch{ setMsg("Copy failed"); }
  };

  if(loading) return <div className="page-head"><div className="muted">Loading domain...</div></div>;
  if(error) return <><div className="page-head"><h1>Domain</h1><div className="muted">{error}</div><Link className="btn btn-ghost" href="/org/domains">Back</Link></div></>;
  if(!data) return null;

  const records = (data.dnsInstructions?.records ?? data.expectedRecords ?? []) as any[];
  const detected = data.detectedRecords as any[]|null;

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">Domain · {data.domain}</div>
          <h1>{data.domain}</h1>
          <div className="sub">Isolated to this website only. Status: <strong>{data.status}</strong> · DNS: {data.dnsStatus} · SSL: {data.sslStatus}</div>
        </div>
        <div className="actions"><Link className="btn btn-ghost" href="/org/domains">Back to domains</Link><button className="btn btn-primary" onClick={verify}>Verify DNS</button></div>
      </div>
      {msg? <div className="card" style={{ padding:"12px 16px", marginBottom:12, background:"#eef6ff" }}>{msg}</div>:null}
      {data.status==="rejected" && data.rejectionReason? <div className="card" style={{ padding:16, background:"var(--rose-050)", border:"1px solid var(--rose)", color:"var(--rose)", marginBottom:12 }}><strong>Rejected:</strong> {data.rejectionReason}</div>:null}
      {data.status==="pending"? <div className="card" style={{ padding:16, marginBottom:12 }}>Awaiting admin approval. You will receive DNS instructions once approved.</div>:null}

      <div className="grid g2">
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontWeight:800, marginBottom:8 }}>DNS Instructions (dynamic)</div>
          <div className="muted" style={{ fontSize:12, marginBottom:12 }}>Add these records at your domain provider. Values are generated dynamically from infrastructure config.</div>
          {records.length===0? <div className="muted">No records yet — awaiting approval.</div> :
            <div style={{ display:"grid", gap:8 }}>
              <div style={{ display:"grid", gridTemplateColumns:"70px 120px 1fr 60px 100px", gap:8, fontSize:11, fontWeight:800, color:"var(--muted)", padding:"0 8px" }}><span>Type</span><span>Host</span><span>Value</span><span>TTL</span><span>Purpose</span></div>
              {records.map((r:any,i:number)=>(
                <div key={i} style={{ display:"grid", gridTemplateColumns:"70px 120px 1fr 60px 100px 50px", gap:8, alignItems:"center", padding:"8px", background:"var(--bg-2)", borderRadius:8, fontSize:12 }}>
                  <span style={{ fontWeight:800 }}>{r.type}</span>
                  <span style={{ fontFamily:"monospace" }}>{r.host}</span>
                  <span style={{ fontFamily:"monospace", wordBreak:"break-all", fontWeight:600 }}>{r.value}</span>
                  <span>{r.ttl}</span>
                  <span style={{ fontSize:11 }}>{r.purpose}</span>
                  <button className="btn btn-ghost btn-sm" onClick={()=>copy(r.value)}>Copy</button>
                </div>
              ))}
            </div>
          }
          {data.verificationToken? <div style={{ marginTop:12, padding:10, background:"#0b1020", color:"#b8c2ff", borderRadius:8, fontFamily:"monospace", fontSize:11 }}>Verification token: {data.verificationToken} <button className="btn btn-ghost btn-sm" style={{ marginLeft:8, background:"rgba(255,255,255,.08)", color:"#fff" }} onClick={()=>copy(data.verificationToken)}>Copy</button></div>:null}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontWeight:800, marginBottom:8 }}>Status</div>
            <div style={{ display:"grid", gap:8, fontSize:13 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}><span className="muted">Domain</span><span style={{ fontFamily:"monospace", fontWeight:700 }}>{data.domain}</span></div>
              <div style={{ display:"flex", justifyContent:"space-between" }}><span className="muted">Request status</span><span className="badge b-indigo">{data.status}</span></div>
              <div style={{ display:"flex", justifyContent:"space-between" }}><span className="muted">DNS</span><span className="badge b-gray">{data.dnsStatus}</span></div>
              <div style={{ display:"flex", justifyContent:"space-between" }}><span className="muted">SSL</span><span className="badge b-gray">{data.sslStatus}</span></div>
              <div style={{ display:"flex", justifyContent:"space-between" }}><span className="muted">Last checked</span><span style={{ fontSize:12 }}>{data.lastVerificationAt? new Date(data.lastVerificationAt).toLocaleString(): "Never"}</span></div>
              {data.verifiedAt? <div style={{ display:"flex", justifyContent:"space-between" }}><span className="muted">Verified</span><span style={{ fontSize:12 }}>{new Date(data.verifiedAt).toLocaleString()}</span></div>:null}
              {data.sslIssuedAt? <div style={{ display:"flex", justifyContent:"space-between" }}><span className="muted">SSL issued</span><span style={{ fontSize:12 }}>{new Date(data.sslIssuedAt).toLocaleString()}</span></div>:null}
            </div>
            <div style={{ marginTop:12, padding:10, background:"var(--success-soft)", borderRadius:8, fontSize:12, color:"var(--success)", fontWeight:700 }}>
              {data.status==="connected"? "✓ Domain Connected & HTTPS Active": data.status==="ssl_pending"? "SSL provisioning in progress...": data.status==="verified"? "DNS verified — issuing SSL...": data.status==="dns_required"? "Add DNS records above, then click Verify DNS": "Waiting for verification"}
            </div>
          </div>
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontWeight:800, marginBottom:8 }}>Verification history</div>
            {(!data.logs || data.logs.length===0)? <div className="muted" style={{ fontSize:12 }}>No verification attempts yet.</div> :
              <div style={{ display:"grid", gap:8 }}>{data.logs.map((l:any)=>(
                <div key={l.id} style={{ padding:8, background: l.success? "var(--success-soft)":"var(--rose-050)", borderRadius:8, fontSize:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontWeight:700, color: l.success? "var(--success)":"var(--rose)" }}>{l.success? "Success":"Failed"}</span><span className="muted" style={{ fontSize:11 }}>{new Date(l.checkedAt).toLocaleString()}</span></div>
                  <div className="muted" style={{ fontSize:11, marginTop:4 }}>{l.message}</div>
                  {l.expected && !l.success? <div style={{ fontSize:11, fontFamily:"monospace", marginTop:4 }}><div>Expected: {JSON.stringify(l.expected).slice(0,120)}</div><div>Detected: {JSON.stringify(l.detected).slice(0,120)}</div></div>:null}
                </div>
              ))}</div>
            }
          </div>
        </div>
      </div>
    </>
  );
}
