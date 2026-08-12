"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/lib/theme";
import type { PublicCandidate } from "@/lib/candidate";

function monthYear(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 7);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function dateRange(start: string | null, end: string | null, current?: boolean) {
  const from = monthYear(start) || "—";
  if (current) return `${from} – Present`;
  return `${from} – ${monthYear(end) || "—"}`;
}

function LinkOut({ href, label }: { href: string; label: string }) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="rounded-full border border-line px-3 py-1 text-xs font-semibold hover:border-brand hover:text-brand"
    >
      {label}
    </a>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="flex h-14 items-center justify-between border-b border-line bg-elevated px-4 sm:px-6">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-sm font-bold text-white"
        >
          E
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-soft hover:text-ink" />
          <Link
            href="/auth?tab=login"
            className="text-sm font-semibold text-brand hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>
      <main className="px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}

export function PublicProfileView({
  profile,
}: {
  profile: PublicCandidate;
}) {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  const skillTags = (profile.skills || [])
    .filter((s) => s.category !== "desired_role")
    .map((s) => s.name);
  const openTo = (profile.skills || [])
    .filter((s) => s.category === "desired_role")
    .map((s) => s.name);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="border border-line bg-elevated px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-start gap-5">
          {profile.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profile_image_url}
              alt=""
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-soft text-3xl font-bold text-brand">
              {name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {name}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {openTo[0] || "Candidate"}
              {profile.total_experience_years != null
                ? ` · ${profile.total_experience_years} yr exp`
                : ""}
              {profile.location ? ` · ${profile.location}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.linkedin_url ? (
                <LinkOut href={profile.linkedin_url} label="LinkedIn" />
              ) : null}
              {profile.github_url ? (
                <LinkOut href={profile.github_url} label="GitHub" />
              ) : null}
              {profile.portfolio_url ? (
                <LinkOut href={profile.portfolio_url} label="Portfolio" />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border border-line bg-elevated px-5 py-6 sm:px-7">
        <h2 className="font-display text-lg font-bold">About</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">
          {profile.professional_summary || "No bio yet."}
        </p>
      </section>

      {openTo.length ? (
        <section className="border border-line bg-elevated px-5 py-6 sm:px-7">
          <h2 className="font-display text-lg font-bold">Open to</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {openTo.map((role) => (
              <li
                key={role}
                className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-brand"
              >
                {role}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border border-line bg-elevated px-5 py-6 sm:px-7">
        <h2 className="font-display text-lg font-bold">Skills</h2>
        {skillTags.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {skillTags.map((skill) => (
              <li
                key={skill}
                className="rounded-md border border-line px-3 py-1 text-sm"
              >
                {skill}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No skills listed.</p>
        )}
      </section>

      <section className="border border-line bg-elevated px-5 py-6 sm:px-7">
        <h2 className="font-display text-lg font-bold">Experience</h2>
        {profile.experience?.length ? (
          <ul className="mt-4 space-y-5">
            {profile.experience.map((exp) => (
              <li key={exp.id} className="border-l-2 border-brand/40 pl-4">
                <p className="font-semibold">{exp.job_title}</p>
                <p className="text-sm text-muted">
                  {exp.company_name}
                  {exp.location ? ` · ${exp.location}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {dateRange(exp.start_date, exp.end_date, exp.is_current)}
                </p>
                {exp.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                    {exp.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No experience listed.</p>
        )}
      </section>

      <section className="border border-line bg-elevated px-5 py-6 sm:px-7">
        <h2 className="font-display text-lg font-bold">Education</h2>
        {profile.education?.length ? (
          <ul className="mt-4 space-y-5">
            {profile.education.map((edu) => (
              <li key={edu.id}>
                <p className="font-semibold">{edu.institution_name}</p>
                <p className="text-sm text-muted">
                  {[edu.degree, edu.field_of_study].filter(Boolean).join(" · ") ||
                    "Program not listed"}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {dateRange(edu.start_date, edu.end_date)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No education listed.</p>
        )}
      </section>

      {profile.certifications?.length ? (
        <section className="border border-line bg-elevated px-5 py-6 sm:px-7">
          <h2 className="font-display text-lg font-bold">Certifications</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {profile.certifications.map((c, i) => (
              <li
                key={`${c.certification_name}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  {c.certification_name}
                  {c.issuing_organization
                    ? ` · ${c.issuing_organization}`
                    : ""}
                </span>
                {c.file_url ? (
                  <a
                    href={c.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand"
                  >
                    View file
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
