"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { COUNTRIES, COUNTRY_META } from "@/lib/countries";
import { callingCodeForCountry, splitStoredPhone } from "@/lib/phone";
import {
  EMAIL_MAX,
  MOBILE_MAX_DIGITS,
  contactFieldForServerError,
  sanitizeMobileDigits,
  validateEmail,
  validateMobile,
} from "@/lib/contact-validation";
import { PasswordInput } from "@/components/auth/password-input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Icon } from "@/components/icons";
import type { CreateOrgUserInput, OrgUser, UpdateOrgUserInput } from "@/lib/types";

// Shared by /org/users/new and /org/users/[id]/edit. A full page rather than
// a modal so the form works on narrow (mobile) screens and scrolls with the
// page.

export const USERS_PATH = "/org/users";

// Read (and cleared) by the Users list to show a toast after the redirect
// back from this page.
export const USERS_FLASH_KEY = "orgUsers.flash";

const NAME_MAX = 100;
const PASSWORD_MIN = 6;
const FALLBACK_COUNTRY = "India";

const DEFAULT_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "sales", label: "Sales" },
  { value: "telecaller", label: "Telecaller" },
];

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

/** A value from COUNTRY_META, or "" — never a free-text country the select can't show. */
function knownCountry(name: string | null | undefined): string {
  return name && COUNTRY_META[name] ? name : "";
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.firstName.trim()) errors.firstName = "First name is required.";
  else if (form.firstName.trim().length > NAME_MAX) errors.firstName = `Max ${NAME_MAX} characters.`;
  if (!form.lastName.trim()) errors.lastName = "Last name is required.";
  else if (form.lastName.trim().length > NAME_MAX) errors.lastName = `Max ${NAME_MAX} characters.`;

  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;

  // Required on both create and edit — matches the existing Users form.
  Object.assign(errors, validateMobile(form.country, form.phoneNumber, { required: true }));

  if (!form.role) errors.role = "Select a role.";
  if (form.password.trim() && form.password.trim().length < PASSWORD_MIN) {
    errors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
  }
  return errors;
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <div className="error" role="alert">
      {message}
    </div>
  ) : null;
}

