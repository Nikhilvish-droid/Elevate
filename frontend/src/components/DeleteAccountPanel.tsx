"use client";

import { useState } from "react";
import { Field, btnGhost } from "@/components/Auth";
import { deleteAccount } from "@/lib/profile";

export function DeleteAccountPanel({
  email,
  className,
}: {
  email: string | null | undefined;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setOpen(false);
    setConfirmText("");
    setError("");
    setBusy(false);
  }

  async function onDelete() {
    if (confirmText !== "DELETE") {
      setError("Type DELETE in capitals to continue.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await deleteAccount();
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete account.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          "rounded-md border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/10"
        }
      >
        Delete my profile
      </button>
    );
  }

  return (
    <div className="space-y-3 border border-red-500/30 bg-elevated p-4">
      <p className="text-sm text-muted">
        This cannot be undone
        {email ? (
          <>
            {" "}
            for <span className="font-semibold text-ink">{email}</span>
          </>
        ) : null}
        . Type <span className="font-semibold text-ink">DELETE</span> to
        confirm.
      </p>
      <Field
        label="Confirmation"
        name="deleteConfirm"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="DELETE"
        autoComplete="off"
      />
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || confirmText !== "DELETE"}
          onClick={onDelete}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Delete account permanently"}
        </button>
        <button type="button" disabled={busy} onClick={reset} className={btnGhost}>
          Cancel
        </button>
      </div>
    </div>
  );
}
