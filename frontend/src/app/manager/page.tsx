"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashShell,
  IconChart,
  IconHome,
  IconMsg,
  IconStar,
} from "@/components/DashShell";
import { ApplicationMessageThread } from "@/components/company/ApplicationMessageThread";
import { CandidateMessageModal } from "@/components/company/CandidateMessageModal";
import { CompanyDashboardPanel } from "@/components/company/CompanyDashboard";
import { CompanyInboxNote } from "@/components/company/CompanyInboxNote";
import { InterviewCandidateBrief } from "@/components/company/InterviewCandidateBrief";
import { BackToJobs, JobPickList } from "@/components/company/JobPickList";
import { normalizeAppStage, stageLabel } from "@/lib/candidate";
import {
  approveApplication,
  countLabel,
  groupApplicantsByJob,
  isApprovedOrHired,
  isPendingReview,
  isRejectedApplicant,
  listApplicationFeedback,
  listCompanyJobs,
  listJobApplicants,
  listPipelineApplicants,
  rejectApplication,
  type ApplicationFeedbackRow,
  type AssignedInterview,
  type CompanyJob,
  type JobApplicant,
  type PipelineApplicant,
} from "@/lib/companyJobs";
import { getCompanyWorkspace } from "@/lib/company";
import type { MessageKind } from "@/lib/candidateMessages";
import { Profile, getProfile } from "@/lib/profile";
import { profileSlug } from "@/lib/user";

type View = "home" | "shortlist" | "feedback" | "analytics";