export function OrgUserForm({ user }: { user?: OrgUser }) {
  const router = useRouter();
  const { accessToken, user: sessionUser, isOrgAdmin } = useAuth();
  const isEdit = user !== undefined;
  const isAdmin = isOrgAdmin();

  // Default country = the one the organisation chose at onboarding (falling
  // back to the signed-in user's own onboarding country, then India).
  const orgCountry =
    knownCountry(sessionUser?.organisation?.country) || knownCountry(sessionUser?.country) || FALLBACK_COUNTRY;

  const [form, setForm] = useState<FormState>(() => {
    if (!user) {
      return {
        firstName: "",
        lastName: "",
        email: "",
        country: orgCountry,
        phoneNumber: "",
        role: "sales",
        password: "",
      };
    }
    const { country, nationalNumber } = splitStoredPhone(user.phoneNumber);
    return {
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email,
      // A legacy number saved without a dial code can't tell us its country;
      // pre-select the organisation's so the admin only has to confirm it.
      country: country || orgCountry,
      phoneNumber: nationalNumber,
      role: user.role?.key ?? "sales",
      password: "",
    };
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState(false);
  const [roles, setRoles] = useState<{ value: string; label: string; assignable: boolean }[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    const fallback = DEFAULT_ROLE_OPTIONS.map((r) => ({ ...r, assignable: isAdmin || r.value !== "admin" }));
    apiFetch<{ key: string; name: string; assignable: boolean }[]>("/org/users/roles", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((list) =>
        list.length > 0 ? list.map((r) => ({ value: r.key, label: r.name, assignable: r.assignable })) : fallback,
      )
      .catch(() => fallback)
      .then((list) => {
        if (cancelled) return;
        setRoles(list);
        // On create, make sure the pre-selected role is one this admin may assign.
        if (!isEdit) {
          setForm((f) =>
            list.some((r) => r.assignable && r.value === f.role)
              ? f
              : { ...f, role: list.find((r) => r.assignable)?.value ?? "" },
          );
        }
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAdmin, isEdit]);

  // Assignable roles, plus the user's current role on edit so opening the
  // form never silently changes it.
  const roleOptions = roles.filter((r) => r.assignable || (isEdit && r.value === user?.role?.key));

  const callingCode = useMemo(() => callingCodeForCountry(form.country), [form.country]);

  function setField<K extends Field>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Please fix the highlighted fields.");
      return;
    }
    // Changing a user's password from the edit form ends their sessions —
    // confirm first.
    if (isEdit && form.password.trim()) {
      setConfirmPassword(true);
      return;
    }
    void save();
  }

  async function save() {
    if (!accessToken) return;
    // E.164 with no separators — the only shape the API accepts.
    const phoneNumber = `${callingCode ?? ""}${form.phoneNumber}`;
    const password = form.password.trim() || undefined;
    const base = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phoneNumber,
      role: form.role,
      password,
    };

    setSubmitting(true);
    setFormError(null);
    try {
      if (user) {
        const body: UpdateOrgUserInput = base;
        await apiFetch(`/org/users/${encodeURIComponent(user.id)}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
      } else {
        const body: CreateOrgUserInput = base;
        await apiFetch("/org/users", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
      }
      try {
        sessionStorage.setItem(USERS_FLASH_KEY, user ? "User updated" : "User created — login details emailed");
      } catch {
        // Storage unavailable — the redirect still happens, just without a toast.
      }
      router.push(USERS_PATH);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save user.";
      const field = contactFieldForServerError(message);
      if (field) {
        setErrors((prev) => ({ ...prev, [field]: message }));
        setFormError("Please fix the highlighted fields.");
      } else {
        setFormError(message);
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="usr-wrap">
      <div className="usr-header">
        <div className="usr-header-left">
          <Link href={USERS_PATH} className="usr-form-back" aria-label="Back to Users">
            <Icon name="chevron-left" size={18} />
          </Link>
          <div className="usr-header-content">
            <div className="usr-eyebrow">TEAM · USERS</div>
            <h1 className="usr-title">{isEdit ? "Edit user" : "Create user"}</h1>
            <p className="usr-sub">
              {isEdit ? "Update this person's profile, role, or password." : "Add a new team member to your organisation."}
            </p>
          </div>
        </div>
      </div>

      <form className="usr-form-card" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <div className="form-alert" role="alert">
            {formError}
          </div>
        ) : null}

        <div className="usr-form-grid">
          <div className="field">
            <label htmlFor="ou-first">First name *</label>
            <input
              id="ou-first"
              className={`inp${errors.firstName ? " invalid" : ""}`}
              value={form.firstName}
              maxLength={NAME_MAX}
              autoComplete="given-name"
              aria-invalid={!!errors.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
            />
            <FieldError message={errors.firstName} />
          </div>
          <div className="field">
            <label htmlFor="ou-last">Last name *</label>
            <input
              id="ou-last"
              className={`inp${errors.lastName ? " invalid" : ""}`}
              value={form.lastName}
              maxLength={NAME_MAX}
              autoComplete="family-name"
              aria-invalid={!!errors.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
            />
            <FieldError message={errors.lastName} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="ou-email">Work email *</label>
          <input
            id="ou-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={EMAIL_MAX}
            placeholder="name@company.com"
            className={`inp${errors.email ? " invalid" : ""}`}
            value={form.email}
            aria-invalid={!!errors.email}
            onChange={(e) => setField("email", e.target.value.replace(/\s/g, ""))}
          />
          <FieldError message={errors.email} />
        </div>

        <div className="usr-form-grid">
          <div className="field">
            <label htmlFor="ou-country">Country *</label>
            <select
              id="ou-country"
              className={errors.country ? "invalid" : undefined}
              value={form.country}
              aria-invalid={!!errors.country}
              onChange={(e) => {
                setField("country", e.target.value);
                // A number valid for one country is rarely valid for another;
                // re-check on submit rather than keep a stale error.
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
          <div className="field">
            <label htmlFor="ou-phone">Mobile number *</label>
            <div className={`usr-phone${errors.phoneNumber ? " invalid" : ""}`}>
              <span className="usr-phone-cc" aria-hidden="true">
                {callingCode ?? "+--"}
              </span>
              <input
                id="ou-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={MOBILE_MAX_DIGITS}
                placeholder="9876543210"
                value={form.phoneNumber}
                aria-invalid={!!errors.phoneNumber}
                aria-describedby="ou-phone-hint"
                onChange={(e) => setField("phoneNumber", sanitizeMobileDigits(e.target.value))}
              />
            </div>
            {errors.phoneNumber ? (
              <FieldError message={errors.phoneNumber} />
            ) : (
              <div className="hint" id="ou-phone-hint">
                Digits only, up to {MOBILE_MAX_DIGITS}. The country code is added automatically.
              </div>
            )}
          </div>
        </div>

        <div className="usr-form-grid">
          <div className="field">
            <label htmlFor="ou-role">Organisation role *</label>
            <select
              id="ou-role"
              className={errors.role ? "invalid" : undefined}
              value={form.role}
              disabled={rolesLoading}
              aria-invalid={!!errors.role}
              onChange={(e) => setField("role", e.target.value)}
            >
              {rolesLoading ? <option value="">Loading roles…</option> : null}
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <FieldError message={errors.role} />
          </div>
          <div className="field">
            <label htmlFor="ou-password">{isEdit ? "New password (optional)" : "Password (optional)"}</label>
            <PasswordInput
              id="ou-password"
              autoComplete="new-password"
              placeholder={isEdit ? "Leave blank to keep current" : "Leave blank to email temp password"}
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
            />
            <FieldError message={errors.password} />
          </div>
        </div>

        <div className="usr-form-actions">
          <Link
            href={USERS_PATH}
            className="btn btn-ghost"
            aria-disabled={submitting}
            onClick={(e) => {
              if (submitting) e.preventDefault();
            }}
          >
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={submitting || rolesLoading}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create user"}
          </button>
        </div>
      </form>

      <ConfirmModal
        open={confirmPassword}
        title="Change this user's password?"
        message="They'll be signed out everywhere and must set a new password the next time they sign in. An email with the new temporary password will be sent to them."
        confirmLabel="Change password"
        destructive
        busy={submitting}
        onClose={() => setConfirmPassword(false)}
        onConfirm={() => {
          setConfirmPassword(false);
          void save();
        }}
      />
    </div>
  );
}
