"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { trackLead } from "./tracking";
import { Icon } from "@/lib/lp-icon";

const FIELD_META: Record<
  string,
  { label: string; type: string; placeholder: string; required: boolean }
> = {
  name: { label: "Full Name", type: "text", placeholder: "Enter your name", required: true },
  phone: { label: "Phone Number", type: "tel", placeholder: "+91 98765 43210", required: true },
  email: { label: "Email", type: "email", placeholder: "you@example.com", required: false },
  city: { label: "City", type: "text", placeholder: "Your city", required: false },
  budget: { label: "Budget", type: "text", placeholder: "e.g. ₹1.5 Cr", required: false },
  propertyType: { label: "Property Type", type: "select", placeholder: "2 BHK / 3 BHK / Villa", required: false },
  message: { label: "Message", type: "textarea", placeholder: "I'm interested in…", required: false },
};

const DEFAULT_FIELDS = ["name", "phone", "email", "city", "budget", "propertyType"];

function toIntent(buttonText?: string): string {
  const t = buttonText?.toLowerCase() ?? "";
  if (t.includes("brochure")) return "brochure";
  if (t.includes("site visit") || t.includes("book a visit")) return "site_visit";
  if (t.includes("pricing") || t.includes("price")) return "pricing";
  if (t.includes("call")) return "call";
  if (t.includes("whatsapp")) return "whatsapp";
  return "enquiry";
}

function submitLeadUrl(slug?: string): string {
  const base = `/public/pages/${slug ?? ""}/leads`;
  if (typeof window === "undefined") return base;
  const q = window.location.search;
  if (!q) return base;
  const params = new URLSearchParams(q);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    if (!params.has(key)) params.delete(key);
  }
  const s = params.toString();
  return s ? `${base}?${s}` : base;
}

export function LeadForm({
  settings,
  pageSlug,
}: {
  settings: Record<string, unknown>;
  pageSlug?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const fields = Array.isArray(settings.fields)
    ? (settings.fields as string[]).filter((f) => FIELD_META[f])
    : DEFAULT_FIELDS;

  const title = (settings.title as string) ?? "Get a Call Back";
  const subtitle = (settings.subtitle as string) ?? "Fill in your details — our team responds within 30 minutes.";
  const buttonText = (settings.buttonText as string) ?? "Submit Enquiry";
  const successMessage = (settings.successMessage as string) ?? "Thank you! Our team will contact you shortly.";
  const accent = (settings.accentColor as string) ?? "#1a2744";
  const borderRadius = typeof settings.radius === "number" ? settings.radius : 10;

  const buttonStyle: React.CSSProperties = {
    background: accent,
    color: "#ffffff",
    border: "none",
    borderRadius,
    padding: "13px 20px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius,
    border: "1px solid #e2e6ee",
    fontSize: 14.5,
    background: "#ffffff",
    color: "#161c2c",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#3d4657",
    marginBottom: 6,
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const payload: Record<string, string | undefined> = {};
    for (const field of fields) {
      payload[field] = values[field]?.trim() || undefined;
    }
    try {
      await apiFetch(submitLeadUrl(pageSlug), {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          intent: toIntent(buttonText),
        }),
      });
      setStatus("success");
      trackLead();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div
        style={{
          background: "#e9f9ef",
          border: "1px solid #a7e3bd",
          color: "#14663a",
          borderRadius,
          padding: "22px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: 6, display: "flex", justifyContent: "center" }}><Icon name="check-circle" size={30} /></div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{successMessage}</div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#ffffff",
        borderRadius,
        padding: "26px 24px",
        boxShadow: "0 20px 45px -18px rgba(14,21,37,.25)",
        border: "1px solid #e8ebf1",
      }}
    >
      <div style={{ fontSize: 21, fontWeight: 800, color: "#161c2c" }}>{title}</div>
      {subtitle ? (
        <div style={{ fontSize: 13.5, color: "#7a8298", marginTop: 4, marginBottom: 18, lineHeight: 1.5 }}>
          {subtitle}
        </div>
      ) : null}
      <div style={{ display: "grid", gap: 14 }}>
        {fields.map((field) => {
          const meta = FIELD_META[field];
          if (field === "propertyType") {
            return (
              <div key={field}>
                <label style={labelStyle}>{meta.label}</label>
                <select
                  style={inputStyle}
                  value={values[field] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
                >
                  <option value="">Select type</option>
                  <option>2 BHK</option>
                  <option>3 BHK</option>
                  <option>4 BHK</option>
                  <option>Villa</option>
                  <option>Penthouse</option>
                  <option>Commercial</option>
                  <option>Plot / Land</option>
                </select>
              </div>
            );
          }
          if (field === "message") {
            return (
              <div key={field}>
                <label style={labelStyle}>{meta.label}</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                  placeholder={meta.placeholder}
                  value={values[field] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
                />
              </div>
            );
          }
          return (
            <div key={field}>
              <label style={labelStyle}>{meta.label}</label>
              <input
                type={meta.type}
                style={inputStyle}
                placeholder={meta.placeholder}
                value={values[field] ?? ""}
                required={meta.required}
                onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
              />
            </div>
          );
        })}
        <button type="submit" style={buttonStyle} disabled={status === "loading"}>
          {status === "loading" ? "Submitting…" : buttonText}
        </button>
        {status === "error" && error ? (
          <div style={{ color: "#b91c1c", fontSize: 13, textAlign: "center" }}>{error}</div>
        ) : null}
        <div style={{ fontSize: 11.5, color: "#9aa3b2", textAlign: "center", lineHeight: 1.5 }}>
          By submitting you agree to be contacted about this property. We respect your privacy.
        </div>
      </div>
    </form>
  );
}