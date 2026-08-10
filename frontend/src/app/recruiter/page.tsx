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
import { Profile, getProfile } from "@/lib/profile";

type View =
  | "home"
  | "jobs"
  | "apps"
  | "shortlist"
  | "interviews"
  | "email"
  | "offers";

export default function RecruiterPage() {
  const [user, setLocal] = useState<Profile | null>(null);
  const [view, setView] = useState<View>("home");
  const [shortlisted, setShortlisted] = useState<string[]>(["a3", "a4"]);

  useEffect(() => {
    getProfile().then(setLocal);
  }, []);

  const company = user?.company_name ?? "Your company";
  const name = user?.full_name ?? "Recruiter";
  const title = user?.job_title ?? "Recruiter";

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
      teamRole="recruiter"
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
            <ProfileCard
              company={company}
              name={name}
              title={title}
              onPost={() => setView("jobs")}
            />
            <section className="mt-8">
              <div className="mb-4">
                <h2 className="font-display text-xl font-bold">Candidates</h2>
                <p className="mt-1 text-sm text-muted">
                  Applications ranked by match. You can shortlist, email, and
                  schedule — not company settings.
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
          <Panel title="Applications" sub="Everyone who applied to your jobs.">
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
          <Panel title="Shortlist" sub="Candidates ready for hiring manager review.">
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
          <Panel title="Schedule interviews" sub="Book a round and notify the candidate.">
            <SimpleForm
              fields={[
                {
                  label: "Candidate",
                  type: "select",
                  options: applicants.map((a) => a.name),
                },
                { label: "Date & time", type: "datetime" },
              ]}
              cta="Schedule"
            />
          </Panel>
        ) : null}

        {view === "email" ? (
          <Panel title="Send email" sub="Message an applicant.">
            <SimpleForm
              fields={[
                {
                  label: "To",
                  type: "select",
                  options: applicants.map((a) => a.name),
                },
                {
                  label: "Subject",
                  type: "text",
                  value: "Next steps for your application",
                },
                {
                  label: "Message",
                  type: "area",
                  value: "Hi — thanks for applying. We'd like to move forward…",
                },
              ]}
              cta="Send"
            />
          </Panel>
        ) : null}

        {view === "offers" ? (
          <Panel title="Offer letters" sub="Generate an offer. Company settings stay with admin.">
            <SimpleForm
              fields={[
                {
                  label: "Candidate",
                  type: "select",
                  options: applicants.map((a) => a.name),
                },
                { label: "Role", type: "text", value: "Full Stack Developer" },
                { label: "CTC", type: "text", value: "₹18L" },
              ]}
              cta="Generate offer"
            />
          </Panel>
        ) : null}
      </div>
    </DashShell>
  );
}

function ProfileCard({
  company,
  name,
  title,
  onPost,
}: {
  company: string;
  name: string;
  title: string;
  onPost: () => void;
}) {
  return (
    <>
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full w-[70%] bg-brand" />
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-2 border border-line bg-elevated px-4 py-3 text-sm">
        <span className="text-amber-700">⚠</span>
        <p className="text-muted">
          Company profile incomplete.{" "}
          <span className="font-semibold text-brand">Recruiters can&apos;t edit company settings.</span>
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
            onClick={onPost}
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
    </>
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

function SimpleForm({
  fields,
  cta,
}: {
  fields: {
    label: string;
    type: "text" | "area" | "select" | "datetime";
    options?: string[];
    value?: string;
  }[];
  cta: string;
}) {
  return (
    <div className="border border-line bg-elevated px-5 py-6">
      {fields.map((f) => (
        <label key={f.label} className="mt-4 block text-sm font-medium first:mt-0">
          {f.label}
          {f.type === "select" ? (
            <select className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm">
              {f.options?.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : null}
          {f.type === "text" ? (
            <input
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
              defaultValue={f.value}
            />
          ) : null}
          {f.type === "datetime" ? (
            <input
              type="datetime-local"
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
            />
          ) : null}
          {f.type === "area" ? (
            <textarea
              rows={5}
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
              defaultValue={f.value}
            />
          ) : null}
        </label>
      ))}
      <button
        type="button"
        className="mt-5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
      >
        {cta}
      </button>
    </div>
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
