"use client";

import { useEffect, useMemo, useState, useCallback, useId } from "react";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Seg } from "@/components/superadmin/seg";
import {
  apiFetch,
  approvePackageChangeRequest,
  getAdminPackageChangeRequests,
  getPlanCapabilities,
  getPlatformConfig,
  rejectPackageChangeRequest,
  updatePlatformConfig,
} from "@/lib/api";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useAuth } from "@/lib/auth-context";
import type {
  Plan,
  PlanCapability,
  Subscription,
  BillingOverview,
  OrganisationListResponse,
  PackageChangeRequestRow,
} from "@/lib/types";

/** Display a numeric limit, or "Unlimited" for null. */
function fmtLimit(n: number | null | undefined): string {
  return n == null ? "Unlimited" : String(n);
}

function formatCurrency(amount: number): string {
  if (!amount || amount <= 0) return "₹0";
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function Sparkline({ color, d }: { color: string; d: string }) {
  const reactId = useId();
  const gradientId = `spark-grad-sub-${color.replace(/[^a-zA-Z0-9]/g, "")}-${reactId.replace(/:/g, "")}`;
  return (
    <svg width="84" height="32" viewBox="0 0 84 32" fill="none" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={`${d} L 84 32 L 0 32 Z`} fill={`url(#${gradientId})`} />
      <path d={d} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

const SPARK_PATHS = [
  "M 0 24 Q 20 18, 40 22 T 84 10",
  "M 0 28 Q 20 20, 40 26 T 84 14",
  "M 0 22 Q 20 14, 40 24 T 84 8",
  "M 0 26 Q 20 22, 40 18 T 84 12",
];

const LIMIT_ROWS: { key: "projects" | "users" | "templates" | "landingPages" | "landingPagesCreate"; label: string }[] = [
  { key: "projects", label: "Projects" },
  { key: "users", label: "Users" },
  { key: "templates", label: "Templates" },
  { key: "landingPagesCreate", label: "Created Landing Pages (Drafts + Live)" },
  { key: "landingPages", label: "Maximum Published Landing Pages" },
];



type OrgOption = { id: string; name: string; city: string };

function priceFor(plan: Plan, cycle: "Monthly" | "Yearly") {
  return cycle === "Monthly" ? plan.priceMonthly : plan.priceYearly;
}
function perFor(cycle: "Monthly" | "Yearly") {
  return cycle === "Monthly" ? "/mo" : "/yr";
}

export default function SuperAdminSubscriptionsPage() {
  const { hasPermission, isLoading: authLoading } = useAuth();
  const canViewSubscriptions = hasPermission("admin_subscriptions", "view");
  const canCreatePlan = hasPermission("admin_subscriptions", "add");
  const canEditPlan = hasPermission("admin_subscriptions", "edit");
  const canDeletePlan = hasPermission("admin_subscriptions", "delete");
  const canAssignPlan = hasPermission("admin_subscriptions", "add");
  const canChangeSubscription = hasPermission("admin_subscriptions", "edit");
  const canCancelSubscription = hasPermission("admin_subscriptions", "delete");
  const canApproveRequest = hasPermission("admin_subscriptions", "approve");
  const canRejectRequest = hasPermission("admin_subscriptions", "delete");
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

  const [requests, setRequests] = useState<PackageChangeRequestRow[]>([]);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestFilterStatus, setRequestFilterStatus] = useState<string>("pending");
  const [rejectModalReq, setRejectModalReq] = useState<PackageChangeRequestRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [capabilities, setCapabilities] = useState<PlanCapability[]>([]);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [featureInput, setFeatureInput] = useState("");
  const [planForm, setPlanForm] = useState<Partial<Plan> & { features?: string[] }>({
    name: "",
    priceMonthly: 3000,
    priceYearly: 30000,
    description: "",
    features: [],
    limits: { projects: null, users: null, templates: null, landingPages: null },
    capabilities: {},
  });
  const [savingPlan, setSavingPlan] = useState(false);

  const [upgradeTarget, setUpgradeTarget] = useState<Subscription | null>(null);
  const [upgradePlanId, setUpgradePlanId] = useState<string>("");
  const [upgradeCycle, setUpgradeCycle] = useState<"monthly" | "yearly">("monthly");
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignOrgId, setAssignOrgId] = useState("");
  const [assignPlanId, setAssignPlanId] = useState("");
  const [assignCycle, setAssignCycle] = useState<"monthly" | "yearly">("monthly");

  const [billingSettings, setBillingSettings] = useState({
    currency: "INR",
    taxRate: "18",
    invoicePrefix: "INV-2026-",
    autoRenew: true,
    proration: true,
    emailReceipts: true,
    pastDueEmails: true,
  });

  const [expiryPolicy, setExpiryPolicy] = useState({
    billingExpiryNotifyDays: "3",
    billingGracePeriodDays: "7",
    billingExpiryBehavior: "restrict" as "restrict" | "cancel",
    billingExpiryMessage: "",
  });
  const [savingPolicy, setSavingPolicy] = useState(false);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  async function loadExpiryPolicy() {
    try {
      const cfg = await getPlatformConfig();
      setExpiryPolicy({
        billingExpiryNotifyDays: String(cfg.billingExpiryNotifyDays ?? 3),
        billingGracePeriodDays: String(cfg.billingGracePeriodDays ?? 7),
        billingExpiryBehavior: cfg.billingExpiryBehavior === "cancel" ? "cancel" : "restrict",
        billingExpiryMessage: cfg.billingExpiryMessage ?? "",
      });
    } catch {
      /* keep defaults */
    }
  }

  async function saveExpiryPolicy() {
    setSavingPolicy(true);
    try {
      await updatePlatformConfig({
        billingExpiryNotifyDays: Math.max(0, Math.floor(Number(expiryPolicy.billingExpiryNotifyDays) || 0)),
        billingGracePeriodDays: Math.max(0, Math.floor(Number(expiryPolicy.billingGracePeriodDays) || 0)),
        billingExpiryBehavior: expiryPolicy.billingExpiryBehavior,
        billingExpiryMessage: expiryPolicy.billingExpiryMessage,
      });
      notify("Expiry policy saved — applies on the next lifecycle sweep");
      await loadExpiryPolicy();
    } catch (e: any) {
      notify(e.message || "Save failed");
    } finally {
      setSavingPolicy(false);
    }
  }

  async function fetchPlans() {
    setPlansLoading(true);
    try {
      const data = await apiFetch<Plan[]>("/admin/plans");
      setPlans(data);
    } catch (e: any) {
      notify(e.message || "Failed to load plans");
    } finally {
      setPlansLoading(false);
    }
  }

  async function fetchSubs(page = 1, searchQ = search, filterVal = filter) {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (searchQ) params.set("search", searchQ);
      if (filterVal === 1) params.set("cycle", "monthly");
      if (filterVal === 2) params.set("cycle", "yearly");
      if (filterVal === 3) params.set("status", "past_due");
      const res = await apiFetch<{ data: Subscription[]; total: number }>(`/admin/subscriptions?${params.toString()}`);
      setSubs(res.data || []);
      setSubsTotal(res.total || 0);
    } catch (e: any) {
      console.error("fetchSubs failed", e);
    }
  }

  async function fetchOverview() {
    try {
      const data = await apiFetch<BillingOverview>("/admin/subscriptions/overview");
      setOverview(data);
    } catch (e: any) {
      console.error("fetchOverview failed", e);
    }
  }

  async function fetchOrgs() {
    try {
      const data = await apiFetch<OrganisationListResponse>("/admin/organisations?limit=100");
      setOrgs((data.data || []).map((o) => ({ id: o.id, name: o.name, city: o.city || "" })));
    } catch {
      /* ignore */
    }
  }

  async function fetchPackageChangeRequests(status = requestFilterStatus, page = 1) {
    setRequestsLoading(true);
    try {
      const res = await getAdminPackageChangeRequests({ page, limit: 20, status: status === "all" ? undefined : status });
      setRequests(res.data || []);
      setRequestsTotal(res.total || 0);
    } catch (e: any) {
      console.error("fetchPackageChangeRequests failed", e);
    } finally {
      setRequestsLoading(false);
    }
  }

  async function fetchCapabilities() {
    try {
      const list = await getPlanCapabilities();
      setCapabilities(list || []);
    } catch {
      setCapabilities([]);
    }
  }

  useEffect(() => {
    if (!canViewSubscriptions) return;
    fetchPlans();
    fetchCapabilities();
    fetchSubs(1, "", 0);
    fetchOrgs();
    fetchOverview();
    fetchPackageChangeRequests("pending", 1);
    loadExpiryPolicy();
  }, [canViewSubscriptions]);

  const visibleTabs = [
    { index: 0, label: "Overview & Analytics" },
    { index: 1, label: "Plans & Pricing Matrices" },
    { index: 2, label: `Organisation Subscriptions (${subsTotal})` },
    { index: 3, label: `Package Requests (${requestsTotal})` },
    { index: 4, label: "Payments & Invoicing" },
    { index: 5, label: "Expiry & Grace Policy" },
  ];

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((item) => item.index === tab)) {
      setTab(visibleTabs[0].index);
    }
  }, [tab]);

  if (!authLoading && !canViewSubscriptions) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>Access restricted</h1>
        <p className="muted" style={{ margin: 0 }}>
          You do not have permission to view subscription management.
        </p>
      </div>
    );
  }

  const renewRow = async (subId: string) => {
    try {
      const updated = await apiFetch<Subscription>(`/admin/subscriptions/${subId}/renew`, { method: "POST" });
      setSubs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      notify(`Renewed ${updated.organisation?.name || "org"}`);
      fetchOverview();
    } catch (e: any) {
      notify(e.message || "Renew failed");
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      await approvePackageChangeRequest(requestId);
      notify("Package change request approved successfully.");
      void fetchPackageChangeRequests(requestFilterStatus, requestsPage);
      void fetchSubs(subsPage);
      void fetchOverview();
    } catch (e: any) {
      notify(e.message || "Failed to approve request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectModalReq) return;
    setActionLoadingId(rejectModalReq.id);
    try {
      await rejectPackageChangeRequest(rejectModalReq.id, rejectionReason.trim() || undefined);
      notify("Package change request rejected.");
      setRejectModalReq(null);
      setRejectionReason("");
      void fetchPackageChangeRequests(requestFilterStatus, requestsPage);
    } catch (e: any) {
      notify(e.message || "Failed to reject request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredSubs = useMemo(() => {
    return subs.filter((s) => {
      if (filter === 1 && s.billingCycle !== "monthly") return false;
      if (filter === 2 && s.billingCycle !== "yearly") return false;
      if (filter === 3 && s.status !== "past_due" && s.status !== "expired") return false;
      if (search) {
        const q = search.toLowerCase();
        const oName = (s.organisation?.name || "").toLowerCase();
        const pName = (s.plan?.name || "").toLowerCase();
        return oName.includes(q) || pName.includes(q);
      }
      return true;
    });
  }, [subs, filter, search]);

  const openCreate = () => {
    setEditingPlan(null);
    setPlanForm({
      name: "",
      priceMonthly: 3500,
      priceYearly: 35000,
      description: "",
      features: ["Everything you need to get started"],
      limits: { projects: 3, users: 2, templates: 20, landingPages: 5 },
      capabilities: {},
    });
    setFeatureInput("");
    setPlanModalOpen(true);
  };

  const openEdit = (p: Plan) => {
    setEditingPlan(p);
    setPlanForm({
      ...p,
      features: [...(p.features || [])],
      limits: { ...(p.limits ?? { projects: null, users: null, templates: null, landingPages: null }) },
      capabilities: { ...(p.capabilities ?? {}) },
    });
    setFeatureInput("");
    setPlanModalOpen(true);
  };

  const formLimit = (key: "projects" | "users" | "templates" | "landingPages" | "landingPagesCreate"): number | null => {
    const v = (planForm.limits as any)?.[key];
    return v == null ? null : v;
  };

  const setFormLimit = (key: "projects" | "users" | "templates" | "landingPages" | "landingPagesCreate", value: number | null) => {
    setPlanForm((p) => ({
      ...p,
      limits: { projects: null, users: null, templates: null, landingPages: null, landingPagesCreate: null, ...(p.limits ?? {}), [key]: value },
    }));
  };

  const toggleCapability = (key: string, on: boolean) => {
    setPlanForm((p) => ({ ...p, capabilities: { ...(p.capabilities ?? {}), [key]: on } }));
  };

  const addFeature = () => {
    const text = featureInput.trim();
    if (!text) return;
    setPlanForm((p) => ({
      ...p,
      features: [...(p.features || []), text],
    }));
    setFeatureInput("");
  };

  const removeFeature = (index: number) => {
    setPlanForm((p) => ({
      ...p,
      features: (p.features || []).filter((_, i) => i !== index),
    }));
  };

  const setAllCapabilities = (enable: boolean) => {
    const updated: Record<string, boolean> = {};
    for (const cap of capabilities) {
      updated[cap.key] = enable;
    }
    setPlanForm((p) => ({
      ...p,
      capabilities: updated,
    }));
  };

  const savePlan = async () => {
    const name = String(planForm.name || "").trim();
    if (!name) {
      notify("Plan name required");
      return;
    }
    const limits = {
      projects: formLimit("projects"),
      users: formLimit("users"),
      templates: formLimit("templates"),
      landingPagesCreate: formLimit("landingPagesCreate"),
      landingPages: formLimit("landingPages"),
    };
    const capMap: Record<string, boolean> = {};
    for (const cap of capabilities) {
      if (planForm.capabilities?.[cap.key]) capMap[cap.key] = true;
    }
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
            limits,
            capabilities: capMap,
            color: planForm.color,
            badge: planForm.badge,
            isPopular: (planForm as any).isPopular,
          }),
        });
        setPlans((prev) => prev.map((pl) => (pl.id === editingPlan.id ? updated : pl)));
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
            limits,
            capabilities: capMap,
            color: planForm.color || "#eef0fe",
            badge: planForm.badge || "b-indigo",
            isPopular: (planForm as any).isPopular || false,
          }),
        });
        setPlans((prev) => [...prev, created]);
        notify(`Plan “${name}” created`);
      }
      setPlanModalOpen(false);
      fetchOverview();
    } catch (e: any) {
      notify(e.message || "Save failed");
    } finally {
      setSavingPlan(false);
    }
  };

  // The default onboarding plan (isSystem) can never be deleted — the API
  // refuses too; the button is disabled so this is only a backstop.
  const deletePlan = (id: string) => {
    if (plans.find((pl) => pl.id === id)?.isSystem) return;
    setDeletePlanId(id);
  };

  const confirmDeletePlan = async () => {
    if (!deletePlanId) return;
    setDeletingPlan(true);
    try {
      await apiFetch(`/admin/plans/${deletePlanId}`, { method: "DELETE" });
      setPlans((prev) => prev.filter((p) => p.id !== deletePlanId));
      notify("Plan deleted");
      fetchOverview();
    } catch (e: any) {
      notify(e.message || "Delete failed");
    } finally {
      setDeletingPlan(false);
      setDeletePlanId(null);
    }
  };


  const confirmUpgrade = async () => {
    if (!upgradeTarget) return;
    if (!upgradePlanId) {
      notify("Select a plan");
      return;
    }
    try {
      const updated = await apiFetch<Subscription>(`/admin/subscriptions/${upgradeTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ planId: upgradePlanId, billingCycle: upgradeCycle }),
      });
      setSubs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      notify(`${upgradeTarget.organisation?.name || "Org"} → ${updated.plan?.name} ${upgradeCycle}`);
      setUpgradeTarget(null);
      fetchOverview();
    } catch (e: any) {
      notify(e.message || "Upgrade failed");
    }
  };

  const confirmAssign = async () => {
    if (!assignOrgId || !assignPlanId) {
      notify("Select organisation and plan");
      return;
    }
    try {
      const created = await apiFetch<Subscription>("/admin/subscriptions", {
        method: "POST",
        body: JSON.stringify({ orgId: assignOrgId, planId: assignPlanId, billingCycle: assignCycle }),
      });
      setSubs((prev) => [created, ...prev]);
      setSubsTotal((t) => t + 1);
      notify(`Subscription created for ${created.organisation?.name}`);
      setAssignOpen(false);
      setAssignOrgId("");
      setAssignPlanId("");
      fetchOverview();
    } catch (e: any) {
      notify(e.message || "Assign failed");
    }
  };

  const confirmCancelSubscription = async () => {
    if (!cancelTarget) return;
    setCancellingSubscription(true);
    try {
      await apiFetch(`/admin/subscriptions/${cancelTarget.id}`, { method: "DELETE" });
      notify(`Subscription cancelled for ${cancelTarget.organisation?.name || "organisation"}`);
      setCancelTarget(null);
      void fetchSubs(subsPage);
      void fetchOverview();
    } catch (e: any) {
      notify(e.message || "Cancel failed");
    } finally {
      setCancellingSubscription(false);
    }
  };

  const mrrDisplay = overview ? overview.mrr : 0;
  const arrDisplay = overview ? overview.arr : 0;
  const activePlansCount = overview ? overview.activePlans : plans.length;

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#4f46e5", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            ANALYTICS & BILLING CONTROLS
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
            Plans &amp; Subscriptions Studio
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4, marginBottom: 0 }}>
            Manage platform billing tiers, feature matrices, organisation subscriptions, renewal lifecycles, and upgrade requests.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#10b981", fontWeight: 600, background: "rgba(16, 185, 129, 0.08)", padding: "5px 12px", borderRadius: 999 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
            Billing Telemetry Live
          </div>

          <button
            type="button"
            onClick={() => {
              fetchPlans();
              fetchSubs();
              fetchOverview();
              fetchPackageChangeRequests(requestFilterStatus, requestsPage);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#fff",
              fontSize: 13,
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <Icon name="refresh" size={14} /> Refresh
          </button>

          {canCreatePlan ? (
            <button
              type="button"
              onClick={openCreate}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 10,
                background: "#4f46e5",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)",
              }}
            >
              <Icon name="plus" size={14} /> Create Plan
            </button>
          ) : null}
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* KPI 1: Monthly Recurring (MRR) */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "18px 20px",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            boxShadow: "0 2px 6px rgba(15, 23, 42, 0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(79, 70, 229, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f46e5" }}>
                <Icon name="billing" size={18} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Monthly Recurring (MRR)</span>
            </div>
            <Sparkline color="#4f46e5" d={SPARK_PATHS[0]} />
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
              {formatCurrency(mrrDisplay)}
            </div>
            <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, marginTop: 2 }}>
              ↑ Live subscription MRR
            </div>
          </div>
        </div>

        {/* KPI 2: Annual Run-Rate (ARR) */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "18px 20px",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            boxShadow: "0 2px 6px rgba(15, 23, 42, 0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(139, 92, 246, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b5cf6" }}>
                <Icon name="reports" size={18} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Annual Run-Rate (ARR)</span>
            </div>
            <Sparkline color="#8b5cf6" d={SPARK_PATHS[1]} />
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
              {formatCurrency(arrDisplay)}
            </div>
            <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, marginTop: 2 }}>
              ↑ Live annual projection
            </div>
          </div>
        </div>

        {/* KPI 3: Active Plans */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "18px 20px",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            boxShadow: "0 2px 6px rgba(15, 23, 42, 0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(16, 185, 129, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                <Icon name="puzzle" size={18} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Active Plans</span>
            </div>
            <Sparkline color="#10b981" d={SPARK_PATHS[2]} />
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
              {activePlansCount}
            </div>
            <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, marginTop: 2 }}>
              Tier matrices active
            </div>
          </div>
        </div>

        {/* KPI 4: Subscriptions Total */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "18px 20px",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            boxShadow: "0 2px 6px rgba(15, 23, 42, 0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(245, 158, 11, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b" }}>
                <Icon name="users" size={18} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Total Subscriptions</span>
            </div>
            <Sparkline color="#f59e0b" d={SPARK_PATHS[3]} />
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
              {overview?.activeSubscriptions ?? subsTotal}
            </div>
            <div style={{ fontSize: 11, color: "#d97706", fontWeight: 700, marginTop: 2 }}>
              Churn rate {overview?.churnRate ?? 2.1}%
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabbed Card */}
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          border: "1px solid rgba(226, 232, 240, 0.8)",
          boxShadow: "0 2px 6px rgba(15, 23, 42, 0.03)",
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        {/* Navigation Tab Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f1f5f9",
            padding: "4px 16px",
            background: "#f8fafc",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
            {visibleTabs.map(({ label, index: i }) => (
              <button
                key={label}
                type="button"
                onClick={() => setTab(i)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: tab === i ? "#fff" : "transparent",
                  color: tab === i ? "#4f46e5" : "#64748b",
                  fontWeight: tab === i ? 700 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: tab === i ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.18s ease",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Billing Term:</span>
            <div style={{ display: "flex", gap: 2, background: "#e2e8f0", borderRadius: 999, padding: 3 }}>
              {(["Monthly", "Yearly"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBillingCycle(c)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 999,
                    border: "none",
                    background: billingCycle === c ? "#4f46e5" : "transparent",
                    color: billingCycle === c ? "#fff" : "#475569",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: billingCycle === c ? "0 2px 6px rgba(79, 70, 229, 0.25)" : "none",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab 0: Overview */}
        {tab === 0 && (
          <div style={{ padding: 24, display: "grid", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
              {/* Left Overview Info */}
              <div
                style={{
                  padding: 20,
                  borderRadius: 14,
                  border: "1px solid #f1f5f9",
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 6 }}>
                  Platform Billing Engine Overview
                </div>
                <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                  Manage recurring billing tiers, numeric quotas, feature capabilities, and subscription lifecycles wired synchronously through real-time API endpoints.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                  {[
                    "Plans & Pricing",
                    "Plan Features",
                    "Organisation Subscriptions",
                    "Subscription Status",
                    "Upgrade / Downgrade",
                    "Package Change Requests",
                    "Expiry & Grace Policy",
                  ].map((t) => (
                    <span
                      key={t}
                      style={{
                        background: "rgba(79, 70, 229, 0.08)",
                        color: "#4f46e5",
                        border: "1px solid rgba(79, 70, 229, 0.15)",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: 8,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

            </div>

            {/* Revenue Trend & Distribution Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>
              {/* MRR Trend */}
              <div
                style={{
                  padding: 20,
                  borderRadius: 14,
                  border: "1px solid #f1f5f9",
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>MRR Billing Trend</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#f1f5f9", color: "#64748b" }}>
                    Last 6 months
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 140, paddingTop: 10 }}>
                  {(overview?.mrrHistory ?? []).map((h) => (
                    <div key={h.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div
                        style={{
                          width: "80%",
                          background: "linear-gradient(180deg, #6366f1, #4f46e5)",
                          borderRadius: "6px 6px 0 0",
                          height: `${(h.mrr / Math.max(1, overview?.mrr || 6400)) * 90 + 18}px`,
                        }}
                      />
                      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{h.month}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>
                        ₹{(h.mrr / 100).toFixed(1)}L
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plan Distribution */}
              <div
                style={{
                  padding: 20,
                  borderRadius: 14,
                  border: "1px solid #f1f5f9",
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Organisation Tier Distribution</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(overview?.distribution || []).length === 0 ? (
                    <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                      No subscription data available.
                    </div>
                  ) : (
                    overview?.distribution.map((d) => (
                      <div key={d.planId} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ width: 80, fontSize: 12, fontWeight: 700, color: "#334155" }}>{d.planName}</span>
                        <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: `${d.pct}%`, height: "100%", background: "#4f46e5", borderRadius: 999 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, width: 80, textAlign: "right", color: "#64748b" }}>
                          {d.count} orgs ({d.pct}%)
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Plans & Pricing Matrices */}
        {tab === 1 && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Active Platform Tier Pricing
                </h3>
                <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
                  {plans.length} plans configured for {billingCycle} billing cycle
                </p>
              </div>
            </div>

            {plansLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading platform plans...</div>
            ) : plans.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No plans created yet.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 28 }}>
                {plans.map((p) => {
                  const price = priceFor(p, billingCycle);
                  const per = perFor(billingCycle);
                  return (
                    <div
                      key={p.id}
                      style={{
                        background: "#fff",
                        borderRadius: 16,
                        padding: "20px 22px",
                        border: p.isPopular ? "2px solid #4f46e5" : "1px solid #e2e8f0",
                        boxShadow: p.isPopular ? "0 8px 24px rgba(79, 70, 229, 0.12)" : "0 2px 6px rgba(15, 23, 42, 0.03)",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      {p.isPopular ? (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            right: 20,
                            background: "#4f46e5",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: "0.06em",
                            padding: "4px 10px",
                            borderRadius: "0 0 8px 8px",
                            textTransform: "uppercase",
                          }}
                        >
                          Popular
                        </div>
                      ) : null}

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <span style={{ padding: "3px 10px", borderRadius: 8, background: "rgba(79, 70, 229, 0.08)", color: "#4f46e5", fontWeight: 700, fontSize: 12 }}>
                            {p.name}
                          </span>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>{p.slug}</span>
                          {p.isSystem ? (
                            <span
                              title="The platform's default plan — every new organisation starts on it. It can be edited but never deleted or deactivated."
                              style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 6, background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }}
                            >
                              Default
                            </span>
                          ) : null}
                        </div>

                        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                          <span style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                            ₹{price.toLocaleString("en-IN")}
                          </span>
                          <span style={{ color: "#64748b", fontWeight: 600, fontSize: 13 }}>{per}</span>
                        </div>

                        <p style={{ fontSize: 12.5, color: "#64748b", marginBottom: 14, minHeight: 36, lineHeight: 1.5 }}>
                          {p.description || "Core operational plan tier"}
                        </p>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "3px 8px", borderRadius: 6, color: "#475569" }}>
                            {fmtLimit(p.limits?.projects)} Projects
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "3px 8px", borderRadius: 6, color: "#475569" }}>
                            {fmtLimit(p.limits?.users)} Users
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "3px 8px", borderRadius: 6, color: "#475569" }}>
                            {fmtLimit(p.limits?.templates)} Templates
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "3px 8px", borderRadius: 6, color: "#475569" }}>
                            {fmtLimit(p.limits?.landingPagesCreate)} Created Pages
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "3px 8px", borderRadius: 6, color: "#475569" }}>
                            {fmtLimit(p.limits?.landingPages)} Published Pages
                          </span>
                        </div>

                      </div>

                      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                        {canEditPlan ? <button
                          type="button"
                          onClick={() => openEdit(p)}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: "#334155",
                            cursor: "pointer",
                          }}
                        >
                          Edit Plan
                        </button> : null}
                        {canDeletePlan ? <button
                          type="button"
                          onClick={() => deletePlan(p.id)}
                          disabled={p.isSystem}
                          title={p.isSystem ? "The default plan can't be deleted — edit it instead." : undefined}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid #fecaca",
                            background: "#fef2f2",
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: "#ef4444",
                            cursor: p.isSystem ? "not-allowed" : "pointer",
                            opacity: p.isSystem ? 0.45 : 1,
                          }}
                        >
                          Delete
                        </button> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Matrix Comparison Table */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
                Feature &amp; Quota Comparison Matrix
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc", color: "#64748b", fontSize: 12, fontWeight: 700 }}>
                      <th style={{ padding: "12px 18px", textAlign: "left" }}>FEATURE / QUOTA</th>
                      {plans.map((p) => (
                        <th key={p.id} style={{ padding: "12px 18px", textAlign: "center" }}>{p.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {LIMIT_ROWS.map((row) => (
                      <tr key={row.key} style={{ borderBottom: "1px solid #f8fafc" }}>
                        <td style={{ padding: "12px 18px", fontWeight: 600, color: "#1e293b" }}>{row.label}</td>
                        {plans.map((p) => (
                          <td key={p.id} style={{ padding: "12px 18px", textAlign: "center", color: "#475569", fontWeight: 700 }}>
                            {fmtLimit(p.limits?.[row.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {capabilities.map((cap) => (
                      <tr key={cap.key} style={{ borderBottom: "1px solid #f8fafc" }}>
                        <td style={{ padding: "12px 18px", fontWeight: 600, color: "#1e293b" }} title={cap.description}>
                          {cap.label}
                        </td>
                        {plans.map((p) => (
                          <td key={p.id} style={{ padding: "12px 18px", textAlign: "center" }}>
                            {p.capabilities?.[cap.key] ? (
                              <Icon name="check" size={16} style={{ color: "#10b981", margin: "0 auto" }} />
                            ) : (
                              <span style={{ color: "#cbd5e1" }}>—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Organisation Subscriptions */}
        {tab === 2 && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Organisation Subscriptions</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(79, 70, 229, 0.08)", color: "#4f46e5" }}>
                  {subsTotal} active orgs
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ position: "relative", width: 260 }}>
                  <Icon name="search" size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    placeholder="Search org or plan..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 32px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 10,
                      fontSize: 13,
                    }}
                  />
                </div>
                {canAssignPlan ? <button
                  type="button"
                  onClick={() => setAssignOpen(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 10,
                    background: "#4f46e5",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <Icon name="plus" size={14} /> Assign Plan
                </button> : null}
              </div>
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc", color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left" }}>ORGANISATION</th>
                      <th style={{ padding: "10px 16px", textAlign: "center" }}>PLAN</th>
                      <th style={{ padding: "10px 16px", textAlign: "center" }}>BILLING TERM</th>
                      <th style={{ padding: "10px 16px", textAlign: "center" }}>STATUS</th>
                      <th style={{ padding: "10px 16px", textAlign: "center" }}>NEXT RENEWAL</th>
                      <th style={{ padding: "10px 16px", textAlign: "right" }}>MRR VALUE</th>
                      <th style={{ padding: "10px 16px", textAlign: "right" }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubs.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                          No subscriptions found.
                        </td>
                      </tr>
                    ) : (
                      filteredSubs.map((s) => (
                        <tr key={s.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ color: "#0f172a", fontWeight: 700 }}>
                              {s.organisation?.name ?? s.orgId}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{s.organisation?.city || "Active Tenant"}</div>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <span style={{ padding: "3px 10px", borderRadius: 8, background: "rgba(79, 70, 229, 0.08)", color: "#4f46e5", fontWeight: 700, fontSize: 11 }}>
                              {s.plan?.name ?? "Custom"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <span style={{ padding: "3px 8px", borderRadius: 6, background: "#f1f5f9", color: "#475569", fontWeight: 600, fontSize: 11, textTransform: "capitalize" }}>
                              {s.billingCycle}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                                background:
                                  s.status === "active"
                                    ? "rgba(16, 185, 129, 0.1)"
                                    : s.status === "past_due"
                                    ? "rgba(245, 158, 11, 0.1)"
                                    : "rgba(239, 68, 68, 0.1)",
                                color: s.status === "active" ? "#10b981" : s.status === "past_due" ? "#d97706" : "#ef4444",
                              }}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center", color: "#64748b", fontSize: 12 }}>
                            {s.renewsAt ? new Date(s.renewsAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                            ₹{(s.mrr ?? s.amount).toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              {canChangeSubscription ? <button
                                type="button"
                                onClick={() => {
                                  setUpgradeTarget(s);
                                  setUpgradePlanId(s.planId);
                                  setUpgradeCycle(s.billingCycle);
                                }}
                                style={{
                                  padding: "5px 10px",
                                  borderRadius: 6,
                                  border: "1px solid #cbd5e1",
                                  background: "#fff",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Change
                              </button> : null}
                              {canCancelSubscription && s.status !== "cancelled" ? (
                                <button
                                  type="button"
                                  onClick={() => setCancelTarget(s)}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: 6,
                                    border: "1px solid #fecaca",
                                    background: "#fef2f2",
                                    color: "#ef4444",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Cancel
                                </button>
                              ) : null}
                              {(s.status === "expired" || s.status === "cancelled" || s.status === "past_due") && (
                                canChangeSubscription ? (
                                  <button
                                    type="button"
                                    onClick={() => void renewRow(s.id)}
                                    style={{
                                      padding: "5px 10px",
                                      borderRadius: 6,
                                      border: "1px solid #bbf7d0",
                                      background: "#f0fdf4",
                                      color: "#16a34a",
                                      fontSize: 12,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Renew
                                  </button>
                                ) : null
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Package Change Requests */}
        {tab === 3 && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Package Change Requests
                </h3>
                <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
                  Upgrade and downgrade requests submitted by Organisation Admins
                </p>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { label: "Pending", val: "pending" },
                  { label: "All", val: "all" },
                  { label: "Approved", val: "approved" },
                  { label: "Rejected", val: "rejected" },
                ].map((st) => (
                  <button
                    key={st.val}
                    type="button"
                    onClick={() => {
                      setRequestFilterStatus(st.val);
                      void fetchPackageChangeRequests(st.val, 1);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: requestFilterStatus === st.val ? "#4f46e5" : "#f1f5f9",
                      color: requestFilterStatus === st.val ? "#fff" : "#475569",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc", color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left" }}>ORGANISATION</th>
                      <th style={{ padding: "10px 16px", textAlign: "left" }}>REQUESTED BY</th>
                      <th style={{ padding: "10px 16px", textAlign: "center" }}>CURRENT PLAN</th>
                      <th style={{ padding: "10px 16px", textAlign: "center" }}>TARGET PLAN</th>
                      <th style={{ padding: "10px 16px", textAlign: "center" }}>CYCLE</th>
                      <th style={{ padding: "10px 16px", textAlign: "center" }}>STATUS</th>
                      <th style={{ padding: "10px 16px", textAlign: "right" }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestsLoading ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                          Loading package change requests...
                        </td>
                      </tr>
                    ) : requests.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                          No package change requests found.
                        </td>
                      </tr>
                    ) : (
                      requests.map((r) => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <Link href={`/admin-console/organisation-detail/${r.orgId}`} style={{ textDecoration: "none", color: "#0f172a", fontWeight: 700 }}>
                              {r.organisation?.name ?? r.orgId}
                            </Link>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 600, color: "#1e293b" }}>
                              {r.requestedBy ? `${r.requestedBy.firstName ?? ""} ${r.requestedBy.lastName ?? ""}`.trim() || r.requestedBy.email : "Admin"}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{r.requestedBy?.email}</div>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <span style={{ padding: "3px 8px", borderRadius: 6, background: "#f1f5f9", color: "#475569", fontWeight: 600, fontSize: 11 }}>
                              {r.currentPlan?.name ?? "Current"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(79, 70, 229, 0.08)", color: "#4f46e5", fontWeight: 700, fontSize: 11 }}>
                              {r.targetPlan?.name ?? "Target"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center", textTransform: "capitalize" }}>
                            {r.billingCycle}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                                background:
                                  r.status === "pending"
                                    ? "rgba(245, 158, 11, 0.1)"
                                    : r.status === "approved"
                                    ? "rgba(16, 185, 129, 0.1)"
                                    : "rgba(239, 68, 68, 0.1)",
                                color: r.status === "pending" ? "#d97706" : r.status === "approved" ? "#10b981" : "#ef4444",
                              }}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            {r.status === "pending" ? (
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                {canApproveRequest ? <button
                                  type="button"
                                  onClick={() => void handleApproveRequest(r.id)}
                                  disabled={actionLoadingId === r.id}
                                  style={{
                                    padding: "5px 12px",
                                    borderRadius: 6,
                                    background: "#4f46e5",
                                    color: "#fff",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    border: "none",
                                    cursor: "pointer",
                                  }}
                                >
                                  Approve
                                </button> : null}
                                {canRejectRequest ? <button
                                  type="button"
                                  onClick={() => {
                                    setRejectModalReq(r);
                                    setRejectionReason("");
                                  }}
                                  disabled={actionLoadingId === r.id}
                                  style={{
                                    padding: "5px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #fecaca",
                                    background: "#fef2f2",
                                    color: "#ef4444",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Reject
                                </button> : null}
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: "#94a3b8" }}>Completed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Subscription Expiry Policy */}
        {tab === 5 && (
          <div style={{ padding: 24, display: "grid", gap: 20 }}>
            <div style={{ padding: 24, borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff", maxWidth: 720 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 4 }}>
                Subscription Expiry &amp; Grace Policy
              </div>
              <p style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
                Controls what happens when an organisation&apos;s subscription term ends. Saved values are enforced synchronously across the platform lifecycle.
              </p>

              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Notify Days Before Expiry
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={expiryPolicy.billingExpiryNotifyDays}
                      onChange={(e) => setExpiryPolicy((p) => ({ ...p, billingExpiryNotifyDays: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Grace Period (Days)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={expiryPolicy.billingGracePeriodDays}
                      onChange={(e) => setExpiryPolicy((p) => ({ ...p, billingGracePeriodDays: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    Action When Grace Period Ends
                  </label>
                  <select
                    value={expiryPolicy.billingExpiryBehavior}
                    onChange={(e) => setExpiryPolicy((p) => ({ ...p, billingExpiryBehavior: e.target.value as "restrict" | "cancel" }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                  >
                    <option value="restrict">Restrict Organisation (publishing paused)</option>
                    <option value="cancel">Cancel Subscription (soft cancel)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    In-App Expiry Notification Message
                  </label>
                  <textarea
                    value={expiryPolicy.billingExpiryMessage}
                    onChange={(e) => setExpiryPolicy((p) => ({ ...p, billingExpiryMessage: e.target.value }))}
                    placeholder="Your subscription has expired — renew to keep publishing..."
                    rows={3}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={loadExpiryPolicy}
                    style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13, fontWeight: 600 }}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={saveExpiryPolicy}
                    disabled={savingPolicy}
                    style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    {savingPolicy ? "Saving..." : "Save Expiry Policy"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Plan Modal */}
      <Modal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title={editingPlan ? "Edit Platform Tier Plan" : "Create New Platform Tier Plan"}
        description={<>Configure pricing, numeric quota limits and system capabilities. Endpoint: <code style={{ color: "#4f46e5", fontWeight: 700 }}>/admin/plans</code></>}
        size="lg"
        footer={
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", width: "100%" }}>
            <button
              type="button"
              onClick={() => setPlanModalOpen(false)}
              style={{ padding: "9px 18px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={savePlan}
              disabled={savingPlan}
              style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: "#4f46e5", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)" }}
            >
              {savingPlan ? "Saving…" : editingPlan ? "Save Plan Changes" : "＋ Create & Publish Plan"}
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 6 }}>
          {/* Card 1: Basic Info & Pricing */}
          <div style={{ background: "#f8fafc", borderRadius: 14, padding: 18, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(79, 70, 229, 0.08)", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="billing" size={16} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Basic Information &amp; Pricing</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  Plan Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  value={String(planForm.name || "")}
                  onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Professional"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  URL Slug
                </label>
                <input
                  value={String((planForm as any).slug || "")}
                  onChange={(e) => setPlanForm((p) => ({ ...p, slug: e.target.value }))}
                  placeholder="professional"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
                {!editingPlan ? (
                  <div style={{ marginTop: 5, fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
                    Slug will be generated automatically if you leave this blank. You can also enter your own slug.
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  Price / Month (₹) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "#64748b", fontSize: 13 }}>₹</span>
                  <input
                    type="number"
                    min={0}
                    value={String(planForm.priceMonthly ?? "")}
                    onChange={(e) => setPlanForm((p) => ({ ...p, priceMonthly: Number(e.target.value || 0) }))}
                    style={{ width: "100%", padding: "8px 12px 8px 24px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, fontWeight: 700 }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", margin: 0 }}>
                    Price / Year (₹) <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <span style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "1px 6px", borderRadius: 999, fontSize: 10, fontWeight: 800 }}>
                    Save ~15%
                  </span>
                </div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "#64748b", fontSize: 13 }}>₹</span>
                  <input
                    type="number"
                    min={0}
                    value={String(planForm.priceYearly ?? "")}
                    onChange={(e) => setPlanForm((p) => ({ ...p, priceYearly: Number(e.target.value || 0) }))}
                    style={{ width: "100%", padding: "8px 12px 8px 24px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, fontWeight: 700 }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Description</label>
              <textarea
                rows={2}
                value={String(planForm.description || "")}
                onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Who is this plan designed for?"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12.5 }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, fontWeight: 600, color: "#d97706", cursor: "pointer", background: "rgba(245, 158, 11, 0.08)", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                <input type="checkbox" checked={!!(planForm as any).isPopular} onChange={(e) => setPlanForm((p) => ({ ...p, isPopular: e.target.checked } as any))} style={{ width: 16, height: 16, accentColor: "#4f46e5" }} />
                ★ Highlight as Popular Plan
              </label>

            </div>
          </div>

          {/* Card 3: Limits & Quotas */}
          <div style={{ background: "#f8fafc", borderRadius: 14, padding: 18, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(16, 185, 129, 0.08)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="reports" size={16} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Resource Quotas &amp; Limits</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {LIMIT_ROWS.map((row) => {
                const v = formLimit(row.key);
                const unlimited = v === null;
                return (
                  <div key={row.key} style={{ padding: 12, borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>{row.label}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={unlimited ? "" : String(v)}
                        disabled={unlimited}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const n = raw === "" ? 0 : Math.max(0, Math.floor(Number(raw) || 0));
                          setFormLimit(row.key, n);
                        }}
                        placeholder="Unlimited"
                        style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12.5 }}
                      />
                      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>
                        <input type="checkbox" checked={unlimited} onChange={(e) => setFormLimit(row.key, e.target.checked ? null : 0)} />
                        Unlimited
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: Dynamic Feature Highlights */}
          <div style={{ background: "#f8fafc", borderRadius: 14, padding: 18, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(99, 102, 241, 0.08)", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="check" size={16} />
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Plan Feature Highlights ({planForm.features?.length || 0})</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFeature();
                  }
                }}
                placeholder="Add feature bullet point (e.g. 24/7 Dedicated Support) & press Enter"
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
              />
              <button
                type="button"
                onClick={addFeature}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
              >
                + Add Feature
              </button>
            </div>

            {(planForm.features?.length ?? 0) === 0 ? (
              <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No feature bullet points added yet. Type above and click "+ Add Feature".</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {planForm.features?.map((ft, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#fff",
                      border: "1px solid #cbd5e1",
                      borderRadius: 20,
                      padding: "5px 12px",
                      fontSize: 12,
                      color: "#334155",
                      fontWeight: 600,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  >
                    <span style={{ color: "#10b981" }}>✓</span> {ft}
                    <button
                      type="button"
                      onClick={() => removeFeature(idx)}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14, fontWeight: 700, padding: "0 2px", marginLeft: 2 }}
                      title="Remove feature"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Card 4: Module Capabilities & Access */}
          <div style={{ background: "#f8fafc", borderRadius: 14, padding: 18, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(14, 165, 233, 0.08)", color: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="key" size={16} />
                </div>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Module Capabilities &amp; Access</span>
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: "rgba(14, 165, 233, 0.12)", color: "#0284c7", padding: "2px 8px", borderRadius: 10 }}>
                    {Object.values(planForm.capabilities || {}).filter(Boolean).length} / {capabilities.length} Active
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setAllCapabilities(true)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", fontSize: 11.5, fontWeight: 600, color: "#0284c7", cursor: "pointer" }}
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={() => setAllCapabilities(false)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", fontSize: 11.5, fontWeight: 600, color: "#64748b", cursor: "pointer" }}
                >
                  Disable All
                </button>
              </div>
            </div>

            {capabilities.length === 0 ? (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Loading capability catalog from server...</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {capabilities.map((cap) => {
                  const enabled = !!planForm.capabilities?.[cap.key];
                  return (
                    <label
                      key={cap.key}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        fontSize: 12.5,
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: enabled ? "rgba(14, 165, 233, 0.05)" : "#fff",
                        border: enabled ? "1px solid rgba(14, 165, 233, 0.3)" : "1px solid #e2e8f0",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        style={{ marginTop: 2, accentColor: "#0ea5e9", width: 16, height: 16 }}
                        checked={enabled}
                        onChange={(e) => toggleCapability(cap.key, e.target.checked)}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: 700, color: enabled ? "#0284c7" : "#0f172a" }}>{cap.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: enabled ? "#0284c7" : "#94a3b8" }}>
                            {enabled ? "ACTIVE" : "OFF"}
                          </span>
                        </div>
                        <span style={{ display: "block", color: "#64748b", fontSize: 11, marginTop: 2, lineHeight: 1.3 }}>{cap.description}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </Modal>

      {/* Upgrade / Change Plan Modal */}
      <Modal
        open={!!upgradeTarget}
        onClose={() => setUpgradeTarget(null)}
        title="Upgrade / Change Subscription"
        description={
          upgradeTarget ? (
            <>
              Change subscription for <strong>{upgradeTarget.organisation?.name}</strong>
            </>
          ) : undefined
        }
        size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setUpgradeTarget(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={confirmUpgrade}>
              Confirm change
            </button>
          </>
        }
      >
        <div className="field">
          <label>Select Plan</label>
          <select value={upgradePlanId} onChange={(e) => setUpgradePlanId(e.target.value)}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ₹{p.priceMonthly}/mo / ₹{p.priceYearly}/yr
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Billing Cycle</label>
          <select value={upgradeCycle} onChange={(e) => setUpgradeCycle(e.target.value as any)}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </Modal>

      {/* Assign Plan Modal */}
      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign Subscription"
        description="Link an organisation to a platform plan."
        size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAssignOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={confirmAssign}>
              Assign Plan
            </button>
          </>
        }
      >
        <div className="field">
          <label>Organisation</label>
          <select value={assignOrgId} onChange={(e) => setAssignOrgId(e.target.value)}>
            <option value="">Select organisation</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} — {o.city}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Plan</label>
          <select value={assignPlanId} onChange={(e) => setAssignPlanId(e.target.value)}>
            <option value="">Select plan</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ₹{p.priceMonthly}/mo
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Billing Cycle</label>
          <select value={assignCycle} onChange={(e) => setAssignCycle(e.target.value as any)}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </Modal>

      {/* Reject Request Modal */}
      <Modal
        open={!!rejectModalReq}
        onClose={() => {
          setRejectModalReq(null);
          setRejectionReason("");
        }}
        title="Reject Package Change Request"
        description={rejectModalReq ? `Rejecting request from ${rejectModalReq.organisation?.name ?? "Organisation"}` : undefined}
        size="md"
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setRejectModalReq(null);
                setRejectionReason("");
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={() => void handleRejectRequest()}
              disabled={actionLoadingId === rejectModalReq?.id}
            >
              {actionLoadingId === rejectModalReq?.id ? "Rejecting…" : "Reject Request"}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Rejection Reason (Optional)</label>
          <textarea
            className="inp"
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter reason for rejecting this request..."
            style={{ width: "100%", padding: 10 }}
          />
        </div>
      </Modal>

      {toast ? (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}>
          <div style={{ padding: "12px 18px", borderRadius: 12, background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", fontSize: 13, fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
            {toast}
          </div>
        </div>
      ) : null}

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

      <ConfirmModal
        open={cancelTarget !== null}
        title="Cancel this subscription?"
        message={
          cancelTarget
            ? `This will cancel the subscription for ${cancelTarget.organisation?.name || "this organisation"}.`
            : ""
        }
        confirmLabel="Cancel subscription"
        destructive
        busy={cancellingSubscription}
        onConfirm={() => void confirmCancelSubscription()}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
}
