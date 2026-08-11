"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProfile, profilePath, type Profile } from "@/lib/profile";
import {
  computeCompletion,
  getCandidateFull,
  latestResumeScore,
  listMyApplications,
  listMyAssessments,
  listMyInterviews,
  listMyNotifications,
  listMyOffers,
  listPublishedJobs,
  formatPay,
  formatWorkMode,
  stageLabel,
  type ApplicationRow,
  type CandidateFull,
  type JobRow,
} from "@/lib/candidate";

function companyName(job: JobRow | null | undefined) {
  const c = job?.companies as
    | { name?: string }
    | { name?: string }[]
    | null
    | undefined;
  if (Array.isArray(c)) return c[0]?.name ?? "Company";
  return c?.name ?? "Company";
}

function recommendJobs(
  jobs: JobRow[],
  appliedIds: Set<number>,
  full: CandidateFull | null,
) {
  const available = jobs.filter((j) => !appliedIds.has(j.id));
  const needles = [
    ...(full?.skills || []).map((s) => s.name),
    full?.location,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase().trim())
    .filter((s) => s.length > 2);

  const scored = available.map((job) => {
    const hay =
      `${job.title} ${job.description} ${job.location || ""} ${companyName(job)} ${job.department || ""}`.toLowerCase();
    const hits = needles.filter((n) => hay.includes(n)).length;
    return { job, hits };
  });
  scored.sort((a, b) => b.hits - a.hits);
  const matched = scored.filter((s) => s.hits > 0).slice(0, 4).map((s) => s.job);
  return matched.length ? matched : available.slice(0, 4);
}

