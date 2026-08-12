"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AuthLayout,
  Field,
  btnGhost,
  btnPrimary,
} from "@/components/Auth";
import { apiPublic } from "@/lib/api";

function ForgotForm() {
  const params = useSearchParams();
  const presetEmail = params.get("email") ?? "";

  const [email, setEmail] = useState(presetEmail);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setBusy(true);
    try {
      const origin = window.location.origin;
      await apiPublic("/api/auth/send-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset")}`,
        }),
      });
      setSent(true);
      setInfo(
        "Check your email for a reset link. Open it to choose a new password.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="We'll email you a link to reset it."
    >
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-brand" role="status">
            {info}
          </p>
          <p className="text-sm text-muted">
            Sent to <span className="font-medium text-ink">{email.trim()}</span>.
            The link expires after a short time — request another if needed.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setInfo("");
              setError("");
            }}
            className={`w-full ${btnGhost}`}
          >
            Use a different email
          </button>
          <Link href="/auth?tab=login" className={`block w-full text-center ${btnGhost}`}>
            Back to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={sendLink} className="space-y-4" noValidate>
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={busy} className={`w-full ${btnPrimary}`}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <Link href="/auth?tab=login" className={`block w-full text-center ${btnGhost}`}>
            Back to log in
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Forgot password">
          <div className="h-32 animate-pulse rounded-md bg-soft" />
        </AuthLayout>
      }
    >
      <ForgotForm />
    </Suspense>
  );
}
