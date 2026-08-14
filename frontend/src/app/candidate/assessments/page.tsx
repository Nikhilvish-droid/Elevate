"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  listMyAssessments,
  startAssessmentAttempt,
  type AssessmentAttemptRow,
} from "@/lib/assessments";

export default function AssessmentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AssessmentAttemptRow[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    listMyAssessments()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."));
  }, []);

  async function openAttempt(row: AssessmentAttemptRow) {
    setBusyId(row.id);
    setError("");
    try {
      if (row.status === "assigned") {
        await startAssessmentAttempt(row.id);
      }
      router.push(`/candidate/assessments/${row.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start test.");
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Coding assessments
      </h1>
      <p className="mt-1 text-sm text-muted">
        Tests assigned to your applications. The timer starts when you open a
        test.
      </p>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {rows.length === 0 && !error ? (
        <p className="mt-8 border border-line bg-elevated px-5 py-10 text-sm text-muted">
          No assessments yet. Recruiters assign tests after you are shortlisted.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line border border-line bg-elevated">
          {rows.map((row) => {
            const test = Array.isArray(row.coding_assessments)
              ? row.coding_assessments[0]
              : row.coding_assessments;
            const done = ["submitted", "auto_submitted"].includes(row.status);
            return (
              <li key={row.id} className="px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{test?.title ?? "Assessment"}</p>
                    <p className="mt-1 text-sm text-muted">
                      {test?.description ||
                        "Complete this test for your application."}
                    </p>
                    {test?.duration_minutes ? (
                      <p className="mt-1 text-xs text-muted">
                        {test.duration_minutes} minutes
                      </p>
                    ) : null}
                  </div>
                  <span className="text-xs font-semibold capitalize text-brand">
                    {row.status.replace(/_/g, " ")}
                  </span>
                </div>
                {row.score != null ? (
                  <p className="mt-2 text-sm">Score: {row.score}%</p>
                ) : null}
                <div className="mt-3">
                  {done ? (
                    <Link
                      href={`/candidate/assessments/${row.id}`}
                      className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-soft"
                    >
                      View result
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void openAttempt(row)}
                      className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
                    >
                      {busyId === row.id
                        ? "Opening…"
                        : row.status === "in_progress"
                          ? "Continue"
                          : "Start test"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
