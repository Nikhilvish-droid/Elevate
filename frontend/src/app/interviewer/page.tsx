"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  DashShell,
  IconCal,
  IconHome,
  IconMsg,
} from "@/components/DashShell";
import { ApplicationMessageThread } from "@/components/company/ApplicationMessageThread";
import {
  InterviewCandidateBrief,
  JoinMeetingButton,
  meetHref,
} from "@/components/company/InterviewCandidateBrief";
import {
  endCompanyInterview,
  listAssignedInterviews,
  submitInterviewFeedback,
  type AssignedInterview,
} from "@/lib/companyJobs";
import { getCompanyWorkspace } from "@/lib/company";
import { Profile, getProfile } from "@/lib/profile";

type View = "home" | "rounds" | "feedback" | "detail";

const SCORE_FIELDS = [
  { key: "technical", label: "Technical" },
  { key: "communication", label: "Communication" },
  { key: "problem_solving", label: "Problem solving" },
  { key: "teamwork", label: "Teamwork" },
  { key: "leadership", label: "Leadership" },
  { key: "overall", label: "Overall" },
] as const;

type ScoreKey = (typeof SCORE_FIELDS)[number]["key"];

function roundLabel(type: string) {
  const t = String(type || "").toLowerCase();
  const map: Record<string, string> = {
    screening: "Screening",
    technical: "Technical",
    hr: "HR",
    system_design: "System design",
  };
  return map[t] || t.replace(/_/g, " ");
}

function whenLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function interviewStatus(row: AssignedInterview) {
  return String(row.status || "").toLowerCase();
}

function isPastMeeting(row: AssignedInterview) {
  const status = interviewStatus(row);
  return (
    ["ended", "completed", "done", "cancelled"].includes(status) ||
    Boolean(row.feedback?.submitted_at)
  );
}

