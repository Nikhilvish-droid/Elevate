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
import { createClient } from "@/lib/supabase/client";
import { getAccessToken } from "@/lib/auth/jwt";
import { afterAuthPath, syncAuthUser } from "@/lib/profile";

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("tab") === "login" ? "login" : "signup";
  const hint = params.get("hint");
  const authError = params.get("error");
  const isLogin = mode === "login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(
    authError ? "Sign-in failed. Try again." : "",
  );
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");

  function onboardingPath() {
    return hint === "company" || hint === "candidate"
      ? `/onboarding?hint=${hint}`
      : "/onboarding";
  }

  async function afterLogin() {
    const token = await getAccessToken();
    if (!token) {
      setError("Login succeeded but no JWT was issued. Try again.");
      return;
    }

    const profile = await syncAuthUser();
    router.push(afterAuthPath(profile, onboardingPath()));
    router.refresh();
  }

  async function onGoogle() {
    setError("");
    setInfo("");
    setBusy(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(onboardingPath())}`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

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
    const supabase = createClient();

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        await afterLogin();
        return;
      }

      const origin = window.location.origin;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(onboardingPath())}`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // If email confirmation is on, session may be null
      if (!data.session) {
        setInfo(
          "Check your email to confirm your account, then log in.",
        );
        return;
      }

      await afterLogin();
    } finally {
      setBusy(false);
    }
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
        {info ? (
          <p className="text-sm text-brand" role="status">
            {info}
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
