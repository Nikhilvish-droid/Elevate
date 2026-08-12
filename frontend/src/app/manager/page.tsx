"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  DashShell,
  IconChart,
  IconHome,
  IconMsg,
  IconStar,
} from "@/components/DashShell";
import { CompanyDashboardPanel } from "@/components/company/CompanyDashboard";
import { stageLabel } from "@/lib/candidate";
import {
  approveApplication,
  listApplicationFeedback,
  listShortlistedApplicants,
  rejectApplication,
  type ApplicationFeedbackRow,
  type PipelineApplicant,
} from "@/lib/companyJobs";
import { getCompanyWorkspace } from "@/lib/company";
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

export default function ManagerPage() {
  const [user, setLocal] = useState<Profile | null>(null);
  const [companyName, setCompanyName] = useState("Your company");
  const [view, setView] = useState<View>("home");
  const [rows, setRows] = useState<PipelineApplicant[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<ApplicationFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const list = await listShortlistedApplicants();
      setRows(list);
      setSelectedId((prev) => {
        if (prev && list.some((r) => r.application_id === prev)) return prev;
        return list[0]?.application_id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load shortlist.");
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

  useEffect(() => {
    if (selectedId == null) {
      setFeedback([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setFeedbackLoading(true);
      try {
        const data = await listApplicationFeedback(selectedId);
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
  }, [selectedId]);

  const name = user?.full_name ?? "Hiring Manager";
  const selected = rows.find((r) => r.application_id === selectedId) ?? null;

  const nav = [
    { label: "Home", icon: <IconHome />, id: "home" as View },
    { label: "Shortlist", icon: <IconStar />, id: "shortlist" as View },
    { label: "Feedback", icon: <IconMsg />, id: "feedback" as View },
    { label: "Analytics", icon: <IconChart />, id: "analytics" as View },
  ];

  async function onApprove(person: PipelineApplicant) {
    setBusyId(person.application_id);
    setError("");
    setMessage("");
    try {
      await approveApplication(person.application_id);
      setMessage(`${person.full_name} approved for offer.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve.");
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(person: PipelineApplicant) {
    setBusyId(person.application_id);
    setError("");
    setMessage("");
    try {
      await rejectApplication(person.application_id);
      setMessage(`${person.full_name} was rejected.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject.");
    } finally {
      setBusyId(null);
    }
  }

  function openFeedback(id: number) {
    setSelectedId(id);
    setView("feedback");
  }

  return (
    <DashShell
      role="company"
      teamRole="manager"
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
              Review shortlists, compare interviewer feedback, and approve or
              reject hires. You can&apos;t post jobs or change company settings.
            </div>

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

            <section className="mt-8">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold">
                    Shortlisted candidates
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Ready for your review and hire decision.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setView("analytics")}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  Analytics
                </button>
              </div>
              <ShortlistRows
                rows={rows}
                loading={loading}
                busyId={busyId}
                onApprove={onApprove}
                onReject={onReject}
                onFeedback={openFeedback}
              />
            </section>
          </>
        ) : null}

        {view === "shortlist" ? (
          <section>
            <h2 className="font-display text-xl font-bold">Review shortlist</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              Candidates recruiters marked for you. Package details are visible
              for hire decisions.
            </p>
            <ShortlistRows
              rows={rows}
              loading={loading}
              busyId={busyId}
              onApprove={onApprove}
              onReject={onReject}
              onFeedback={openFeedback}
            />
          </section>
        ) : null}

        {view === "feedback" ? (
          <section>
            <h2 className="font-display text-xl font-bold">
              Interviewer feedback
            </h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              Compare scores side by side before you approve a hire.
            </p>

            {rows.length === 0 ? (
              <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
                No shortlisted candidates yet.
              </p>
            ) : (
              <div className="space-y-4">
                <label className="block text-sm font-medium">
                  Candidate
                  <select
                    value={selectedId ?? ""}
                    onChange={(e) => setSelectedId(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                  >
                    {rows.map((p) => (
                      <option key={p.application_id} value={p.application_id}>
                        {p.full_name} · {p.job.title}
                      </option>
                    ))}
                  </select>
                </label>

                {selected ? (
                  <div className="border border-line bg-elevated px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{selected.full_name}</p>
                        <p className="text-sm text-muted">
                          {selected.job.title}
                          {selected.location ? ` · ${selected.location}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {stageLabel(selected.status)}
                          {selected.approved_for_offer
                            ? " · Approved for offer"
                            : ""}
                        </p>
                        {formatCtc(
                          selected.job.salary_min,
                          selected.job.salary_max,
                        ) ? (
                          <p className="mt-1 text-sm">
                            Role package:{" "}
                            {formatCtc(
                              selected.job.salary_min,
                              selected.job.salary_max,
                            )}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={
                            busyId === selected.application_id ||
                            Boolean(selected.approved_for_offer)
                          }
                          onClick={() => onApprove(selected)}
                          className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
                        >
                          {selected.approved_for_offer
                            ? "Approved"
                            : "Approve hire"}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === selected.application_id}
                          onClick={() => onReject(selected)}
                          className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-soft disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

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
            )}
          </section>
        ) : null}

        {view === "analytics" ? <CompanyDashboardPanel /> : null}
      </div>
    </DashShell>
  );
}

function ShortlistRows({
  rows,
  loading,
  busyId,
  onApprove,
  onReject,
  onFeedback,
}: {
  rows: PipelineApplicant[];
  loading: boolean;
  busyId: number | null;
  onApprove: (person: PipelineApplicant) => void;
  onReject: (person: PipelineApplicant) => void;
  onFeedback: (id: number) => void;
}) {
  if (loading) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        Loading shortlist…
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        No shortlisted candidates yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line border border-line bg-elevated">
      {rows.map((person) => (
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
                className="h-11 w-11 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
                {person.full_name.slice(0, 1)}
              </div>
            )}
            <div>
              <p className="font-semibold">{person.full_name}</p>
              <p className="text-sm text-muted">
                {person.job.title}
                {person.location ? ` · ${person.location}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted">
                {stageLabel(person.status)}
                {person.approved_for_offer ? " · Approved for offer" : ""}
              </p>
              {formatCtc(person.job.salary_min, person.job.salary_max) ? (
                <p className="mt-1 text-sm text-muted">
                  Package{" "}
                  {formatCtc(person.job.salary_min, person.job.salary_max)}
                </p>
              ) : null}
              {person.ai_screening?.recommendation ? (
                <p className="mt-1 text-sm text-muted">
                  AI: {person.ai_screening.recommendation}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={
                    busyId === person.application_id ||
                    Boolean(person.approved_for_offer)
                  }
                  onClick={() => onApprove(person)}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft disabled:opacity-60"
                >
                  {person.approved_for_offer ? "Approved" : "Approve hire"}
                </button>
                <button
                  type="button"
                  disabled={busyId === person.application_id}
                  onClick={() => onReject(person)}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft disabled:opacity-60"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => onFeedback(person.application_id)}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                >
                  Feedback
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
  );
}
