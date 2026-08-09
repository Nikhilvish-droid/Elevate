import Link from "next/link";
import Logo from "@/components/Logo";

type AuthShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  eyebrow?: string;
};

export default function AuthShell({
  children,
  title,
  subtitle,
  eyebrow,
}: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen flex-col">
      <div className="border-b border-[var(--line)] bg-[var(--bg)]">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-5 sm:max-w-lg sm:px-8">
          <Link href="/" aria-label="Elevate home">
            <Logo className="h-9" />
          </Link>
          <Link
            href="/"
            className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12 sm:max-w-lg sm:px-8">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand)]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm text-[var(--ink-muted)]">{subtitle}</p>
        )}
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
