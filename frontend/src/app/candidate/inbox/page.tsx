"use client";

import { useEffect, useState } from "react";
import {
  listMyNotifications,
  markNotificationRead,
  type NotificationRow,
} from "@/lib/candidate";

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
                  n.is_read ? "" : "bg-soft/50"
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
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="mt-1 text-sm text-muted">{n.message}</p>
                <p className="mt-2 text-xs text-muted">
                  {new Date(n.created_at).toLocaleString()}
                  {n.is_read ? "" : " · New"}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
