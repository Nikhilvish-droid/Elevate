"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ApplicationMessageThread } from "@/components/company/ApplicationMessageThread";
import { CandidateMessageModal } from "@/components/company/CandidateMessageModal";
import {
  BackLink,
  BackToJobs,
  JobPickList,
} from "@/components/company/JobPickList";
import { roundLabel, stageLabel } from "@/lib/candidate";
import {
  draftCandidateMessage,
  type MessageKind,
} from "@/lib/candidateMessages";
import { getCompanyWorkspace } from "@/lib/company";
import {
  cancelCompanyInterview,
  countLabel,
  getGoogleMeetStatus,
  groupApplicantsByJob,
  listCompanyInterviewers,
  listCompanyInterviews,
  listPipelineApplicants,
  listShortlistedApplicants,
  scheduleCompanyInterview,
  sendCompanyMessage,
  updateCompanyInterview,
  type CompanyInterview,
  type CompanyInterviewer,
  type PipelineApplicant,
} from "@/lib/companyJobs";

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatInterviewWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Time TBD";
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function interviewStatus(row: CompanyInterview) {
  return String(row.status || "").toLowerCase();
}

function isScheduledInterview(row: CompanyInterview) {
  return interviewStatus(row) === "scheduled";
}

function isDoneInterview(row: CompanyInterview) {
  return ["ended", "completed", "done"].includes(interviewStatus(row));
}

function meetingDoneLabel(type: string) {
  const t = String(type || "").toLowerCase();
  if (t === "hr" || t === "hr_interview") return "HR meeting done";
  if (t === "technical" || t === "technical_interview") {
    return "Technical meeting done";
  }
  if (t === "screening" || t === "resume_screening") {
    return "Screening meeting done";
  }
  if (t === "system_design") return "System design meeting done";
  return `${t.replace(/_/g, " ")} meeting done`;
}

function nextRoundType(rows: CompanyInterview[]) {
  const done = rows.filter(isDoneInterview);
  const last = done[done.length - 1];
  const t = String(last?.interview_type || "").toLowerCase();
  if (t === "screening" || t === "resume_screening") return "technical";
  if (t === "technical" || t === "technical_interview") return "hr";
  return "hr";
}

