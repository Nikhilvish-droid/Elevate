"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DocumentUpload } from "@/components/Auth";
import {
  applyToJob,
  formatEmployment,
  formatPay,
  formatPostedAt,
  formatWorkMode,
  getCandidateFull,
  getMyApplicationForJob,
  getPublishedJob,
  parseSkillList,
  type CandidateFull,
  type JobRow,
} from "@/lib/candidate";
import { uploadResume } from "@/lib/storage";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [job, setJob] = useState<JobRow | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  const [fit, setFit] = useState("");
  const [why, setWhy] = useState("");
  const [resumes, setResumes] = useState<CandidateFull["resumes"]>([]);
  const [resumeId, setResumeId] = useState<number | "">("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
        if (cand) {
          setResumes(cand.resumes || []);
          const primary =
            cand.resumes.find((r) => r.is_primary) || cand.resumes[0];
          if (primary) setResumeId(primary.id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load job.");
      }
    })();
  }, [id]);

  async function onApply(e: FormEvent) {
    e.preventDefault();
    if (fit.trim().length < 20) {
      setError("Describe how you fit this role (at least 20 characters).");
      return;
    }
    if (why.trim().length < 20) {
      setError("Explain why you want this role (at least 20 characters).");
      return;
    }
    if (!resumeFile && !resumeId) {
      setError("Add your latest resume before applying.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const uploaded = resumeFile ? await uploadResume(resumeFile) : null;
      await applyToJob(id, {
        fit: fit.trim(),
        why: why.trim(),
        resume_id: uploaded ? null : Number(resumeId) || null,
        resume: uploaded,
      });
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
        <Link href="/candidate/jobs" className="text-brand">
          Back to jobs
        </Link>
      </p>
    );
  }

  const skills = parseSkillList(job.required_skills);
  const posted = formatPostedAt(job.created_at);
  const companyAbout =
    job.company_details ||
    job.companies?.description ||
    null;
  const deadline = job.application_deadline
    ? new Date(job.application_deadline).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/candidate/jobs" className="text-sm text-muted hover:text-ink">
        ← Jobs
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
        {job.title}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {job.companies?.name ?? "Company"}
        {job.companies?.industry ? ` · ${job.companies.industry}` : ""}
        {" · "}
        {job.location ?? "Location TBD"} · {formatWorkMode(job.work_mode)} ·{" "}
        {formatEmployment(job.employment_type)}
      </p>
      <p className="mt-2 text-sm font-medium">
        {formatPay(job.salary_min, job.salary_max)}
      </p>
      {job.department ? (
        <p className="mt-1 text-sm text-muted">Department: {job.department}</p>
      ) : null}
      {job.experience_min_years != null ? (
        <p className="mt-1 text-sm text-muted">
          Experience: {job.experience_min_years}
          {job.experience_max_years != null
            ? `–${job.experience_max_years}`
            : "+"}{" "}
          years
        </p>
      ) : null}
      {posted ? <p className="mt-1 text-sm text-muted">{posted}</p> : null}
      {deadline ? (
        <p className="mt-1 text-sm text-muted">Apply by {deadline}</p>
      ) : null}

      {skills.length ? (
        <div className="mt-6">
          <h2 className="text-sm font-semibold">Skills required</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-md border border-line bg-elevated px-2.5 py-1 text-xs font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <article className="mt-8 whitespace-pre-wrap border border-line bg-elevated px-5 py-6 text-sm leading-relaxed">
        <h2 className="mb-3 text-sm font-semibold">Job description</h2>
        {job.description}
      </article>

      {companyAbout ? (
        <article className="mt-5 whitespace-pre-wrap border border-line bg-elevated px-5 py-6 text-sm leading-relaxed">
          <h2 className="mb-3 text-sm font-semibold">About the company</h2>
          <p className="font-medium">{job.companies?.name ?? "Company"}</p>
          {job.companies?.website_url ? (
            <a
              href={
                job.companies.website_url.startsWith("http")
                  ? job.companies.website_url
                  : `https://${job.companies.website_url}`
              }
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm font-semibold text-brand hover:underline"
            >
              {job.companies.website_url}
            </a>
          ) : null}
          <p className="mt-3 text-muted">{companyAbout}</p>
        </article>
      ) : job.companies?.name ? (
        <article className="mt-5 border border-line bg-elevated px-5 py-6 text-sm">
          <h2 className="mb-2 text-sm font-semibold">About the company</h2>
          <p className="font-medium">{job.companies.name}</p>
          {job.companies.industry ? (
            <p className="mt-1 text-muted">{job.companies.industry}</p>
          ) : null}
        </article>
      ) : null}

      {applied ? (
        <p className="mt-6 border border-line bg-soft px-4 py-3 text-sm">
          You already applied. Status:{" "}
          <span className="font-semibold capitalize">
            {applied.replace(/_/g, " ")}
          </span>
          .{" "}
          <Link href="/candidate/applied" className="font-semibold text-brand">
            Track application
          </Link>
        </p>
      ) : (
        <form onSubmit={onApply} className="mt-8 space-y-5 border border-line bg-elevated px-5 py-6">
          <div>
            <h2 className="font-display text-lg font-bold">Apply to this role</h2>
            <p className="mt-1 text-sm text-muted">
              Attach your latest resume and tell us how you fit and why you want
              this post.
            </p>
          </div>

          {resumes.length ? (
            <label className="block text-sm font-medium">
              Choose an existing resume
              <select
                value={resumeFile ? "" : resumeId}
                disabled={Boolean(resumeFile)}
                onChange={(e) =>
                  setResumeId(e.target.value ? Number(e.target.value) : "")
                }
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand disabled:opacity-60"
              >
                <option value="">Select resume</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.file_name}
                    {r.is_primary ? " (primary)" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <DocumentUpload
            label={resumes.length ? "Or upload your latest resume" : "Latest resume"}
            hint="PDF or DOCX · up to 10 MB · required"
            file={resumeFile}
            onChange={(file) => {
              setResumeFile(file);
              if (file) setResumeId("");
            }}
          />

          <label className="block text-sm font-medium">
            How do you fit this role?
            <textarea
              required
              rows={4}
              value={fit}
              onChange={(e) => setFit(e.target.value)}
              placeholder="Skills, projects, or experience that match this job…"
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>

          <label className="block text-sm font-medium">
            Why do you want this role?
            <textarea
              required
              rows={4}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="What interests you about this company and post…"
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Submit application"}
          </button>
        </form>
      )}
    </div>
  );
}
