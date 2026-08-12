"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  DashShell,
  IconCal,
  IconHome,
  IconMsg,
} from "@/components/DashShell";
import {
  listAssignedInterviews,
  submitInterviewFeedback,
  type AssignedInterview,
} from "@/lib/companyJobs";
import { getCompanyWorkspace } from "@/lib/company";
import { Profile, getProfile } from "@/lib/profile";

type View = "home" | "rounds" | "feedback";

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
    setView("feedback");
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
        onClick: () => setView(item.id),
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
                rows={rows}
                loading={loading}
                onOpen={openFeedback}
              />
            </section>
          </>
        ) : null}

        {view === "rounds" ? (
          <section>
            <h2 className="font-display text-xl font-bold">Assigned rounds</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              Join the scheduled interview when it&apos;s time.
            </p>
            <InterviewList
              rows={rows}
              loading={loading}
              onOpen={openFeedback}
            />
          </section>
        ) : null}

        {view === "feedback" ? (
          <section>
            <h2 className="font-display text-xl font-bold">Leave feedback</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              Structured scores for the hiring manager. Compensation is never
              shown here.
            </p>
            {loading ? (
              <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
                Loading…
              </p>
            ) : rows.length === 0 ? (
              <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
                No assigned interviews yet.
              </p>
            ) : (
              <form
                onSubmit={onSubmit}
                className="border border-line bg-elevated px-5 py-6"
              >
                <label className="block text-sm font-medium">
                  Interview
                  <select
                    className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                    value={activeId ?? ""}
                    onChange={(e) => setActiveId(Number(e.target.value))}
                  >
                    {rows.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.candidate_name} · {roundLabel(i.interview_type)}
                      </option>
                    ))}
                  </select>
                </label>
                {active ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-muted">
                        {active.job_title} · {whenLabel(active.scheduled_at)}
                        {active.candidate_location
                          ? ` · ${active.candidate_location}`
                          : ""}
                      </p>
                      {active.meeting_link ? (
                        <a
                          href={active.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                        >
                          Join meeting
                        </a>
                      ) : null}
                    </div>
                    {active.match_summary?.recommendation ? (
                      <p className="text-sm text-muted">
                        AI note: {active.match_summary.recommendation}
                        {active.match_summary.match_percentage != null
                          ? ` (${active.match_summary.match_percentage}% match)`
                          : ""}
                      </p>
                    ) : null}
                    {active.screening_questions ? (
                      <div className="border border-line bg-surface px-4 py-3 text-sm">
                        <p className="font-semibold">Question bank</p>
                        {(
                          [
                            ["Easy", active.screening_questions.easy],
                            ["Medium", active.screening_questions.medium],
                            ["Hard", active.screening_questions.hard],
                          ] as const
                        ).map(([label, list]) =>
                          list?.length ? (
                            <div key={label} className="mt-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                {label}
                              </p>
                              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
                                {list.slice(0, 5).map((q) => (
                                  <li key={q}>{q}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null,
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
            )}
          </section>
        ) : null}
      </div>
    </DashShell>
  );
}

function InterviewList({
  rows,
  loading,
  onOpen,
}: {
  rows: AssignedInterview[];
  loading: boolean;
  onOpen: (id: number) => void;
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
        No assigned interviews yet. Recruiters will schedule you onto rounds.
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
            className="flex flex-wrap items-start justify-between gap-4 px-5 py-5"
          >
            <div className="flex gap-3">
              {item.profile_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.profile_image_url}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
                  {item.candidate_name.slice(0, 1)}
                </div>
              )}
              <div>
                <p className="font-semibold">{item.candidate_name}</p>
                <p className="text-sm text-muted">
                  {roundLabel(item.interview_type)} · {item.job_title}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {whenLabel(item.scheduled_at)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.meeting_link ? (
                    <a
                      href={item.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                    >
                      Join meeting
                    </a>
                  ) : null}
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
            <span
              className={`text-xs font-semibold ${
                needsFeedback ? "text-amber-700" : "text-brand"
              }`}
            >
              {needsFeedback ? "Needs feedback" : "Feedback sent"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
