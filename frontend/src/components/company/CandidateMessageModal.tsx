"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  draftCandidateMessage,
  type MessageKind,
  type MessageVars,
} from "@/lib/candidateMessages";
import { sendCompanyMessage } from "@/lib/companyJobs";

const KIND_LABEL: Record<MessageKind, string> = {
  shortlisted: "Shortlisted",
  round_advance: "Next round",
  rejected: "Not selected",
  approved: "Approved for offer",
  offer_ctc: "Offer / CTC",
  assessment_assigned: "Coding assessment",
};

export function CandidateMessageModal({
  open,
  applicationId,
  candidateName,
  kind,
  vars,
  busy,
  onClose,
  onSent,
  onSkip,
}: {
  open: boolean;
  applicationId: number;
  candidateName: string;
  kind: MessageKind;
  vars: MessageVars;
  busy?: boolean;
  onClose: () => void;
  onSent: () => void | Promise<void>;
  onSkip?: () => void | Promise<void>;
}) {
  const draft = draftCandidateMessage(kind, vars);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const next = draftCandidateMessage(kind, vars);
    setSubject(next.subject);
    setBody(next.body);
    setError("");
  }, [open, kind, vars.name, vars.job, vars.company, vars.round, vars.ctc, vars.location, vars.joining_date]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setError("Subject and message are required.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await sendCompanyMessage({
        application_id: applicationId,
        subject: subject.trim(),
        message: body.trim(),
        template_key: kind,
      });
      await onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  const locked = Boolean(busy || sending);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg border border-line bg-elevated px-5 py-5 shadow-lg"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Message candidate · {KIND_LABEL[kind]}
        </p>
        <h2 className="mt-1 font-display text-lg font-bold">
          Send to {candidateName}
        </h2>
        <p className="mt-1 text-sm text-muted">
          This lands in their Elevate Inbox (orange dot until they open it). If
          Resend is configured, a copy also goes to their email.
        </p>
        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <label className="mt-4 block text-sm font-medium">
          Subject
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          Message
          <textarea
            required
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
          />
        </label>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {onSkip ? (
            <button
              type="button"
              disabled={locked}
              onClick={() => void onSkip()}
              className="rounded-md border border-line px-3 py-2 text-sm font-semibold hover:bg-soft disabled:opacity-60"
            >
              Skip
            </button>
          ) : (
            <button
              type="button"
              disabled={locked}
              onClick={onClose}
              className="rounded-md border border-line px-3 py-2 text-sm font-semibold hover:bg-soft disabled:opacity-60"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={locked}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send to Inbox"}
          </button>
        </div>
      </form>
    </div>
  );
}
