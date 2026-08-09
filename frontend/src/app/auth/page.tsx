"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthLayout,
  AuthTabs,
  Field,
  GoogleButton,
  OrDivider,
  btnPrimary,
} from "@/components/Auth";

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("tab") === "login" ? "login" : "signup";
  const hint = params.get("hint");
  const isLogin = mode === "login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function goOnboarding() {
    router.push(
      hint === "company" || hint === "candidate"
        ? `/onboarding?hint=${hint}`
        : "/onboarding",
    );
  }

  async function onGoogle() {
    setError("");
    setBusy(true);
    await delay(300);
    setBusy(false);
    if (isLogin) router.push("/");
    else goOnboarding();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    if (!isLogin) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords don't match.");
        return;
      }
    }

    setBusy(true);
    await delay(300);
    setBusy(false);

    if (isLogin) router.push("/");
    else goOnboarding();
  }

  return (
    <AuthLayout
      title={isLogin ? "Log in" : "Create your account"}
      subtitle={
        isLogin
          ? "Use Google or email to continue."
          : "Create an account, then choose candidate or company."
      }
    >
      <AuthTabs mode={mode} hint={hint} />
      <GoogleButton
        label={isLogin ? "Continue with Google" : "Sign up with Google"}
        onClick={onGoogle}
        disabled={busy}
      />
      <OrDivider />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />

        <div>
          <Field
            label="Password"
            name="password"
            type={showPass ? "text" : "password"}
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isLogin ? "Your password" : "Min. 8 characters"}
          />
          <button
            type="button"
            className="mt-1.5 text-xs font-medium text-brand hover:underline"
            onClick={() => setShowPass((v) => !v)}
          >
            {showPass ? "Hide" : "Show"} password
          </button>
        </div>

        {!isLogin && (
          <Field
            label="Confirm password"
            name="confirm"
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        )}

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={busy} className={`w-full ${btnPrimary}`}>
          {busy
            ? isLogin
              ? "Signing in…"
              : "Creating…"
            : isLogin
              ? "Log in"
              : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Account">
          <div className="h-32 animate-pulse rounded-md bg-soft" />
        </AuthLayout>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