function formatCtc(min: number | null, max: number | null) {
  if (min == null && max == null) return null;
  const fmt = (n: number) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
      : `₹${n.toLocaleString("en-IN")}`;
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}`;
  return fmt((min ?? max)!);
}

function scoreLine(row: ApplicationFeedbackRow) {
  const parts = [
    row.technical != null ? `Tech ${row.technical}` : null,
    row.communication != null ? `Comm ${row.communication}` : null,
    row.problem_solving != null ? `PS ${row.problem_solving}` : null,
    row.teamwork != null ? `Team ${row.teamwork}` : null,
    row.leadership != null ? `Lead ${row.leadership}` : null,
    row.overall != null ? `Overall ${row.overall}` : null,
  ].filter(Boolean);
  return parts.join(" · ") || "Scores pending";
}

function applicantToBrief(
  person: JobApplicant,
  jobTitle: string,
): AssignedInterview {
  return {
    id: person.application_id,
    interview_type: person.status,
    scheduled_at: person.applied_at || new Date().toISOString(),
    duration_minutes: 0,
    meeting_link: null,
    location: person.location,
    status: person.status,
    application_id: person.application_id,
    candidate_name: person.full_name,
    candidate_id: person.candidate_id,
    profile_image_url: person.profile_image_url,
    candidate_location: person.location,
    expertise: person.expertise,
    skills: person.skills,
    total_experience_years: person.total_experience_years,
    how_you_fit: person.how_you_fit,
    why_role: person.why_role,
    cover_letter: person.cover_letter,
    match_score: person.match_score,
    job_title: jobTitle,
    company_name: null,
    ai_screening: person.ai_screening,
    resume: person.resume,
    screening_questions: null,
    match_summary: person.ai_screening
      ? {
          match_percentage:
            person.ai_screening.match_percentage ?? person.match_score,
          strong_skills: person.ai_screening.strong_skills || [],
          missing_skills: person.ai_screening.missing_skills || [],
          recommendation: person.ai_screening.recommendation || null,
        }
      : null,
    feedback: null,
  };
}

export default function ManagerPage() {
  const [user, setLocal] = useState<Profile | null>(null);
  const [companyName, setCompanyName] = useState("Your company");
  const [view, setView] = useState<View>("home");
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [pipeline, setPipeline] = useState<PipelineApplicant[]>([]);
  const [jobApplicants, setJobApplicants] = useState<JobApplicant[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [detailApplicant, setDetailApplicant] = useState<JobApplicant | null>(
    null,
  );
  const [feedbackPersonId, setFeedbackPersonId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<ApplicationFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingMsg, setPendingMsg] = useState<{
    person: PipelineApplicant;
    kind: Extract<MessageKind, "approved" | "rejected">;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const [jobList, rows] = await Promise.all([
        listCompanyJobs().catch(() => [] as CompanyJob[]),
        listPipelineApplicants(),
      ]);
      setJobs(jobList);
      setPipeline(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load pipeline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getProfile().then(setLocal);
    getCompanyWorkspace()
      .then((ws) => setCompanyName(ws.company.name || "Your company"))
      .catch(() => {});
    load();
  }, [load]);

  const pending = useMemo(
    () => pipeline.filter((row) => isPendingReview(row)),
    [pipeline],
  );
  const approved = useMemo(
    () => pipeline.filter((row) => isApprovedOrHired(row)),
    [pipeline],
  );
  const rejected = useMemo(
    () => pipeline.filter((row) => isRejectedApplicant(row)),
    [pipeline],
  );
  const reviewable = useMemo(
    () => [...pending, ...approved],
    [pending, approved],
  );

  const jobsFromPipeline = useMemo(
    () => groupApplicantsByJob(pipeline),
    [pipeline],
  );
  const jobOptions = useMemo(() => {
    if (jobs.length) {
      return jobs.map((job) => ({
        id: job.id,
        title: job.title,
        location: job.location,
      }));
    }
    return jobsFromPipeline.map((job) => ({
      id: job.id,
      title: job.title,
      location: job.location,
    }));
  }, [jobs, jobsFromPipeline]);

  const activeJob =
    selectedJobId == null
      ? null
      : jobOptions.find((job) => job.id === selectedJobId) ?? null;
  const pendingForJob = pending.filter((row) => row.job.id === selectedJobId);
  const reviewableForJob = reviewable.filter(
    (row) => row.job.id === selectedJobId,
  );
  const feedbackPerson =
    feedbackPersonId == null
      ? null
      : reviewable.find((row) => row.application_id === feedbackPersonId) ??
        null;

  useEffect(() => {
    if (feedbackPersonId == null) {
      setFeedback([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setFeedbackLoading(true);
      try {
        const data = await listApplicationFeedback(feedbackPersonId);
        if (!cancelled) setFeedback(data);
      } catch {
        if (!cancelled) setFeedback([]);
      } finally {
        if (!cancelled) setFeedbackLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [feedbackPersonId]);

  const name = user?.full_name ?? "Hiring Manager";

  function resetDrilldown() {
    setSelectedJobId(null);
    setDetailApplicant(null);
    setFeedbackPersonId(null);
    setJobApplicants([]);
  }

  function go(next: View) {
    setView(next);
    resetDrilldown();
    setError("");
    setMessage("");
  }

  async function openShortlistJob(id: number) {
    setSelectedJobId(id);
    setDetailApplicant(null);
    setAppsLoading(true);
    setError("");
    try {
      const data = await listJobApplicants(id);
      setJobApplicants(data.applicants);
    } catch (err) {
      setJobApplicants([]);
      setError(
        err instanceof Error ? err.message : "Could not load candidates.",
      );
    } finally {
      setAppsLoading(false);
    }
  }

  const shortlistPeople = useMemo(() => {
    const pendingIds = new Set(pendingForJob.map((row) => row.application_id));
    if (!jobApplicants.length) {
      return pendingForJob.map((row) => ({
        application_id: row.application_id,
        candidate_id: row.candidate_id,
        full_name: row.full_name,
        profile_image_url: row.profile_image_url,
        expertise: row.job.title,
        location: row.location,
        total_experience_years: null,
        skills: [] as string[],
        status: row.status,
        match_score: row.match_score,
        applied_at: row.applied_at,
        cover_letter: row.cover_letter || null,
        how_you_fit: row.how_you_fit,
        why_role: row.why_role,
        ai_screening: row.ai_screening,
        resume: null,
      })) satisfies JobApplicant[];
    }
    return jobApplicants.filter((person) => {
      if (pendingIds.has(person.application_id)) return true;
      const stage = normalizeAppStage(person.status);
      return (
        ["shortlisted", "technical_interview", "hr_interview"].includes(stage) &&
        !isApprovedOrHired(
          pipeline.find((row) => row.application_id === person.application_id) ||
            person,
        )
      );
    });
  }, [jobApplicants, pendingForJob, pipeline]);

  async function onApprove(person: PipelineApplicant) {
    setPendingMsg({ person, kind: "approved" });
  }

  async function onReject(person: PipelineApplicant) {
    setPendingMsg({ person, kind: "rejected" });
  }

  async function finishPending(sendDone: boolean) {
    if (!pendingMsg) return;
    const person = pendingMsg.person;
    const kind = pendingMsg.kind;
    setBusyId(person.application_id);
    setError("");
    setMessage("");
    try {
      if (kind === "approved") {
        await approveApplication(person.application_id);
        setMessage(
          sendDone
            ? `${person.full_name} approved and notified in Inbox.`
            : `${person.full_name} approved for offer.`,
        );
      } else {
        await rejectApplication(person.application_id);
        setMessage(
          sendDone
            ? `${person.full_name} was rejected and notified in Inbox.`
            : `${person.full_name} was rejected.`,
        );
      }
      setFeedbackPersonId(null);
      setDetailApplicant(null);
      setPendingMsg(null);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : kind === "approved"
            ? "Could not approve."
            : "Could not reject.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const nav = [
    { label: "Home", icon: <IconHome />, id: "home" as View },
    { label: "Shortlist", icon: <IconStar />, id: "shortlist" as View },
    { label: "Feedback", icon: <IconMsg />, id: "feedback" as View },
    { label: "Analytics", icon: <IconChart />, id: "analytics" as View },
  ];

  return (
    <DashShell
      role="company"
      teamRole="manager"
      nav={nav.map((item) => ({
        href: "#",
        label: item.label,
        icon: item.icon,
        active: view === item.id,
        onClick: () => go(item.id),
      }))}
    >
      <div className="mx-auto max-w-3xl">
        {pendingMsg ? (
          <CandidateMessageModal
            open
            applicationId={pendingMsg.person.application_id}
            candidateName={pendingMsg.person.full_name}
            kind={pendingMsg.kind}
            vars={{
              name: pendingMsg.person.full_name,
              job: pendingMsg.person.job.title,
              company: companyName,
            }}
            busy={busyId === pendingMsg.person.application_id}
            onClose={() => setPendingMsg(null)}
            onSent={() => finishPending(true)}
            onSkip={() => finishPending(false)}
          />
        ) : null}
        {error ? (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? <p className="mb-4 text-sm text-brand">{message}</p> : null}

        {view === "home" ? (
          <>
            <div className="mb-6 border border-line bg-elevated px-4 py-3 text-sm text-muted">
              Review shortlists, compare interviewer feedback, and approve or
              reject hires. You can&apos;t post jobs or change company settings.
            </div>
            <CompanyInboxNote />

            <section className="border border-line bg-elevated px-5 py-6 sm:px-7">
              <div className="flex gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-soft text-xl font-bold text-brand">
                  {companyName.slice(0, 1)}
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight">
                    {companyName}
                  </h1>
                  <p className="mt-0.5 text-sm text-muted">
                    {name} · Hiring manager
                  </p>
                </div>
              </div>
            </section>

            <HomeDecisionList
              title="Pending review"
              empty="No candidates waiting on a hire decision."
              rows={pending}
              loading={loading}
              tone="pending"
              onOpen={(person) => {
                setView("shortlist");
                void openShortlistJob(person.job.id);
              }}
            />
            <HomeDecisionList
              title="Approved / hired"
              empty="No approved or hired candidates yet."
              rows={approved}
              loading={loading}
              tone="approved"
            />
            <HomeDecisionList
              title="Rejected"
              empty="No rejected candidates yet."
              rows={rejected}
              loading={loading}
              tone="rejected"
            />
          </>
        ) : null}

        {view === "shortlist" ? (
          <section>
            {detailApplicant && activeJob ? (
              <>
                <button
                  type="button"
                  onClick={() => setDetailApplicant(null)}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  ← {activeJob.title}
                </button>
                <h2 className="mt-2 font-display text-xl font-bold">
                  Candidate details
                </h2>
                <p className="mt-1 mb-4 text-sm text-muted">
                  Profile, resume, and AI screening — no interview question
                  bank.
                </p>
                <div className="border border-line bg-elevated px-5 py-6">
                  <InterviewCandidateBrief
                    item={applicantToBrief(detailApplicant, activeJob.title)}
                    showQuestions={false}
                  />
                  <ApplicationMessageThread
                    applicationId={detailApplicant.application_id}
                  />
                </div>
              </>
            ) : activeJob ? (
              <>
                <BackToJobs
                  onClick={() => {
                    setSelectedJobId(null);
                    setJobApplicants([]);
                    setDetailApplicant(null);
                  }}
                />
                <h2 className="mt-2 font-display text-xl font-bold">
                  Review shortlist
                </h2>
                <p className="mt-1 mb-4 text-sm text-muted">
                  Candidates recruiters marked for {activeJob.title}. Open
                  details to see the AI resume screener.
                </p>
                {appsLoading || loading ? (
                  <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
                    Loading shortlist…
                  </p>
                ) : shortlistPeople.length === 0 ? (
                  <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
                    No shortlisted candidates for this job.
                  </p>
                ) : (
                  <ul className="divide-y divide-line border border-line bg-elevated">
                    {shortlistPeople.map((person) => (
                      <li
                        key={person.application_id}
                        className="flex flex-wrap items-start justify-between gap-4 px-5 py-5"
                      >
                        <div className="flex min-w-0 gap-3">
                          {person.profile_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={person.profile_image_url}
                              alt=""
                              className="h-11 w-11 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
                              {person.full_name.slice(0, 1)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold">{person.full_name}</p>
                            <p className="text-sm text-muted">
                              {person.expertise}
                              {person.location ? ` · ${person.location}` : ""}
                            </p>
                            <p className="mt-1 text-xs text-muted">
                              {stageLabel(person.status)}
                            </p>
                            {person.ai_screening?.recommendation ? (
                              <p className="mt-1 text-sm text-muted">
                                AI: {person.ai_screening.recommendation}
                              </p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setDetailApplicant(person)}
                                className="rounded-md bg-brand px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-deep"
                              >
                                See candidate detail
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setView("feedback");
                                  setSelectedJobId(activeJob.id);
                                  setFeedbackPersonId(person.application_id);
                                }}
                                className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                              >
                                See feedback
                              </button>
                              <Link
                                href={`/u/${profileSlug(person.full_name)}-${person.candidate_id}`}
                                className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                              >
                                Profile
                              </Link>
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-brand">
                          {person.match_score != null
                            ? `${Math.round(person.match_score)}% match`
                            : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : loading ? (
              <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
                Loading jobs…
              </p>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold">
                  Review shortlist
                </h2>
                <p className="mt-1 mb-4 text-sm text-muted">
                  Pick a job, then open a candidate to see details and the AI
                  resume screener.
                </p>
                <JobPickList
                  jobs={jobOptions.map((job) => ({
                    id: job.id,
                    title: job.title,
                    subtitle: job.location,
                    meta: countLabel(
                      pending.filter((row) => row.job.id === job.id).length,
                      "shortlisted",
                      "shortlisted",
                    ),
                  }))}
                  onSelect={(id) => void openShortlistJob(id)}
                  empty="No jobs yet. Recruiters will post roles first."
                  actionLabel="Review"
                />
              </>
            )}
          </section>
        ) : null}

        {view === "feedback" ? (
          <section>
            {feedbackPerson ? (
              <>
                <button
                  type="button"
                  onClick={() => setFeedbackPersonId(null)}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  ← Candidates
                </button>
                <h2 className="mt-2 font-display text-xl font-bold">
                  Interviewer feedback
                </h2>
                <p className="mt-1 mb-4 text-sm text-muted">
                  Read every round, then approve or reject this hire.
                </p>
                <div className="border border-line bg-elevated px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{feedbackPerson.full_name}</p>
                      <p className="text-sm text-muted">
                        {feedbackPerson.job.title}
                        {feedbackPerson.location
                          ? ` · ${feedbackPerson.location}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {stageLabel(feedbackPerson.status)}
                        {feedbackPerson.approved_for_offer
                          ? " · Approved for offer"
                          : ""}
                      </p>
                      {formatCtc(
                        feedbackPerson.job.salary_min,
                        feedbackPerson.job.salary_max,
                      ) ? (
                        <p className="mt-1 text-sm">
                          Role package:{" "}
                          {formatCtc(
                            feedbackPerson.job.salary_min,
                            feedbackPerson.job.salary_max,
                          )}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={
                          busyId === feedbackPerson.application_id ||
                          Boolean(feedbackPerson.approved_for_offer)
                        }
                        onClick={() => onApprove(feedbackPerson)}
                        className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
                      >
                        {feedbackPerson.approved_for_offer
                          ? "Approved"
                          : "Approve hire"}
                      </button>
                      <button
                        type="button"
                        disabled={
                          busyId === feedbackPerson.application_id ||
                          isRejectedApplicant(feedbackPerson)
                        }
                        onClick={() => onReject(feedbackPerson)}
                        className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-soft disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
                <ApplicationMessageThread
                  applicationId={feedbackPerson.application_id}
                />
                <div className="mt-4">
                  {feedbackLoading ? (
                    <p className="text-sm text-muted">Loading feedback…</p>
                  ) : feedback.length === 0 ? (
                    <p className="border border-line bg-elevated px-5 py-8 text-sm text-muted">
                      No interviewer feedback submitted yet for this candidate.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {feedback.map((row) => (
                        <div
                          key={row.interview_id}
                          className="border border-line bg-elevated px-4 py-4"
                        >
                          <p className="font-semibold">{row.interviewer_name}</p>
                          <p className="mt-0.5 text-sm text-muted capitalize">
                            {String(row.interview_type || "round").replace(
                              /_/g,
                              " ",
                            )}
                            {row.submitted_at
                              ? ` · ${new Date(row.submitted_at).toLocaleDateString("en-IN")}`
                              : " · Pending"}
                          </p>
                          <p className="mt-2 text-sm">{scoreLine(row)}</p>
                          {row.comments ? (
                            <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
                              {row.comments}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : activeJob ? (
              <>
                <BackToJobs
                  onClick={() => {
                    setSelectedJobId(null);
                    setFeedbackPersonId(null);
                  }}
                />
                <h2 className="mt-2 font-display text-xl font-bold">
                  Interviewer feedback
                </h2>
                <p className="mt-1 mb-4 text-sm text-muted">
                  Pick a candidate for {activeJob.title}, then decide after you
                  read the scores.
                </p>
                {loading ? (
                  <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
                    Loading candidates…
                  </p>
                ) : reviewableForJob.length === 0 ? (
                  <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
                    No candidates to review for this job.
                  </p>
                ) : (
                  <ul className="divide-y divide-line border border-line bg-elevated">
                    {reviewableForJob.map((person) => (
                      <li
                        key={person.application_id}
                        className="flex flex-wrap items-center justify-between gap-4 px-5 py-5"
                      >
                        <div className="flex min-w-0 gap-3">
                          {person.profile_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={person.profile_image_url}
                              alt=""
                              className="h-11 w-11 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
                              {person.full_name.slice(0, 1)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold">{person.full_name}</p>
                            <p className="text-sm text-muted">
                              {stageLabel(person.status)}
                              {person.approved_for_offer
                                ? " · Approved for offer"
                                : ""}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFeedbackPersonId(person.application_id)
                          }
                          className="shrink-0 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep"
                        >
                          See feedback
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : loading ? (
              <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
                Loading jobs…
              </p>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold">
                  Interviewer feedback
                </h2>
                <p className="mt-1 mb-4 text-sm text-muted">
                  Pick a job, open a candidate&apos;s feedback, then approve or
                  reject.
                </p>
                <JobPickList
                  jobs={jobOptions.map((job) => ({
                    id: job.id,
                    title: job.title,
                    subtitle: job.location,
                    meta: countLabel(
                      reviewable.filter((row) => row.job.id === job.id).length,
                      "candidate",
                      "candidates",
                    ),
                  }))}
                  onSelect={setSelectedJobId}
                  empty="No jobs yet. Recruiters will post roles first."
                  actionLabel="View candidates"
                />
              </>
            )}
          </section>
        ) : null}

        {view === "analytics" ? <CompanyDashboardPanel /> : null}
      </div>
    </DashShell>
  );
}

function HomeDecisionList({
  title,
  empty,
  rows,
  loading,
  tone,
  onOpen,
}: {
  title: string;
  empty: string;
  rows: PipelineApplicant[];
  loading: boolean;
  tone: "pending" | "approved" | "rejected";
  onOpen?: (person: PipelineApplicant) => void;
}) {
  const badge =
    tone === "approved"
      ? "text-brand"
      : tone === "rejected"
        ? "text-red-600"
        : "text-amber-700";

  return (
    <section className="mt-8">
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted">
          {countLabel(rows.length, "candidate", "candidates")}
        </p>
      </div>
      {loading ? (
        <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
          Loading candidates…
        </p>
      ) : rows.length === 0 ? (
        <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-line border border-line bg-elevated">
          {rows.map((person) => (
            <li
              key={person.application_id}
              className="flex flex-wrap items-start justify-between gap-4 px-5 py-5"
            >
              <div className="flex min-w-0 gap-3">
                {person.profile_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={person.profile_image_url}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
                    {person.full_name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold">{person.full_name}</p>
                  <p className="text-sm text-muted">
                    {person.job.title}
                    {person.location ? ` · ${person.location}` : ""}
                  </p>
                  <p className={`mt-1 text-xs font-semibold ${badge}`}>
                    {person.approved_for_offer && tone === "approved"
                      ? "Approved for offer"
                      : stageLabel(person.status)}
                  </p>
                  {onOpen ? (
                    <button
                      type="button"
                      onClick={() => onOpen(person)}
                      className="mt-2 rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                    >
                      Review
                    </button>
                  ) : null}
                </div>
              </div>
              <span className="text-sm font-semibold text-brand">
                {person.match_score != null
                  ? `${Math.round(person.match_score)}% match`
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
