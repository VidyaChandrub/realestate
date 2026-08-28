"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Seg } from "@/components/superadmin/seg";
import { apiFetch } from "@/lib/api";
import { Icon } from "@/components/icons";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { Plan, Subscription, BillingOverview, OrganisationListResponse } from "@/lib/types";

const ALL_FEATURES = [
  "Projects", "Users", "Templates", "Custom domain", "Email support", "Priority support",
  "Dedicated manager", "WhatsApp integration", "Custom branding", "API access", "White-label", "SSO & SLA", "Audit logs", "Advanced analytics"
];

const PLAN_BADGE_OPTIONS = [
  { value: "b-indigo", label: "Indigo" },
  { value: "b-green", label: "Green" },
  { value: "b-amber", label: "Amber" },
  { value: "b-rose", label: "Rose" },
  { value: "b-violet", label: "Violet" },
  { value: "b-gray", label: "Gray" },
  { value: "b-teal", label: "Teal" },
  { value: "b-sky", label: "Sky" },
];

type OrgOption = { id: string; name: string; city: string };

function priceFor(plan: Plan, cycle: "Monthly" | "Yearly") {
  return cycle === "Monthly" ? plan.priceMonthly : plan.priceYearly;
}
function perFor(cycle: "Monthly" | "Yearly") { return cycle === "Monthly" ? "/mo" : "/yr"; }

