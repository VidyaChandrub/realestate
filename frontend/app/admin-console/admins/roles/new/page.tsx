"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Icon } from "@/components/icons";
import {
  FLASH_KEY,
  FLASH_TAB_KEY,
  FieldError,
  LIST_PATH,
  Section,
  fieldLabel,
  grid,
  inputStyle,
} from "../../member-form";

// Create platform role as a full page (was a modal on the Roles tab). Same
// fields and request as before — name, optional key, description, with the
// two quick-start presets.

const PRESETS = [
  { name: "Platform Operator", key: "platform_operator", desc: "Day-to-day Super Admin console: organisations, domains, support" },
  { name: "Platform Support", key: "platform_support", desc: "Helps organisations with onboarding, billing, and access issues" },
];

const NAME_MAX = 100;

export default function CreatePlatformRolePage() {
  const router = useRouter();
  const { isLoading, hasPermission } = useAuth();
  const [form, setForm] = useState({ name: "", key: "", description: "" });
  const [nameError, setNameError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  if (!hasPermission("admin_platform_team", "add")) {
    return (
      <div className="form-alert" style={{ maxWidth: 880, margin: "0 auto" }}>
        You don&apos;t have permission to create platform roles. <Link href={LIST_PATH}>Back to Platform Team</Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    if (!form.name.trim()) {
      setNameError("Role name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/admin/platform-roles", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          key: form.key.trim() || undefined,
          description: form.description,
        }),
      });
      try {
        sessionStorage.setItem(FLASH_KEY, "Platform role created");
        sessionStorage.setItem(FLASH_TAB_KEY, "roles");
      } catch {
        // Storage unavailable — the redirect still happens, just without a toast.
      }
      router.push(LIST_PATH);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create role");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", width: "100%" }}>
      <nav
        aria-label="Breadcrumb"
        style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7, fontSize: 13, color: "#64748b", marginBottom: 16 }}
      >
        <Icon name="home" size={14} />
        <span>Platform</span>
        <span style={{ color: "#94a3b8" }}>›</span>
        <Link href={LIST_PATH} style={{ color: "#64748b", textDecoration: "none" }}>
          Platform Team
        </Link>
        <span style={{ color: "#94a3b8" }}>›</span>
        <span style={{ color: "#0f172a", fontWeight: 600 }}>Create role</span>
      </nav>

      <form
        onSubmit={handleSubmit}
        noValidate
        style={{
          background: "#ffffff",
          border: "1px solid #eef2f6",
          borderRadius: 18,
          padding: "20px clamp(16px, 4vw, 28px) 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: 20 }}>
          <Link
            href={LIST_PATH}
            aria-label="Back to Platform Team"
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#334155",
            }}
          >
            <Icon name="chevron-left" size={16} />
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Create platform role</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#64748b" }}>
              Define a new role that can be assigned to platform admins.
            </p>
          </div>
        </div>

        {formError ? (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 16,
            }}
          >
            <Icon name="alert" size={16} />
            {formError}
          </div>
        ) : null}

        <Section icon="plus" iconBg="#eef2ff" iconColor="#0f1424" title="Quick start">
          <div style={grid}>
            {PRESETS.map((p) => {
              const selected = form.key === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setForm({ name: p.name, key: p.key, description: p.desc });
                    setNameError(undefined);
                  }}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: selected ? "1.5px solid #0f1424" : "1px solid #e2e8f0",
                    background: selected ? "#eef2ff" : "#ffffff",
                    color: selected ? "#0f1424" : "#475569",
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                    lineHeight: 1.4,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: selected ? "#6366f1" : "#94a3b8" }}>{p.desc}</div>
                </button>
              );
            })}
          </div>
        </Section>

        <Section icon="shield" iconBg="#fef3c7" iconColor="#d97706" title="Role details">
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="pr-name" style={fieldLabel}>Role name *</label>
            <input
              id="pr-name"
              style={inputStyle(!!nameError)}
              value={form.name}
              maxLength={NAME_MAX}
              placeholder="e.g. Platform Operator"
              aria-invalid={!!nameError}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                setNameError(undefined);
              }}
            />
            <FieldError message={nameError} />
          </div>
          <div style={{ ...grid, marginBottom: 16 }}>
            <div>
              <label htmlFor="pr-key" style={fieldLabel}>Key / slug</label>
              <input
                id="pr-key"
                style={inputStyle(false)}
                value={form.key}
                maxLength={50}
                placeholder="Auto-generated if empty"
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 14 }}>🌐</span>
                Platform scope
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="pr-desc" style={fieldLabel}>Description</label>
            <textarea
              id="pr-desc"
              style={{ ...inputStyle(false), minHeight: 88, resize: "vertical" }}
              rows={3}
              value={form.description}
              placeholder="What does this role do?"
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </Section>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap-reverse",
            justifyContent: "flex-end",
            gap: 10,
            paddingTop: 18,
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <Link
            href={LIST_PATH}
            aria-disabled={submitting}
            onClick={(e) => {
              if (submitting) e.preventDefault();
            }}
            style={{
              flex: "1 1 140px",
              maxWidth: 200,
              textAlign: "center",
              padding: "10px 18px",
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 500,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#475569",
              textDecoration: "none",
              opacity: submitting ? 0.5 : 1,
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !form.name.trim()}
            style={{
              flex: "1 1 140px",
              maxWidth: 200,
              padding: "10px 20px",
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 600,
              border: "none",
              color: "#ffffff",
              cursor: submitting || !form.name.trim() ? "not-allowed" : "pointer",
              opacity: submitting || !form.name.trim() ? 0.5 : 1,
              background: "#0f1424",
              boxShadow: "0 2px 8px -2px rgba(21, 27, 46, 0.4)",
            }}
          >
            {submitting ? "Creating…" : "Create role"}
          </button>
        </div>
      </form>
    </div>
  );
}
