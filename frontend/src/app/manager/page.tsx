"use client";

import { useEffect, useState } from "react";
import {
  DashShell,
  IconChart,
  IconCheck,
  IconHome,
  IconMsg,
  IconStar,
} from "@/components/DashShell";
import { analytics, applicants } from "@/data/mock";
import { Profile, getProfile } from "@/lib/profile";

type View = "home" | "shortlist" | "approve" | "feedback" | "analytics";

export default function ManagerPage() {
  const [user, setLocal] = useState<Profile | null>(null);
  const [view, setView] = useState<View>("home");
  const [approved, setApproved] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const shortlist = applicants.filter((a) => a.stage === "Shortlisted");

  useEffect(() => {
    getProfile().then(setLocal);
  }, []);

  const company = user?.company_name ?? "Your company";
  const name = user?.full_name ?? "Hiring Manager";

  const nav = [
    { label: "Home", icon: <IconHome />, id: "home" as View },
    { label: "Shortlist", icon: <IconStar />, id: "shortlist" as View },
    { label: "Approve", icon: <IconCheck />, id: "approve" as View },
    { label: "Feedback", icon: <IconMsg />, id: "feedback" as View },
    { label: "Analytics", icon: <IconChart />, id: "analytics" as View },
  ];

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
        {view === "home" ? (
          <>
            <div className="mb-4 h-1 overflow-hidden rounded-full bg-line">
              <div className="h-full w-[55%] bg-brand" />
            </div>
            <div className="mb-6 border border-line bg-elevated px-4 py-3 text-sm text-muted">
              Hiring managers review shortlists and decide — you can&apos;t post
              jobs or change company settings.
            </div>

            <section className="border border-line bg-elevated px-5 py-6 sm:px-7">
              <div className="flex gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-soft text-xl font-bold text-brand">
                  {company.slice(0, 1)}
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight">
                    {company}
                  </h1>
                  <p className="mt-0.5 text-sm text-muted">
                    {name} · Hiring manager
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-4">
                <h2 className="font-display text-xl font-bold">
                  Shortlisted candidates
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Ready for your review and hire decision.
                </p>
              </div>
              <ShortlistRows
                rows={shortlist}
                approved={approved}
                onApprove={(id) =>
                  setApproved((p) => (p.includes(id) ? p : [...p, id]))
                }
                onFeedback={() => setView("feedback")}
              />
            </section>
          </>
        ) : null}

        {view === "shortlist" ? (
          <section>
            <h2 className="font-display text-xl font-bold">Review shortlist</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              Candidates recruiters marked for you.
            </p>
            <ShortlistRows
              rows={shortlist}
              approved={approved}
              onApprove={(id) =>
                setApproved((p) => (p.includes(id) ? p : [...p, id]))
              }
              onFeedback={() => setView("feedback")}
            />
          </section>
        ) : null}

        {view === "approve" ? (
          <section>
            <h2 className="font-display text-xl font-bold">Approve hiring</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              Sign off who moves to offer.
            </p>
            <ul className="divide-y divide-line border border-line bg-elevated">
              {shortlist.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-muted">
                      {p.job} · {p.match}% match
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setApproved((prev) =>
                        prev.includes(p.id)
                          ? prev.filter((x) => x !== p.id)
                          : [...prev, p.id],
                      )
                    }
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                      approved.includes(p.id)
                        ? "bg-brand text-white"
                        : "border border-line hover:bg-soft"
                    }`}
                  >
                    {approved.includes(p.id) ? "Approved" : "Approve hire"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {view === "feedback" ? (
          <section>
            <h2 className="font-display text-xl font-bold">Give feedback</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              Notes the hiring team can see.
            </p>
            <div className="space-y-4">
              {shortlist.map((p) => (
                <div key={p.id} className="border border-line bg-elevated px-5 py-4">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted">{p.job}</p>
                  <textarea
                    rows={3}
                    className="mt-3 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
                    placeholder="Strengths, gaps, hire / no-hire…"
                    value={notes[p.id] ?? ""}
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [p.id]: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="mt-2 rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-soft"
                  >
                    Save note
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {view === "analytics" ? (
          <section>
            <h2 className="font-display text-xl font-bold">Analytics</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              Funnel snapshot for your open roles.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {analytics.map((a) => (
                <div
                  key={a.label}
                  className="border border-line bg-elevated px-4 py-5"
                >
                  <p className="text-2xl font-bold text-brand">{a.value}</p>
                  <p className="mt-1 text-sm text-muted">{a.label}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </DashShell>
  );
}

function ShortlistRows({
  rows,
  approved,
  onApprove,
  onFeedback,
}: {
  rows: typeof applicants;
  approved: string[];
  onApprove: (id: string) => void;
  onFeedback: () => void;
}) {
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
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onApprove(person.id)}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                >
                  {approved.includes(person.id) ? "Approved" : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={onFeedback}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                >
                  Feedback
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
