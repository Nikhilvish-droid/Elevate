"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthLayout,
  Field,
  btnGhost,
  btnPrimary,
} from "@/components/Auth";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/profile";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) {
        setHasSession(Boolean(session));
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw new Error(updateError.message);
      await signOut();
      router.replace("/auth?tab=login&reset=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <AuthLayout title="Reset password">
        <p className="text-sm text-muted">Checking your reset link…</p>
      </AuthLayout>
    );
  }

  if (!hasSession) {
    return (
      <AuthLayout
        title="Reset link required"
        subtitle="Open the link from your email, or request a new one."
      >
        <div className="space-y-3">
          <Link href="/auth/forgot" className={`block w-full text-center ${btnPrimary}`}>
            Request reset link
          </Link>
          <Link href="/auth?tab=login" className={`block w-full text-center ${btnGhost}`}>
            Back to log in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="New password" subtitle="Choose a new password for your account.">
      <form onSubmit={savePassword} className="space-y-4" noValidate>
        <Field
          label="New password"
          name="password"
          type={showPass ? "text" : "password"}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
        />
        <Field
          label="Confirm password"
          name="confirm"
          type={showPass ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <button
          type="button"
          className="text-xs font-medium text-brand hover:underline"
          onClick={() => setShowPass((v) => !v)}
        >
          {showPass ? "Hide" : "Show"} password
        </button>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={busy} className={`w-full ${btnPrimary}`}>
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
    </AuthLayout>
  );
}
