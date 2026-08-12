"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  APPLICATION_PIPELINE,
  formatEmployment,
  formatPay,
  formatWorkMode,
  listMyApplications,
  pipelineIndex,
  stageLabel,
  type ApplicationRow,
} from "@/lib/candidate";

function companyName(app: ApplicationRow) {
  const job = app.jobs;
  const companies = job?.companies;
  if (Array.isArray(companies)) return companies[0]?.name ?? "Company";
  return companies?.name ?? "Company";
}

export default function AppliedPage() {
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyApplications()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Applications
      </h1>
      <p className="mt-1 text-sm text-muted">
        Track each role: Applied → Resume Screening → Shortlisted → Technical
        Interview → HR Interview → Offer → Hired.
      </p>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="mt-8 border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
          Loading applications…
        </p>
      ) : rows.length === 0 && !error ? (
        <p className="mt-8 border border-line bg-elevated px-5 py-10 text-sm text-muted">
          You haven&apos;t applied yet.{" "}
          <Link href="/candidate/jobs" className="font-semibold text-brand">
            Browse jobs
          </Link>
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((app) => {
            const job = app.jobs;
            const idx = pipelineIndex(app.status);
            const rejected = String(app.status).toLowerCase() === "rejected";
            return (
              <li key={app.id} className="border border-line bg-elevated px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{job?.title ?? "Role"}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {companyName(app)}
                      {job?.location ? ` · ${job.location}` : ""}
                    </p>
                    {job ? (
                      <p className="mt-1 text-sm text-muted">
                        {[
                          formatWorkMode(job.work_mode),
                          formatEmployment(job.employment_type),
                          formatPay(job.salary_min, job.salary_max),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-md border px-2.5 py-1 text-xs font-semibold capitalize ${
                      rejected
                        ? "border-line text-muted"
                        : "border-brand/30 text-brand"
                    }`}
                  >
                    {stageLabel(app.status)}
                  </span>
                </div>

                {!rejected ? (
                  <div className="mt-5">
                    <div className="flex gap-1">
                      {APPLICATION_PIPELINE.map((step, i) => (
                        <span
                          key={step}
                          title={stageLabel(step)}
                          className={`h-1.5 flex-1 ${
                            idx >= i ? "bg-brand" : "bg-line"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between gap-1 text-[10px] text-muted">
                      {APPLICATION_PIPELINE.map((step) => (
                        <span key={step} className="min-w-0 flex-1 truncate" title={stageLabel(step)}>
                          {stageLabel(step)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted">
                    This application was not moved forward.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted">
                    Applied {new Date(app.applied_at).toLocaleDateString("en-IN")}
                    {app.match_score != null
                      ? ` · Match ${Math.round(app.match_score)}%`
                      : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {job?.id ? (
                      <Link
                        href={`/candidate/jobs/${job.id}`}
                        className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                      >
                        View job
                      </Link>
                    ) : null}
                    <Link
                      href="/candidate/interviews"
                      className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                    >
                      Rounds
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
