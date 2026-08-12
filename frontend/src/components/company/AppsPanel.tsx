"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  normalizeAppStage,
  stageLabel,
} from "@/lib/candidate";
import {
  formatEmployment,
  formatWorkMode,
  jobStatusLabel,
  listCompanyJobs,
  listJobApplicants,
  runAiScreen,
  updateApplicationStatus,
  type AiScreening,
  type CompanyJob,
  type JobApplicant,
} from "@/lib/companyJobs";
import { profileSlug } from "@/lib/user";

type Props = {
  onSchedule?: () => void;
  onEmail?: () => void;
};

const STAGE_OPTIONS = [
  "applied",
  "resume_screening",
  "shortlisted",
  "technical_interview",
  "hr_interview",
  "rejected",
] as const;

function relativeApplied(iso: string | null) {
  if (!iso) return "Applied recently";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Applied recently";
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Applied today";
  if (days === 1) return "Applied yesterday";
  if (days < 7) return `Applied ${days} days ago`;
  return `Applied ${Math.floor(days / 7)} wk ago`;
}

function SkillList({
  title,
  items,
  tone,
}: {
  title: string;
  items?: string[] | null;
  tone: "good" | "bad" | "warn";
}) {
  if (!items?.length) return null;
  const color =
    tone === "good"
      ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
      : tone === "bad"
        ? "border-red-500/30 text-red-700 dark:text-red-400"
        : "border-amber-500/30 text-amber-800 dark:text-amber-400";
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className={`rounded-md border px-2 py-0.5 text-xs font-medium ${color}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AiScreeningPanel({ screening }: { screening: AiScreening }) {
  const score =
    screening.match_percentage != null
      ? Math.round(screening.match_percentage)
      : null;
  const questionCount =
    (screening.questions?.easy?.length || 0) +
    (screening.questions?.medium?.length || 0) +
    (screening.questions?.hard?.length || 0);

  return (
    <div className="mt-4 space-y-4 border-t border-line pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">AI resume screening</p>
          <p className="mt-1 text-sm text-muted">
            {screening.recommendation ||
              "Compared this resume against the job description."}
          </p>
        </div>
        <div className="text-right">
          {score != null ? (
            <p className="font-display text-2xl font-bold text-brand">
              {score}%
            </p>
          ) : null}
          {screening.verdict ? (
            <p className="mt-0.5 text-xs font-semibold capitalize text-muted">
              Hint: {screening.verdict}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SkillList
          title="Pros / strong skills"
          items={screening.strong_skills}
          tone="good"
        />
        <SkillList
          title="Cons / missing skills"
          items={screening.missing_skills}
          tone="bad"
        />
        <SkillList
          title="Weak / unclear areas"
          items={screening.weak_areas}
          tone="warn"
        />
      </div>

      {!screening.strong_skills?.length &&
      !screening.missing_skills?.length &&
      !screening.weak_areas?.length ? (
        <p className="text-sm text-muted">
          No skill breakdown stored for this run. Click Re-run AI screen to
          refresh.
        </p>
      ) : null}

      {questionCount > 0 ? (
        <p className="text-xs text-muted">
          Interview question bank ready ({questionCount} questions across
          easy / medium / hard). Assigned interviewers can see them on their
          round.
        </p>
      ) : null}
    </div>
  );
}

function AiScreeningOverlay({ name }: { name: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm border border-line bg-elevated px-6 py-8 text-center shadow-lg">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-line border-t-brand" />
        <p className="mt-5 font-display text-lg font-bold">AI screening…</p>
        <p className="mt-2 text-sm text-muted">
          Reading {name}&apos;s resume and matching it to the job description.
          This can take a few seconds.
        </p>
      </div>
    </div>
  );
}

function ApplicantCard({
  person,
  jobTitle,
  busy,
  screeningBusy,
  onStage,
  onShortlist,
  onScreen,
  onSchedule,
  onEmail,
}: {
  person: JobApplicant;
  jobTitle: string;
  busy: boolean;
  screeningBusy: boolean;
  onStage: (status: string) => void;
  onShortlist: () => void;
  onScreen: () => void;
  onSchedule?: () => void;
  onEmail?: () => void;
}) {
  const [open, setOpen] = useState(Boolean(person.ai_screening));
  const shortlisted = String(person.status).toLowerCase() === "shortlisted";
  const hasAnswers = Boolean(
    person.how_you_fit || person.why_role || person.cover_letter,
  );
  const screening = person.ai_screening;

  useEffect(() => {
    if (screening) setOpen(true);
  }, [screening]);

  return (
    <li className="px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 gap-3">
          {person.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.profile_image_url}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
              {person.full_name.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-semibold">{person.full_name}</p>
            <p className="text-sm text-muted">
              {person.expertise}
              {jobTitle ? ` · ${jobTitle}` : ""}
            </p>
            <p className="mt-1 text-sm text-muted">
              {[
                person.location,
                person.total_experience_years != null
                  ? `${person.total_experience_years} yr exp`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Location not set"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {stageLabel(person.status)} · {relativeApplied(person.applied_at)}
            </p>
            {person.resume?.file_name ? (
              <p className="mt-1 text-xs text-muted">
                Resume: {person.resume.file_name}
              </p>
            ) : null}
            {screening?.strong_skills?.length ? (
              <p className="mt-1 text-xs text-muted">
                Pros: {screening.strong_skills.slice(0, 4).join(", ")}
                {screening.strong_skills.length > 4 ? "…" : ""}
              </p>
            ) : null}
            <label className="mt-2 block text-xs font-medium text-muted">
              Move stage
              <select
                disabled={busy || screeningBusy}
                value={normalizeAppStage(person.status || "applied")}
                onChange={(e) => onStage(e.target.value)}
                className="mt-1 w-full max-w-xs rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink"
              >
                {STAGE_OPTIONS.map((stage) => (
                  <option key={stage} value={stage}>
                    {stageLabel(stage)}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || screeningBusy}
                onClick={onShortlist}
                className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft disabled:opacity-60"
              >
                {shortlisted ? "Shortlisted" : "Shortlist"}
              </button>
              <button
                type="button"
                disabled={busy || screeningBusy}
                onClick={onScreen}
                className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft disabled:opacity-60"
              >
                {screeningBusy
                  ? "Screening…"
                  : screening
                    ? "Re-run AI screen"
                    : "Run AI screen"}
              </button>
              <button
                type="button"
                onClick={onSchedule}
                className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
              >
                Interview
              </button>
              <button
                type="button"
                onClick={onEmail}
                className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
              >
                Email
              </button>
              <Link
                href={`/u/${profileSlug(person.full_name)}-${person.candidate_id}`}
                className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
              >
                Profile
              </Link>
              {hasAnswers || screening ? (
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                >
                  {open ? "Hide details" : "View details"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <span className="text-sm font-semibold text-brand">
          {person.match_score != null
            ? `${Math.round(person.match_score)}% match`
            : "—"}
        </span>
      </div>

      {open && screening ? <AiScreeningPanel screening={screening} /> : null}

      {open ? (
        <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
          {person.how_you_fit ? (
            <div>
              <p className="font-semibold">How they fit</p>
              <p className="mt-1 whitespace-pre-wrap text-muted">
                {person.how_you_fit}
              </p>
            </div>
          ) : null}
          {person.why_role ? (
            <div>
              <p className="font-semibold">Why this role</p>
              <p className="mt-1 whitespace-pre-wrap text-muted">
                {person.why_role}
              </p>
            </div>
          ) : null}
          {!person.how_you_fit && !person.why_role && person.cover_letter ? (
            <div>
              <p className="font-semibold">Application note</p>
              <p className="mt-1 whitespace-pre-wrap text-muted">
                {person.cover_letter}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function AppsPanel({ onSchedule, onEmail }: Props) {
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [applicants, setApplicants] = useState<JobApplicant[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [screeningId, setScreeningId] = useState<number | null>(null);

  const screeningPerson =
    screeningId == null
      ? null
      : applicants.find((a) => a.application_id === screeningId) || null;

  const loadJobs = useCallback(async () => {
    try {
      setError("");
      setJobs(await listCompanyJobs());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  async function openApplicants(job: CompanyJob) {
    setSelectedJobId(job.id);
    setJobTitle(job.title);
    setAppsLoading(true);
    setError("");
    try {
      const data = await listJobApplicants(job.id);
      setApplicants(data.applicants);
      setJobTitle(data.job.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load applicants.");
      setApplicants([]);
    } finally {
      setAppsLoading(false);
    }
  }

  async function setStage(person: JobApplicant, status: string) {
    setBusyId(person.application_id);
    setError("");
    try {
      const updated = await updateApplicationStatus(
        person.application_id,
        status,
      );
      setApplicants((prev) =>
        prev.map((row) =>
          row.application_id === person.application_id
            ? { ...row, status: updated.status }
            : row,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update stage.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function shortlist(person: JobApplicant) {
    const next =
      String(person.status).toLowerCase() === "shortlisted"
        ? "applied"
        : "shortlisted";
    await setStage(person, next);
  }

  async function screen(person: JobApplicant) {
    setScreeningId(person.application_id);
    setError("");
    try {
      const updated = await runAiScreen(person.application_id);
      setApplicants((prev) =>
        prev.map((row) =>
          row.application_id === person.application_id
            ? {
                ...row,
                status: updated.status,
                match_score: updated.match_score,
                ai_screening: updated.ai_screening ?? row.ai_screening,
              }
            : row,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not run AI screening.",
      );
    } finally {
      setScreeningId(null);
    }
  }

  if (selectedJobId != null) {
    return (
      <section>
        {screeningPerson ? (
          <AiScreeningOverlay name={screeningPerson.full_name} />
        ) : null}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => {
                setSelectedJobId(null);
                setApplicants([]);
              }}
              className="text-sm font-semibold text-brand hover:underline"
            >
              ← All jobs
            </button>
            <h2 className="mt-2 font-display text-xl font-bold">Applicants</h2>
            <p className="mt-1 text-sm text-muted">
              Everyone who applied to {jobTitle || "this job"}. Move stages as
              you screen.
            </p>
          </div>
        </div>

        {error ? (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {appsLoading ? (
          <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
            Loading applicants…
          </p>
        ) : applicants.length === 0 ? (
          <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
            No one has applied to this job yet.
          </p>
        ) : (
          <ul className="divide-y divide-line border border-line bg-elevated">
            {applicants.map((person) => (
              <ApplicantCard
                key={person.application_id}
                person={person}
                jobTitle={jobTitle}
                busy={busyId === person.application_id}
                screeningBusy={screeningId === person.application_id}
                onStage={(status) => setStage(person, status)}
                onShortlist={() => shortlist(person)}
                onScreen={() => screen(person)}
                onSchedule={onSchedule}
                onEmail={onEmail}
              />
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold">Applications</h2>
        <p className="mt-1 text-sm text-muted">
          Pick a job to see who applied.
        </p>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
          Loading jobs…
        </p>
      ) : jobs.length === 0 ? (
        <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
          No jobs yet. Post a job first, then applicants will show up here.
        </p>
      ) : (
        <ul className="divide-y divide-line border border-line bg-elevated">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-4 px-5 py-5"
            >
              <div className="min-w-0">
                <p className="font-semibold">{job.title}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {[
                    job.department,
                    job.location,
                    formatWorkMode(job.work_mode),
                    formatEmployment(job.employment_type),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {jobStatusLabel(job.status)} · {job.applicants_count ?? 0}{" "}
                  applicant{(job.applicants_count ?? 0) === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openApplicants(job)}
                className="shrink-0 rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:bg-soft"
              >
                View applicants
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
