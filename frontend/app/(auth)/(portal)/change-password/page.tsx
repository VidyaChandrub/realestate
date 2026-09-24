"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";

// Forced password change for first-time / temp-password accounts. Reached
// straight after login when the session carries must_change_password (see
// the login page and OrgAdminShell). The backend /auth/change-password
// endpoint verifies the old password, enforces the new-password rules and
// clears the must-change flag; on success we drop the session and send the
// user back to a clean login.
export default function ChangePasswordPage() {
  const router = useRouter();
  const { accessToken, user, isLoading, logout } = useAuth();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Which login the user belongs to — Platform Team members (no org_id) sign
  // in at /admin-login, everyone else at /login. Set from the session in the
  // submit handler (before logout() clears it) so the post-change redirect and
  // the "sign in" link both point at the right place.
  const [loginHref, setLoginHref] = useState("/login");

  // No session → nothing to change. Bounce to the right login (but wait for
  // the auth context to finish restoring from storage first).
  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.replace(loginHref);
    }
  }, [isLoading, accessToken, router, loginHref]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!oldPassword) next.oldPassword = "Old password is required.";
    if (!newPassword) {
      next.newPassword = "New password is required.";
    } else if (newPassword.length < 8) {
      next.newPassword = "New password must be at least 8 characters.";
    } else if (newPassword === oldPassword) {
      next.newPassword = "New password must be different from the old password.";
    }
    if (!confirmPassword) {
      next.confirmPassword = "Please confirm your new password.";
    } else if (confirmPassword !== newPassword) {
      next.confirmPassword = "New password and confirm password do not match.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneralError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await apiFetch<{ success: boolean }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: oldPassword,
          new_password: newPassword,
        }),
      });
      setDone(true);
      // Capture the right sign-in route before logout() clears the session —
      // Platform Team members go back to /admin-login, everyone else to /login.
      setLoginHref(user && !user.org_id ? "/admin-login" : "/login");
      // New credentials are live — clear the session so the user signs in
      // fresh with the password they just set.
      await logout();
    } catch (err) {
      if (err instanceof ApiError && /different/i.test(err.message)) {
        setFieldErrors((prev) => ({
          ...prev,
          newPassword: "New password must be different from the old password.",
        }));
      } else if (err instanceof ApiError && err.status === 401) {
        setFieldErrors((prev) => ({
          ...prev,
          oldPassword: "Old password is incorrect.",
        }));
      } else {
        setGeneralError(
          err instanceof Error ? err.message : "Failed to change password.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Security"
      title="Change your password"
      subtitle={
        user?.email
          ? `Signed in as ${user.email}. Your account was set up with a temporary password — choose a new one you'll remember.`
          : "Set a new password for your account."
      }
      footer={
        <>
          ← Back to <Link href={loginHref}>Sign in</Link>
        </>
      }
    >
      {done ? (
        <div className="help" style={{ marginTop: 22 }}>
          ✅ Password changed successfully. You can now{" "}
          <Link href={loginHref} style={{ fontWeight: 600 }}>
            sign in
          </Link>{" "}
          with your new password.
        </div>
      ) : (
        <form style={{ marginTop: 24 }} onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label>Old password</label>
            <PasswordInput
              value={oldPassword}
              onChange={(e) => {
                setOldPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, oldPassword: "" }));
              }}
              autoComplete="current-password"
              placeholder="••••••••••"
            />
            {fieldErrors.oldPassword ? (
              <div className="hint" style={{ color: "var(--rose)" }}>
                {fieldErrors.oldPassword}
              </div>
            ) : null}
          </div>
          <div className="field">
            <label>New password</label>
            <PasswordInput
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, newPassword: "" }));
              }}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
            {fieldErrors.newPassword ? (
              <div className="hint" style={{ color: "var(--rose)" }}>
                {fieldErrors.newPassword}
              </div>
            ) : null}
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              autoComplete="new-password"
              placeholder="Re-enter new password"
            />
            {fieldErrors.confirmPassword ? (
              <div className="hint" style={{ color: "var(--rose)" }}>
                {fieldErrors.confirmPassword}
              </div>
            ) : null}
          </div>

          {generalError ? (
            <p
              role="alert"
              className="help"
              style={{
                color: "var(--rose)",
                borderColor: "var(--rose-050)",
                background: "var(--rose-050)",
                marginBottom: 14,
              }}
            >
              {generalError}
            </p>
          ) : null}

          <button
            className="btn btn-primary btn-block btn-lg"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Change password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
