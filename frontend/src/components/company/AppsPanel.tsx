"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApplicationAssessmentScores } from "@/components/company/ApplicationAssessmentScores";
import { ApplicationMessageThread } from "@/components/company/ApplicationMessageThread";
import { CandidateMessageModal } from "@/components/company/CandidateMessageModal";
import {
  normalizeAppStage,
  stageLabel,
} from "@/lib/candidate";
import { getCompanyWorkspace } from "@/lib/company";
import {
  formatEmployment,
  formatWorkMode,
  getApplicationResume,
  jobStatusLabel,
  listCompanyJobs,
  listJobApplicants,
  runAiScreen,
  updateApplicationStatus,
  type AiScreening,
  type CompanyJob,
  type JobApplicant,
} from "@/lib/companyJobs";
import type { MessageKind } from "@/lib/candidateMessages";
import { profileSlug } from "@/lib/user";

type Props = {
  onSchedule?: () => void;
  onEmail?: (applicationId?: number) => void;
  onTests?: () => void;
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
  const questionCount =
    (screening.questions?.easy?.length || 0) +
    (screening.questions?.medium?.length || 0) +
    (screening.questions?.hard?.length || 0);
  const hasBreakdown =
    screening.resume_score != null ||
    screening.fit_score != null ||
    screening.why_score != null;

  return (
    <div className="mt-4 space-y-4 border-t border-line pt-4">
      <div>
        <p className="font-semibold">AI resume screening</p>
        <p className="mt-1 text-sm text-muted">
          {screening.recommendation ||
            "Score out of 100: 90% resume, 5% how they fit, 5% why this role."}
        </p>
        {screening.verdict ? (
          <p className="mt-1 text-xs font-semibold capitalize text-muted">
            Hint: {screening.verdict}
          </p>
        ) : null}
      </div>

      {hasBreakdown ? (
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-md border border-line bg-soft/40 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Resume ({screening.weights?.resume ?? 90}%)
            </p>
            <p className="mt-0.5 font-semibold">
              {screening.resume_score != null
                ? `${Math.round(screening.resume_score)}/100`
                : "—"}
            </p>
          </li>
          <li className="rounded-md border border-line bg-soft/40 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              How they fit ({screening.weights?.fit ?? 5}%)
            </p>
            <p className="mt-0.5 font-semibold">
              {screening.fit_score != null
                ? `${Math.round(screening.fit_score)}/100`
                : "—"}
            </p>
          </li>
          <li className="rounded-md border border-line bg-soft/40 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Why this role ({screening.weights?.why ?? 5}%)
            </p>
            <p className="mt-0.5 font-semibold">
              {screening.why_score != null
                ? `${Math.round(screening.why_score)}/100`
                : "—"}
            </p>
          </li>
        </ul>
      ) : null}

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

      {screening.summary ? (
        <div className="rounded-md border border-line bg-soft/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            AI resume summary
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
            {screening.summary}
          </p>
          <p className="mt-2 text-xs text-muted">
            Written so a hiring manager can decide without opening the file.
          </p>
        </div>
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
          Reading {name}&apos;s resume plus how they fit and why this role,
          then scoring out of 100. This can take a few seconds.
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
  onTests,
}: {
  person: JobApplicant;
  jobTitle: string;
  busy: boolean;
  screeningBusy: boolean;
  onStage: (status: string) => void;
  onShortlist: () => void;
  onScreen: () => void;
  onSchedule?: () => void;
  onEmail?: (applicationId?: number) => void;
  onTests?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const shortlisted = String(person.status).toLowerCase() === "shortlisted";
  const hasAnswers = Boolean(
    person.how_you_fit || person.why_role || person.cover_letter,
  );
  const screening = person.ai_screening;
  const hasResume = Boolean(person.resume?.id || person.resume?.file_url);
  const canViewDetails = Boolean(hasAnswers || screening || hasResume);

  async function openResume() {
    setResumeError("");
    if (person.resume?.file_url?.startsWith("http")) {
      window.open(person.resume.file_url, "_blank", "noopener,noreferrer");
      return;
    }
    setResumeBusy(true);
    try {
      const data = await getApplicationResume(person.application_id);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setResumeError(
        err instanceof Error ? err.message : "Could not open resume.",
      );
    } finally {
      setResumeBusy(false);
    }
  }

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
                Resume on file: {person.resume.file_name}
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
              {onTests ? (
                <button
                  type="button"
                  onClick={onTests}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                >
                  Assign test
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onEmail?.(person.application_id)}
                className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
              >
                Message
              </button>
              <Link
                href={`/u/${profileSlug(person.full_name)}-${person.candidate_id}`}
                className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
              >
                Profile
              </Link>
              {hasResume ? (
                <button
                  type="button"
                  disabled={resumeBusy}
                  onClick={openResume}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft disabled:opacity-60"
                >
                  {resumeBusy ? "Opening…" : "View resume"}
                </button>
              ) : null}
            </div>
            {resumeError ? (
              <p className="mt-2 text-xs text-red-600">{resumeError}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="font-display text-2xl font-bold leading-none text-brand">
            {person.match_score != null
              ? `${Math.round(person.match_score)}/100`
              : "—"}
          </p>
          <p className="text-xs font-medium text-muted">Match score</p>
          <button
            type="button"
            disabled={busy || screeningBusy}
            onClick={onShortlist}
            className={`min-w-[8.5rem] rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
              shortlisted
                ? "bg-brand text-white hover:bg-brand-deep"
                : "border-2 border-brand bg-brand/10 text-brand hover:bg-brand hover:text-white"
            }`}
          >
            {shortlisted ? "Shortlisted" : "Shortlist"}
          </button>
        </div>
      </div>

      {canViewDetails ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`mt-3 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
            open
              ? "border border-line bg-soft hover:bg-elevated"
              : "bg-brand text-white hover:bg-brand-deep"
          }`}
        >
          {open ? "Hide details" : "View details"}
          <span className="text-xs leading-none" aria-hidden>
            {open ? "▴" : "▾"}
          </span>
        </button>
      ) : null}

      {open && screening ? <AiScreeningPanel screening={screening} /> : null}

      {open ? (
        <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
          <ApplicationAssessmentScores applicationId={person.application_id} />
          {hasResume ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">Resume</p>
                <p className="mt-0.5 text-muted">
                  {person.resume?.file_name || "Uploaded resume"}
                </p>
              </div>
              <button
                type="button"
                disabled={resumeBusy}
                onClick={openResume}
                className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-soft disabled:opacity-60"
              >
                {resumeBusy ? "Opening…" : "Open resume"}
              </button>
            </div>
          ) : (
            <p className="text-muted">No resume on this application.</p>
          )}
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
          <ApplicationMessageThread applicationId={person.application_id} />
        </div>
      ) : null}
    </li>
  );
}

export function AppsPanel({ onSchedule, onEmail, onTests }: Props) {
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [applicants, setApplicants] = useState<JobApplicant[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [screeningId, setScreeningId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState("Company");
  const [pendingMsg, setPendingMsg] = useState<{
    person: JobApplicant;
    kind: Extract<MessageKind, "shortlisted" | "rejected">;
    nextStatus: string;
  } | null>(null);

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
    getCompanyWorkspace()
      .then((ws) => setCompanyName(ws.company.name || "Company"))
      .catch(() => {});
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

  async function applyStage(person: JobApplicant, status: string) {
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

  async function setStage(person: JobApplicant, status: string) {
    if (status === "rejected") {
      setPendingMsg({ person, kind: "rejected", nextStatus: "rejected" });
      return;
    }
    if (
      status === "shortlisted" &&
      String(person.status).toLowerCase() !== "shortlisted"
    ) {
      setPendingMsg({ person, kind: "shortlisted", nextStatus: "shortlisted" });
      return;
    }
    await applyStage(person, status);
  }

  async function shortlist(person: JobApplicant) {
    if (String(person.status).toLowerCase() === "shortlisted") {
      await applyStage(person, "applied");
      return;
    }
    setPendingMsg({ person, kind: "shortlisted", nextStatus: "shortlisted" });
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

  async function finishPending(sendDone: boolean) {
    if (!pendingMsg) return;
    await applyStage(pendingMsg.person, pendingMsg.nextStatus);
    setPendingMsg(null);
    if (sendDone) {
      setError("");
    }
  }

  if (selectedJobId != null) {
    return (
      <section>
        {screeningPerson ? (
          <AiScreeningOverlay name={screeningPerson.full_name} />
        ) : null}
        {pendingMsg ? (
          <CandidateMessageModal
            open
            applicationId={pendingMsg.person.application_id}
            candidateName={pendingMsg.person.full_name}
            kind={pendingMsg.kind}
            vars={{
              name: pendingMsg.person.full_name,
              job: jobTitle,
              company: companyName,
            }}
            busy={busyId === pendingMsg.person.application_id}
            onClose={() => setPendingMsg(null)}
            onSent={() => finishPending(true)}
            onSkip={() => finishPending(false)}
          />
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
                onTests={onTests}
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
