"use client";

import { useEffect, useState } from "react";
import {
  listMyInterviews,
  type InterviewRow,
} from "@/lib/candidate";

export default function InterviewsPage() {
  const [rows, setRows] = useState<InterviewRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listMyInterviews()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."));
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Interview schedule
      </h1>
      <p className="mt-1 text-sm text-muted">
        Upcoming and past rounds assigned to you.
      </p>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {rows.length === 0 && !error ? (
        <p className="mt-8 border border-line bg-elevated px-5 py-10 text-sm text-muted">
          No interviews scheduled yet. They appear here after a recruiter books a round.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line border border-line bg-elevated">
          {rows.map((row) => {
            const app = row.applications;
            const job = app?.jobs as
              | { title?: string; companies?: { name?: string } | { name?: string }[] | null }
              | null;
            const company = Array.isArray(job?.companies)
              ? job?.companies[0]?.name
              : job?.companies?.name;
            const when = new Date(row.scheduled_at);
            return (
              <li key={row.id} className="px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{job?.title ?? "Interview"}</p>
                    <p className="text-sm text-muted">
                      {company ?? "Company"} · {row.interview_type} · {row.duration_minutes} min
                    </p>
                    <p className="mt-1 text-sm">
                      {when.toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    {row.location ? (
                      <p className="text-sm text-muted">{row.location}</p>
                    ) : null}
                  </div>
                  <span className="text-xs font-semibold capitalize text-brand">
                    {row.status.replace(/_/g, " ")}
                  </span>
                </div>
                {row.meeting_link ? (
                  <a
                    href={row.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm font-semibold text-brand"
                  >
                    Join meeting
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