export default function CandidateHome() {
  const [user, setUser] = useState<Profile | null>(null);
  const [full, setFull] = useState<CandidateFull | null>(null);
  const [recommended, setRecommended] = useState<JobRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [applied, setApplied] = useState(0);
  const [upcoming, setUpcoming] = useState(0);
  const [tests, setTests] = useState(0);
  const [offers, setOffers] = useState(0);
  const [unread, setUnread] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const profile = await getProfile();
        setUser(profile);
        const [cand, jobList, apps, interviews, assessments, offerList, notes, analysis] =
          await Promise.all([
            getCandidateFull(),
            listPublishedJobs().catch(() => []),
            listMyApplications().catch(() => []),
            listMyInterviews().catch(() => []),
            listMyAssessments().catch(() => []),
            listMyOffers().catch(() => []),
            listMyNotifications().catch(() => []),
            latestResumeScore().catch(() => null),
          ]);
        setFull(cand);
        setApplications(apps.slice(0, 4));
        setApplied(apps.length);
        setRecommended(
          recommendJobs(
            jobList,
            new Set(apps.map((a) => a.job_id)),
            cand,
          ),
        );
        setUpcoming(
          interviews.filter(
            (i) => i.status === "scheduled" && new Date(i.scheduled_at) >= new Date(),
          ).length,
        );
        setTests(assessments.filter((a) => a.status === "in_progress").length);
        setOffers(offerList.filter((o) => o.status === "sent").length);
        setUnread(notes.filter((n) => !n.is_read).length);
        setScore(analysis?.match_percentage ?? null);
        const rec = analysis?.recommendations;
        setTips(Array.isArray(rec) ? rec.map(String).slice(0, 3) : []);
        if (!cand) {
          setError("Finish candidate onboarding to load your full profile.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load dashboard.");
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function copyShareLink() {
    if (!user?.candidate_id) {
      setError("Finish onboarding before sharing your profile.");
      return;
    }
    const url = `${window.location.origin}${profilePath(user)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy your unique profile link", url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const name =
    (full
      ? [full.first_name, full.last_name].filter(Boolean).join(" ")
      : "") ||
    user?.full_name ||
    "Candidate";
  const location = full?.location ?? user?.location ?? "—";
  const headline = full?.professional_summary ?? user?.headline ?? "Open to roles";
  const completion = full ? computeCompletion(full) : 0;
  const missing = 9 - Math.round((completion / 100) * 9);

  useEffect(() => {
    if (!user?.full_name) return;
    const previous = document.title;
    document.title = `${user.full_name} · Elevate`;
    return () => {
      document.title = previous;
    };
  }, [user?.full_name]);

  if (!loaded) {
    return <p className="text-sm text-muted">Loading your profile…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>Profile {completion}% complete</span>
        <Link href="/candidate/profile" className="font-semibold text-brand hover:underline">
          Edit profile
        </Link>
      </div>
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-line">
        <div
          className="h-full bg-brand transition-all"
          style={{ width: `${completion}%` }}
        />
      </div>

      {completion < 100 ? (
        <div className="mb-6 flex flex-wrap items-center gap-2 border border-line bg-elevated px-4 py-3 text-sm">
          <span className="text-amber-600 dark:text-amber-400">⚠</span>
          <p className="text-muted">
            Recruiters see a stronger profile when it&apos;s complete.{" "}
            <Link href="/candidate/profile" className="font-semibold text-brand hover:underline">
              {missing} {missing === 1 ? "step" : "steps"} left
            </Link>
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <section className="border border-line bg-elevated px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            {user?.profile_image_url || full?.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user?.profile_image_url || full?.profile_image_url || ""}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-soft text-xl font-bold text-brand">
                {name.slice(0, 1)}
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {name}
              </h1>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted">
                {headline} · {location}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyShareLink}
              className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:bg-soft"
            >
              {copied ? "Link copied" : "Share profile"}
            </button>
            <Link
              href="/candidate/profile"
              className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:bg-soft"
            >
              Edit profile
            </Link>
          </div>
        </div>
      </section>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/candidate/applied", label: "Applied", value: applied },
          { href: "/candidate/interviews", label: "Interviews", value: upcoming },
          { href: "/candidate/assessments", label: "Open tests", value: tests },
          { href: "/candidate/offers", label: "Offers", value: offers },
        ].map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="block border border-line bg-elevated px-4 py-4 transition hover:border-brand"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {s.label}
              </p>
              <p className="mt-1 font-display text-2xl font-bold">{s.value}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="border border-line bg-elevated px-5 py-5">
          <h2 className="font-display text-lg font-bold">Resume score</h2>
          <p className="mt-3 font-display text-4xl font-bold text-brand">
            {score != null ? `${Math.round(score)}%` : "—"}
          </p>
          <p className="mt-2 text-sm text-muted">
            {score != null
              ? "Latest AI match against a job description."
              : "Upload a resume, then matching scores appear after analysis."}
          </p>
        </section>
        <section className="border border-line bg-elevated px-5 py-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Inbox</h2>
            <Link href="/candidate/inbox" className="text-xs font-semibold text-brand">
              {unread} unread
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted">
            Interview updates, assessments, and offers land here.
          </p>
          {tips.length ? (
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {tips.map((t) => (
                <li key={t}>— {t}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No AI suggestions yet.</p>
          )}
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">Recommended jobs</h2>
            <p className="mt-1 text-sm text-muted">
              Roles matched to your skills and location.
            </p>
          </div>
          <Link href="/candidate/jobs" className="text-sm font-semibold text-brand hover:underline">
            Browse all
          </Link>
        </div>

        {recommended.length === 0 ? (
          <p className="border border-line bg-elevated px-5 py-8 text-sm text-muted">
            No published jobs yet. When recruiters post roles, they&apos;ll show here.
          </p>
        ) : (
          <ul className="divide-y divide-line border border-line bg-elevated">
            {recommended.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/candidate/jobs/${job.id}`}
                  className="flex flex-wrap items-start justify-between gap-4 px-5 py-5 hover:bg-soft"
                >
                  <div>
                    <p className="font-semibold">{job.title}</p>
                    <p className="text-sm text-muted">
                      {companyName(job)} · {job.location ?? "Location TBD"} ·{" "}
                      {formatWorkMode(job.work_mode)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {formatPay(job.salary_min, job.salary_max)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-brand">View →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">Applied jobs</h2>
            <p className="mt-1 text-sm text-muted">Your latest applications.</p>
          </div>
          <Link href="/candidate/applied" className="text-sm font-semibold text-brand hover:underline">
            View all
          </Link>
        </div>

        {applications.length === 0 ? (
          <p className="border border-line bg-elevated px-5 py-8 text-sm text-muted">
            You haven&apos;t applied yet.{" "}
            <Link href="/candidate/jobs" className="font-semibold text-brand">
              Browse jobs
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-line border border-line bg-elevated">
            {applications.map((app) => {
              const raw = app.jobs as JobRow | JobRow[] | null;
              const job = Array.isArray(raw) ? raw[0] : raw;
              return (
                <li key={app.id}>
                  <Link
                    href={job?.id ? `/candidate/jobs/${job.id}` : "/candidate/applied"}
                    className="flex flex-wrap items-start justify-between gap-4 px-5 py-5 hover:bg-soft"
                  >
                    <div>
                      <p className="font-semibold">{job?.title ?? "Role"}</p>
                      <p className="text-sm text-muted">
                        {companyName(job)} · {job?.location ?? "—"}
                      </p>
                    </div>
                    <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold capitalize text-brand">
                      {stageLabel(app.status)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
