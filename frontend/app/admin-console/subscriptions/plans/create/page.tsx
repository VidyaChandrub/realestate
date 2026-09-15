"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, getPlanCapabilities } from "@/lib/api";
import type { Plan, PlanCapability } from "@/lib/types";
import { Icon, type IconName } from "@/components/icons";

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

const LIMIT_CONFIG = [
  { key: "projects" as const, label: "Projects", icon: "properties" as IconName, hint: "Maximum number of projects." },
  { key: "users" as const, label: "Users", icon: "crm" as IconName, hint: "Maximum number of users." },
  { key: "templates" as const, label: "Templates", icon: "document" as IconName, hint: "Maximum number of templates." },
  { key: "landingPages" as const, label: "Maximum Published Landing Pages", icon: "globe" as IconName, hint: "Maximum number of landing pages that can be published." },
];

export default function CreatePlanPage() {
  const router = useRouter();
  const [capabilities, setCapabilities] = useState<PlanCapability[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    priceMonthly: 3500,
    priceYearly: 35000,
    description: "",
    badge: "b-indigo",
    color: "#eef0fe",
    isPopular: false,
    limits: {
      projects: 3 as number | null,
      users: 2 as number | null,
      templates: 20 as number | null,
      landingPages: 5 as number | null,
    },
    capabilities: {} as Record<string, boolean>,
    features: ["1 Templates", "3 Projects", "2 Users", "5 Landing pages"] as string[],
  });

  const [featureInput, setFeatureInput] = useState("");

  useEffect(() => {
    getPlanCapabilities()
      .then(setCapabilities)
      .catch(() => {});
  }, []);

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug === "" || prev.slug === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") ? slug : prev.slug,
    }));
  };

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

  const addFeature = () => {
    const f = featureInput.trim();
    if (!f) return;
    setForm((prev) => ({ ...prev, features: [...prev.features, f] }));
    setFeatureInput("");
  };

  const removeFeature = (idx: number) => {
    setForm((prev) => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));
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

      await apiFetch<Plan>("/admin/plans", {
        method: "POST",
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
      setError(err?.message || "Failed to create plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 60px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/admin-console/subscriptions" className="btn btn-ghost btn-sm" style={{ padding: "8px 12px" }}>
            ← Back
          </Link>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--brand-050)",
              color: "var(--brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="plus" size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Create Plan</h1>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Configure pricing, numeric quotas and capabilities
            </p>
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 999,
            background: "var(--surface-2)",
            border: "1px solid var(--line-2)",
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          <span>Saved to</span>
          <code style={{ color: "var(--brand)", fontWeight: 600 }}>/admin/plans</code>
        </div>
      </div>

      {error ? <div className="form-alert" style={{ marginBottom: 20 }}>{error}</div> : null}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Section 1: Basic Information */}
        <div className="card" style={{ padding: 24, borderRadius: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--brand-050)",
                color: "var(--brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="document" size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Basic Information</h3>
              <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
                Set the basic details for this plan.
              </p>
            </div>
          </div>

          <div className="row2" style={{ marginBottom: 16 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>
                Plan name <span style={{ color: "var(--rose)" }}>*</span>
              </label>
              <input
                className="inp"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Starter"
                required
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>
                Slug <span style={{ color: "var(--rose)" }}>*</span>
              </label>
              <input
                className="inp"
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                placeholder="starter"
                required
              />
              <div className="hint" style={{ fontSize: 11.5, marginTop: 4 }}>
                Used in URL. Only lowercase letters, numbers and hyphens.
              </div>
            </div>
          </div>

          <div className="row2" style={{ marginBottom: 16 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>
                Price / month (₹) <span style={{ color: "var(--rose)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontWeight: 600,
                    color: "var(--muted)",
                  }}
                >
                  ₹
                </span>
                <input
                  className="inp"
                  type="number"
                  min={0}
                  value={form.priceMonthly}
                  onChange={(e) => setForm((p) => ({ ...p, priceMonthly: Number(e.target.value || 0) }))}
                  style={{ paddingLeft: 28 }}
                  required
                />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>
                  Price / year (₹) <span style={{ color: "var(--rose)" }}>*</span>
                </label>
                <span
                  style={{
                    background: "var(--green-050)",
                    color: "var(--green)",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Save up to 20%
                </span>
              </div>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontWeight: 600,
                    color: "var(--muted)",
                  }}
                >
                  ₹
                </span>
                <input
                  className="inp"
                  type="number"
                  min={0}
                  value={form.priceYearly}
                  onChange={(e) => setForm((p) => ({ ...p, priceYearly: Number(e.target.value || 0) }))}
                  style={{ paddingLeft: 28 }}
                  required
                />
              </div>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, fontSize: 13 }}>Description</label>
            <div style={{ position: "relative" }}>
              <textarea
                className="inp"
                rows={3}
                maxLength={300}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Who is this plan for?"
                style={{ width: "100%", paddingRight: 60 }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  bottom: 10,
                  fontSize: 11,
                  color: "var(--muted)",
                }}
              >
                {form.description.length}/300
              </span>
            </div>
          </div>

          <div className="row2" style={{ marginBottom: 16 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>Badge</label>
              <select
                className="inp"
                value={form.badge}
                onChange={(e) => setForm((p) => ({ ...p, badge: e.target.value }))}
              >
                {PLAN_BADGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <div className="hint" style={{ fontSize: 11.5, marginTop: 4 }}>
                Show a badge for this plan (e.g. Popular, New, Best Value)
              </div>
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>Color</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                  style={{
                    width: 42,
                    height: 42,
                    padding: 2,
                    border: "1px solid var(--line-2)",
                    borderRadius: 10,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                />
                <input
                  className="inp"
                  value={form.color}
                  onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                  style={{ flex: 1 }}
                />
              </div>
              <div className="hint" style={{ fontSize: 11.5, marginTop: 4 }}>
                Choose a color for plan display
              </div>
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              border: "1px solid var(--amber-050)",
              background: "var(--amber-050)",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.isPopular}
              onChange={(e) => setForm((p) => ({ ...p, isPopular: e.target.checked }))}
              style={{ width: 18, height: 18 }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--amber)" }}>
                ★ Mark as Popular plan
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
                This plan will be highlighted in the plan list.
              </div>
            </div>
          </label>
        </div>

        {/* Section 2: Limits */}
        <div className="card" style={{ padding: 24, borderRadius: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--brand-050)",
                color: "var(--brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="reports" size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Limits</h3>
              <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
                Set a number per quota, or toggle Unlimited.
              </p>
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
                    border: "1px solid var(--line-2)",
                    borderRadius: 12,
                    background: "var(--surface)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "var(--surface-2)",
                        color: "var(--brand)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name={conf.icon} size={16} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{conf.label}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                    <input
                      className="inp"
                      type="number"
                      min={0}
                      disabled={isUnlimited}
                      value={isUnlimited ? "" : String(val ?? 0)}
                      onChange={(e) => setLimit(conf.key, Math.max(0, Math.floor(Number(e.target.value || 0))))}
                      placeholder="Unlimited"
                      style={{ flex: 1 }}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={isUnlimited}
                        onChange={(e) => setLimit(conf.key, e.target.checked ? null : 0)}
                      />
                      Unlimited
                    </label>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{conf.hint}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Capabilities */}
        <div className="card" style={{ padding: 24, borderRadius: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--brand-050)",
                color: "var(--brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="key" size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Capabilities</h3>
              <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
                Select the features included in this plan.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {capabilities.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Loading capabilities catalog…</p>
            ) : (
              capabilities.map((cap) => (
                <label
                  key={cap.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    border: "1px solid var(--line-2)",
                    borderRadius: 12,
                    background: "var(--surface)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!form.capabilities[cap.key]}
                    onChange={(e) => toggleCapability(cap.key, e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{cap.label}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{cap.description}</div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Section 4: Marketing Bullet Points */}
        <div className="card" style={{ padding: 24, borderRadius: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--brand-050)",
                color: "var(--brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="sparkles" size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Marketing Bullet Points</h3>
              <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
                Copy shown on the pricing card.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input
              className="inp"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
              placeholder="e.g. Email support, Custom domain, Basic analytics"
              style={{ flex: 1 }}
            />
            <button className="btn btn-ghost" type="button" onClick={addFeature}>
              + Add
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {form.features.map((f, i) => (
              <span
                key={i}
                className="chip"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line-2)",
                  fontSize: 12.5,
                  padding: "4px 10px",
                }}
              >
                {f}{" "}
                <button
                  type="button"
                  onClick={() => removeFeature(i)}
                  style={{
                    marginLeft: 6,
                    border: "none",
                    background: "none",
                    color: "var(--rose)",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
          <Link href="/admin-console/subscriptions" className="btn btn-ghost">
            Cancel
          </Link>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Creating Plan…" : "+ Create Plan"}
          </button>
        </div>
      </form>
    </div>
  );
}
