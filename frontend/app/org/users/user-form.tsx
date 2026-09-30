"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Field,
  FormActions,
  FormAlert,
  FormGrid,
  FormPage,
  PasswordField,
  PhoneInput,
  SelectInput,
  TextInput,
  formPageStyles,
} from "@/components/forms/form-page";
import { ConfirmModal } from "@/components/ui/confirm-modal";
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
    <FormPage
      eyebrow="Team · Users"
      title={isEdit ? "Edit user" : "Create user"}
      subtitle={isEdit ? "Update this person's profile, role, or password." : "Add a new team member to your organisation."}
      backHref={USERS_PATH}
      backLabel="Back to Users"
    >
      <form className={formPageStyles.panel} onSubmit={handleSubmit} noValidate>
        <FormAlert message={formError} />

        <FormGrid>
          <Field htmlFor="ou-first" label="First name *" icon="profile" error={errors.firstName}>
            <TextInput
              id="ou-first"
              icon="profile"
              placeholder="Enter first name"
              value={form.firstName}
              maxLength={NAME_MAX}
              autoComplete="given-name"
              invalid={!!errors.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
            />
          </Field>
          <Field htmlFor="ou-last" label="Last name *" icon="profile" error={errors.lastName}>
            <TextInput
              id="ou-last"
              icon="profile"
              placeholder="Enter last name"
              value={form.lastName}
              maxLength={NAME_MAX}
              autoComplete="family-name"
              invalid={!!errors.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
            />
          </Field>
        </FormGrid>

        <Field htmlFor="ou-email" label="Work email *" icon="mail" error={errors.email}>
          <TextInput
            id="ou-email"
            icon="mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={EMAIL_MAX}
            placeholder="name@company.com"
            value={form.email}
            invalid={!!errors.email}
            onChange={(e) => setField("email", e.target.value.replace(/\s/g, ""))}
          />
        </Field>

        <FormGrid>
          <Field htmlFor="ou-country" label="Country *" icon="globe" error={errors.country}>
            <SelectInput
              id="ou-country"
              value={form.country}
              invalid={!!errors.country}
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
            </SelectInput>
          </Field>
          <Field
            htmlFor="ou-phone"
            label="Mobile number *"
            icon="phone"
            error={errors.phoneNumber}
            hintId="ou-phone-hint"
            hint={`Digits only, up to ${MOBILE_MAX_DIGITS}. The country code is added automatically.`}
          >
            <PhoneInput
              id="ou-phone"
              prefix={callingCode ?? "+--"}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={MOBILE_MAX_DIGITS}
              placeholder="9876543210"
              value={form.phoneNumber}
              invalid={!!errors.phoneNumber}
              aria-describedby="ou-phone-hint"
              onChange={(e) => setField("phoneNumber", sanitizeMobileDigits(e.target.value))}
            />
          </Field>
        </FormGrid>

        <FormGrid>
          <Field htmlFor="ou-role" label="Organisation role *" icon="shield" error={errors.role}>
            <SelectInput
              id="ou-role"
              value={form.role}
              disabled={rolesLoading}
              invalid={!!errors.role}
              onChange={(e) => setField("role", e.target.value)}
            >
              {rolesLoading ? <option value="">Loading roles…</option> : null}
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field
            htmlFor="ou-password"
            label={isEdit ? "New password" : "Password"}
            note="(optional)"
            icon="lock"
            error={errors.password}
          >
            <PasswordField
              id="ou-password"
              value={form.password}
              invalid={!!errors.password}
              onChange={(e) => setField("password", e.target.value)}
              placeholder={isEdit ? "Leave blank to keep current" : "Leave blank to email temp password"}
            />
          </Field>
        </FormGrid>

        <FormActions
          cancelHref={USERS_PATH}
          busy={submitting}
          submitDisabled={rolesLoading}
          busyLabel="Saving…"
          submitLabel={isEdit ? "Save changes" : "Create user"}
          submitIcon={isEdit ? "check" : "user-plus"}
        />
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
    </FormPage>
  );
}
