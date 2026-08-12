"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  listCompanyInterviewers,
  listPipelineApplicants,
  listShortlistedApplicants,
  scheduleCompanyInterview,
  sendCompanyMessage,
  type CompanyInterviewer,
  type PipelineApplicant,
} from "@/lib/companyJobs";

export function InterviewPanel() {
  const [rows, setRows] = useState<PipelineApplicant[]>([]);
  const [interviewers, setInterviewers] = useState<CompanyInterviewer[]>([]);
  const [applicationId, setApplicationId] = useState<number | "">("");
  const [interviewerId, setInterviewerId] = useState("");
  const [when, setWhen] = useState("");
  const [round, setRound] = useState("technical");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [shortlisted, interviewersList] = await Promise.all([
        listShortlistedApplicants(),
        listCompanyInterviewers(),
      ]);
      setRows(shortlisted);
      setInterviewers(interviewersList);
      if (!applicationId && shortlisted[0]) {
        setApplicationId(shortlisted[0].application_id);
      }
      if (!interviewerId && interviewersList[0]) {
        setInterviewerId(interviewersList[0].user_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load candidates.");
    } finally {
      setLoading(false);
    }
  }, [applicationId, interviewerId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!applicationId || !when) {
      setError("Pick a candidate and date/time.");
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
      await scheduleCompanyInterview({
        application_id: Number(applicationId),
        interviewer_id: interviewerId,
        scheduled_at: when,
        interview_type: round,
        meeting_link: link.trim() || null,
      });
      setMessage("Interview scheduled. Candidate was notified.");
      setWhen("");
      setLink("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold">Schedule interviews</h2>
        <p className="mt-1 text-sm text-muted">
          Assign a company interviewer, add a meeting link, and notify the
          candidate.
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
      ) : (
        <form onSubmit={onSubmit} className="border border-line bg-elevated px-5 py-6">
          {rows.length === 0 ? (
            <p className="text-sm text-muted">
              Shortlist candidates in Apps before scheduling interviews.
            </p>
          ) : (
            <>
              <label className="block text-sm font-medium">
                Candidate
                <select
                  required
                  value={applicationId}
                  onChange={(e) => setApplicationId(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                >
                  {rows.map((p) => (
                    <option key={p.application_id} value={p.application_id}>
                      {p.full_name} · {p.job.title}
                    </option>
                  ))}
                </select>
              </label>
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
              <label className="mt-4 block text-sm font-medium">
                Meeting link
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://meet.google.com/…"
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={busy || interviewers.length === 0}
                className="mt-5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
              >
                {busy ? "Scheduling…" : "Schedule"}
              </button>
            </>
          )}
        </form>
      )}
    </section>
  );
}

export function EmailPanel() {
  const [rows, setRows] = useState<PipelineApplicant[]>([]);
  const [applicationId, setApplicationId] = useState<number | "">("");
  const [subject, setSubject] = useState("Next steps for your application");
  const [body, setBody] = useState(
    "Hi — thanks for applying. We'd like to move forward…",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await listPipelineApplicants();
        setRows(list);
        if (list[0]) setApplicationId(list[0].application_id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load candidates.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      await sendCompanyMessage({
        application_id: Number(applicationId),
        subject: subject.trim(),
        message: body.trim(),
      });
      setMessage("Message sent to the candidate inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold">Send email</h2>
        <p className="mt-1 text-sm text-muted">Message an applicant.</p>
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
      ) : (
        <form onSubmit={onSubmit} className="border border-line bg-elevated px-5 py-6">
          {rows.length === 0 ? (
            <p className="text-sm text-muted">
              No applicants yet. When candidates apply, they appear here.
            </p>
          ) : (
            <>
              <label className="block text-sm font-medium">
                To
                <select
                  required
                  value={applicationId}
                  onChange={(e) => setApplicationId(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                >
                  {rows.map((p) => (
                    <option key={p.application_id} value={p.application_id}>
                      {p.full_name} · {p.job.title}
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
            </>
          )}
        </form>
      )}
    </section>
  );
}