export default function SuperAdminSubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [subsTotal, setSubsTotal] = useState(0);
  const [subsPage, setSubsPage] = useState(1);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);

  const [billingCycle, setBillingCycle] = useState<"Monthly" | "Yearly">("Monthly");
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState(0);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [deletingPlan, setDeletingPlan] = useState(false);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState<Partial<Plan> & { features?: string[] }>({ name: "", priceMonthly: 3000, priceYearly: 30000, description: "", features: [] });
  const [featureInput, setFeatureInput] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);

  const [upgradeTarget, setUpgradeTarget] = useState<Subscription | null>(null);
  const [upgradePlanId, setUpgradePlanId] = useState<string>("");
  const [upgradeCycle, setUpgradeCycle] = useState<"monthly"|"yearly">("monthly");

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignOrgId, setAssignOrgId] = useState("");
  const [assignPlanId, setAssignPlanId] = useState("");
  const [assignCycle, setAssignCycle] = useState<"monthly"|"yearly">("monthly");

  const [billingSettings, setBillingSettings] = useState({
    currency: "INR",
    taxRate: "18",
    invoicePrefix: "INV-2026-",
    graceDays: "7",
    autoRenew: true,
    proration: true,
    emailReceipts: true,
    pastDueEmails: true,
  });

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  async function fetchPlans() {
    setPlansLoading(true);
    try {
      const data = await apiFetch<Plan[]>("/admin/plans");
      setPlans(data);
    } catch (e: any) { notify(e.message || "Failed to load plans"); }
    finally { setPlansLoading(false); }
  }
  async function fetchSubs(page = 1, searchQ = search, filterVal = filter) {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (searchQ.trim()) params.set("search", searchQ.trim());
      if (filterVal === 1) params.set("billingCycle", "monthly");
      else if (filterVal === 2) params.set("billingCycle", "yearly");
      else if (filterVal === 3) params.set("status", "past_due");
      const res = await apiFetch<{ data: Subscription[]; total: number; page: number; limit: number }>(`/admin/subscriptions?${params.toString()}`);
      setSubs(res.data);
      setSubsTotal(res.total);
      setSubsPage(res.page);
    } catch (e: any) { notify(e.message || "Failed to load subscriptions"); }
  }
  async function fetchOverview() {
    try {
      const data = await apiFetch<BillingOverview>("/admin/subscriptions/overview");
      setOverview(data);
    } catch {}
  }
  async function fetchOrgs() {
    try {
      const res = await apiFetch<OrganisationListResponse>("/admin/organisations?page=1&limit=100");
      setOrgs(res.data.map(o => ({ id: o.id, name: o.name, city: o.city })));
    } catch {}
  }

  useEffect(() => { fetchPlans(); fetchOverview(); fetchOrgs(); }, []);
  useEffect(() => { if (tab === 2) fetchSubs(1); }, [tab]);
  // debounce search for subs
  useEffect(() => {
    if (tab !== 2) return;
    const t = setTimeout(() => fetchSubs(1), 350);
    return () => clearTimeout(t);
  }, [search, filter]);

  const filteredSubs = useMemo(() => subs, [subs]);

  const openCreate = () => {
    setEditingPlan(null);
    setPlanForm({ name: "", priceMonthly: 3500, priceYearly: 35000, description: "", features: ["3 projects", "Email support"], limits: { projects: "3", users: "2", templates: "20" } });
    setFeatureInput("");
    setPlanModalOpen(true);
  };
  const openEdit = (p: Plan) => {
    setEditingPlan(p);
    setPlanForm({ ...p, features: [...(p.features || [])] });
    setFeatureInput("");
    setPlanModalOpen(true);
  };
  const savePlan = async () => {
    const name = String(planForm.name || "").trim();
    if (!name) { notify("Plan name required"); return; }
    setSavingPlan(true);
    try {
      if (editingPlan) {
        const updated = await apiFetch<Plan>(`/admin/plans/${editingPlan.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name,
            slug: planForm.slug,
            description: planForm.description,
            priceMonthly: Number(planForm.priceMonthly || 0),
            priceYearly: Number(planForm.priceYearly || 0),
            features: planForm.features || [],
            limits: planForm.limits,
            color: planForm.color,
            badge: planForm.badge,
            isPopular: (planForm as any).isPopular,
          }),
        });
        setPlans(prev => prev.map(pl => pl.id === editingPlan.id ? updated : pl));
        notify(`Plan “${name}” updated`);
      } else {
        const created = await apiFetch<Plan>("/admin/plans", {
          method: "POST",
          body: JSON.stringify({
            name,
            slug: planForm.slug,
            description: planForm.description || "",
            priceMonthly: Number(planForm.priceMonthly || 3000),
            priceYearly: Number(planForm.priceYearly || 30000),
            features: planForm.features || [],
            limits: planForm.limits || { projects: "—", users: "—", templates: "—" },
            color: planForm.color || "#eef0fe",
            badge: planForm.badge || "b-indigo",
            isPopular: (planForm as any).isPopular || false,
          }),
        });
        setPlans(prev => [...prev, created]);
        notify(`Plan “${name}” created`);
      }
      setPlanModalOpen(false);
      fetchOverview();
    } catch (e: any) { notify(e.message || "Save failed"); }
    finally { setSavingPlan(false); }
  };
  const deletePlan = (id: string) => setDeletePlanId(id);
  const confirmDeletePlan = async () => {
    if (!deletePlanId) return;
    setDeletingPlan(true);
    try {
      await apiFetch(`/admin/plans/${deletePlanId}`, { method: "DELETE" });
      setPlans(prev => prev.filter(p => p.id !== deletePlanId));
      notify("Plan deleted");
      fetchOverview();
    } catch (e: any) { notify(e.message || "Delete failed"); }
    finally { setDeletingPlan(false); setDeletePlanId(null); }
  };

  const addFeature = () => {
    const f = featureInput.trim();
    if (!f) return;
    setPlanForm(prev => ({ ...prev, features: [...((prev.features as string[]) || []), f] }));
    setFeatureInput("");
  };
  const removeFeature = (idx: number) => {
    setPlanForm(prev => ({ ...prev, features: (prev.features as string[] || []).filter((_, i) => i !== idx) }));
  };

  const confirmUpgrade = async () => {
    if (!upgradeTarget) return;
    if (!upgradePlanId) { notify("Select a plan"); return; }
    try {
      const updated = await apiFetch<Subscription>(`/admin/subscriptions/${upgradeTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ planId: upgradePlanId, billingCycle: upgradeCycle }),
      });
      setSubs(prev => prev.map(s => s.id === updated.id ? updated : s));
      notify(`${upgradeTarget.organisation?.name || "Org"} → ${updated.plan?.name} ${upgradeCycle}`);
      setUpgradeTarget(null);
      fetchOverview();
    } catch (e: any) { notify(e.message || "Upgrade failed"); }
  };

  const confirmAssign = async () => {
    if (!assignOrgId || !assignPlanId) { notify("Select organisation and plan"); return; }
    try {
      const created = await apiFetch<Subscription>("/admin/subscriptions", {
        method: "POST",
        body: JSON.stringify({ orgId: assignOrgId, planId: assignPlanId, billingCycle: assignCycle }),
      });
      setSubs(prev => [created, ...prev]);
      setSubsTotal(t => t + 1);
      notify(`Subscription created for ${created.organisation?.name}`);
      setAssignOpen(false);
      setAssignOrgId(""); setAssignPlanId("");
      fetchOverview();
    } catch (e: any) { notify(e.message || "Assign failed"); }
  };

  // derived stats from overview or fallback
  const mrrDisplay = overview ? overview.mrr : 0;
  const arrDisplay = overview ? overview.arr : 0;
  const activePlansCount = overview ? overview.activePlans : plans.length;

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="billing" size={14} /> Billing · Platform</div>
          <h1>Plans & Subscriptions</h1>
          <div className="sub">Platform plans, subscriptions, payments and billing — now API-wired (Super Admin).</div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => notify("CSV exported")}>⤓ Export CSV</button>
          <button className="btn btn-primary" onClick={openCreate}>＋ Create Plan</button>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Reveal delay={1}><div className="stat"><div className="top"><span className="label">Monthly recurring (MRR)</span><span className="ic ic-indigo"><Icon name="billing" size={16} /></span></div><div className="value"><CountUp value={mrrDisplay/100} pre="₹" suf="L" dec={1} /></div><div className="delta up">↑ live from API</div></div></Reveal>
        <Reveal delay={2}><div className="stat"><div className="top"><span className="label">Annual run-rate (ARR)</span><span className="ic ic-violet"><Icon name="reports" size={16} /></span></div><div className="value"><CountUp value={arrDisplay/100} pre="₹" suf="L" dec={1} /></div><div className="delta up">↑ live</div></div></Reveal>
        <Reveal delay={3}><div className="stat"><div className="top"><span className="label">Active plans</span><span className="ic ic-green"><Icon name="check" size={16} /></span></div><div className="value"><CountUp value={activePlansCount} /></div><div className="delta up">↑ API</div></div></Reveal>
        <Reveal delay={4}><div className="stat"><div className="top"><span className="label">Subscriptions</span><span className="ic ic-rose"><Icon name="puzzle" size={16} /></span></div><div className="value"><CountUp value={overview?.activeSubscriptions ?? subsTotal} /></div><div className="delta down">churn {overview?.churnRate ?? 2.1}%</div></div></Reveal>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--line)", overflowX: "auto", padding: "0 8px" }}>
          {[
            "Overview",
            "Plans & Pricing",
            "Organisation Subscriptions",
            "Payments",
            "Billing Settings",
          ].map((label, i) => (
            <button
              key={label}
              onClick={() => setTab(i)}
              style={{
                padding: "14px 18px",
                background: "none",
                border: "none",
                borderBottom: tab === i ? "2.5px solid var(--brand)" : "2.5px solid transparent",
                color: tab === i ? "var(--brand)" : "var(--muted)",
                fontWeight: tab === i ? 700 : 500,
                fontSize: 13.5,
                cursor: "pointer",
                whiteSpace: "nowrap",
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{billingCycle}</span>
            <div style={{ display: "flex", gap: 4, background: "#eef1f6", borderRadius: 999, padding: 3 }}>
              {(["Monthly", "Yearly"] as const).map(c => (
                <button key={c} onClick={() => setBillingCycle(c)} style={{ padding: "5px 12px", borderRadius: 999, border: "none", background: billingCycle === c ? "#fff" : "transparent", color: billingCycle === c ? "var(--ink)" : "var(--muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: billingCycle === c ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>{c}</button>
              ))}
            </div>
          </div>
        </div>

        {tab === 0 && (
          <div style={{ padding: 20, display: "grid", gap: 18 }}>
            <div className="grid g-2-1">
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Purpose</div>
                <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.6 }}>
                  Platform plans, subscriptions, payments and billing. Create and edit plans, manage plan features, track organisation subscriptions & status, upgrade/downgrade via <span className="mono" style={{ fontWeight:700 }}> /admin/plans</span> and <span className="mono" style={{ fontWeight:700 }}>/admin/subscriptions</span> APIs.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {["Plans & Pricing", "Create Plan", "Edit Plan", "Plan Features", "Organisation Subscriptions", "Subscription Status", "Upgrade / Downgrade", "Payments", "Invoices", "Billing Settings"].map(t => (
                    <span key={t} className="chip" style={{ background: "var(--brand-050)", color: "var(--brand)", border: "1px solid var(--brand-100)", fontSize: 11 }}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Quick actions</div>
                <div style={{ display: "grid", gap: 8 }}>
                  <button className="btn btn-primary btn-block" onClick={openCreate}>＋ Create Plan</button>
                  <button className="btn btn-ghost btn-block" onClick={() => setTab(1)}>View Plans & Pricing →</button>
                  <button className="btn btn-ghost btn-block" onClick={() => setAssignOpen(true)}>Assign Subscription →</button>
                  <button className="btn btn-ghost btn-block" onClick={() => setTab(2)}>Manage Organisation Subscriptions →</button>
                </div>
              </div>
            </div>

            <div className="grid g-2-1">
              <div className="card" style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700 }}>MRR trend — API</div>
                  <span className="chip">Last 6 months</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, padding: "0 4px" }}>
                  {(overview?.mrrHistory ?? []).map(h => (
                    <div key={h.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ width: "100%", background: "linear-gradient(180deg, var(--brand), var(--iris))", borderRadius: 8, height: `${(h.mrr / Math.max(1, overview?.mrr || 6400)) * 90 + 18}px`, boxShadow: "0 4px 12px rgba(79,70,229,0.18)" }} />
                      <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{h.month}</span>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>₹{(h.mrr/100).toFixed(1)}L</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {plans.map(p => (
                    <span key={p.id} className="chip" style={{ background: "var(--surface-2)" }}>{p.name}: ₹{priceFor(p, billingCycle).toLocaleString("en-IN")}</span>
                  ))}
                </div>
              </div>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Distribution — API</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {(overview?.distribution || []).length === 0 ? <div style={{ color:"var(--muted)", fontSize:13 }}>No subscriptions yet — assign a plan to see distribution.</div> :
                  overview?.distribution.map(d => (
                    <div key={d.planId} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className={`badge ${d.badge}`} style={{ minWidth: 80, justifyContent: "center" }}>{d.planName}</span>
                      <div className="bar" style={{ flex: 1, height: 10 }}><i style={{ width: `${d.pct}%` }} /></div>
                      <span style={{ fontSize: 12, fontWeight: 600, width: 80, textAlign: "right" }}>{d.count} orgs · {d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 1 && (
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              <div>
                <div className="t" style={{ fontWeight: 700 }}>Plans & Pricing</div>
                <div className="x" style={{ fontSize: 12.5, color: "var(--muted)" }}>{plans.length} plans · {billingCycle} billing · API-wired</div>
              </div>
              <button className="btn btn-primary" onClick={openCreate}>＋ Create Plan</button>
            </div>

            {plansLoading ? <div style={{ padding: 24, textAlign:"center", color:"var(--muted)"}}>Loading plans…</div> : plans.length===0 ? <div style={{ padding:24, textAlign:"center", color:"var(--muted)"}}>No plans yet — create one.</div> :
            <div className="grid g3">
              {plans.map(p => {
                const price = priceFor(p, billingCycle);
                const per = perFor(billingCycle);
                return (
                  <div key={p.id} className="card hover" style={{ padding: 18, position: "relative", overflow: "hidden", borderColor: p.isPopular ? "var(--brand-100)" : undefined, boxShadow: p.isPopular ? "0 8px 30px -12px rgba(79,70,229,0.35)" : undefined }}>
                    {p.isPopular ? <div style={{ position: "absolute", top: 12, right: -28, background: "var(--brand)", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: 0.06, padding: "4px 28px", transform: "rotate(32deg)" }}>POPULAR</div> : null}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span className={`badge ${p.badge || "b-indigo"}`} style={{ textTransform: "capitalize" }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{p.slug}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.03, fontFamily: "var(--display)" }}>₹{price.toLocaleString("en-IN")}</span>
                      <span style={{ color: "var(--muted)", fontWeight: 600 }}>{per}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>{p.description}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      <span className="chip">{p.limits?.projects ?? "—"} projects</span>
                      <span className="chip">{p.limits?.users ?? "—"} users</span>
                      <span className="chip">{p.limits?.templates ?? "—"} templates</span>
                    </div>
                    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.06, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Plan Features</div>
                      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 5 }}>
                        {p.features.map(f => <li key={f} style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{f}</li>)}
                      </ul>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => openEdit(p)}>Edit Plan</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => deletePlan(p.id)} style={{ color: "var(--rose)" }}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
            }

            <div className="card" style={{ marginTop: 18, overflow: "hidden" }}>
              <div className="card-h">
                <div className="t">Plan Features — comparison matrix</div>
                <span className="chip">API</span>
              </div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>Feature</th>{plans.map(p => <th key={p.id}>{p.name}</th>)}</tr></thead>
                  <tbody>
                    {ALL_FEATURES.map(feat => (
                      <tr key={feat}>
                        <td style={{ fontWeight: 600 }}>{feat}</td>
                        {plans.map(p => {
                          const has = p.features.some(f => f.toLowerCase().includes(feat.toLowerCase().split(" ")[0]));
                          return <td key={p.id} style={{ textAlign: "center" }}>{has ? "" : "—"}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 2 && (
          <div style={{ padding: 0 }}>
            <div style={{ padding: "16px 20px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontWeight: 700 }}>Organisation Subscriptions</div>
              <span className="chip">{subsTotal} orgs</span>
              <Seg options={["All", "Monthly", "Annual", "Past due"]} value={filter} onChange={setFilter} />
              <div className="tb-search" style={{ maxWidth: 300, flex: 1, position: "relative" }}>
                <span className="si" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--faint)" }}><Icon name="search" size={14} /></span>
                <input placeholder="Search organisation or plan…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", padding: "10px 14px 10px 34px", border: "1px solid var(--line-2)", borderRadius: 10 }} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setAssignOpen(true)}>＋ Assign Plan</button>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Organisation</th><th>Plan</th><th>Amount</th><th>Cycle</th><th>Status</th><th>Next renewal</th><th>MRR</th><th>Action</th></tr></thead>
                <tbody>
                  {filteredSubs.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>No subscriptions — assign a plan to an organisation.</td></tr>
                  ) : filteredSubs.map(s => (
                    <tr key={s.id}>
                      <td><Link className="u" href={`/admin-console/organisation-detail/${s.orgId}`}><span><span className="nm">{s.organisation?.name ?? s.orgId}</span><br /><span className="sm">{s.organisation?.city ?? ""}</span></span></Link></td>
                      <td><span className={`badge ${s.plan?.badge || "b-indigo"}`}>{s.plan?.name ?? "—"}</span></td>
                      <td>₹{s.amount.toLocaleString("en-IN")}</td>
                      <td><span className="badge b-gray">{s.billingCycle}</span></td>
                      <td><span className={`badge ${s.status==="active"?"b-green":s.status==="past_due"?"b-amber":s.status==="trial"?"b-sky":"b-gray"}`} style={{ gap: 6 }}>{s.status}</span></td>
                      <td>{s.renewsAt ? new Date(s.renewsAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric"}) : "—"}</td>
                      <td>₹{s.mrr?.toLocaleString("en-IN") ?? s.amount.toLocaleString("en-IN")}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setUpgradeTarget(s); setUpgradePlanId(s.planId); setUpgradeCycle(s.billingCycle); }}>Change</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 3 && (
          <div style={{ padding: 20, display: "grid", gap: 18 }}>
            <div className="card"><div className="card-h"><div className="t">Payments</div><span className="chip">Placeholder — API to be added</span></div><div style={{ padding:16, color:"var(--muted)", fontSize:13}}>Payments & invoices are UI-only placeholders; subscriptions API is live. Wire Razorpay/Stripe webhooks to create billing.payments next.</div></div>
          </div>
        )}

        {tab === 4 && (
          <div style={{ padding: 20, display: "grid", gap: 18 }}>
            <div className="card">
              <div className="card-h"><div className="t">Billing Settings</div><span className="chip">Local only</span></div>
              <div style={{ padding: 18, display: "grid", gap: 16, maxWidth: 720 }}>
                <div className="row2">
                  <div className="field"><label>Currency</label>
                    <select value={billingSettings.currency} onChange={e => setBillingSettings(s => ({ ...s, currency: e.target.value }))}>
                      <option value="INR">INR — Indian Rupee (₹)</option>
                      <option value="AED">AED — Dirham</option>
                      <option value="USD">USD — US Dollar ($)</option>
                    </select>
                  </div>
                  <div className="field"><label>Tax rate (%)</label><input className="inp" value={billingSettings.taxRate} onChange={e => setBillingSettings(s => ({ ...s, taxRate: e.target.value }))} /></div>
                </div>
                <div className="row2">
                  <div className="field"><label>Invoice prefix</label><input className="inp" value={billingSettings.invoicePrefix} onChange={e => setBillingSettings(s => ({ ...s, invoicePrefix: e.target.value }))} /></div>
                  <div className="field"><label>Grace days (past due)</label><input className="inp" value={billingSettings.graceDays} onChange={e => setBillingSettings(s => ({ ...s, graceDays: e.target.value }))} /></div>
                </div>
                {[
                  ["Auto-renew subscriptions", "autoRenew", "Charge automatically on renewal date"],
                  ["Proration on upgrade/downgrade", "proration", "Credit unused time when changing plan"],
                  ["Email receipts on payment", "emailReceipts", "Send receipt after successful payment"],
                  ["Past-due reminder emails", "pastDueEmails", "Notify orgs before suspension"],
                ].map(([label, key, hint]) => (
                  <div key={key as string} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 12 }}>
                    <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{label as string}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{hint as string}</div></div>
                    <button
                      onClick={() => setBillingSettings(s => ({ ...s, [key as string]: !(s as any)[key as string] }))}
                      className={`switch ${(billingSettings as any)[key as string] ? "on" : ""}`}
                      aria-label={label as string}
                    />
                  </div>
                ))}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => notify("Billing settings reset (mock)")}>Reset</button>
                  <button className="btn btn-primary" onClick={() => notify("Billing settings saved (frontend only)")}>Save billing settings</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {planModalOpen ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20 }} onClick={() => setPlanModalOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 24, width: 720, maxWidth: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 80px rgba(15,23,42,.2)" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>{editingPlan ? "Edit Plan" : "Create Plan"}</h2>
            <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 13.5 }}>Configure plan pricing and plan features. Saved to <span className="mono">/admin/plans</span>.</p>
            <div className="row2">
              <div className="field"><label>Plan name</label><input className="inp" value={String(planForm.name || "")} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Starter" /></div>
              <div className="field"><label>Slug</label><input className="inp" value={String((planForm as any).slug || "")} onChange={e => setPlanForm(p => ({ ...p, slug: e.target.value }))} placeholder="starter" /></div>
            </div>
            <div className="row2">
              <div className="field"><label>Price / month (₹)</label><input className="inp" type="number" value={String(planForm.priceMonthly ?? "")} onChange={e => setPlanForm(p => ({ ...p, priceMonthly: Number(e.target.value || 0) }))} /></div>
              <div className="field"><label>Price / year (₹)</label><input className="inp" type="number" value={String(planForm.priceYearly ?? "")} onChange={e => setPlanForm(p => ({ ...p, priceYearly: Number(e.target.value || 0) }))} /></div>
            </div>
            <div className="field"><label>Description</label><textarea value={String(planForm.description || "")} onChange={e => setPlanForm(p => ({ ...p, description: e.target.value }))} placeholder="Who is this plan for?" /></div>
            <div className="row2">
              <div className="field">
                <label>Badge</label>
                <select
                  className="inp"
                  value={String((planForm as any).badge || "b-indigo")}
                  onChange={(e) => setPlanForm(p => ({ ...p, badge: e.target.value }))}
                >
                  {PLAN_BADGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Color</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="color"
                    value={String((planForm as any).color || "#eef0fe")}
                    onChange={(e) => setPlanForm(p => ({ ...p, color: e.target.value }))}
                    style={{ width: 42, height: 38, padding: 2, border: "1px solid var(--line)", borderRadius: 8, background: "#fff", cursor: "pointer" }}
                    aria-label="Pick plan color"
                  />
                  <input
                    className="inp"
                    value={String((planForm as any).color || "#eef0fe")}
                    onChange={(e) => setPlanForm(p => ({ ...p, color: e.target.value }))}
                    placeholder="#eef0fe"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>
            <label style={{ display:"flex", gap:8, alignItems:"center", fontSize:13, margin:"8px 0" }}><input type="checkbox" checked={!!(planForm as any).isPopular} onChange={e => setPlanForm(p => ({ ...p, isPopular: e.target.checked } as any))} /> Popular plan</label>
            <div className="field">
              <label>Plan Features</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="inp" value={featureInput} onChange={e => setFeatureInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addFeature())} placeholder="Add a feature and press Enter" style={{ flex: 1 }} />
                <button className="btn btn-ghost" type="button" onClick={addFeature}>Add</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {((planForm.features as string[]) || []).map((f, i) => (
                  <span key={i} className="chip" style={{ background: "#fff", border: "1px solid var(--line-2)" }}>
                    {f} <button onClick={() => removeFeature(i)} style={{ marginLeft: 6, border: "none", background: "var(--rose-050)", color: "var(--rose)", borderRadius: 6, padding: "1px 6px", cursor: "pointer" }}>×</button>
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <button className="btn btn-ghost" onClick={() => setPlanModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={savePlan} disabled={savingPlan}>{savingPlan ? "Saving…" : editingPlan ? "Save plan" : "Create plan"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {upgradeTarget ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20 }} onClick={() => setUpgradeTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 24, width: 520, maxWidth: "100%", boxShadow: "0 24px 80px rgba(15,23,42,.2)" }}>
            <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800 }}>Upgrade / Downgrade</h2>
            <p style={{ margin: "0 0 14px", color: "var(--muted)", fontSize: 13.5 }}>
              Change subscription for <strong>{upgradeTarget.organisation?.name}</strong> — current <span className={`badge ${upgradeTarget.plan?.badge || "b-indigo"}`}>{upgradeTarget.plan?.name}</span>
            </p>
            <div className="field">
              <label>Select plan</label>
              <select value={upgradePlanId} onChange={e => setUpgradePlanId(e.target.value)}>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ₹{p.priceMonthly}/mo / ₹{p.priceYearly}/yr</option>)}
              </select>
            </div>
            <div className="field">
              <label>Billing cycle</label>
              <select value={upgradeCycle} onChange={e => setUpgradeCycle(e.target.value as any)}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setUpgradeTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmUpgrade}>Confirm change</button>
            </div>
          </div>
        </div>
      ) : null}

      {assignOpen ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20 }} onClick={() => setAssignOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 24, width: 520, maxWidth: "100%", boxShadow: "0 24px 80px rgba(15,23,42,.2)" }}>
            <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800 }}>Assign Subscription</h2>
            <p style={{ margin: "0 0 14px", color: "var(--muted)", fontSize: 13.5 }}>Link an organisation to a plan.</p>
            <div className="field">
              <label>Organisation</label>
              <select value={assignOrgId} onChange={e => setAssignOrgId(e.target.value)}>
                <option value="">Select organisation</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name} — {o.city}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Plan</label>
              <select value={assignPlanId} onChange={e => setAssignPlanId(e.target.value)}>
                <option value="">Select plan</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ₹{p.priceMonthly}/mo</option>)}
              </select>
            </div>
            <div className="field">
              <label>Billing cycle</label>
              <select value={assignCycle} onChange={e => setAssignCycle(e.target.value as any)}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setAssignOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmAssign}>Assign</button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}><div className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "var(--sh-lg)", border: "1px solid var(--line)" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)" }} />{toast}</div></div> : null}
      <ConfirmModal
        open={deletePlanId !== null}
        title="Delete this plan?"
        message="Organisations already on this plan keep their subscription; the plan just stops being offered."
        confirmLabel="Delete plan"
        destructive
        busy={deletingPlan}
        onConfirm={() => void confirmDeletePlan()}
        onClose={() => setDeletePlanId(null)}
      />
    </>
  );
}
