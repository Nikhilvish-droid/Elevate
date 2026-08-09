"use client";

import { useEffect, useState } from "react";
import {
  DashShell,
  IconBrief,
  IconCal,
  IconHome,
  IconList,
  IconMsg,
  IconOffer,
  IconStar,
} from "@/components/DashShell";
import { applicants, postedJobs } from "@/data/mock";
import { DemoUser, getUser } from "@/lib/demo";

type View =
  | "home"
  | "jobs"
  | "apps"
  | "shortlist"
  | "interviews"
  | "email"
  | "offers";

export default function RecruiterPage() {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [view, setView] = useState<View>("home");
  const [shortlisted, setShortlisted] = useState<string[]>(["a3"]);

  useEffect(() => {
    const u = getUser();
    setUser(
      u?.role === "company"
        ? u
        : {
            email: "hiring@elevate.app",
            role: "company",
            name: "Alex Rivera",
            companyName: "Elevate Labs",
            jobTitle: "Recruiter",
          },
    );
  }, []);

  const company = user?.companyName ?? "Elevate Labs";
  const name = user?.name ?? "Recruiter";
  const title = user?.jobTitle ?? "Recruiter";

  const nav = [
    { label: "Home", icon: <IconHome />, id: "home" as View },
    { label: "Jobs", icon: <IconBrief />, id: "jobs" as View },
    { label: "Apps", icon: <IconList />, id: "apps" as View },
    { label: "Shortlist", icon: <IconStar />, id: "shortlist" as View },
    { label: "Interview", icon: <IconCal />, id: "interviews" as View },
    { label: "Email", icon: <IconMsg />, id: "email" as View },
    { label: "Offers", icon: <IconOffer />, id: "offers" as View },
  ];

  function toggleShortlist(id: string) {
    setShortlisted((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <DashShell
      role="company"
      nav={nav.map((item) => ({
        href: "#",
        label: item.label,
        icon: item.icon,
        active: view === item.id,
        onClick: () => setView(item.id),
      }))}
    >
      <div className="mx-auto max-w-3xl">
        {view === "home" ? (
          <>
            <div className="mb-4 h-1 overflow-hidden rounded-full bg-line">
              <div className="h-full w-[70%] bg-brand" />
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-2 border border-line bg-elevated px-4 py-3 text-sm">
              <span className="text-amber-700">⚠</span>
              <p className="text-muted">
                Company profile is incomplete — candidates see less trust.{" "}
                <button
                  type="button"
                  className="font-semibold text-brand hover:underline"
                >
                  Finish setup
                </button>
              </p>
            </div>

            <section className="border border-line bg-elevated px-5 py-6 sm:px-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-soft text-xl font-bold text-brand">
                    {company.slice(0, 1)}
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-bold tracking-tight">
                      {company}
                    </h1>
                    <p className="mt-0.5 text-sm text-muted">
                      {name} · {title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setView("jobs")}
                  className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
                >
                  Post a job
                </button>
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <p className="text-sm font-medium">Hiring status</p>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Actively hiring
                </button>
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-4">
                <h2 className="font-display text-xl font-bold">Candidates</h2>
                <p className="mt-1 text-sm text-muted">
                  People who applied — ranked by match score.
                </p>
              </div>

              <CandidateList
                rows={applicants}
                shortlisted={shortlisted}
                onShortlist={toggleShortlist}
                onSchedule={() => setView("interviews")}
                onEmail={() => setView("email")}
              />
            </section>
          </>
        ) : null}

        {view === "jobs" ? (
          <Panel title="Post jobs" sub="Create and manage open roles." action="New job">
            <ul className="divide-y divide-line border border-line bg-elevated">
              {postedJobs.map((job) => (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <p className="font-semibold">{job.title}</p>
                    <p className="text-sm text-muted">
                      {job.applicants} applicants · Posted {job.posted}
                    </p>
                  </div>
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      job.status === "Open"
                        ? "bg-soft text-brand"
                        : "bg-line text-muted"
                    }`}
                  >
                    {job.status}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {view === "apps" ? (
          <Panel title="Applications" sub="All candidates who applied to your jobs.">
            <CandidateList
              rows={applicants}
              shortlisted={shortlisted}
              onShortlist={toggleShortlist}
              onSchedule={() => setView("interviews")}
              onEmail={() => setView("email")}
            />
          </Panel>
        ) : null}

        {view === "shortlist" ? (
          <Panel title="Shortlist" sub="Candidates you’ve marked to move forward.">
            <CandidateList
              rows={applicants.filter((a) => shortlisted.includes(a.id))}
              shortlisted={shortlisted}
              onShortlist={toggleShortlist}
              onSchedule={() => setView("interviews")}
              onEmail={() => setView("email")}
            />
          </Panel>
        ) : null}

        {view === "interviews" ? (
          <Panel
            title="Schedule interviews"
            sub="Pick a time and notify the candidate (demo)."
          >
            <div className="border border-line bg-elevated px-5 py-6">
              <label className="block text-sm font-medium">
                Candidate
                <select className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm">
                  {applicants.map((a) => (
                    <option key={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block text-sm font-medium">
                Date & time
                <input
                  type="datetime-local"
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                />
              </label>
              <button
                type="button"
                className="mt-5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
              >
                Schedule
              </button>
            </div>
          </Panel>
        ) : null}

        {view === "email" ? (
          <Panel title="Send email" sub="Message an applicant (demo only).">
            <div className="border border-line bg-elevated px-5 py-6">
              <label className="block text-sm font-medium">
                To
                <select className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm">
                  {applicants.map((a) => (
                    <option key={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block text-sm font-medium">
                Subject
                <input
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                  defaultValue="Next steps for your application"
                />
              </label>
              <label className="mt-4 block text-sm font-medium">
                Message
                <textarea
                  rows={5}
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                  defaultValue="Hi — thanks for applying. We'd like to move forward…"
                />
              </label>
              <button
                type="button"
                className="mt-5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
              >
                Send
              </button>
            </div>
          </Panel>
        ) : null}

        {view === "offers" ? (
          <Panel
            title="Offer letters"
            sub="Generate a simple offer (demo — no company settings)."
          >
            <div className="border border-line bg-elevated px-5 py-6">
              <label className="block text-sm font-medium">
                Candidate
                <select className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm">
                  {applicants.map((a) => (
                    <option key={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block text-sm font-medium">
                Role
                <input
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                  defaultValue="Full Stack Developer"
                />
              </label>
              <label className="mt-4 block text-sm font-medium">
                CTC
                <input
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                  defaultValue="₹18L"
                />
              </label>
              <button
                type="button"
                className="mt-5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
              >
                Generate offer
              </button>
            </div>
          </Panel>
        ) : null}
      </div>
    </DashShell>
  );
}

function Panel({
  title,
  sub,
  action,
  children,
}: {
  title: string;
  sub: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-muted">{sub}</p>
        </div>
        {action ? (
          <button
            type="button"
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
          >
            {action}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function CandidateList({
  rows,
  shortlisted,
  onShortlist,
  onSchedule,
  onEmail,
}: {
  rows: typeof applicants;
  shortlisted: string[];
  onShortlist: (id: string) => void;
  onSchedule: () => void;
  onEmail: () => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        No candidates here yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line border border-line bg-elevated">
      {rows.map((person) => (
        <li
          key={person.id}
          className="flex flex-wrap items-start justify-between gap-4 px-5 py-5"
        >
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
              {person.name.slice(0, 1)}
            </div>
            <div>
              <p className="font-semibold">{person.name}</p>
              <p className="text-sm text-muted">
                {person.role} · {person.job}
              </p>
              <p className="mt-1 text-sm text-muted">{person.location}</p>
              <p className="mt-1 text-xs text-muted">
                {person.stage} · Applied {person.applied}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onShortlist(person.id)}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                >
                  {shortlisted.includes(person.id) ? "Shortlisted" : "Shortlist"}
                </button>
                <button
                  type="button"
                  onClick={onSchedule}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                >
                  Interview
                </button>
                <button
                  type="button"
                  onClick={onEmail}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                >
                  Email
                </button>
              </div>
            </div>
          </div>
          <span className="text-sm font-semibold text-brand">
            {person.match}% match
          </span>
        </li>
      ))}
    </ul>
  );
}
