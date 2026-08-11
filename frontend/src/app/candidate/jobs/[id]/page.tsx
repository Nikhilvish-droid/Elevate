"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  applyToJob,
  formatEmployment,
  formatPay,
  formatWorkMode,
  getCandidateFull,
  getMyApplicationForJob,
  getPublishedJob,
  type JobRow,
} from "@/lib/candidate";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [job, setJob] = useState<JobRow | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  const [cover, setCover] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasResume, setHasResume] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const row = await getPublishedJob(id);
        setJob(row);
        const [app, cand] = await Promise.all([
          getMyApplicationForJob(id).catch(() => null),
          getCandidateFull(),
        ]);
        if (app) setApplied(app.status);
        if (cand) setHasResume(cand.resumes.length > 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load job.");
      }
    })();
  }, [id]);

  async function onApply(e: FormEvent) {
    e.preventDefault();
    if (!hasResume) {
      setError("Upload a resume on your profile before applying.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await applyToJob(id, cover);
      router.push("/candidate/applied");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply.");
    } finally {
      setBusy(false);
    }
  }

  if (!job && !error) {
    return <p className="text-sm text-muted">Loading role…</p>;
  }

  if (!job) {
    return (
      <p className="text-sm text-muted">
        {error || "Job not found."}{" "}
        <Link href="/candidate/jobs" className="text-brand">Back to jobs</Link>
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/candidate/jobs" className="text-sm text-muted hover:text-ink">
        ← Jobs
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
        {job.title}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {job.companies?.name ?? "Company"} · {job.location ?? "Location TBD"} ·{" "}
        {formatWorkMode(job.work_mode)} · {formatEmployment(job.employment_type)}
      </p>
      <p className="mt-2 text-sm font-medium">
        {formatPay(job.salary_min, job.salary_max)}
      </p>
      {job.experience_min_years != null ? (
        <p className="mt-1 text-sm text-muted">
          Experience: {job.experience_min_years}
          {job.experience_max_years != null ? `–${job.experience_max_years}` : "+"} years
        </p>
      ) : null}

      <article className="mt-8 whitespace-pre-wrap border border-line bg-elevated px-5 py-6 text-sm leading-relaxed">
        {job.description}
      </article>

      {applied ? (
        <p className="mt-6 border border-line bg-soft px-4 py-3 text-sm">
          You already applied. Status:{" "}
          <span className="font-semibold capitalize">{applied.replace(/_/g, " ")}</span>
          .{" "}
          <Link href="/candidate/applied" className="font-semibold text-brand">
            Track application
          </Link>
        </p>
      ) : (
        <form onSubmit={onApply} className="mt-8 space-y-3">
          {!hasResume ? (
            <p className="border border-line bg-soft px-4 py-3 text-sm text-muted">
              Upload a resume first.{" "}
              <Link href="/candidate/profile" className="font-semibold text-brand">
                Edit profile
              </Link>
            </p>
          ) : null}
          <label className="block text-sm font-medium">
            Cover letter (optional)
            <textarea
              rows={5}
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-line bg-elevated px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !hasResume}
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Apply now"}
          </button>
        </form>
      )}
    </div>
  );
}
