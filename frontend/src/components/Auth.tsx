import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/lib/theme";

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
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/" className="text-sm text-muted hover:text-ink">
              Home
            </Link>
          </div>
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

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Circular photo picker with live preview */
export function PhotoUpload({
  label = "Profile picture",
  hint = "JPG or PNG · up to 2 MB",
  file,
  existingUrl,
  onChange,
}: {
  label?: string;
  hint?: string;
  file: File | null;
  existingUrl?: string | null;
  onChange: (file: File | null) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(existingUrl ?? null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, existingUrl]);

  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-soft transition hover:border-brand"
          aria-label={file ? "Change photo" : "Add photo"}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-brand">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 19c1.5-3.5 12.5-3.5 14 0" />
              </svg>
            </span>
          )}
          <span className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/45 to-transparent pb-1.5 opacity-0 transition group-hover:opacity-100">
            <span className="text-[10px] font-semibold text-white">Edit</span>
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`${btnGhost} px-3 py-2 text-xs`}
            >
              {file || existingUrl ? "Upload a new photo" : "Upload photo"}
            </button>
            {file ? (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="rounded-md px-3 py-2 text-xs font-semibold text-muted hover:bg-soft hover:text-ink"
              >
                Remove
              </button>
            ) : null}
          </div>
          <p className="mt-1.5 truncate text-xs text-muted">
            {file ? file.name : hint}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

/** Document drop-zone for resume PDF/DOCX */
export function DocumentUpload({
  label = "Resume",
  hint = "PDF or DOCX · up to 10 MB",
  accept = ".pdf,.doc,.docx,application/pdf",
  file,
  onChange,
}: {
  label?: string;
  hint?: string;
  accept?: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function takeFiles(list: FileList | null) {
    onChange(list?.[0] ?? null);
  }

  return (
    <div>
      <p className="text-sm font-medium">{label}</p>

      {file ? (
        <div className="mt-2 flex items-center gap-3 border border-line bg-elevated px-3 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-soft text-brand">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
              <path d="M14 3v5h5" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted">{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs font-semibold text-brand hover:underline"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-xs font-semibold text-muted hover:text-ink"
            aria-label="Remove file"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            takeFiles(e.dataTransfer.files);
          }}
          className={`mt-2 flex w-full flex-col items-center justify-center gap-2 border border-dashed px-4 py-7 text-center transition ${
            dragging
              ? "border-brand bg-soft"
              : "border-line bg-elevated hover:border-brand hover:bg-soft"
          }`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-soft text-brand">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M12 16V7" />
              <path d="M8.5 10.5 12 7l3.5 3.5" />
              <path d="M5 16.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.5" />
            </svg>
          </span>
          <span className="text-sm font-semibold text-ink">
            Drop resume here or browse
          </span>
          <span className="text-xs text-muted">{hint}</span>
        </button>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => takeFiles(e.target.files)}
      />
    </div>
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
  const base = "rounded px-3 py-2.5 text-center text-sm font-semibold";
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
