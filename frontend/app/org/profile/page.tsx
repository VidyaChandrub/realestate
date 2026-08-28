"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError, changePassword, getProfile } from "@/lib/api";
import type { SafeOrganisation, SafeUser } from "@/lib/types";

interface ProfileData {
  user: SafeUser;
  organisation: SafeOrganisation | null;
}

interface InfoRow {
  label: string;
  value: string | null;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div
        className="inp"
        style={{
          background: "var(--surface-2)",
          color: "var(--ink)",
          cursor: "default",
          display: "flex",
          alignItems: "center",
          minHeight: 38,
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user: sessionUser } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadProfile() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Failed to load your profile.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  const org = profile?.organisation ?? null;
  const u = profile?.user ?? sessionUser;

  const infoRows: InfoRow[] = u
    ? [
        { label: "Full Name", value: [u.first_name, u.last_name].filter(Boolean).join(" ") || "—" },
        { label: "Work Email", value: u.email },
        { label: "Phone Number", value: u.phone_number ?? "—" },
        { label: "Company", value: org?.name ?? "—" },
        { label: "City", value: org?.city ?? "—" },
        { label: "Country", value: org?.country ?? "—" },
        { label: "Currency", value: org?.currency ?? "—" },
        { label: "Timezone", value: org?.timezone ?? "—" },
        { label: "Member Since", value: u.created_at ? formatDate(u.created_at) : "—" },
      ]
    : [];

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (!currentPassword) {
      setPwError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      const res = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      if (res.success) {
        setPwSuccess("Your password has been changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwError("Unable to change password. Please try again.");
      }
    } catch (err) {
      setPwError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">Account</div>
          <h1>My Profile</h1>
          <div className="sub">
            Your registration details and account security.
          </div>
        </div>
      </div>

      {loadError ? <div className="form-alert">{loadError}</div> : null}

      {loading ? (
        <div className="card">
          <div className="card-b">
            <p className="muted">Loading your profile…</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-h">
              <span className="t">Profile</span>
              <span className="x">Registration details</span>
            </div>
            <div className="card-b">
              <div className="row2">
                {infoRows.slice(0, 2).map((row) => (
                  <InfoField key={row.label} label={row.label} value={row.value} />
                ))}
              </div>
              <div className="row2">
                {infoRows.slice(2, 4).map((row) => (
                  <InfoField key={row.label} label={row.label} value={row.value} />
                ))}
              </div>
              <div className="row2">
                {infoRows.slice(4, 6).map((row) => (
                  <InfoField key={row.label} label={row.label} value={row.value} />
                ))}
              </div>
              <div className="row2">
                {infoRows.slice(6, 8).map((row) => (
                  <InfoField key={row.label} label={row.label} value={row.value} />
                ))}
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <InfoField
                  label={infoRows[8]?.label ?? "Member Since"}
                  value={infoRows[8]?.value ?? "—"}
                />
              </div>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>
                Organisation details are managed in{" "}
                <Link href="/org/settings" style={{ color: "var(--brand)", fontWeight: 600 }}>
                  Organisation Settings
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <span className="t">Security</span>
              <span className="x">Change your password</span>
            </div>
            <div className="card-b">
              <form onSubmit={handlePasswordChange}>
                <div className="field">
                  <label>Current Password</label>
                  <input
                    className="inp"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>New Password</label>
                  <input
                    className="inp"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <div className="hint">At least 8 characters.</div>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Confirm New Password</label>
                  <input
                    className="inp"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {pwError ? <div className="form-alert">{pwError}</div> : null}
                {pwSuccess ? <div className="form-alert ok">{pwSuccess}</div> : null}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ marginTop: 4 }}
                >
                  {saving ? "Updating…" : "Change Password"}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
