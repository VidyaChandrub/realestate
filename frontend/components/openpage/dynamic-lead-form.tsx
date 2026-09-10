"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { FormLeadField, SiteConfig } from "@/lib/openpage/types";
import { isFieldVisible } from "@/lib/openpage/form-logic";
import { submitLead } from "@/lib/api";
import { composeLeadSource } from "@/lib/lead-display";
import { packDynamicLeadFields } from "@/lib/openpage/resolve-form";
import { fireTrackingLead } from "@/components/openpage/tracking-scripts";
import { bumpTracking } from "@/lib/openpage/tracking";
import { wtField, wtFieldDark, getWidgetTheme } from "@/lib/openpage/widget-theme";

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}
function isValidPhone(v: string): boolean {
  return v.replace(/\D/g, "").length >= 8;
}

export function DynamicLeadForm({
  form,
  live,
  pageId,
  place,
  projectId,
  projectName,
  extraFields,
  variant = "light",
  hideSubmit,
  submitLabel,
  unitId,
  onSuccess,
}: {
  form: SiteConfig["form"];
  live: boolean;
  pageId?: string;
  place: string;
  projectId?: string;
  projectName?: string;
  extraFields?: Record<string, string>;
  variant?: "light" | "dark";
  hideSubmit?: boolean;
  submitLabel?: string;
  unitId?: string;
  onSuccess?: () => void;
}) {
  const wt = getWidgetTheme();
  const fields = useMemo(
    () => (Array.isArray(form.fields) ? form.fields.filter((f) => f && f.type !== "hidden") : []),
    [form.fields],
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const visible = fields.filter((f) =>
    isFieldVisible(f as FormLeadField, fields as FormLeadField[], values),
  );

  const fieldStyle = (extra?: CSSProperties): CSSProperties =>
    variant === "dark" ? wtFieldDark(extra, wt) : wtField(extra, wt);

  const validate = (): boolean => {
    for (const f of visible) {
      const key = f.id || f.label;
      const v = (values[key] ?? "").trim();
      if (f.required && !v && f.type !== "checkbox") {
        setError(`${f.label} is required.`);
        return false;
      }
      if (f.required && f.type === "checkbox" && v !== "yes") {
        setError(`${f.label} is required.`);
        return false;
      }
      if (v && f.type === "email" && !isValidEmail(v)) {
        setError("Please enter a valid email address.");
        return false;
      }
      if (v && f.type === "phone" && !isValidPhone(v)) {
        setError("Please enter a valid phone number.");
        return false;
      }
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setError("");
    setSubmitting(true);
    const leadFields = {
      ...packDynamicLeadFields(visible, values),
      ...(extraFields ?? {}),
    };
    if (projectName) {
      leadFields.Project = projectName;
      leadFields.project = projectName;
    }
    try {
      if (live && pageId) {
        fireTrackingLead();
        bumpTracking(pageId, "form");
        await submitLead({
          landingPageId: pageId,
          projectId,
          formName: form.name || place,
          source: composeLeadSource({
            place,
            project: projectName,
            interest: leadFields.interestedIn,
          }),
          fields: leadFields,
          unitId,
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("prestate:lead-success"));
        }
      }
      setDone(true);
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div style={{ fontSize: 13.5, fontWeight: 700, color: variant === "dark" ? "#fff" : wt.ink, lineHeight: 1.5 }}>
        {form.successTitle || form.thankYou || "Thanks — our team will call you shortly."}
      </div>
    );
  }

  const labelColor = variant === "dark" ? "#cbd5e1" : wt.slate;
  const errorBg = variant === "dark" ? "rgba(248,113,113,.12)" : "#fef2f2";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      {visible.map((f, i) => {
        const key = f.id || f.label;
        const val = values[key] ?? "";
        return (
          <div key={f.id || key || i}>
            {f.type !== "checkbox" ? (
              <label style={{ fontSize: 11.5, fontWeight: 700, color: labelColor, marginBottom: 5, display: "block" }}>
                {f.label}
                {f.required ? " *" : ""}
              </label>
            ) : null}
            {f.type === "select" ? (
              <select
                required={f.required}
                value={val}
                onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                style={fieldStyle(variant === "dark" ? { background: "rgba(15,23,42,.95)" } : undefined)}
              >
                <option value="">{f.placeholder || "Choose"}</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : f.type === "radio" ? (
              <div role="radiogroup" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {(f.options ?? []).map((o) => (
                  <label key={o} style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12.5, color: labelColor }}>
                    <input
                      type="radio"
                      name={key}
                      checked={val === o}
                      onChange={() => setValues((p) => ({ ...p, [key]: o }))}
                    />
                    {o}
                  </label>
                ))}
              </div>
            ) : f.type === "textarea" ? (
              <textarea
                required={f.required}
                placeholder={f.placeholder}
                value={val}
                onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                style={fieldStyle({ minHeight: 80 })}
              />
            ) : f.type === "checkbox" ? (
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: labelColor }}>
                <input
                  type="checkbox"
                  required={f.required}
                  checked={val === "yes"}
                  onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.checked ? "yes" : "" }))}
                />
                {f.label}
              </label>
            ) : (
              <input
                type={
                  f.type === "email"
                    ? "email"
                    : f.type === "phone"
                      ? "tel"
                      : f.type === "number"
                        ? "number"
                        : f.type === "date"
                          ? "date"
                          : f.type === "time"
                            ? "time"
                            : "text"
                }
                required={f.required}
                placeholder={f.placeholder}
                value={val}
                onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                style={fieldStyle()}
              />
            )}
          </div>
        );
      })}
      {error ? (
        <div style={{ padding: "8px 10px", borderRadius: 8, background: errorBg, color: "#dc2626", fontSize: 12.5, fontWeight: 600 }}>
          {error}
        </div>
      ) : null}
      {hideSubmit ? null : (
        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 4,
            width: "100%",
            padding: "12px 16px",
            borderRadius: 10,
            border: "none",
            background: wt.primary,
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Submitting…" : submitLabel || form.submitLabel || "Submit"}
        </button>
      )}
    </form>
  );
}
