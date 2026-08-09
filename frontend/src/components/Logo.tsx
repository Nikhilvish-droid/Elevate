import Image from "next/image";

type LogoProps = {
  className?: string;
  /** Prefer PNG wordmark when available; falls back to SVG mark + text. */
  variant?: "image" | "mark";
};

export default function Logo({ className = "", variant = "image" }: LogoProps) {
  if (variant === "image") {
    return (
      <Image
        src="/elevate-logo.png"
        alt="Elevate"
        width={160}
        height={40}
        className={`w-auto ${className || "h-[1.15em]"}`}
        priority
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-display font-bold tracking-tight ${className}`}
    >
      <svg
        viewBox="0 0 40 40"
        className="h-[1.1em] w-[1.1em] shrink-0 text-[var(--brand)]"
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M8 6h22v5.2H14.8v5.1h12.4v5H14.8v6.5L8 34V6zm14.2 12.8l6.6-5.4 2.4 2.9-6.6 5.4-2.4-2.9z"
        />
        <path
          fill="currentColor"
          d="M22 16.2l8.5-7 2.2 2.7-8.5 7-2.2-2.7z"
        />
      </svg>
      <span>
        <span className="text-[var(--brand)]">E</span>
        <span className="text-[var(--ink)]">levate</span>
      </span>
    </span>
  );
}
