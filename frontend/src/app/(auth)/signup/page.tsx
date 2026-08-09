"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthField from "@/components/auth/AuthField";
import AuthDivider from "@/components/auth/AuthDivider";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";

type Role = "candidate" | "company";

function SignupContent() {
  const params = useSearchParams();
  const roleParam = params.get("role");
  const intent = params.get("intent");
  const q = params.get("q");

  const initialRole: Role =
    roleParam === "company" ? "company" : "candidate";

  const [role, setRole] = useState<Role>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const isCompany = role === "company";

  const title = isCompany
    ? intent === "create-company"
      ? "Create company profile"
      : "Sign up to hire"
    : intent === "create-profile"
      ? "Create candidate profile"
      : "Create your account";

  const subtitle = isCompany
    ? intent === "search-candidates" && q
      ? `Search candidates for “${q}” after you create your account.`
      : "Companies and recruiters — post jobs and manage hiring."
    : intent === "search-jobs" && q
      ? `Search “${q}” after you create your candidate profile.`
      : "Candidates — build a profile and apply to open roles.";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setStatus("");

    if (!name.trim() || !email.trim() || !password || !confirm) {
      setError("Fill in all fields to continue.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    // Placeholder until Supabase auth is wired
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setStatus(
      `Account form ready for ${isCompany ? "company" : "candidate"}. Connect Supabase next.`,
    );
  }

  function onGoogle() {
    setError("");
    setStatus(
      `Google sign-up ready for ${isCompany ? "company" : "candidate"}. Wire Supabase Google OAuth next.`,
    );
  }

  return (
    <AuthShell
      eyebrow={isCompany ? "Company / Recruiter" : "Candidate"}
      title={title}
      subtitle={subtitle}
    >
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-md border border-[var(--line)] p-1">
        <button
          type="button"
          onClick={() => setRole("candidate")}
          className={`rounded px-3 py-2 text-sm font-semibold transition ${
            role === "candidate"
              ? "bg-[var(--brand)] text-white"
              : "text-[var(--ink-muted)] hover:bg-[var(--accent-soft)]"
          }`}
        >
          Candidate
        </button>
        <button
          type="button"
          onClick={() => setRole("company")}
          className={`rounded px-3 py-2 text-sm font-semibold transition ${
            role === "company"
              ? "bg-[var(--brand)] text-white"
              : "text-[var(--ink-muted)] hover:bg-[var(--accent-soft)]"
          }`}
        >
          Company
        </button>
      </div>

      <GoogleAuthButton
        label="Sign up with Google"
        onClick={onGoogle}
        disabled={loading}
      />

      <AuthDivider label="or use email" />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <AuthField
          label={isCompany ? "Full name / contact" : "Full name"}
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isCompany ? "Alex Rivera" : "Your name"}
        />

        {isCompany && (
          <AuthField
            label="Company name"
            name="company"
            type="text"
            autoComplete="organization"
            placeholder="Acme Hiring"
          />
        )}

        <AuthField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />

        <div>
          <AuthField
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="mt-1.5 text-xs font-medium text-[var(--brand)] hover:underline"
          >
            {showPassword ? "Hide password" : "Show password"}
          </button>
        </div>

        <AuthField
          label="Confirm password"
          name="confirm"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat password"
        />

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
          {loading
            ? "Creating account…"
            : isCompany
              ? "Create company account"
              : "Create candidate account"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[var(--ink-muted)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--brand)] hover:underline"
        >
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Sign up" subtitle="Loading…">
          <div className="h-40 animate-pulse rounded-md bg-[var(--accent-soft)]" />
        </AuthShell>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
