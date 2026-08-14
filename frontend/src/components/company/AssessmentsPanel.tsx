"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  addAssessmentQuestion,
  assignAssessment,
  createCompanyAssessment,
  deleteAssessmentQuestion,
  deleteCompanyAssessment,
  getCompanyAssessment,
  listAssessmentAttempts,
  listCompanyAssessments,
  type AssessmentAttemptRow,
  type AssessmentQuestion,
  type CodingAssessment,
  type QuestionType,
} from "@/lib/assessments";
import { listCompanyJobs, listPipelineApplicants, type CompanyJob } from "@/lib/companyJobs";

type Mode = "list" | "create" | "detail";

export function AssessmentsPanel() {
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [rows, setRows] = useState<CodingAssessment[]>([]);
  const [mode, setMode] = useState<Mode>("list");
  const [active, setActive] = useState<(CodingAssessment & { questions: AssessmentQuestion[] }) | null>(null);
  const [attempts, setAttempts] = useState<AssessmentAttemptRow[]>([]);
  const [pipeline, setPipeline] = useState<
    { application_id: number; full_name: string; job: { id: number; title: string }; status: string }[]
  >([]);
  const [selectedApps, setSelectedApps] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [jobId, setJobId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);

  const [qType, setQType] = useState<QuestionType>("mcq");
  const [qPrompt, setQPrompt] = useState("");
  const [qPoints, setQPoints] = useState(10);
  const [qOptions, setQOptions] = useState("A) Option 1\nB) Option 2\nC) Option 3\nD) Option 4");
  const [qCorrect, setQCorrect] = useState("A");
  const [qLanguage, setQLanguage] = useState("javascript");
  const [qCases, setQCases] = useState(
    '[{"stdin":"","stdout":"expected","visible":false}]',
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [jobList, assessments, apps] = await Promise.all([
        listCompanyJobs().catch(() => [] as CompanyJob[]),
        listCompanyAssessments(),
        listPipelineApplicants().catch(() => []),
      ]);
      setJobs(jobList);
      setRows(assessments);
      setPipeline(
        apps.map((row) => ({
          application_id: row.application_id,
          full_name: row.full_name,
          job: row.job,
          status: row.status,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load assessments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(id: number) {
    setBusy(true);
    setError("");
    try {
      const [detail, attemptRows] = await Promise.all([
        getCompanyAssessment(id),
        listAssessmentAttempts(id),
      ]);
      setActive(detail);
      setAttempts(attemptRows);
      setSelectedApps([]);
      setMode("detail");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open assessment.");
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (jobId === "" || !title.trim()) {
      setError("Job and title are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const created = await createCompanyAssessment({
        job_id: Number(jobId),
        title: title.trim(),
        description: description.trim(),
        duration_minutes: duration,
      });
      setMessage("Assessment created. Add questions next.");
      setTitle("");
      setDescription("");
      await openDetail(created.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create.");
    } finally {
      setBusy(false);
    }
  }

  async function onAddQuestion(e: FormEvent) {
    e.preventDefault();
    if (!active) return;
    setBusy(true);
    setError("");
    try {
      let options: string[] = [];
      let test_cases: { stdin: string; stdout: string }[] = [];
      if (qType === "mcq") {
        options = qOptions
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
      } else {
        test_cases = JSON.parse(qCases);
        if (!test_cases.some((tc) => String(tc.stdout || tc.expected || "").trim())) {
          setError("Add expected output to at least one test case.");
          setBusy(false);
          return;
        }
      }
      await addAssessmentQuestion(active.id, {
        question_type: qType,
        prompt: qPrompt.trim(),
        points: qPoints,
        options,
        correct_option: qType === "mcq" ? qCorrect.trim() : null,
        language: qType === "mcq" ? null : qLanguage,
        test_cases,
      });
      setQPrompt("");
      setMessage("Question added.");
      await openDetail(active.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add question.");
    } finally {
      setBusy(false);
    }
  }

  async function onAssign() {
    if (!active || !selectedApps.length) {
      setError("Select at least one shortlisted candidate.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await assignAssessment(active.id, selectedApps);
      setMessage("Test assigned. Candidates will see it under Tests.");
      setSelectedApps([]);
      const attemptRows = await listAssessmentAttempts(active.id);
      setAttempts(attemptRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign.");
    } finally {
      setBusy(false);
    }
  }

  const assignable = pipeline.filter(
    (row) =>
      active &&
      row.job.id === active.job_id &&
      ["shortlisted", "technical_interview", "resume_screening"].includes(
        String(row.status || "").toLowerCase(),
      ),
  );

  if (loading) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        Loading tests…
      </p>
    );
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Coding assessments</h2>
          <p className="mt-1 text-sm text-muted">
            Build a test for a job, assign it after shortlist, then review scores
            before Technical Interview.
          </p>
        </div>
        {mode === "list" ? (
          <button
            type="button"
            onClick={() => {
              setMode("create");
              setError("");
              setMessage("");
            }}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
          >
            New test
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMode("list");
              setActive(null);
              load();
            }}
            className="text-sm font-semibold text-brand hover:underline"
          >
            ← All tests
          </button>
        )}
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="mb-4 text-sm text-brand">{message}</p> : null}

      {mode === "create" ? (
        <form
          onSubmit={onCreate}
          className="space-y-4 border border-line bg-elevated px-5 py-6"
        >
          <label className="block text-sm">
            <span className="font-medium">Job</span>
            <select
              value={jobId}
              onChange={(e) =>
                setJobId(e.target.value ? Number(e.target.value) : "")
              }
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2"
              required
            >
              <option value="">Select job</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Duration (minutes)</span>
            <input
              type="number"
              min={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 60)}
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {busy ? "Saving…" : "Create test"}
          </button>
        </form>
      ) : null}

      {mode === "list" ? (
        rows.length === 0 ? (
          <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
            No tests yet. Create one for a job, then assign it to shortlisted
            candidates.
          </p>
        ) : (
          <ul className="divide-y divide-line border border-line bg-elevated">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="font-semibold">{row.title}</p>
                  <p className="text-sm text-muted">
                    {row.job_title || `Job #${row.job_id}`} ·{" "}
                    {row.duration_minutes} min
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openDetail(row.id)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-soft"
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {mode === "detail" && active ? (
        <div className="space-y-8">
          <div className="border border-line bg-elevated px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold">{active.title}</h3>
                <p className="mt-1 text-sm text-muted">
                  {active.description || "No description."} ·{" "}
                  {active.duration_minutes} min · pass {active.pass_score ?? 60}%
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (!window.confirm("Delete this assessment?")) return;
                  await deleteCompanyAssessment(active.id);
                  setMode("list");
                  setActive(null);
                  load();
                }}
                className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-soft"
              >
                Delete
              </button>
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Questions</h3>
            {active.questions?.length ? (
              <ul className="mb-4 space-y-3">
                {active.questions.map((q, i) => (
                  <li
                    key={q.id}
                    className="flex flex-wrap items-start justify-between gap-3 border border-line bg-elevated px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-muted">
                        {i + 1}. {q.question_type} · {q.points} pts
                      </p>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{q.prompt}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteAssessmentQuestion(active.id, q.id);
                        await openDetail(active.id);
                      }}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-muted">No questions yet.</p>
            )}

            <form
              onSubmit={onAddQuestion}
              className="space-y-3 border border-line bg-elevated px-4 py-4"
            >
              <p className="text-sm font-semibold">Add question</p>
              <div className="flex flex-wrap gap-3">
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value as QuestionType)}
                  className="rounded-md border border-line bg-surface px-3 py-2 text-sm"
                >
                  <option value="mcq">MCQ</option>
                  <option value="coding">Coding</option>
                  <option value="sql">SQL</option>
                  <option value="debug">Debug</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={qPoints}
                  onChange={(e) => setQPoints(Number(e.target.value) || 10)}
                  className="w-24 rounded-md border border-line bg-surface px-3 py-2 text-sm"
                  placeholder="Points"
                />
                {qType !== "mcq" ? (
                  <select
                    value={qLanguage}
                    onChange={(e) => setQLanguage(e.target.value)}
                    className="rounded-md border border-line bg-surface px-3 py-2 text-sm"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="sql">SQL</option>
                  </select>
                ) : null}
              </div>
              <textarea
                value={qPrompt}
                onChange={(e) => setQPrompt(e.target.value)}
                rows={3}
                required
                placeholder="Question prompt"
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
              />
              {qType === "mcq" ? (
                <>
                  <textarea
                    value={qOptions}
                    onChange={(e) => setQOptions(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
                    placeholder="One option per line"
                  />
                  <input
                    value={qCorrect}
                    onChange={(e) => setQCorrect(e.target.value)}
                    className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
                    placeholder="Correct option letter, e.g. A"
                  />
                </>
              ) : (
                <textarea
                  value={qCases}
                  onChange={(e) => setQCases(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs"
                  placeholder='[{"stdin":"","stdout":"expected"}]'
                />
              )}
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
              >
                Add question
              </button>
            </form>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Assign to candidates</h3>
            {assignable.length === 0 ? (
              <p className="text-sm text-muted">
                No shortlisted candidates for this job yet.
              </p>
            ) : (
              <>
                <ul className="mb-3 divide-y divide-line border border-line bg-elevated">
                  {assignable.map((row) => (
                    <li key={row.application_id} className="flex items-center gap-3 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedApps.includes(row.application_id)}
                        onChange={(e) => {
                          setSelectedApps((prev) =>
                            e.target.checked
                              ? [...prev, row.application_id]
                              : prev.filter((id) => id !== row.application_id),
                          );
                        }}
                      />
                      <div>
                        <p className="text-sm font-semibold">{row.full_name}</p>
                        <p className="text-xs text-muted capitalize">
                          {row.status.replace(/_/g, " ")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={busy || !selectedApps.length}
                  onClick={onAssign}
                  className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
                >
                  Assign test
                </button>
              </>
            )}
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Results</h3>
            {attempts.length === 0 ? (
              <p className="text-sm text-muted">No attempts yet.</p>
            ) : (
              <ul className="divide-y divide-line border border-line bg-elevated">
                {attempts.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold">
                        {row.candidate_name || `Candidate #${row.candidate_id}`}
                      </p>
                      <p className="text-xs capitalize text-muted">
                        {row.status.replace(/_/g, " ")}
                        {row.violation_count
                          ? ` · ${row.violation_count} violations`
                          : ""}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-brand">
                      {row.score != null ? `${row.score}%` : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
