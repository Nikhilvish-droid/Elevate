import { InputHTMLAttributes } from "react";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export default function AuthField({
  label,
  id,
  error,
  className = "",
  ...props
}: AuthFieldProps) {
  const fieldId = id || props.name;

  return (
    <label className="block text-sm font-medium" htmlFor={fieldId}>
      {label}
      <input
        id={fieldId}
        className={`mt-1.5 w-full rounded-md border bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--brand)] ${
          error ? "border-red-500" : "border-[var(--line)]"
        } ${className}`}
        {...props}
      />
      {error && (
        <span className="mt-1 block text-xs font-normal text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}
