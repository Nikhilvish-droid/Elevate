"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import AuthField from "@/components/auth/AuthField";
import AuthDivider from "@/components/auth/AuthDivider";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setStatus("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    // Placeholder until Supabase auth is wired
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setStatus(
      "Login form is ready. Connect Supabase email/password auth next.",
    );
  }

  function onGoogle() {
    setError("");
    setStatus(
      "Google sign-in is ready to connect. Wire Supabase Google OAuth next.",
    );
  }

  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back. Sign in with Google or your email."
    >
      <GoogleAuthButton
        label="Continue with Google"
        onClick={onGoogle}
        disabled={loading}
      />

      <AuthDivider label="or use email" />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <AuthField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />

        <div>
          <AuthField
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="mt-1.5 text-xs font-medium text-[var(--brand)] hover:underline"
          >
            {showPassword ? "Hide password" : "Show password"}
          </button>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-[var(--ink-muted)]">
            <input
              type="checkbox"
              className="rounded border-[var(--line)]"
              name="remember"
            />
            Remember me
          </label>
          <button
            type="button"
            className="font-medium text-[var(--brand)] hover:underline"
            onClick={() =>
              setStatus("Password reset will be available with Supabase.")
            }
          >
            Forgot password?
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {status && (
          <p className="text-sm text-[var(--brand)]" role="status">
            {status}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Log in"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[var(--ink-muted)]">
        New to Elevate?{" "}
        <Link
          href="/signup"
          className="font-semibold text-[var(--brand)] hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
