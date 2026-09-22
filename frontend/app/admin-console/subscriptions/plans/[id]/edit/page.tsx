"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, getPlanCapabilities } from "@/lib/api";
import type { Plan, PlanCapability } from "@/lib/types";
import { Icon, type IconName } from "@/components/icons";



const LIMIT_CONFIG = [
  { key: "projects" as const, label: "Projects", icon: "building" as IconName, hint: "Maximum number of projects." },
  { key: "users" as const, label: "Users", icon: "users" as IconName, hint: "Maximum number of user seats." },
  { key: "templates" as const, label: "Templates", icon: "templates" as IconName, hint: "Maximum number of assigned templates." },
  { key: "landingPagesCreate" as const, label: "Created Landing Pages", icon: "landing" as IconName, hint: "Maximum landing pages created (drafts + live)." },
  { key: "landingPages" as const, label: "Published Landing Pages", icon: "globe" as IconName, hint: "Maximum published landing pages simultaneously." },
];

function fmtLimit(n: number | null | undefined): string {
  return n == null ? "Unlimited" : String(n);
}

export default function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const planId = resolvedParams.id;
  const router = useRouter();

  const [capabilities, setCapabilities] = useState<PlanCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewCycle, setPreviewCycle] = useState<"monthly" | "yearly">("monthly");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    priceMonthly: 0,
    priceYearly: 0,
    description: "",
    badge: "b-indigo",
    color: "#eef0fe",
    isPopular: false,
    limits: {
      projects: null as number | null,
      users: null as number | null,
      templates: null as number | null,
      landingPagesCreate: null as number | null,
      landingPages: null as number | null,
    },
    capabilities: {} as Record<string, boolean>,
    features: [] as string[],
  });

  useEffect(() => {
    Promise.all([getPlanCapabilities(), apiFetch<Plan[]>("/admin/plans")])
      .then(([caps, plans]) => {
        setCapabilities(caps);
        const p = plans.find((item) => item.id === planId);
        if (p) {
          setForm({
            name: p.name || "",
            slug: p.slug || "",
            priceMonthly: p.priceMonthly || 0,
            priceYearly: p.priceYearly || 0,
            description: p.description || "",
            badge: p.badge || "b-indigo",
            color: p.color || "#eef0fe",
            isPopular: !!p.isPopular,
            limits: {
              projects: p.limits?.projects ?? null,
              users: p.limits?.users ?? null,
              templates: p.limits?.templates ?? null,
              landingPagesCreate: p.limits?.landingPagesCreate ?? null,
              landingPages: p.limits?.landingPages ?? null,
            },
            capabilities: { ...(p.capabilities || {}) },
            features: [...(p.features || [])],
          });
        } else {
          setError("Plan not found");
        }
      })
      .catch((err) => setError(err?.message || "Failed to load plan details"))
      .finally(() => setLoading(false));
  }, [planId]);

  const setLimit = (key: keyof typeof form.limits, val: number | null) => {
    setForm((prev) => ({
      ...prev,
      limits: { ...prev.limits, [key]: val },
    }));
  };

  const toggleCapability = (key: string, on: boolean) => {
    setForm((prev) => ({
      ...prev,
      capabilities: { ...prev.capabilities, [key]: on },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Plan name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const capMap: Record<string, boolean> = {};
      for (const cap of capabilities) {
        if (form.capabilities[cap.key]) capMap[cap.key] = true;
      }

      await apiFetch<Plan>(`/admin/plans/${planId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim() || undefined,
          description: form.description.trim() || "",
          priceMonthly: Number(form.priceMonthly || 0),
          priceYearly: Number(form.priceYearly || 0),
          features: form.features,
          limits: form.limits,
          capabilities: capMap,
          color: form.color,
          badge: form.badge,
          isPopular: form.isPopular,
        }),
      });

      router.push("/admin-console/subscriptions");
    } catch (err: any) {
      setError(err?.message || "Failed to update plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading plan configuration...</div>;
  }

  const activePrice = previewCycle === "monthly" ? form.priceMonthly : form.priceYearly;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "10px 0 60px" }}>
      {/* Header Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link
            href="/admin-console/subscriptions"
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
              textDecoration: "none",
            }}
          >
            ← Back to Subscriptions
          </Link>

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#4f46e5", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
              EDIT TIER CONFIGURATION
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
              Edit Plan: {form.name || "Tier"}
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, background: "#f1f5f9", padding: "6px 12px", borderRadius: 999 }}>
            API Endpoint: <code style={{ color: "#4f46e5", fontWeight: 700 }}>/admin/plans/{planId}</code>
          </div>
        </div>
      </div>

      {error ? (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", marginBottom: 20, fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 24, alignItems: "start" }}>
          {/* Left Form Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Card 1: Basic Information & Pricing */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 2px 6px rgba(15, 23, 42, 0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(79, 70, 229, 0.08)", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="billing" size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Basic Information &amp; Pricing</h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Update tier name, slug, description, and monthly/yearly rates.</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    Plan Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Professional"
                    required
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 13.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    URL Slug <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                    placeholder="professional"
                    required
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 13.5 }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    Price / Month (₹) <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "#64748b" }}>₹</span>
                    <input
                      type="number"
                      min={0}
                      value={form.priceMonthly}
                      onChange={(e) => setForm((p) => ({ ...p, priceMonthly: Number(e.target.value || 0) }))}
                      required
                      style={{ width: "100%", padding: "10px 14px 10px 28px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 13.5, fontWeight: 700 }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", margin: 0 }}>
                      Price / Year (₹) <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <span style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800 }}>
                      Save ~15%
                    </span>
                  </div>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "#64748b" }}>₹</span>
                    <input
                      type="number"
                      min={0}
                      value={form.priceYearly}
                      onChange={(e) => setForm((p) => ({ ...p, priceYearly: Number(e.target.value || 0) }))}
                      required
                      style={{ width: "100%", padding: "10px 14px 10px 28px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 13.5, fontWeight: 700 }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>Description</label>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Who is this plan designed for?"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 13, resize: "vertical" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    background: "rgba(245, 158, 11, 0.05)",
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.isPopular}
                    onChange={(e) => setForm((p) => ({ ...p, isPopular: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: "#4f46e5" }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#d97706" }}>
                      ★ Highlight as Popular Plan
                    </div>
                  </div>
                </label>

              </div>
            </div>

            {/* Card 3: Limits & Quotas */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 2px 6px rgba(15, 23, 42, 0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(16, 185, 129, 0.08)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="reports" size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Resource Quotas &amp; Limits</h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Specify exact numeric limits or check Unlimited.</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {LIMIT_CONFIG.map((conf) => {
                  const val = form.limits[conf.key];
                  const isUnlimited = val === null;
                  return (
                    <div
                      key={conf.key}
                      style={{
                        padding: 16,
                        border: "1px solid #f1f5f9",
                        borderRadius: 12,
                        background: "#f8fafc",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: "#fff", border: "1px solid #e2e8f0", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon name={conf.icon} size={15} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{conf.label}</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                        <input
                          type="number"
                          min={0}
                          disabled={isUnlimited}
                          value={isUnlimited ? "" : String(val ?? 0)}
                          onChange={(e) => setLimit(conf.key, Math.max(0, Math.floor(Number(e.target.value || 0))))}
                          placeholder="Unlimited"
                          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                        />
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#475569", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={isUnlimited}
                            onChange={(e) => setLimit(conf.key, e.target.checked ? null : 0)}
                          />
                          Unlimited
                        </label>
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{conf.hint}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 4: Capabilities */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 2px 6px rgba(15, 23, 42, 0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(14, 165, 233, 0.08)", color: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="key" size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Module Capabilities &amp; Access</h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Check features included in this tier payload.</p>
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {capabilities.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Loading capabilities catalog...</p>
                ) : (
                  capabilities.map((cap) => (
                    <label
                      key={cap.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        border: "1px solid #f1f5f9",
                        borderRadius: 12,
                        background: form.capabilities[cap.key] ? "rgba(79, 70, 229, 0.04)" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!form.capabilities[cap.key]}
                        onChange={(e) => toggleCapability(cap.key, e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: "#4f46e5" }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{cap.label}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{cap.description}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Live Preview Card */}
          <div style={{ position: "sticky", top: 80 }}>
            <div
              style={{
                background: "#fff",
                borderRadius: 18,
                padding: 24,
                border: form.isPopular ? "2px solid #4f46e5" : "1px solid rgba(226, 232, 240, 0.8)",
                boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
                position: "relative",
              }}
            >
              {form.isPopular ? (
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

              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
                LIVE CARD PREVIEW
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ padding: "4px 12px", borderRadius: 8, background: "rgba(79, 70, 229, 0.08)", color: "#4f46e5", fontWeight: 800, fontSize: 13 }}>
                  {form.name || "Plan Name"}
                </span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{form.slug || "slug"}</span>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 34, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                  ₹{(activePrice || 0).toLocaleString("en-IN")}
                </span>
                <span style={{ color: "#64748b", fontWeight: 600, fontSize: 13 }}>
                  {previewCycle === "monthly" ? "/mo" : "/yr"}
                </span>
              </div>

              {/* Cycle Toggle in Preview */}
              <div style={{ display: "flex", gap: 4, background: "#f1f5f9", padding: 3, borderRadius: 8, marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => setPreviewCycle("monthly")}
                  style={{
                    flex: 1,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "none",
                    background: previewCycle === "monthly" ? "#fff" : "transparent",
                    color: previewCycle === "monthly" ? "#0f172a" : "#64748b",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewCycle("yearly")}
                  style={{
                    flex: 1,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "none",
                    background: previewCycle === "yearly" ? "#fff" : "transparent",
                    color: previewCycle === "yearly" ? "#0f172a" : "#64748b",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Yearly
                </button>
              </div>

              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.5 }}>
                {form.description || "Plan description will appear here..."}
              </p>

              {/* Quota Chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                <span style={{ fontSize: 11, fontWeight: 600, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "4px 8px", borderRadius: 6, color: "#475569" }}>
                  {fmtLimit(form.limits.projects)} Projects
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "4px 8px", borderRadius: 6, color: "#475569" }}>
                  {fmtLimit(form.limits.users)} Users
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "4px 8px", borderRadius: 6, color: "#475569" }}>
                  {fmtLimit(form.limits.templates)} Templates
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "4px 8px", borderRadius: 6, color: "#475569" }}>
                  {fmtLimit(form.limits.landingPages)} Pages
                </span>
              </div>


              {/* Submit Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    width: "100%",
                    padding: "12px 18px",
                    borderRadius: 12,
                    background: "#4f46e5",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
                  }}
                >
                  {saving ? "Saving Changes..." : "Save Plan Changes"}
                </button>
                <Link
                  href="/admin-console/subscriptions"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "10px 18px",
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#475569",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
