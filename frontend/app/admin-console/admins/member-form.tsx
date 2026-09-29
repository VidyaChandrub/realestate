"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPlatformTeamMember, getPlatformTeamRoles, updatePlatformTeamMember } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import { callingCodeForCountry, splitStoredPhone, validatePhoneForCountry } from "@/lib/phone";
import { Icon, type IconName } from "@/components/icons";
import { PasswordInput } from "@/components/auth/password-input";
import type { PlatformTeamMember, PlatformTeamRole } from "@/lib/types";

// Shared by /admin-console/admins/new and /admin-console/admins/[id]/edit.
// A full page rather than a modal so the form works on narrow (mobile)
// screens and scrolls with the page — no nested scroll container.

export const SUPER_ADMIN_ROLE = "super_admin";
export const LIST_PATH = "/admin-console/admins";

// Read (and cleared) by the Platform Team list to show a toast after the
// redirect back from this page.
export const FLASH_KEY = "platformTeam.flash";

const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const EMAIL_MAX = 254;
const NAME_MAX = 100;
// ITU E.164 ceiling. The number is also validated per country below, which
// is what actually rejects a too-long / too-short number for that country.
const PHONE_MAX_DIGITS = 15;
const PASSWORD_MIN = 6;
const DEFAULT_COUNTRY = "India";

type Field = "firstName" | "lastName" | "email" | "country" | "phoneNumber" | "role" | "password";
type FieldErrors = Partial<Record<Field, string>>;

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  phoneNumber: string; // national digits only — the dial code comes from `country`
  role: string;
  password: string;
}

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "#475569",
  marginBottom: 6,
};

