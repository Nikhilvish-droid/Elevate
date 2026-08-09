export default function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-[var(--line)]" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wider">
        <span className="bg-[var(--bg)] px-3 text-[var(--ink-muted)]">
          {label}
        </span>
      </div>
    </div>
  );
}
