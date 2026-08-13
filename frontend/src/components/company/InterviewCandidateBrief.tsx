"use client";

import Link from "next/link";
import { useState } from "react";
import {
  getApplicationResume,
  type AssignedInterview,
} from "@/lib/companyJobs";
import { profileSlug } from "@/lib/user";

function meetHref(link?: string | null) {
  const value = String(link || "").trim();
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function JoinMeetingButton({
  href,
  className = "",
}: {
  href: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep ${className}`}
    >
      Join meeting
    </a>
  );
}

export function QuestionBank({
  questions,
}: {
  questions?: AssignedInterview["screening_questions"] | null;
}) {
  if (
    !questions ||
    !(questions.easy?.length || questions.medium?.length || questions.hard?.length)
  ) {
    return null;
  }

  return (
    <div className="border border-line bg-surface px-4 py-3 text-sm">
      <p className="font-semibold">Question bank</p>
      <p className="mt-1 text-xs text-muted">
        Suggested prompts for this round. Use them after you review the candidate.
      </p>
      {(
        [
          ["Easy", questions.easy],
          ["Medium", questions.medium],
          ["Hard", questions.hard],
        ] as const
      ).map(([label, list]) =>
        list?.length ? (
          <div key={label} className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {label}
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
              {list.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </div>
  );
}

export function InterviewCandidateBrief({
  item,
  showQuestions = true,
}: {
  item: AssignedInterview;
  showQuestions?: boolean;
}) {
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const screening = item.ai_screening;
  const skills = item.skills || [];
  const strong = screening?.strong_skills || item.match_summary?.strong_skills || [];
  const missing =
    screening?.missing_skills || item.match_summary?.missing_skills || [];
  const weak = screening?.weak_areas || [];
  const questions = item.screening_questions || screening?.questions || null;
  const match =
    item.match_score ??
    item.match_summary?.match_percentage ??
    screening?.match_percentage ??
    null;
  const hasResume = Boolean(item.resume?.id || item.resume?.file_url);

  async function openResume() {
    setResumeError("");
    if (item.resume?.file_url?.startsWith("http")) {
      window.open(item.resume.file_url, "_blank", "noopener,noreferrer");
      return;
    }
    setResumeBusy(true);
    try {
      const data = await getApplicationResume(item.application_id);
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          {item.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.profile_image_url}
              alt=""
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
              {item.candidate_name.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-semibold">{item.candidate_name}</p>
            <p className="text-sm text-muted">
              {[item.expertise, item.job_title].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-1 text-sm text-muted">
              {[
                item.candidate_location,
                item.total_experience_years != null
                  ? `${item.total_experience_years} yr exp`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Location not set"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold leading-none text-brand">
            {match != null ? `${Math.round(match)}/100` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted">Match score</p>
        </div>
      </div>

      {skills.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Skills
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <li
                key={skill}
                className="rounded-md border border-line px-2 py-0.5 text-xs font-medium"
              >
                {skill}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {item.professional_summary ? (
        <div>
          <p className="font-semibold">Summary</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
            {item.professional_summary}
          </p>
        </div>
      ) : null}

      {screening?.recommendation || item.match_summary?.recommendation ? (
        <p className="text-sm text-muted">
          AI note:{" "}
          {screening?.recommendation || item.match_summary?.recommendation}
          {match != null ? ` (${Math.round(match)}% match)` : ""}
        </p>
      ) : null}

      {strong.length || missing.length || weak.length ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {strong.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Strong skills
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {strong.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-md border border-emerald-500/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {missing.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Missing skills
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {missing.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-md border border-red-500/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {weak.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Weak / unclear
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {weak.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-md border border-amber-500/30 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-400"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {screening?.summary ? (
        <div className="rounded-md border border-line bg-soft/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            AI resume summary
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
            {screening.summary}
          </p>
        </div>
      ) : null}

      {item.how_you_fit ? (
        <div>
          <p className="font-semibold">How they fit</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
            {item.how_you_fit}
          </p>
        </div>
      ) : null}
      {item.why_role ? (
        <div>
          <p className="font-semibold">Why this role</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
            {item.why_role}
          </p>
        </div>
      ) : null}
      {!item.how_you_fit && !item.why_role && item.cover_letter ? (
        <div>
          <p className="font-semibold">Application note</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
            {item.cover_letter}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">Resume</p>
          <p className="mt-0.5 text-sm text-muted">
            {hasResume
              ? item.resume?.file_name || "Uploaded resume"
              : "No resume on this application."}
          </p>
          {resumeError ? (
            <p className="mt-1 text-xs text-red-600">{resumeError}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {item.candidate_id ? (
            <Link
              href={`/u/${profileSlug(item.candidate_name)}-${item.candidate_id}`}
              className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-soft"
            >
              Open profile
            </Link>
          ) : null}
          {hasResume ? (
            <button
              type="button"
              disabled={resumeBusy}
              onClick={openResume}
              className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-soft disabled:opacity-60"
            >
              {resumeBusy ? "Opening…" : "View resume"}
            </button>
          ) : null}
        </div>
      </div>

      {showQuestions ? <QuestionBank questions={questions} /> : null}
    </div>
  );
}

export { meetHref };
