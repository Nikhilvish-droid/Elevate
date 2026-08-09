import Link from "next/link";
import type { InputHTMLAttributes, ReactNode } from "react";
import Logo from "@/components/Logo";

export const inputClass =
  "mt-1.5 w-full rounded-md border border-line bg-elevated px-3 py-2.5 text-sm outline-none focus:border-brand";

export const btnPrimary =
  "rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60";

export const btnGhost =
  "rounded-md border border-line px-4 py-2.5 text-sm font-semibold hover:bg-soft";

export function AuthLayout({
  title,
  subtitle,
  eyebrow,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-5 sm:max-w-lg">
          <Link href="/" aria-label="Elevate home">
            <Logo className="h-9" />
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-ink">
            Home
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-5 py-10 sm:max-w-lg sm:py-12">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          {title}
        </h1>
        {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

export function Field({
  label,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const fieldId = id ?? props.name;
  return (
    <label className="block text-sm font-medium" htmlFor={fieldId}>
      {label}
      <input id={fieldId} className={inputClass} {...props} />
    </label>
  );
}

export function GoogleButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-3 bg-elevated ${btnGhost}`}
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.9 26.8 37 24 37c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l.1.1 6.2 5.2C39.2 37.2 44 31.7 44 24c0-1.3-.1-2.5-.4-3.5z"
        />
      </svg>
      {label}
    </button>
  );
}

export function OrDivider() {
  return (
    <div className="relative my-6 text-center text-xs uppercase tracking-wider text-muted">
      <span className="absolute inset-x-0 top-1/2 border-t border-line" />
      <span className="relative bg-surface px-3">or email</span>
    </div>
  );
}

export function AuthTabs({
  mode,
  hint,
}: {
  mode: "login" | "signup";
  hint: string | null;
}) {
  const q = hint ? `&hint=${encodeURIComponent(hint)}` : "";
  const base =
    "rounded px-3 py-2.5 text-center text-sm font-semibold";
  const on = "bg-brand text-white";
  const off = "text-muted hover:bg-soft";

  return (
    <div className="mb-6 grid grid-cols-2 gap-1 rounded-md border border-line p-1">
      <Link
        href={`/auth?tab=login${q}`}
        className={`${base} ${mode === "login" ? on : off}`}
      >
        Log in
      </Link>
      <Link
        href={`/auth?tab=signup${q}`}
        className={`${base} ${mode === "signup" ? on : off}`}
      >
        Sign up
      </Link>
    </div>
  );
}
