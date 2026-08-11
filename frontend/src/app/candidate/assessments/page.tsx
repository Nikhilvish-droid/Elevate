"use client";

import { useEffect, useState } from "react";
import {
  listMyAssessments,
  type AssessmentAttempt,
} from "@/lib/candidate";

export default function AssessmentsPage() {
  const [rows, setRows] = useState<AssessmentAttempt[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listMyAssessments()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."));
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Coding assessments
      </h1>
      <p className="mt-1 text-sm text-muted">
        Tests assigned to your applications. Scores show here after you submit.
      </p>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {rows.length === 0 && !error ? (
        <p className="mt-8 border border-line bg-elevated px-5 py-10 text-sm text-muted">
          No assessments yet. Recruiters attach tests after you apply.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line border border-line bg-elevated">
          {rows.map((row) => {
            const test = Array.isArray(row.coding_assessments)
              ? row.coding_assessments[0]
              : row.coding_assessments;
            return (
              <li key={row.id} className="px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{test?.title ?? "Assessment"}</p>
                    <p className="mt-1 text-sm text-muted">
                      {test?.description || "Complete this test for your application."}
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
