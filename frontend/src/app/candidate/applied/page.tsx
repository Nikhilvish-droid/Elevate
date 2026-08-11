"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  listMyApplications,
  stageLabel,
  type ApplicationRow,
} from "@/lib/candidate";

const PIPELINE = [
  "applied",
  "resume_screening",
  "shortlisted",
  "technical_interview",
  "hr_interview",
  "offer",
  "hired",
];

export default function AppliedPage() {
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listMyApplications()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."));
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Applications
      </h1>
      <p className="mt-1 text-sm text-muted">
        Track each role from applied through offer.
      </p>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {rows.length === 0 && !error ? (
        <p className="mt-8 border border-line bg-elevated px-5 py-10 text-sm text-muted">
          You haven&apos;t applied yet.{" "}
          <Link href="/candidate/jobs" className="font-semibold text-brand">
            Browse jobs
          </Link>
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((app) => {
            const job = app.jobs as {
              id?: number;
              title?: string;
              location?: string;
              companies?: { name?: string } | { name?: string }[] | null;
            } | null;
            const company = Array.isArray(job?.companies)
              ? job?.companies[0]?.name
              : job?.companies?.name;
            const idx = PIPELINE.indexOf(app.status);
            return (
              <li key={app.id} className="border border-line bg-elevated px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{job?.title ?? "Role"}</p>
                    <p className="text-sm text-muted">
                      {company ?? "Company"} · {job?.location ?? "—"}
                    </p>
                  </div>
                  <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold capitalize text-brand">
                    {stageLabel(app.status)}
                  </span>
                </div>
                <div className="mt-4 flex gap-1">
                  {PIPELINE.map((step, i) => (
                    <span
                      key={step}
                      className={`h-1.5 flex-1 rounded-full ${
                        idx >= i ? "bg-brand" : "bg-line"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted">
                  Applied {new Date(app.applied_at).toLocaleDateString()}
                  {app.match_score != null ? ` · Match ${Math.round(app.match_score)}%` : ""}
                </p>
                {job?.id ? (
                  <Link
                    href={`/candidate/jobs/${job.id}`}
                    className="mt-2 inline-block text-xs font-semibold text-brand"
                  >
                    View job
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
