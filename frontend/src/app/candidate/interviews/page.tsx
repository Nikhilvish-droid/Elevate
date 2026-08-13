"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listMyInterviews,
  roundLabel,
  type InterviewRow,
} from "@/lib/candidate";

function unwrapApp(row: InterviewRow) {
  const raw = row.applications as InterviewRow["applications"] | InterviewRow["applications"][] | null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

function companyOf(row: InterviewRow) {
  const app = unwrapApp(row);
  const companies = app?.jobs?.companies;
  if (Array.isArray(companies)) return companies[0]?.name ?? "Company";
  return companies?.name ?? "Company";
}

function jobTitleOf(row: InterviewRow) {
  return unwrapApp(row)?.jobs?.title ?? "Interview";
}

function isPast(row: InterviewRow) {
  const status = String(row.status || "").toLowerCase();
  if (["completed", "ended", "done", "cancelled", "no_show"].includes(status)) return true;
  return new Date(row.scheduled_at).getTime() < Date.now() - 30 * 60 * 1000;
}

function RoundCard({
  row,
  badge,
}: {
  row: InterviewRow;
  badge: string;
}) {
  const when = new Date(row.scheduled_at);
  const link = row.meeting_link?.trim();
  const href =
    link && !/^https?:\/\//i.test(link) ? `https://${link}` : link || null;

  return (
    <li className="border border-line bg-elevated px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {badge}
            </span>
            <span className="text-xs font-semibold capitalize text-brand">
              {String(row.status || "").replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-2 font-semibold">{jobTitleOf(row)}</p>
          <p className="mt-0.5 text-sm text-muted">
            {companyOf(row)} · {roundLabel(row.interview_type)} ·{" "}
            {row.duration_minutes} min
          </p>
          <p className="mt-2 text-sm">
            {when.toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          {row.location ? (
            <p className="mt-1 text-sm text-muted">{row.location}</p>
          ) : null}
        </div>
      </div>

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
        >
          Join meeting
        </a>
      ) : (
        <p className="mt-4 text-sm text-muted">
          Meeting link not added yet. Check again closer to the round.
        </p>
      )}
    </li>
  );
}

export default function InterviewsPage() {
  const [rows, setRows] = useState<InterviewRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyInterviews()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
  }, []);

  const { current, upcoming, previous } = useMemo(() => {
    const sorted = [...rows].sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
    );
    const past = sorted.filter(isPast);
    const future = sorted.filter((r) => !isPast(r));
    return {
      current: future[0] ?? null,
      upcoming: future.slice(1),
      previous: [...past].reverse(),
    };
  }, [rows]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Rounds</h1>
      <p className="mt-1 text-sm text-muted">
        See your current round, upcoming interviews, and past rounds.
      </p>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="mt-8 border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
          Loading rounds…
        </p>
      ) : rows.length === 0 && !error ? (
        <p className="mt-8 border border-line bg-elevated px-5 py-10 text-sm text-muted">
          No interviews scheduled yet. They appear here after a recruiter books a
          round.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-sm font-semibold">Current round</h2>
            {current ? (
              <ul className="mt-3 space-y-3">
                <RoundCard row={current} badge="Now" />
              </ul>
            ) : (
              <p className="mt-3 border border-line bg-elevated px-5 py-6 text-sm text-muted">
                No upcoming round right now.
              </p>
            )}
          </section>

          {upcoming.length ? (
            <section>
              <h2 className="text-sm font-semibold">Upcoming rounds</h2>
              <ul className="mt-3 space-y-3">
                {upcoming.map((row) => (
                  <RoundCard key={row.id} row={row} badge="Upcoming" />
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="text-sm font-semibold">Previous rounds</h2>
            {previous.length ? (
              <ul className="mt-3 space-y-3">
                {previous.map((row) => (
                  <RoundCard key={row.id} row={row} badge="Done" />
                ))}
              </ul>
            ) : (
              <p className="mt-3 border border-line bg-elevated px-5 py-6 text-sm text-muted">
                No previous rounds yet.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
