"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  formatEmployment,
  formatPay,
  formatWorkMode,
  listPublishedJobs,
  type JobRow,
} from "@/lib/candidate";

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [emp, setEmp] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  async function load(filters?: {
    q?: string;
    location?: string;
    work_mode?: string;
    employment_type?: string;
  }) {
    setBusy(true);
    setError("");
    try {
      setJobs(await listPublishedJobs(filters));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load jobs.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    load({
      q,
      location,
      work_mode: workMode || undefined,
      employment_type: emp || undefined,
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Find jobs</h1>
      <p className="mt-1 text-sm text-muted">
        Filter by location, work mode, and employment type.
      </p>

      <form onSubmit={onSearch} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Title or company"
          className="rounded-md border border-line bg-elevated px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
          className="rounded-md border border-line bg-elevated px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
        <select
          value={workMode}
          onChange={(e) => setWorkMode(e.target.value)}
          className="rounded-md border border-line bg-elevated px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          <option value="">Any work mode</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>
        <select
          value={emp}
          onChange={(e) => setEmp(e.target.value)}
          className="rounded-md border border-line bg-elevated px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          <option value="">Any type</option>
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="internship">Internship</option>
          <option value="contract">Contract</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep sm:col-span-2 lg:col-span-4"
        >
          {busy ? "Searching…" : "Search"}
        </button>
      </form>

      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}

      <ul className="mt-6 divide-y divide-line border border-line bg-elevated">
        {!busy && jobs.length === 0 ? (
          <li className="px-5 py-10 text-sm text-muted">
            No roles match these filters. Try clearing search, or wait until a
            recruiter publishes a job.
          </li>
        ) : (
          jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/candidate/jobs/${job.id}`}
                className="flex flex-wrap items-start justify-between gap-4 px-5 py-5 hover:bg-soft"
              >
                <div>
                  <p className="font-semibold">{job.title}</p>
                  <p className="text-sm text-muted">
                    {job.companies?.name ?? "Company"} · {job.location ?? "—"} ·{" "}
                    {formatWorkMode(job.work_mode)} · {formatEmployment(job.employment_type)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {formatPay(job.salary_min, job.salary_max)}
                  </p>
                </div>
                <span className="text-xs font-semibold text-brand">Apply →</span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
