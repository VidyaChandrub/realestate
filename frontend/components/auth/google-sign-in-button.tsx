"use client";

import { useEffect, useRef, useState } from "react";
import { authenticateWithGoogle, getGoogleAuthConfig, getGoogleAuthUrl } from "@/lib/api";
import type { GoogleAuthResponse } from "@/lib/types";

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        fill="#EA4335"
      />
    </svg>
  );
}

interface GoogleSignInButtonProps {
  mode?: "login" | "register";
  portal?: "organisation" | "platform";
  text?: string;
  disabled?: boolean;
  extraData?: {
    country?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
  };
  onSuccess: (res: GoogleAuthResponse) => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (res: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (notification?: (status: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({
  mode = "login",
  portal = "organisation",
  text,
  disabled = false,
  extraData,
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    getGoogleAuthConfig()
      .then((cfg) => {
        if (!mounted) return;
        if (cfg.clientId) {
          setClientId(cfg.clientId);
          // Load Google Identity Services script
          if (!scriptLoadedRef.current && !document.getElementById("google-gsi-script")) {
            const script = document.createElement("script");
            script.id = "google-gsi-script";
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.onload = () => {
              scriptLoadedRef.current = true;
            };
            document.head.appendChild(script);
          }
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  async function handleGoogleClick() {
    if (loading || disabled) return;
    setLoading(true);

    try {
      // 1. If Google Identity Services (GIS) library is available and clientId is configured:
      if (typeof window !== "undefined" && window.google?.accounts?.id && clientId) {
        let responded = false;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (res) => {
            responded = true;
            if (!res.credential) {
              setLoading(false);
              onError?.("No Google credential returned");
              return;
            }
            try {
              const authRes = await authenticateWithGoogle({
                credential: res.credential,
                mode,
                portal,
                country: extraData?.country,
                phoneNumber: extraData?.phoneNumber,
                firstName: extraData?.firstName,
                lastName: extraData?.lastName,
                host: window.location.host,
              });
              onSuccess(authRes);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Google authentication failed";
              onError?.(msg);
            } finally {
              setLoading(false);
            }
          },
          cancel_on_tap_outside: true,
        });

        // Prompt Google Sign-In prompt
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            if (!responded) {
              // Popup failed or was dismissed, fall back to standard OAuth redirect
              fallbackToOAuthRedirect();
            }
          }
        });

        // Timeout to fallback if popup does not appear in 4 seconds
        setTimeout(() => {
          if (!responded && loading) {
            fallbackToOAuthRedirect();
          }
        }, 4000);
        return;
      }

      // 2. Otherwise fall back to standard OAuth authorization URL redirect
      await fallbackToOAuthRedirect();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not initialize Google sign in";
      onError?.(msg);
      setLoading(false);
    }
  }

  async function fallbackToOAuthRedirect() {
    try {
      const redirectUri =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/google/callback`
          : undefined;
      const res = await getGoogleAuthUrl(mode, portal, redirectUri);
      if (res.url) {
        window.location.href = res.url;
        return;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google OAuth is not configured on server";
      onError?.(msg);
      setLoading(false);
    }
  }

  const label =
    text ||
    (mode === "register" ? "Sign up with Google" : "Continue with Google");

  return (
    <button
      type="button"
      className="btn-google"
      onClick={() => void handleGoogleClick()}
      disabled={disabled || loading}
      aria-label={label}
    >
      {loading ? (
        <span className="btn-google-spinner" aria-hidden="true" />
      ) : (
        <GoogleIcon size={18} />
      )}
      <span>{loading ? "Connecting to Google…" : label}</span>
    </button>
  );
}
