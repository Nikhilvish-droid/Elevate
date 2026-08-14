"use client";

import { useEffect, useState } from "react";
import {
  listApplicationAssessments,
  type AssessmentAttemptRow,
} from "@/lib/assessments";

export function ApplicationAssessmentScores({
  applicationId,
}: {
  applicationId: number | null | undefined;
}) {
  const [rows, setRows] = useState<AssessmentAttemptRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!applicationId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listApplicationAssessments(applicationId)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (!applicationId) return null;
  if (loading) {
    return (
      <p className="text-xs text-muted">Loading assessment scores…</p>
    );
  }
  if (!rows.length) return null;

  return (
    <div className="border border-line bg-surface px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Coding assessments
      </p>
      <ul className="mt-2 space-y-2">
        {rows.map((row) => {
          const title =
            (row.coding_assessments &&
              "title" in row.coding_assessments &&
              row.coding_assessments.title) ||
            "Assessment";
          return (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span>
                {title}
                <span className="ml-2 text-xs capitalize text-muted">
                  {row.status.replace(/_/g, " ")}
                </span>
              </span>
              <span className="font-semibold text-brand">
                {row.score != null ? `${row.score}%` : "—"}
                {row.violation_count
                  ? ` · ${row.violation_count} flags`
                  : ""}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">
        After review, recruiters can move the candidate to Technical Interview.
      </p>
    </div>
  );
}
