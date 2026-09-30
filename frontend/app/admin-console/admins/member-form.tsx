"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPlatformTeamMember, getPlatformTeamRoles, updatePlatformTeamMember } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import { callingCodeForCountry, splitStoredPhone } from "@/lib/phone";
import {
  EMAIL_MAX,
  MOBILE_MAX_DIGITS as PHONE_MAX_DIGITS,
  sanitizeMobileDigits as sanitizeDigits,
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
import type { PlatformTeamMember, PlatformTeamRole } from "@/lib/types";

// Shared by /admin-console/admins/new and /admin-console/admins/[id]/edit.
// A full page rather than a modal so the form works on narrow (mobile)
// screens and scrolls with the page — no nested scroll container.

export const SUPER_ADMIN_ROLE = "super_admin";
export const LIST_PATH = "/admin-console/admins";

// Read (and cleared) by the Platform Team list to show a toast after the
// redirect back from this page.
export const FLASH_KEY = "platformTeam.flash";
// Tab ("members" | "roles") the list should open on after that redirect.
export const FLASH_TAB_KEY = "platformTeam.flashTab";

const NAME_MAX = 100;
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

function validate(form: FormState, isEdit: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.firstName.trim()) errors.firstName = "First name is required.";
  else if (form.firstName.trim().length > NAME_MAX) errors.firstName = `Max ${NAME_MAX} characters.`;
  if (!form.lastName.trim()) errors.lastName = "Last name is required.";
  else if (form.lastName.trim().length > NAME_MAX) errors.lastName = `Max ${NAME_MAX} characters.`;

  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;

  // Mobile is required on create; on edit it stays optional for legacy rows
  // saved without one, but anything entered must still be valid.
  Object.assign(errors, validateMobile(form.country, form.phoneNumber, { required: !isEdit }));

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
  const [confirmPassword, setConfirmPassword] = useState(false);
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

  async function handleSubmit(e?: React.FormEvent, passwordConfirmed = false) {
    e?.preventDefault();
    if (submitting) return;
    setFormError(null);

    const nextErrors = validate(form, isEdit);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    // Setting a new password from the edit form signs the member out and
    // forces a change at next login — confirm first (same as org Users).
    if (isEdit && form.password.trim() && !passwordConfirmed) {
      setConfirmPassword(true);
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
          member
            ? password
              ? "Platform team member updated — new password emailed"
              : "Platform team member updated"
            : "Platform team member created — credentials emailed",
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

  return (
    <FormPage
      eyebrow="Platform · Platform Team"
      title={isEdit ? "Edit platform user" : "Create platform user"}
      subtitle={isEdit ? "Update this team member's profile or role." : "Invite a new user to the Super Admin console."}
      backHref={LIST_PATH}
      backLabel="Back to Platform Team"
    >
      <form className={formPageStyles.panel} onSubmit={handleSubmit} noValidate>
        <FormAlert message={formError} />

        <FormGrid>
          <Field htmlFor="pm-first" label="First name *" icon="profile" error={errors.firstName}>
            <TextInput
              id="pm-first"
              icon="profile"
              placeholder="Enter first name"
              value={form.firstName}
              maxLength={NAME_MAX}
              autoComplete="given-name"
              invalid={!!errors.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
            />
          </Field>
          <Field htmlFor="pm-last" label="Last name *" icon="profile" error={errors.lastName}>
            <TextInput
              id="pm-last"
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

        <Field htmlFor="pm-email" label="Email *" icon="mail" error={errors.email}>
          <TextInput
            id="pm-email"
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
          <Field htmlFor="pm-country" label={`Country${isEdit ? "" : " *"}`} icon="globe" error={errors.country}>
            <SelectInput
              id="pm-country"
              value={form.country}
              invalid={!!errors.country}
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
            </SelectInput>
          </Field>
          <Field
            htmlFor="pm-phone"
            label={`Mobile number${isEdit ? "" : " *"}`}
            icon="phone"
            error={errors.phoneNumber}
            hintId="pm-phone-hint"
            hint={`Digits only, up to ${PHONE_MAX_DIGITS}. The country code is added automatically.`}
          >
            <PhoneInput
              id="pm-phone"
              prefix={callingCode ?? "+--"}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={PHONE_MAX_DIGITS}
              placeholder={isEdit ? "Optional" : "9825041200"}
              value={form.phoneNumber}
              invalid={!!errors.phoneNumber}
              aria-describedby="pm-phone-hint"
              onChange={(e) => setField("phoneNumber", sanitizeDigits(e.target.value))}
            />
          </Field>
        </FormGrid>

        <FormGrid>
          <Field
            htmlFor="pm-role"
            label="Platform role *"
            icon="shield"
            error={errors.role}
            hint={
              !rolesLoading && roleOptions.length === 0
                ? "Create a role on the Roles tab before adding a user."
                : "Create a role on the Roles tab first for a custom permission set."
            }
          >
            <SelectInput
              id="pm-role"
              value={form.role}
              disabled={rolesLoading}
              invalid={!!errors.role}
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
            </SelectInput>
          </Field>
          <Field
            htmlFor="pm-password"
            label={isEdit ? "New password" : "Temporary password"}
            note={isEdit ? "(optional)" : "(auto-generated if empty)"}
            icon="lock"
            error={errors.password}
          >
            <PasswordField
              id="pm-password"
              value={form.password}
              invalid={!!errors.password}
              onChange={(e) => setField("password", e.target.value)}
              placeholder={isEdit ? "Leave blank to keep current" : "Leave blank to generate"}
            />
          </Field>
        </FormGrid>

        <FormActions
          cancelHref={LIST_PATH}
          busy={submitting}
          submitDisabled={rolesLoading}
          busyLabel="Saving…"
          submitLabel={isEdit ? "Save changes" : "Create user"}
          submitIcon={isEdit ? "check" : "user-plus"}
        />
      </form>

      <ConfirmModal
        open={confirmPassword}
        title="Change this member's password?"
        message="They'll be signed out everywhere and must set a new password the next time they sign in. An email with the new temporary password will be sent to them."
        confirmLabel="Change password"
        destructive
        busy={submitting}
        onClose={() => setConfirmPassword(false)}
        onConfirm={() => {
          setConfirmPassword(false);
          void handleSubmit(undefined, true);
        }}
      />
    </FormPage>
  );
}