function inputStyle(invalid: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${invalid ? "#fca5a5" : "#e2e8f0"}`,
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    boxSizing: "border-box",
    minHeight: 42,
  };
}

// Two columns on desktop, one on phones — no media query needed.
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
};

function sanitizeDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, PHONE_MAX_DIGITS);
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" style={{ marginTop: 6, fontSize: 12, color: "#dc2626", lineHeight: 1.4 }}>
      {message}
    </div>
  );
}

function Section({
  icon,
  iconBg,
  iconColor,
  title,
  children,
}: {
  icon: IconName;
  iconBg: string;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ padding: "20px 0", borderTop: "1px solid #f1f5f9" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: iconBg,
            color: iconColor,
          }}
        >
          <Icon name={icon} size={14} />
        </div>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#334155" }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function validate(form: FormState, isEdit: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.firstName.trim()) errors.firstName = "First name is required.";
  else if (form.firstName.trim().length > NAME_MAX) errors.firstName = `Max ${NAME_MAX} characters.`;
  if (!form.lastName.trim()) errors.lastName = "Last name is required.";
  else if (form.lastName.trim().length > NAME_MAX) errors.lastName = `Max ${NAME_MAX} characters.`;

  const email = form.email.trim();
  if (!email) errors.email = "Email is required.";
  else if (email.length > EMAIL_MAX || !EMAIL_REGEX.test(email)) errors.email = "Enter a valid email address.";

  // Mobile is required on create; on edit it stays optional for legacy rows
  // saved without one, but anything entered must still be valid.
  const phone = form.phoneNumber;
  if (!isEdit || phone) {
    if (!form.country) errors.country = "Select a country.";
    if (!phone) {
      errors.phoneNumber = "Mobile number is required.";
    } else if (!/^\d+$/.test(phone) || phone.length > PHONE_MAX_DIGITS) {
      errors.phoneNumber = `Digits only, up to ${PHONE_MAX_DIGITS}.`;
    } else if (form.country) {
      const phoneError = validatePhoneForCountry(phone, form.country);
      if (phoneError) errors.phoneNumber = phoneError;
    }
  }

  if (!form.role) errors.role = "Select a platform role.";
  if (form.password.trim() && form.password.trim().length < PASSWORD_MIN) {
    errors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
  }
  return errors;
}

/** Routes a server conflict (duplicate email / mobile) onto its field. */
function fieldForServerError(message: string): Field | null {
  const m = message.toLowerCase();
  if (m.includes("mobile") || m.includes("phone")) return "phoneNumber";
  if (m.includes("email")) return "email";
  if (m.includes("password")) return "password";
  if (m.includes("role")) return "role";
  return null;
}

export function PlatformMemberForm({ member }: { member?: PlatformTeamMember }) {
  const router = useRouter();
  const isEdit = member !== undefined;

  const [form, setForm] = useState<FormState>(() => {
    if (!member) {
      return {
        firstName: "",
        lastName: "",
        email: "",
        country: DEFAULT_COUNTRY,
        phoneNumber: "",
        role: "",
        password: "",
      };
    }
    const { country, nationalNumber } = splitStoredPhone(member.phoneNumber);
    return {
      firstName: member.firstName ?? "",
      lastName: member.lastName ?? "",
      email: member.email,
      country,
      phoneNumber: nationalNumber,
      role: member.role?.key ?? "",
      password: "",
    };
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [roles, setRoles] = useState<PlatformTeamRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPlatformTeamRoles()
      .then((list) => {
        if (cancelled) return;
        setRoles(list);
        // Pre-select the first assignable role on create.
        if (!isEdit) {
          setForm((f) => (f.role ? f : { ...f, role: list.find((r) => r.key !== SUPER_ADMIN_ROLE)?.key ?? "" }));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setFormError(err instanceof Error ? err.message : "Failed to load platform roles");
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  // The console never creates another Super Admin (the backend rejects it
  // too). An existing member's current role stays listed so editing never
  // silently changes it.
  const roleOptions = roles.filter((r) => r.key !== SUPER_ADMIN_ROLE || (isEdit && member?.role?.key === r.key));

  const callingCode = useMemo(() => callingCodeForCountry(form.country), [form.country]);

  function setField<K extends Field>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    const nextErrors = validate(form, isEdit);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    // E.164 with no separators — the only shape the API accepts.
    const phone = form.phoneNumber && callingCode ? `${callingCode}${form.phoneNumber}` : undefined;
    const password = form.password.trim();
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      ...(password ? { password } : {}),
    };

    setSubmitting(true);
    try {
      if (member) {
        await updatePlatformTeamMember(member.id, { ...payload, phoneNumber: phone });
      } else {
        await createPlatformTeamMember({ ...payload, phoneNumber: phone as string });
      }
      try {
        sessionStorage.setItem(
          FLASH_KEY,
          member ? "Platform team member updated" : "Platform team member created — credentials emailed",
        );
      } catch {
        // Storage unavailable — the redirect still happens, just without a toast.
      }
      router.push(LIST_PATH);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      const field = fieldForServerError(message);
      if (field) {
        setErrors((prev) => ({ ...prev, [field]: message }));
        setFormError("Please fix the highlighted fields.");
      } else {
        setFormError(message);
      }
      setSubmitting(false);
    }
  }

  const title = isEdit ? "Edit platform user" : "Create platform user";

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", width: "100%" }}>
      {/* Breadcrumb */}
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
        <span style={{ color: "#0f172a", fontWeight: 600 }}>{isEdit ? "Edit user" : "Create user"}</span>
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
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{title}</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#64748b" }}>
              {isEdit ? "Update this team member's profile or role." : "Invite a new user to the Super Admin console."}
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

        <Section icon="users" iconBg="#eef2ff" iconColor="#0f1424" title="Personal information">
          <div style={grid}>
            <div>
              <label htmlFor="pm-first" style={fieldLabel}>First name *</label>
              <input
                id="pm-first"
                style={inputStyle(!!errors.firstName)}
                value={form.firstName}
                maxLength={NAME_MAX}
                autoComplete="given-name"
                aria-invalid={!!errors.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
              />
              <FieldError message={errors.firstName} />
            </div>
            <div>
              <label htmlFor="pm-last" style={fieldLabel}>Last name *</label>
              <input
                id="pm-last"
                style={inputStyle(!!errors.lastName)}
                value={form.lastName}
                maxLength={NAME_MAX}
                autoComplete="family-name"
                aria-invalid={!!errors.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
              />
              <FieldError message={errors.lastName} />
            </div>
          </div>
        </Section>

        <Section icon="mail" iconBg="#ecfdf5" iconColor="#0d9488" title="Contact details">
          <div style={{ ...grid, marginBottom: 16 }}>
            <div>
              <label htmlFor="pm-email" style={fieldLabel}>Email *</label>
              <input
                id="pm-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={EMAIL_MAX}
                placeholder="name@company.com"
                style={inputStyle(!!errors.email)}
                value={form.email}
                aria-invalid={!!errors.email}
                onChange={(e) => setField("email", e.target.value.replace(/\s/g, ""))}
              />
              <FieldError message={errors.email} />
            </div>
          </div>
          <div style={grid}>
            <div>
              <label htmlFor="pm-country" style={fieldLabel}>Country{isEdit ? "" : " *"}</label>
              <select
                id="pm-country"
                style={inputStyle(!!errors.country)}
                value={form.country}
                aria-invalid={!!errors.country}
                onChange={(e) => {
                  setField("country", e.target.value);
                  // A number valid for one country is rarely valid for
                  // another; re-check it on submit rather than keep a stale error.
                  setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                }}
              >
                <option value="">Select country…</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c} ({callingCodeForCountry(c) ?? "—"})
                  </option>
                ))}
              </select>
              <FieldError message={errors.country} />
            </div>
            <div>
              <label htmlFor="pm-phone" style={fieldLabel}>Mobile number{isEdit ? "" : " *"}</label>
              <div
                style={{
                  ...inputStyle(!!errors.phoneNumber),
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                  overflow: "hidden",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    padding: "0 10px 0 12px",
                    alignSelf: "stretch",
                    display: "flex",
                    alignItems: "center",
                    background: "#f8fafc",
                    borderRight: "1px solid #e2e8f0",
                    color: "#475569",
                    fontSize: 14,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                  }}
                >
                  {callingCode ?? "+--"}
                </span>
                <input
                  id="pm-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={PHONE_MAX_DIGITS}
                  placeholder={isEdit ? "Optional" : "9825041200"}
                  value={form.phoneNumber}
                  aria-invalid={!!errors.phoneNumber}
                  aria-describedby="pm-phone-hint"
                  onChange={(e) => setField("phoneNumber", sanitizeDigits(e.target.value))}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: "none",
                    outline: "none",
                    padding: "10px 12px",
                    fontSize: 14,
                    color: "#0f172a",
                    background: "transparent",
                  }}
                />
              </div>
              {errors.phoneNumber ? (
                <FieldError message={errors.phoneNumber} />
              ) : (
                <div id="pm-phone-hint" style={{ marginTop: 6, fontSize: 12, color: "#94a3b8" }}>
                  Digits only, up to {PHONE_MAX_DIGITS}. The country code is added automatically.
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section icon="shield" iconBg="#fef3c7" iconColor="#d97706" title="Role & access">
          <div style={grid}>
            <div>
              <label htmlFor="pm-role" style={fieldLabel}>Platform role *</label>
              <select
                id="pm-role"
                style={inputStyle(!!errors.role)}
                value={form.role}
                disabled={rolesLoading}
                aria-invalid={!!errors.role}
                onChange={(e) => setField("role", e.target.value)}
              >
                {rolesLoading ? <option value="">Loading roles…</option> : null}
                {!rolesLoading && roleOptions.length === 0 ? (
                  <option value="" disabled>
                    No platform roles yet
                  </option>
                ) : null}
                {roleOptions.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                    {r.key === SUPER_ADMIN_ROLE ? " (full access)" : ""}
                  </option>
                ))}
              </select>
              {errors.role ? (
                <FieldError message={errors.role} />
              ) : (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: !rolesLoading && roleOptions.length === 0 ? "#dc2626" : "#94a3b8",
                    lineHeight: 1.4,
                  }}
                >
                  {!rolesLoading && roleOptions.length === 0
                    ? "Create a role on the Roles tab before adding a user."
                    : "Create a role on the Roles tab first for a custom permission set."}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="pm-password" style={fieldLabel}>
                {isEdit ? "New password" : "Temporary password"}
                <span style={{ fontWeight: 400, color: "#94a3b8" }}> (auto-generated if empty)</span>
              </label>
              <PasswordInput
                id="pm-password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder="Leave blank to generate"
                autoComplete="new-password"
              />
              <FieldError message={errors.password} />
            </div>
          </div>
        </Section>

        {/* Actions */}
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
            disabled={submitting || rolesLoading}
            style={{
              flex: "1 1 140px",
              maxWidth: 200,
              padding: "10px 20px",
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 600,
              border: "none",
              color: "#ffffff",
              cursor: submitting || rolesLoading ? "not-allowed" : "pointer",
              opacity: submitting || rolesLoading ? 0.5 : 1,
              background: "#0f1424",
              boxShadow: "0 2px 8px -2px rgba(21, 27, 46, 0.4)",
            }}
          >
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create user"}
          </button>
        </div>
      </form>
    </div>
  );
}
