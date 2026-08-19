"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/icons";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getOrgSetup, completeEmailVerification } = useAuth();

  const email = searchParams.get("email") ?? getOrgSetup()?.email ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sent">("idle");

  useEffect(() => {
    const setup = getOrgSetup();
    if (!setup) {
      router.replace("/register");
    }
  }, [getOrgSetup, router]);

  function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (completeEmailVerification(code)) {
      router.push("/onboarding");
      router.refresh();
    } else {
      setError("That code doesn't look right. Check it and try again.");
    }
  }

  function handleResend() {
    setResendState("sent");
    setError(null);
    window.setTimeout(() => setResendState("idle"), 1500);
  }

  return (
    <div className="text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
        <Icon name="mail" size={26} />
      </span>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Verify your email
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        We sent a 6-digit code to{" "}
        <span className="font-medium text-slate-800 dark:text-slate-100">{email}</span>.
        Enter it below to activate your organisation.
      </p>

      <form
        onSubmit={handleVerify}
        className="mx-auto mt-6 flex max-w-xs flex-col gap-4"
      >
        <Input
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          placeholder="000000"
          className="h-12 text-center text-lg tracking-[0.5em]"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ""));
            setError(null);
          }}
          aria-label="Verification code"
        />

        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={code.length !== 6}>
          Verify email
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
        Didn&apos;t receive it?{" "}
        <button
          type="button"
          onClick={handleResend}
          className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {resendState === "sent" ? "Code re-sent ✓" : "Resend code"}
        </button>
      </p>
    </div>
  );
}