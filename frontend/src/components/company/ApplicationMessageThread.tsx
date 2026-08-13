"use client";

import { useEffect, useState } from "react";
import { maskCtcInMessage } from "@/lib/candidateMessages";
import {
  listApplicationMessages,
  type ApplicationMessage,
} from "@/lib/companyJobs";

function whenLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ApplicationMessageThread({
  applicationId,
  maskCtc = false,
}: {
  applicationId: number;
  maskCtc?: boolean;
}) {
  const [messages, setMessages] = useState<ApplicationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const rows = await listApplicationMessages(applicationId);
        if (!cancelled) setMessages(rows);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load messages.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="text-sm font-semibold">Messages</p>
      <p className="mt-0.5 text-xs text-muted">
        Same thread for recruiter, hiring manager, and interviewer.
        {maskCtc ? " CTC amounts are hidden." : ""}
      </p>
      {loading ? (
        <p className="mt-3 text-sm text-muted">Loading messages…</p>
      ) : error ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : messages.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No messages sent yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {messages.map((row) => {
            const body = maskCtc ? maskCtcInMessage(row.body) : row.body;
            return (
              <li
                key={row.id}
                className="rounded-md border border-line bg-surface px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{row.subject}</p>
                  <p className="text-xs text-muted">{whenLabel(row.created_at)}</p>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {row.sender_name}
                  {row.email_sent ? " · also emailed" : ""}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
                  {body}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}