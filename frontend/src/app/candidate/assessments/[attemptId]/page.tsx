"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAssessmentAttempt,
  reportAssessmentViolation,
  saveAssessmentAnswers,
  startAssessmentAttempt,
  submitAssessmentAttempt,
  type AssessmentQuestion,
  type AttemptDetail,
} from "@/lib/assessments";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <p className="border border-line bg-elevated px-4 py-8 text-sm text-muted">
      Loading editor…
    </p>
  ),
});

function optionLabels(q: AssessmentQuestion): { key: string; label: string }[] {
  const opts = q.options || [];
  return opts.map((o, i) => {
    const label =
      typeof o === "string" ? o : String(o.label || o.text || o.key || "");
    const fromObj =
      typeof o === "object" && o && "key" in o && o.key ? String(o.key) : "";
    const fromLabel = label.match(/^([A-Za-z])[).:\s-]/)?.[1] || "";
    const key = (fromObj || fromLabel || String.fromCharCode(65 + i)).toUpperCase();
    return { key, label };
  });
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TakeAssessmentPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = Number(params.attemptId);
  const router = useRouter();

  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const submittingRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const questions = detail?.questions || [];
  const current = questions[index];
  const submitted = ["submitted", "auto_submitted"].includes(
    detail?.status || "",
  );

  const load = useCallback(async () => {
    if (!Number.isFinite(attemptId)) {
      setError("Invalid attempt.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      let data = await getAssessmentAttempt(attemptId);
      if (data.status === "assigned") {
        data = await startAssessmentAttempt(attemptId);
        data = await getAssessmentAttempt(attemptId);
      }
      setDetail(data);
      setRemaining(data.remaining_seconds ?? 0);
      const map: Record<number, string> = {};
      for (const a of data.answers || []) {
        map[a.question_id] = a.answer_text || "";
      }
      setAnswers(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load test.");
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  const buildAnswerPayload = useCallback(() => {
    return Object.entries(answersRef.current).map(([question_id, answer_text]) => ({
      question_id: Number(question_id),
      answer_text,
    }));
  }, []);

  const doSubmit = useCallback(
    async (auto = false) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setBusy(true);
      try {
        const result = await submitAssessmentAttempt(attemptId, {
          auto,
          answers: buildAnswerPayload(),
        });
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                ...result,
                remaining_seconds: 0,
              }
            : prev,
        );
        setRemaining(0);
        setMessage(
          auto
            ? "Test auto-submitted (time up or too many tab switches)."
            : "Test submitted. Your score is ready.",
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not submit.");
        submittingRef.current = false;
      } finally {
        setBusy(false);
      }
    },
    [attemptId, buildAnswerPayload],
  );

  // Countdown from server remaining seconds (do not depend on remaining —
  // that would reset the interval every tick).
  useEffect(() => {
    if (submitted || loading || detail?.status !== "in_progress") return;
    if (remaining <= 0) {
      void doSubmit(true);
      return;
    }
    const timer = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          void doSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remaining is seed only
  }, [submitted, loading, detail?.status, doSubmit]);

  // Autosave
  useEffect(() => {
    if (submitted || loading) return;
    const timer = window.setInterval(() => {
      void saveAssessmentAnswers(attemptId, buildAnswerPayload()).catch(() => {});
    }, 20000);
    return () => window.clearInterval(timer);
  }, [attemptId, submitted, loading, buildAnswerPayload]);

  // Proctoring
  useEffect(() => {
    if (submitted || loading || detail?.status !== "in_progress") return;

    async function onViolation(type: "tab_switch" | "window_blur") {
      try {
        const res = await reportAssessmentViolation(attemptId, type);
        setDetail((prev) =>
          prev ? { ...prev, violation_count: res.violation_count } : prev,
        );
        if (res.auto_submitted) {
          setMessage("Too many tab switches — test auto-submitted.");
          await load();
        }
      } catch {
        /* ignore */
      }
    }

    const onVis = () => {
      if (document.hidden) void onViolation("tab_switch");
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [attemptId, submitted, loading, detail?.status, load]);

  const title = useMemo(() => {
    const a = detail?.coding_assessments;
    return a && "title" in a ? a.title : "Assessment";
  }, [detail]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-muted">Preparing your test…</p>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/candidate/assessments" className="mt-4 inline-block text-sm text-brand">
          ← Back to tests
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="text-sm text-brand">{message || "Submitted."}</p>
        <p className="text-sm">
          Score:{" "}
          <span className="font-semibold text-brand">
            {detail?.score != null ? `${detail.score}%` : "—"}
          </span>
        </p>
        <button
          type="button"
          onClick={() => router.push("/candidate/assessments")}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
        >
          Back to tests
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold">{title}</h1>
          <p className="text-xs text-muted">
            Question {index + 1} of {questions.length}
            {detail?.violation_count
              ? ` · Violations: ${detail.violation_count}`
              : ""}
          </p>
        </div>
        <div
          className={`rounded-md px-3 py-1.5 font-mono text-sm font-semibold ${
            remaining < 60 ? "bg-red-500/15 text-red-600" : "bg-soft text-ink"
          }`}
        >
          {formatTime(remaining)}
        </div>
      </div>

      {error ? (
        <p className="mb-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="mb-3 text-sm text-brand">{message}</p> : null}

      {current ? (
        <div className="space-y-4 border border-line bg-elevated px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {current.question_type} · {current.points} pts
          </p>
          <p className="whitespace-pre-wrap text-sm leading-6">{current.prompt}</p>

          {current.question_type === "mcq" ? (
            <ul className="space-y-2">
              {optionLabels(current).map((opt) => (
                <li key={opt.key}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name={`q-${current.id}`}
                      checked={answers[current.id] === opt.key}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [current.id]: opt.key }))
                      }
                      className="mt-1"
                    />
                    <span>{opt.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-hidden rounded-md border border-line">
              <MonacoEditor
                height="320px"
                language={
                  current.language === "cpp"
                    ? "cpp"
                    : current.language === "sql"
                      ? "sql"
                      : current.language || "javascript"
                }
                theme="vs-dark"
                value={answers[current.id] || ""}
                onChange={(value) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [current.id]: value || "",
                  }))
                }
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">No questions in this test.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={index <= 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:bg-soft disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={index >= questions.length - 1}
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:bg-soft disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void doSubmit(false)}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Submit test"}
        </button>
      </div>
    </div>
  );
}
