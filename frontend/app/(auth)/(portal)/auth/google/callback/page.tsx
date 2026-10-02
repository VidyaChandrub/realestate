"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { dashboardPathFor } from "@/lib/mock/sessions";
import type { SafeUser } from "@/lib/types";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleError = params.get("google_error");
    const mode = params.get("mode") || "login";
    const token = params.get("token");
    const refresh = params.get("refresh");
    const incomplete = params.get("incomplete") === "1";
    const googleEmail = params.get("google_email");
    const googleFn = params.get("google_fn");
    const googleLn = params.get("google_ln");
    const googleNotFound = params.get("google_not_found") === "1";

    if (googleError) {
      router.replace(`/${mode}?google_error=${encodeURIComponent(googleError)}`);
      return;
    }

    if (googleNotFound) {
      const email = params.get("email") || "";
      router.replace(`/login?google_not_found=1&email=${encodeURIComponent(email)}`);
      return;
    }

    const googleToken = params.get("google_token");

    if (googleEmail) {
      const q = new URLSearchParams({
        google_email: googleEmail,
        google_fn: googleFn || "",
        google_ln: googleLn || "",
        google_verified: "1",
      });
      if (googleToken) q.set("google_token", googleToken);
      router.replace(`/register?${q.toString()}`);
      return;
    }

    if (token && refresh) {
      // Fetch profile with the new token
      apiFetch<{ user: SafeUser }>("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res?.user) throw new Error("Could not load user profile");
          const session = await loginWithGoogle({
            user: res.user,
            access_token: token,
            refresh_token: refresh,
            roles: [],
            onboarding_incomplete: incomplete,
          });

          if (incomplete || session.onboarding_step !== "completed") {
            try {
              window.sessionStorage.setItem("register_resume_intent", "1");
            } catch {}
            router.replace("/register");
          } else {
            router.replace(
              session.must_change_password
                ? "/change-password"
                : dashboardPathFor(session.role),
            );
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Failed to complete Google login";
          setError(msg);
          setTimeout(() => {
            router.replace(`/${mode}?google_error=${encodeURIComponent(msg)}`);
          }, 2000);
        });
      return;
    }

    router.replace(`/${mode}`);
  }, [loginWithGoogle, router]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0c1220",
        color: "#ffffff",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 16,
          padding: "32px 40px",
          textAlign: "center",
          maxWidth: 420,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid rgba(255, 255, 255, 0.2)",
            borderTopColor: "#38bdf8",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
          Authenticating with Google
        </h2>
        <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>
          {error ? error : "Please wait while we complete your sign-in…"}
        </p>
      </div>
    </div>
  );
}