export default function InterviewerPage() {
  const [user, setLocal] = useState<Profile | null>(null);
  const [companyName, setCompanyName] = useState("Your company");
  const [view, setView] = useState<View>("home");
  const [rows, setRows] = useState<AssignedInterview[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<ScoreKey, string>>({
    technical: "4",
    communication: "4",
    problem_solving: "4",
    teamwork: "4",
    leadership: "4",
    overall: "4",
  });
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [endingId, setEndingId] = useState<number | null>(null);
  const [confirmEndId, setConfirmEndId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const list = await listAssignedInterviews();
      setRows(list);
      setActiveId((prev) => {
        if (prev && list.some((r) => r.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load assigned interviews.",
      );
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

  const name = user?.full_name ?? "Interviewer";
  const active = rows.find((r) => r.id === activeId) ?? null;
  const upcoming = rows.filter((row) => !isPastMeeting(row));
  const past = rows.filter((row) => isPastMeeting(row));

  useEffect(() => {
    if (!active?.feedback) {
      setScores({
        technical: "4",
        communication: "4",
        problem_solving: "4",
        teamwork: "4",
        leadership: "4",
        overall: "4",
      });
      setComments("");
      return;
    }
    const f = active.feedback;
    setScores({
      technical: String(f.technical ?? 4),
      communication: String(f.communication ?? 4),
      problem_solving: String(f.problem_solving ?? 4),
      teamwork: String(f.teamwork ?? 4),
      leadership: String(f.leadership ?? 4),
      overall: String(f.overall ?? 4),
    });
    setComments(f.comments || "");
  }, [active]);

  const nav = [
    { label: "Home", icon: <IconHome />, id: "home" as View },
    { label: "Rounds", icon: <IconCal />, id: "rounds" as View },
    { label: "Feedback", icon: <IconMsg />, id: "feedback" as View },
  ];

  function openFeedback(id: number) {
    setActiveId(id);
    setFeedbackOpen(true);
    setView("feedback");
  }

  function openDetail(id: number) {
    setActiveId(id);
    setView("detail");
  }

  async function endMeeting(id: number) {
    if (confirmEndId !== id) {
      setConfirmEndId(id);
      return;
    }
    setEndingId(id);
    setError("");
    setMessage("");
    try {
      await endCompanyInterview(id);
      setConfirmEndId(null);
      setMessage("Meeting marked as done. It now appears under Past meetings.");
      if (view === "detail") setView("rounds");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not end meeting.");
    } finally {
      setEndingId(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeId) {
      setError("Pick an interview.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await submitInterviewFeedback(activeId, {
        technical: Number(scores.technical),
        communication: Number(scores.communication),
        problem_solving: Number(scores.problem_solving),
        teamwork: Number(scores.teamwork),
        leadership: Number(scores.leadership),
        overall: Number(scores.overall),
        comments: comments.trim(),
      });
      setMessage("Feedback submitted for the hiring manager.");
      setFeedbackOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save feedback.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashShell
      role="company"
      teamRole="interviewer"
      nav={nav.map((item) => ({
        href: "#",
        label: item.label,
        icon: item.icon,
        active: view === item.id,
        onClick: () => {
          if (item.id === "feedback") setFeedbackOpen(false);
          setView(item.id);
        },
      }))}
    >
      <div className="mx-auto max-w-3xl">
        {error ? (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? <p className="mb-4 text-sm text-brand">{message}</p> : null}

        {view === "home" ? (
          <>
            <div className="mb-6 border border-line bg-elevated px-4 py-3 text-sm text-muted">
              Interviewers run assigned rounds and leave feedback — no job
              posting, shortlisting, offers, or salary details.
            </div>

            <section className="border border-line bg-elevated px-5 py-6 sm:px-7">
              <div className="flex gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-soft text-xl font-bold text-brand">
                  {name.slice(0, 1)}
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight">
                    {name}
                  </h1>
                  <p className="mt-0.5 text-sm text-muted">
                    Interviewer · {companyName}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-4">
                <h2 className="font-display text-xl font-bold">My interviews</h2>
                <p className="mt-1 text-sm text-muted">
                  Upcoming rounds and ones waiting on feedback.
                </p>
              </div>
              <InterviewList
                rows={upcoming}
                loading={loading}
                onOpen={openFeedback}
                onDetail={openDetail}
                onEnd={endMeeting}
                endingId={endingId}
                confirmEndId={confirmEndId}
              />
              <div className="mt-10">
                <h2 className="font-display text-xl font-bold">Past meetings</h2>
                <p className="mt-1 mb-4 text-sm text-muted">
                  Finished rounds and the feedback you submitted.
                </p>
                <PastMeetingList
                  rows={past}
                  loading={loading}
                  onOpen={openFeedback}
                  onDetail={openDetail}
                />
              </div>
            </section>
          </>
        ) : null}

        {view === "rounds" ? (
          <section>
            <h2 className="font-display text-xl font-bold">Assigned rounds</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              Join the scheduled interview when it&apos;s time. End the meeting
              when it finishes.
            </p>
            <InterviewList
              rows={upcoming}
              loading={loading}
              onOpen={openFeedback}
              onDetail={openDetail}
              onEnd={endMeeting}
              endingId={endingId}
              confirmEndId={confirmEndId}
            />
            <div className="mt-10">
              <h2 className="font-display text-xl font-bold">Past meetings</h2>
              <p className="mt-1 mb-4 text-sm text-muted">
                Meetings you ended, plus the scores you gave.
              </p>
              <PastMeetingList
                rows={past}
                loading={loading}
                onOpen={openFeedback}
                onDetail={openDetail}
              />
            </div>
          </section>
        ) : null}

        {view === "detail" ? (
          <section>
            <button
              type="button"
              onClick={() => setView("rounds")}
              className="text-sm font-semibold text-brand hover:underline"
            >
              ← Assigned rounds
            </button>
            <div className="mt-2 mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">
                  Candidate details
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {active
                    ? `${roundLabel(active.interview_type)} · ${active.job_title} · ${whenLabel(active.scheduled_at)}`
                    : "Review skills, resume, and suggested questions."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {active?.meeting_link && meetHref(active.meeting_link) ? (
                  <JoinMeetingButton href={meetHref(active.meeting_link)!} />
                ) : null}
                {active && !isPastMeeting(active) ? (
                  <button
                    type="button"
                    disabled={endingId === active.id}
                    onClick={() => void endMeeting(active.id)}
                    className="rounded-md border border-line px-3 py-2 text-sm font-semibold hover:bg-soft disabled:opacity-60"
                  >
                    {endingId === active.id
                      ? "Ending…"
                      : confirmEndId === active.id
                        ? "Confirm end"
                        : "End meeting"}
                  </button>
                ) : null}
              </div>
            </div>
            {loading ? (
              <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
                Loading…
              </p>
            ) : active ? (
              <div className="border border-line bg-elevated px-5 py-6">
                <InterviewCandidateBrief item={active} showQuestions />
                <ApplicationMessageThread
                  applicationId={active.application_id}
                  maskCtc
                />
                <button
                  type="button"
                  onClick={() => openFeedback(active.id)}
                  className="mt-5 rounded-md border border-line px-3 py-2 text-sm font-semibold hover:bg-soft"
                >
                  {active.feedback?.submitted_at
                    ? "View feedback"
                    : "Add feedback"}
                </button>
              </div>
            ) : (
              <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
                Pick a candidate from Assigned rounds.
              </p>
            )}
          </section>
        ) : null}

        {view === "feedback" ? (
          <section>
            {feedbackOpen && active ? (
              <>
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(false)}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  ← Candidates
                </button>
                <h2 className="mt-2 font-display text-xl font-bold">
                  Submit feedback
                </h2>
                <p className="mt-1 mb-4 text-sm text-muted">
                  {active.candidate_name} · {roundLabel(active.interview_type)}
                </p>
                <form
                  onSubmit={onSubmit}
                  className="border border-line bg-elevated px-5 py-6"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {SCORE_FIELDS.map((field) => (
                      <label key={field.key} className="block text-sm font-medium">
                        {field.label} (1–5)
                        <select
                          className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                          value={scores[field.key]}
                          onChange={(e) =>
                            setScores((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                        >
                          {["1", "2", "3", "4", "5"].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>

                  <label className="mt-4 block text-sm font-medium">
                    Comments
                    <textarea
                      rows={5}
                      className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                      placeholder="What went well? Any concerns?"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
                  >
                    {busy ? "Saving…" : "Submit feedback"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold">Leave feedback</h2>
                <p className="mt-1 mb-4 text-sm text-muted">
                  Pick a candidate and submit scores. Compensation is never shown
                  here.
                </p>
                <FeedbackList
                  rows={rows.filter((row) => !row.feedback?.submitted_at)}
                  loading={loading}
                  onSubmitFeedback={openFeedback}
                />
              </>
            )}
          </section>
        ) : null}
      </div>
    </DashShell>
  );
}

function FeedbackList({
  rows,
  loading,
  onSubmitFeedback,
}: {
  rows: AssignedInterview[];
  loading: boolean;
  onSubmitFeedback: (id: number) => void;
}) {
  if (loading) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        Loading interviews…
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        No assigned interviews yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line border border-line bg-elevated">
      {rows.map((item) => {
        const needsFeedback = !item.feedback?.submitted_at;
        return (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-4 px-5 py-5"
          >
            <div className="flex min-w-0 items-center gap-3">
              {item.profile_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.profile_image_url}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
                  {item.candidate_name.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold">{item.candidate_name}</p>
                <p className="text-sm text-muted">
                  {roundLabel(item.interview_type)} · {item.job_title}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSubmitFeedback(item.id)}
              className="shrink-0 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep"
            >
              {needsFeedback ? "Submit feedback" : "View feedback"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PastMeetingList({
  rows,
  loading,
  onOpen,
  onDetail,
}: {
  rows: AssignedInterview[];
  loading: boolean;
  onOpen: (id: number) => void;
  onDetail: (id: number) => void;
}) {
  if (loading) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        Loading meetings…
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        No past meetings yet. End a round to see it here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line border border-line bg-elevated">
      {rows.map((item) => {
        const feedback = item.feedback;
        const cancelled = interviewStatus(item) === "cancelled";
        return (
          <li key={item.id} className="px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                {item.profile_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.profile_image_url}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
                    {item.candidate_name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold">{item.candidate_name}</p>
                  <p className="text-sm text-muted">
                    {roundLabel(item.interview_type)} · {item.job_title}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {whenLabel(item.scheduled_at)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onDetail(item.id)}
                      className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                    >
                      See candidate detail
                    </button>
                    {!cancelled ? (
                      <button
                        type="button"
                        onClick={() => onOpen(item.id)}
                        className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                      >
                        {feedback?.submitted_at
                          ? "View feedback"
                          : "Add feedback"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              <span
                className={`text-xs font-semibold ${
                  cancelled ? "text-muted" : "text-brand"
                }`}
              >
                {cancelled
                  ? "Cancelled"
                  : feedback?.submitted_at
                    ? "Feedback sent"
                    : "Meeting done"}
              </span>
            </div>
            <ApplicationMessageThread
              applicationId={item.application_id}
              maskCtc
            />
            {feedback?.submitted_at ? (
              <div className="mt-4 border-t border-line pt-4 text-sm">
                <p className="font-semibold">Your feedback</p>
                <p className="mt-2 text-muted">
                  Tech {feedback.technical} · Comm {feedback.communication} · PS{" "}
                  {feedback.problem_solving} · Team {feedback.teamwork} · Lead{" "}
                  {feedback.leadership} · Overall {feedback.overall}
                </p>
                {feedback.comments ? (
                  <p className="mt-2 whitespace-pre-wrap text-muted">
                    {feedback.comments}
                  </p>
                ) : null}
              </div>
            ) : cancelled ? null : (
              <p className="mt-3 text-xs text-muted">
                Meeting ended. Submit feedback when you are ready.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function InterviewList({
  rows,
  loading,
  onOpen,
  onDetail,
  onEnd,
  endingId,
  confirmEndId,
}: {
  rows: AssignedInterview[];
  loading: boolean;
  onOpen: (id: number) => void;
  onDetail: (id: number) => void;
  onEnd: (id: number) => void;
  endingId: number | null;
  confirmEndId: number | null;
}) {
  if (loading) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        Loading interviews…
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        No upcoming rounds right now.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line border border-line bg-elevated">
      {rows.map((item) => {
        const needsFeedback = !item.feedback?.submitted_at;
        const join = meetHref(item.meeting_link);
        const skills = (item.skills || []).slice(0, 4);
        return (
          <li
            key={item.id}
            className="flex flex-wrap items-start justify-between gap-4 px-5 py-5"
          >
            <div className="flex min-w-0 flex-1 gap-3">
              <button
                type="button"
                onClick={() => onDetail(item.id)}
                className="shrink-0"
              >
                {item.profile_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.profile_image_url}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
                    {item.candidate_name.slice(0, 1)}
                  </div>
                )}
              </button>
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onDetail(item.id)}
                  className="text-left font-semibold hover:underline"
                >
                  {item.candidate_name}
                </button>
                <p className="text-sm text-muted">
                  {roundLabel(item.interview_type)} · {item.job_title}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {whenLabel(item.scheduled_at)}
                </p>
                {skills.length ? (
                  <p className="mt-1 text-xs text-muted">
                    Skills: {skills.join(", ")}
                    {(item.skills || []).length > 4 ? "…" : ""}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onDetail(item.id)}
                    className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                  >
                    See candidate detail
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpen(item.id)}
                    className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                  >
                    {needsFeedback ? "Add feedback" : "View feedback"}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span
                className={`text-xs font-semibold ${
                  needsFeedback ? "text-amber-700" : "text-brand"
                }`}
              >
                {needsFeedback ? "Needs feedback" : "Feedback sent"}
              </span>
              {join ? <JoinMeetingButton href={join} /> : null}
              <button
                type="button"
                disabled={endingId === item.id}
                onClick={() => onEnd(item.id)}
                className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-soft disabled:opacity-60"
              >
                {endingId === item.id
                  ? "Ending…"
                  : confirmEndId === item.id
                    ? "Confirm end"
                    : "End meeting"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
