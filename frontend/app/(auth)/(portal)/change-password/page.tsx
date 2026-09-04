"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
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

  // No session → nothing to change. Bounce to login (but wait for the
  // auth context to finish restoring from storage first).
  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.replace("/login");
    }
  }, [isLoading, accessToken, router]);

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
    <div className="auth">
      <div className="brandside">
        <div className="glow" />
        <div style={{ position: "relative" }}>
          <div className="logo">iR</div>
        </div>
        <div style={{ position: "relative" }}>
          <h1 className="reveal in">One more step before you&apos;re in.</h1>
          <p className="reveal in" data-delay="1" style={{ marginTop: 18 }}>
            Your account was set up with a temporary password. Choose a new one
            you&apos;ll remember — you&apos;ll use it every time you sign in from
            now on.
          </p>
        </div>
        <div style={{ position: "relative", color: "#8891b4", fontSize: 13 }}>
          iPixxel Realty · Real-estate CRM &amp; landing pages
        </div>
      </div>

      <div className="formside">
        <div className="fw">
          <div className="reveal in">
            <h2>Change your password</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              {user?.email
                ? `Signed in as ${user.email}.`
                : "Set a new password for your account."}
            </p>
          </div>

          {done ? (
            <div
              className="help reveal in"
              data-delay="1"
              style={{ marginTop: 26 }}
            >
              ✅ Password changed successfully. You can now{" "}
              <Link
                href="/login"
                style={{ color: "var(--brand)", fontWeight: 600 }}
              >
                sign in
              </Link>{" "}
              with your new password.
            </div>
          ) : (
            <form
              className="reveal in"
              data-delay="1"
              style={{ marginTop: 26 }}
              onSubmit={handleSubmit}
              noValidate
            >
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
        </div>
      </div>
    </div>
  );
}
