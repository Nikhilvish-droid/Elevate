"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getPublicCandidate,
  type PublicCandidate,
} from "@/lib/candidate";
import {
  getApplicationResume,
  type AssignedInterview,
} from "@/lib/companyJobs";
import { profileSlug } from "@/lib/user";
import { ApplicationAssessmentScores } from "@/components/company/ApplicationAssessmentScores";

function meetHref(link?: string | null) {
  const value = String(link || "").trim();
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function monthYear(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 7);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function dateRange(start: string | null, end: string | null, current?: boolean) {
  const from = monthYear(start) || "—";
  if (current) return `${from} – Present`;
  return `${from} – ${monthYear(end) || "—"}`;
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

function ProfileDossier({ profile }: { profile: PublicCandidate }) {
  const skillTags = (profile.skills || [])
    .filter((s) => s.category !== "desired_role")
    .map((s) => s.name);
  const openTo = (profile.skills || [])
    .filter((s) => s.category === "desired_role")
    .map((s) => s.name);

  return (
    <div className="space-y-4 border-t border-line pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Full profile
      </p>

      {profile.professional_summary ? (
        <div>
          <p className="font-semibold">About</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
            {profile.professional_summary}
          </p>
        </div>
      ) : null}

      {openTo.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Open to
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {openTo.map((role) => (
              <li
                key={role}
                className="rounded-md bg-soft px-2 py-0.5 text-xs font-semibold text-brand"
              >
                {role}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {skillTags.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Skills
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {skillTags.map((skill) => (
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

      <div>
        <p className="font-semibold">Experience</p>
        {profile.experience?.length ? (
          <ul className="mt-2 space-y-3">
            {profile.experience.map((exp) => (
              <li key={exp.id} className="text-sm">
                <p className="font-medium">{exp.job_title}</p>
                <p className="text-muted">
                  {exp.company_name}
                  {exp.employment_type ? ` · ${exp.employment_type}` : ""}
                  {exp.location ? ` · ${exp.location}` : ""}
                </p>
                <p className="text-xs text-muted">
                  {dateRange(exp.start_date, exp.end_date, exp.is_current)}
                </p>
                {exp.description ? (
                  <p className="mt-1 whitespace-pre-wrap text-muted">
                    {exp.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">No experience listed.</p>
        )}
      </div>

      <div>
        <p className="font-semibold">Education</p>
        {profile.education?.length ? (
          <ul className="mt-2 space-y-3">
            {profile.education.map((edu) => (
              <li key={edu.id} className="text-sm">
                <p className="font-medium">{edu.institution_name}</p>
                <p className="text-muted">
                  {[edu.degree, edu.field_of_study].filter(Boolean).join(" · ") ||
                    "Program not listed"}
                </p>
                <p className="text-xs text-muted">
                  {dateRange(edu.start_date, edu.end_date)}
                  {edu.grade ? ` · ${edu.grade}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">No education listed.</p>
        )}
      </div>

      <div>
        <p className="font-semibold">Certifications</p>
        {profile.certifications?.length ? (
          <ul className="mt-2 space-y-2 text-sm">
            {profile.certifications.map((c, i) => (
              <li
                key={`${c.certification_name}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  {c.certification_name}
                  {c.issuing_organization
                    ? ` · ${c.issuing_organization}`
                    : ""}
                </span>
                {c.file_url || c.credential_url ? (
                  <a
                    href={c.file_url || c.credential_url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand hover:underline"
                  >
                    View
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">No certifications listed.</p>
        )}
      </div>

      {profile.resumes?.length ? (
        <div>
          <p className="font-semibold">Resumes on profile</p>
          <ul className="mt-2 space-y-2 text-sm">
            {profile.resumes.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  {r.file_name}
                  {r.is_primary ? " (primary)" : ""}
                </span>
                {r.file_url ? (
                  <a
                    href={r.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand hover:underline"
                  >
                    View resume
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
  const [dossier, setDossier] = useState<PublicCandidate | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
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

  useEffect(() => {
    if (!item.candidate_id) {
      setDossier(null);
      return;
    }
    let cancelled = false;
    setDossierLoading(true);
    getPublicCandidate(item.candidate_id)
      .then((profile) => {
        if (!cancelled) setDossier(profile);
      })
      .finally(() => {
        if (!cancelled) setDossierLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item.candidate_id]);

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

      <ApplicationAssessmentScores applicationId={item.application_id} />

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

      {dossierLoading ? (
        <p className="border-t border-line pt-4 text-sm text-muted">
          Loading full profile…
        </p>
      ) : dossier ? (
        <ProfileDossier profile={dossier} />
      ) : null}

      {showQuestions ? <QuestionBank questions={questions} /> : null}
    </div>
  );
}

export { meetHref };