export function InterviewPanel() {
  const [rows, setRows] = useState<PipelineApplicant[]>([]);
  const [interviewers, setInterviewers] = useState<CompanyInterviewer[]>([]);
  const [interviews, setInterviews] = useState<CompanyInterview[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [editingInterviewId, setEditingInterviewId] = useState<number | null>(
    null,
  );
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [busyInterviewId, setBusyInterviewId] = useState<number | null>(null);
  const [interviewerId, setInterviewerId] = useState("");
  const [when, setWhen] = useState("");
  const [round, setRound] = useState("technical");
  const [link, setLink] = useState("");
  const [meetConfigured, setMeetConfigured] = useState(false);
  const [createMeet, setCreateMeet] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("Company");
  const [advanceMsg, setAdvanceMsg] = useState<{
    applicationId: number;
    name: string;
    job: string;
    round: string;
  } | null>(null);

  const jobs = useMemo(() => groupApplicantsByJob(rows), [rows]);
  const activeJob =
    selectedJobId == null
      ? null
      : jobs.find((job) => job.id === selectedJobId) ?? null;
  const candidates = activeJob?.items ?? [];
  const activeCandidate =
    applicationId == null
      ? null
      : candidates.find((person) => person.application_id === applicationId) ??
        null;
  const editingInterview =
    editingInterviewId == null
      ? null
      : interviews.find((row) => row.id === editingInterviewId) ?? null;
  const interviewsByApplication = useMemo(() => {
    const map = new Map<number, CompanyInterview[]>();
    for (const row of interviews) {
      const list = map.get(row.application_id) || [];
      list.push(row);
      map.set(row.application_id, list);
    }
    return map;
  }, [interviews]);
  const scheduledByJob = useMemo(() => {
    const map = new Map<number, { scheduled: number; done: number }>();
    for (const row of interviews) {
      if (row.job_id == null) continue;
      const current = map.get(row.job_id) || { scheduled: 0, done: 0 };
      if (isScheduledInterview(row)) current.scheduled += 1;
      if (isDoneInterview(row)) current.done += 1;
      map.set(row.job_id, current);
    }
    return map;
  }, [interviews]);

  const load = useCallback(async () => {
    try {
      const [shortlisted, interviewersList, meet, interviewRows] =
        await Promise.all([
          listShortlistedApplicants(),
          listCompanyInterviewers(),
          getGoogleMeetStatus().catch(() => ({ configured: false })),
          listCompanyInterviews(),
        ]);
      setRows(shortlisted);
      setInterviewers(interviewersList);
      setMeetConfigured(Boolean(meet.configured));
      setInterviews(interviewRows);
      getCompanyWorkspace()
        .then((ws) => setCompanyName(ws.company.name || "Company"))
        .catch(() => {});
      if (!interviewerId && interviewersList[0]) {
        setInterviewerId(interviewersList[0].user_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load candidates.");
    } finally {
      setLoading(false);
    }
  }, [interviewerId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openJob(id: number) {
    setSelectedJobId(id);
    setApplicationId(null);
    setEditingInterviewId(null);
    setConfirmCancelId(null);
    setError("");
    setMessage("");
  }

  function openCandidate(id: number) {
    setApplicationId(id);
    setEditingInterviewId(null);
    setWhen("");
    setLink("");
    setRound(nextRoundType(interviewsByApplication.get(id) || []));
    setCreateMeet(meetConfigured);
    setError("");
    setMessage("");
  }

  function openReschedule(interview: CompanyInterview) {
    setApplicationId(interview.application_id);
    setEditingInterviewId(interview.id);
    setWhen(toDatetimeLocal(interview.scheduled_at));
    setRound(interview.interview_type || "technical");
    if (interview.interviewer_id) setInterviewerId(interview.interviewer_id);
    setLink(interview.meeting_link || "");
    setCreateMeet(false);
    setConfirmCancelId(null);
    setError("");
    setMessage("");
  }

  function backToCandidates() {
    setApplicationId(null);
    setEditingInterviewId(null);
    setWhen("");
    setLink("");
    setError("");
  }

  function backToJobs() {
    setSelectedJobId(null);
    setApplicationId(null);
    setEditingInterviewId(null);
    setWhen("");
    setLink("");
    setError("");
  }

  async function cancelInterview(interview: CompanyInterview) {
    if (confirmCancelId !== interview.id) {
      setConfirmCancelId(interview.id);
      return;
    }
    setBusyInterviewId(interview.id);
    setError("");
    setMessage("");
    try {
      await cancelCompanyInterview(interview.id);
      setConfirmCancelId(null);
      setMessage(`Interview cancelled for ${interview.candidate_name}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel.");
    } finally {
      setBusyInterviewId(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!applicationId || !when) {
      setError("Pick a date and time.");
      return;
    }
    if (!interviewerId) {
      setError("Pick an interviewer.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const name = activeCandidate?.full_name ?? "Candidate";
      const pastedLink = link.trim();
      const makeMeet = meetConfigured && createMeet && !pastedLink;
      const wasReschedule = Boolean(editingInterviewId);
      const priorDone = (
        interviewsByApplication.get(Number(applicationId)) || []
      ).some(isDoneInterview);
      if (editingInterviewId) {
        await updateCompanyInterview(editingInterviewId, {
          scheduled_at: when,
          interviewer_id: interviewerId,
          interview_type: round,
          meeting_link: pastedLink || null,
          create_google_meet: makeMeet,
        });
      } else {
        await scheduleCompanyInterview({
          application_id: Number(applicationId),
          interviewer_id: interviewerId,
          scheduled_at: when,
          interview_type: round,
          meeting_link: pastedLink || null,
          create_google_meet: makeMeet,
        });
      }
      setWhen("");
      setLink("");
      setApplicationId(null);
      setEditingInterviewId(null);
      if (!wasReschedule && priorDone) {
        setAdvanceMsg({
          applicationId: Number(applicationId),
          name,
          job: activeJob?.title || "the role",
          round: roundLabel(round),
        });
      }
      setMessage(
        wasReschedule
          ? `Interview rescheduled for ${name}. They were notified.`
          : makeMeet
            ? `Interview scheduled for ${name}. Google Meet link was created and they were notified.`
            : `Interview scheduled for ${name}. They were notified.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      {advanceMsg ? (
        <CandidateMessageModal
          open
          applicationId={advanceMsg.applicationId}
          candidateName={advanceMsg.name}
          kind="round_advance"
          vars={{
            name: advanceMsg.name,
            job: advanceMsg.job,
            company: companyName,
            round: advanceMsg.round,
          }}
          onClose={() => setAdvanceMsg(null)}
          onSent={() => {
            setAdvanceMsg(null);
            setMessage(
              `${advanceMsg.name} was notified they are moving to the next round.`,
            );
          }}
          onSkip={() => {
            setAdvanceMsg(null);
            setMessage("Next-round note skipped. Interview is still scheduled.");
          }}
        />
      ) : null}
      <div className="mb-4">
        {activeCandidate ? (
          <BackLink onClick={backToCandidates} label="Candidates" />
        ) : activeJob ? (
          <BackToJobs onClick={backToJobs} />
        ) : null}
        <h2
          className={`${activeJob ? "mt-2 " : ""}font-display text-xl font-bold`}
        >
          {editingInterview ? "Reschedule interview" : "Schedule interviews"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {editingInterview && activeCandidate && activeJob
            ? `Update ${activeCandidate.full_name}'s interview for ${activeJob.title}.`
            : activeCandidate && activeJob
              ? `Schedule ${activeCandidate.full_name} for ${activeJob.title}.`
              : activeJob
                ? `Candidates shortlisted for ${activeJob.title}. Ended rounds show as meeting done — schedule another round when you are ready.`
                : "Pick a job, then a candidate, then schedule the interview."}
        </p>
      </div>
      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="mb-4 text-sm text-brand">{message}</p> : null}
      {loading ? (
        <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
          Loading…
        </p>
      ) : !activeJob ? (
        <JobPickList
          jobs={jobs.map((job) => {
            const counts = scheduledByJob.get(job.id) || {
              scheduled: 0,
              done: 0,
            };
            return {
              id: job.id,
              title: job.title,
              subtitle: job.location,
              meta: [
                countLabel(job.items.length, "candidate", "candidates"),
                counts.scheduled
                  ? countLabel(counts.scheduled, "scheduled", "scheduled")
                  : null,
                counts.done ? countLabel(counts.done, "done", "done") : null,
              ]
                .filter(Boolean)
                .join(" · "),
            };
          })}
          onSelect={openJob}
          empty="Shortlist candidates in Apps before scheduling interviews."
          actionLabel="View candidates"
        />
      ) : activeCandidate ? (
        <form onSubmit={onSubmit} className="border border-line bg-elevated px-5 py-6">
          <div className="mb-4 flex items-center gap-3">
            {activeCandidate.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeCandidate.profile_image_url}
                alt=""
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
                {activeCandidate.full_name.slice(0, 1)}
              </span>
            )}
            <div>
              <p className="font-semibold">{activeCandidate.full_name}</p>
              <p className="text-sm text-muted">
                {activeCandidate.location || "Location TBD"}
                {activeCandidate.match_score != null
                  ? ` · ${Math.round(activeCandidate.match_score)}% match`
                  : ""}
              </p>
            </div>
          </div>
          <label className="mt-4 block text-sm font-medium">
            Interviewer
            <select
              required
              value={interviewerId}
              onChange={(e) => setInterviewerId(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
            >
              {interviewers.length === 0 ? (
                <option value="">No interviewers on the team yet</option>
              ) : (
                interviewers.map((person) => (
                  <option key={person.user_id} value={person.user_id}>
                    {person.full_name}
                    {person.email ? ` · ${person.email}` : ""}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="mt-4 block text-sm font-medium">
            Date & time
            <input
              required
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Round
            <select
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
            >
              <option value="technical">Technical</option>
              <option value="hr">HR</option>
              <option value="system_design">System design</option>
              <option value="screening">Screening</option>
            </select>
          </label>
          {meetConfigured ? (
            <label className="mt-4 flex items-start gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={createMeet}
                onChange={(e) => setCreateMeet(e.target.checked)}
                className="mt-0.5"
              />
              <span>Create Google Meet link automatically</span>
            </label>
          ) : (
            <p className="mt-4 text-xs text-muted">
              To auto-create Google Meet links, add Google Calendar credentials
              in backend/.env (see backend README).
            </p>
          )}
          <label className="mt-4 block text-sm font-medium">
            {meetConfigured && createMeet
              ? "Meeting link (optional override)"
              : "Meeting link"}
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={
                meetConfigured && createMeet
                  ? "Leave blank to generate a Google Meet link"
                  : "https://meet.google.com/…"
              }
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={busy || interviewers.length === 0}
            className="mt-5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {busy
              ? editingInterview
                ? "Saving…"
                : "Scheduling…"
              : editingInterview
                ? "Save changes"
                : "Schedule"}
          </button>
          <ApplicationMessageThread applicationId={activeCandidate.application_id} />
        </form>
      ) : candidates.length === 0 ? (
        <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
          No shortlisted candidates for this job.
        </p>
      ) : (
        <ul className="divide-y divide-line border border-line bg-elevated">
          {candidates.map((person) => (
            <li
              key={person.application_id}
              className="flex flex-wrap items-start justify-between gap-4 px-5 py-5"
            >
              <div className="flex gap-3">
                {person.profile_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={person.profile_image_url}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
                    {person.full_name.slice(0, 1)}
                  </span>
                )}
                <div>
                  <p className="font-semibold">{person.full_name}</p>
                  <p className="text-sm text-muted">
                    {person.location || "Location TBD"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {(() => {
                      const rows =
                        interviewsByApplication.get(person.application_id) ||
                        [];
                      const done = rows.filter(isDoneInterview);
                      const scheduled = rows.filter(isScheduledInterview);
                      if (done.length && !scheduled.length) {
                        return meetingDoneLabel(
                          done[done.length - 1].interview_type,
                        );
                      }
                      return stageLabel(person.status);
                    })()}
                  </p>
                  {(interviewsByApplication.get(person.application_id) || [])
                    .filter(
                      (interview) =>
                        isDoneInterview(interview) ||
                        isScheduledInterview(interview),
                    )
                    .map((interview) => {
                      const done = isDoneInterview(interview);
                      return (
                        <div
                          key={interview.id}
                          className="mt-2 rounded-md border border-line bg-surface px-3 py-2"
                        >
                          <p
                            className={`text-xs font-semibold ${
                              done ? "text-brand" : "text-brand"
                            }`}
                          >
                            {done
                              ? meetingDoneLabel(interview.interview_type)
                              : "Interview scheduled"}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {roundLabel(interview.interview_type)} ·{" "}
                            {formatInterviewWhen(interview.scheduled_at)}
                          </p>
                          {interview.interviewer_name ? (
                            <p className="text-xs text-muted">
                              With {interview.interviewer_name}
                            </p>
                          ) : null}
                          {done ? null : (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {interview.meeting_link ? (
                                <a
                                  href={
                                    /^https?:\/\//i.test(interview.meeting_link)
                                      ? interview.meeting_link
                                      : `https://${interview.meeting_link}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                                >
                                  Join
                                </a>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => openReschedule(interview)}
                                className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                              >
                                Reschedule
                              </button>
                              <button
                                type="button"
                                disabled={busyInterviewId === interview.id}
                                onClick={() => cancelInterview(interview)}
                                className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft disabled:opacity-60"
                              >
                                {busyInterviewId === interview.id
                                  ? "Cancelling…"
                                  : confirmCancelId === interview.id
                                    ? "Confirm cancel"
                                    : "Cancel"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  <button
                    type="button"
                    onClick={() => openCandidate(person.application_id)}
                    className="mt-2 rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                  >
                    {(interviewsByApplication.get(person.application_id) || [])
                      .filter(
                        (interview) =>
                          isDoneInterview(interview) ||
                          isScheduledInterview(interview),
                      ).length > 0
                      ? "Schedule another round"
                      : "Schedule interview"}
                  </button>
                </div>
              </div>
              <span className="text-sm font-semibold text-brand">
                {person.match_score != null
                  ? `${Math.round(person.match_score)}% match`
                  : "Shortlisted"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function emailKindFor(person: PipelineApplicant): MessageKind {
  const status = String(person.status || "").toLowerCase();
  if (status === "rejected") return "rejected";
  if (person.approved_for_offer || status === "offer" || status === "hired") {
    return "offer_ctc";
  }
  if (status === "technical_interview" || status === "hr_interview") {
    return "round_advance";
  }
  if (status === "shortlisted") return "shortlisted";
  return "shortlisted";
}

export function EmailPanel({
  initialApplicationId = null,
}: {
  initialApplicationId?: number | null;
}) {
  const [rows, setRows] = useState<PipelineApplicant[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [applicationId, setApplicationId] = useState<number | "">("");
  const [subject, setSubject] = useState("Next steps for your application");
  const [body, setBody] = useState(
    "Hi — thanks for applying. We'd like to move forward…",
  );
  const [companyName, setCompanyName] = useState("Company");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const jobs = useMemo(() => groupApplicantsByJob(rows), [rows]);
  const activeJob =
    selectedJobId == null
      ? null
      : jobs.find((job) => job.id === selectedJobId) ?? null;
  const candidates = activeJob?.items ?? [];

  useEffect(() => {
    (async () => {
      try {
        const [list, ws] = await Promise.all([
          listPipelineApplicants(),
          getCompanyWorkspace().catch(() => null),
        ]);
        setRows(list);
        const company = ws?.company?.name || "Company";
        if (ws?.company?.name) setCompanyName(company);
        if (initialApplicationId) {
          const person = list.find(
            (row) => row.application_id === initialApplicationId,
          );
          if (person) {
            setSelectedJobId(person.job.id);
            setApplicationId(person.application_id);
            const kind = emailKindFor(person);
            const draft = draftCandidateMessage(kind, {
              name: person.full_name,
              job: person.job.title,
              company,
              round:
                String(person.status || "").toLowerCase() === "hr_interview"
                  ? "HR"
                  : "technical",
              location: person.job.location || "TBD",
            });
            setSubject(draft.subject);
            setBody(draft.body);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load candidates.");
      } finally {
        setLoading(false);
      }
    })();
  }, [initialApplicationId]);

  function fillDraft(person: PipelineApplicant | undefined, jobTitle?: string) {
    if (!person) return;
    const kind = emailKindFor(person);
    const draft = draftCandidateMessage(kind, {
      name: person.full_name,
      job: jobTitle || person.job.title,
      company: companyName,
      round:
        String(person.status || "").toLowerCase() === "hr_interview"
          ? "HR"
          : "technical",
      location: person.job.location || "TBD",
    });
    setSubject(draft.subject);
    setBody(draft.body);
  }

  function openJob(id: number) {
    setSelectedJobId(id);
    setMessage("");
    const group = jobs.find((job) => job.id === id);
    const first = group?.items[0];
    setApplicationId(first?.application_id ?? "");
    fillDraft(first, group?.title);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!applicationId) {
      setError("Pick a candidate.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const person = candidates.find(
        (row) => row.application_id === Number(applicationId),
      );
      await sendCompanyMessage({
        application_id: Number(applicationId),
        subject: subject.trim(),
        message: body.trim(),
        template_key: person ? emailKindFor(person) : "shortlisted",
      });
      setMessage("Message sent to the candidate Inbox. They will see an orange dot until they open it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="mb-4">
        {activeJob ? (
          <BackToJobs onClick={() => setSelectedJobId(null)} />
        ) : null}
        <h2
          className={`${activeJob ? "mt-2 " : ""}font-display text-xl font-bold`}
        >
          Message candidate
        </h2>
        <p className="mt-1 text-sm text-muted">
          {activeJob
            ? `This goes to their Elevate Inbox for ${activeJob.title} (orange dot until they open it).`
            : "Pick a job, then message an applicant. They see it in Inbox — no outside email needed."}
        </p>
      </div>
      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="mb-4 text-sm text-brand">{message}</p> : null}
      {loading ? (
        <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
          Loading…
        </p>
      ) : !activeJob ? (
        <JobPickList
          jobs={jobs.map((job) => ({
            id: job.id,
            title: job.title,
            subtitle: job.location,
            meta: countLabel(job.items.length, "applicant", "applicants"),
          }))}
          onSelect={openJob}
          empty="No applicants yet. When candidates apply, they appear here."
          actionLabel="Message"
        />
      ) : (
        <form onSubmit={onSubmit} className="border border-line bg-elevated px-5 py-6">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted">No applicants for this job.</p>
          ) : (
            <>
              <label className="block text-sm font-medium">
                To
                <select
                  required
                  value={applicationId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setApplicationId(id);
                    fillDraft(
                      candidates.find((p) => p.application_id === id),
                      activeJob?.title,
                    );
                  }}
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                >
                  {candidates.map((p) => (
                    <option key={p.application_id} value={p.application_id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block text-sm font-medium">
                Subject
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                />
              </label>
              <label className="mt-4 block text-sm font-medium">
                Message
                <textarea
                  required
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="mt-5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send"}
              </button>
              {applicationId ? (
                <ApplicationMessageThread applicationId={Number(applicationId)} />
              ) : null}
            </>
          )}
        </form>
      )}
    </section>
  );
}
