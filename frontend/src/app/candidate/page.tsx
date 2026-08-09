"use client";

import { useEffect, useState } from "react";
import {
  DashShell,
  IconBrief,
  IconHome,
  IconList,
  IconMsg,
  IconUser,
} from "@/components/DashShell";
import { jobs } from "@/data/mock";
import { DemoUser, getUser } from "@/lib/demo";

const nav = [
  { href: "/candidate", label: "Home", icon: <IconHome /> },
  { href: "/candidate", label: "Profile", icon: <IconUser /> },
  { href: "/candidate", label: "Jobs", icon: <IconBrief /> },
  { href: "/candidate", label: "Applied", icon: <IconList /> },
  { href: "/candidate", label: "Messages", icon: <IconMsg /> },
];

export default function CandidatePage() {
  const [user, setUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    const u = getUser();
    setUser(
      u?.role === "candidate"
        ? u
        : {
            email: "demo@elevate.app",
            role: "candidate",
            name: "Nikhil Vishwakarma",
            headline: "Full Stack Engineer",
            location: "Mumbai",
          },
    );
  }, []);

  const name = user?.name ?? "Candidate";
  const location = user?.location ?? "Mumbai";
  const headline = user?.headline ?? "Looking for roles";

  return (
    <DashShell role="candidate" nav={nav}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full w-[45%] bg-brand" />
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 border border-line bg-elevated px-4 py-3 text-sm">
          <span className="text-amber-700">⚠</span>
          <p className="text-muted">
            Your profile can&apos;t be found by recruiters — it&apos;s missing key
            info.{" "}
            <button type="button" className="font-semibold text-brand hover:underline">
              2 steps to complete
            </button>
          </p>
        </div>

        <section className="border border-line bg-elevated px-5 py-6 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-soft text-xl font-bold text-brand">
                {name.slice(0, 1)}
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight">
                  {name}
                </h1>
                <p className="mt-0.5 text-sm text-muted">
                  {headline} · {location}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="text-sm font-medium text-brand hover:underline"
            >
              View public profile
            </button>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <p className="text-sm font-medium">Where are you in your job search?</p>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Ready to interview
            </button>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="font-display text-xl font-bold">Recommended jobs</h2>
            <p className="mt-1 text-sm text-muted">
              Roles where your skills look like a strong fit.
            </p>
          </div>

          <ul className="divide-y divide-line border border-line bg-elevated">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-start justify-between gap-4 px-5 py-5"
              >
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-soft text-sm font-bold text-brand">
                    {job.company.slice(0, 1)}
                  </div>
                  <div>
                    <p className="font-semibold">{job.title}</p>
                    <p className="text-sm text-muted">{job.company}</p>
                    <p className="mt-1 text-sm text-muted">
                      {job.location} · {job.pay}
                    </p>
                    <p className="mt-1 text-xs text-muted">Posted {job.posted}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm font-semibold text-brand">
                    {job.match}% match
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-soft"
                  >
                    Save
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </DashShell>
  );
}
