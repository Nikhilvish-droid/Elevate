"use client";

import { useEffect, useState } from "react";
import {
  listMyNotifications,
  markNotificationRead,
  type NotificationRow,
} from "@/lib/candidate";

function typeLabel(type: string) {
  const t = String(type || "").toLowerCase();
  if (t === "message") return "Message";
  if (t === "interview") return "Interview";
  if (t === "offer") return "Offer";
  if (t === "application") return "Application";
  return t.replace(/_/g, " ") || "Update";
}

export default function InboxPage() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      setRows(await listMyNotifications());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Inbox</h1>
      <p className="mt-1 text-sm text-muted">
        Application, interview, assessment, and offer updates.
      </p>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {rows.length === 0 && !error ? (
        <p className="mt-8 border border-line bg-elevated px-5 py-10 text-sm text-muted">
          No notifications yet.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line border border-line bg-elevated">
          {rows.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={`block w-full px-5 py-4 text-left hover:bg-soft ${
                  n.is_read ? "" : "bg-soft/40"
                }`}
                onClick={async () => {
                  if (!n.is_read) {
                    try {
                      await markNotificationRead(n.id);
                      await load();
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Could not mark read.",
                      );
                    }
                  }
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {typeLabel(n.notification_type)}
                  </span>
                  {!n.is_read ? (
                    <span className="text-[10px] font-semibold text-brand">
                      New
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-semibold">{n.title}</p>
                {(n.company_name || n.job_title) && (
                  <p className="mt-1 text-sm text-brand">
                    {[n.company_name, n.job_title].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                  {n.message}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {new Date(n.created_at).toLocaleString("en-IN")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
