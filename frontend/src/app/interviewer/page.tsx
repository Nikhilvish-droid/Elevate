"use client";

import { useEffect, useState } from "react";
import {
  DashShell,
  IconCal,
  IconHome,
  IconMsg,
} from "@/components/DashShell";
import { interviews } from "@/data/mock";
import { DemoUser, getUser, setUser } from "@/lib/demo";

type View = "home" | "rounds" | "feedback";

export default function InterviewerPage() {
  const [user, setLocal] = useState<DemoUser | null>(null);
  const [view, setView] = useState<View>("home");
  const [activeId, setActiveId] = useState(interviews[0]?.id ?? "");
  const [rating, setRating] = useState("4");
  const [feedback, setFeedback] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    const u = getUser();
    const next: DemoUser =
      u?.role === "company"
        ? {
            ...u,
            teamRole: "interviewer",
            jobTitle: u.jobTitle || "Interviewer",
          }
        : {
            email: "interview@elevate.app",
            role: "company",
            name: "Sam Ortiz",
            companyName: "Elevate Labs",
            jobTitle: "Interviewer",
            teamRole: "interviewer",
          };
    setUser(next);
    setLocal(next);
  }, []);

  const company = user?.companyName ?? "Elevate Labs";
  const name = user?.name ?? "Interviewer";
  const active = interviews.find((i) => i.id === activeId) ?? interviews[0];

  const nav = [
    { label: "Home", icon: <IconHome />, id: "home" as View },
    { label: "Rounds", icon: <IconCal />, id: "rounds" as View },
    { label: "Feedback", icon: <IconMsg />, id: "feedback" as View },
  ];

  function submitFeedback() {
    setSaved(`Feedback saved for ${active?.candidate} (demo).`);
    setFeedback("");
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
        {view === "home" ? (
          <>
            <div className="mb-4 h-1 overflow-hidden rounded-full bg-line">
              <div className="h-full w-[40%] bg-brand" />
            </div>
            <div className="mb-6 border border-line bg-elevated px-4 py-3 text-sm text-muted">
              Interviewers run assigned rounds and leave feedback — no job
              posting, shortlisting, or offers.
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
                    Interviewer · {company}
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
                onOpen={(id) => {
                  setActiveId(id);
                  setView("feedback");
                }}
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
              onOpen={(id) => {
                setActiveId(id);
                setView("feedback");
              }}
            />
          </section>
        ) : null}

        {view === "feedback" ? (
          <section>
            <h2 className="font-display text-xl font-bold">Leave feedback</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              Structured notes for the hiring manager.
            </p>
            <div className="border border-line bg-elevated px-5 py-6">
              <label className="block text-sm font-medium">
                Interview
                <select
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                  value={activeId}
                  onChange={(e) => setActiveId(e.target.value)}
                >
                  {interviews.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.candidate} · {i.round}
                    </option>
                  ))}
                </select>
              </label>
              {active ? (
                <p className="mt-2 text-sm text-muted">
                  {active.job} · {active.when} · {active.status}
                </p>
              ) : null}
              <label className="mt-4 block text-sm font-medium">
                Score (1–5)
                <select
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                >
                  {["1", "2", "3", "4", "5"].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block text-sm font-medium">
                Feedback
                <textarea
                  rows={5}
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                  placeholder="What went well? Any concerns?"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={submitFeedback}
                className="mt-5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
              >
                Submit feedback
              </button>
              {saved ? (
                <p className="mt-3 text-sm text-brand" role="status">
                  {saved}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </DashShell>
  );
}

function InterviewList({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <ul className="divide-y divide-line border border-line bg-elevated">
      {interviews.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-start justify-between gap-4 px-5 py-5"
        >
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
              {item.candidate.slice(0, 1)}
            </div>
            <div>
              <p className="font-semibold">{item.candidate}</p>
              <p className="text-sm text-muted">
                {item.round} · {item.job}
              </p>
              <p className="mt-1 text-sm text-muted">{item.when}</p>
              <button
                type="button"
                onClick={() => onOpen(item.id)}
                className="mt-2 rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
              >
                {item.status === "Needs feedback"
                  ? "Add feedback"
                  : "Open feedback"}
              </button>
            </div>
          </div>
          <span
            className={`text-xs font-semibold ${
              item.status === "Needs feedback" ? "text-amber-700" : "text-brand"
            }`}
          >
            {item.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
