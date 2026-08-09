"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

const navLinks = [
  { href: "#workflow", label: "Workflow" },
  { href: "#features", label: "Features" },
  { href: "#roles", label: "Roles" },
  { href: "#faq", label: "FAQ" },
];

const pipelineStages = [
  "Applied",
  "Screening",
  "Shortlisted",
  "Technical",
  "HR",
  "Offer",
  "Hired",
];

const features = [
  {
    title: "Jobs with real hiring fields",
    body: "Post roles with salary, required skills, work mode, and deadlines — then edit, close, or duplicate without leaving the workspace.",
  },
  {
    title: "AI resume match scores",
    body: "Upload PDF or DOCX (up to 10 MB). Elevate parses skills and experience, auto-fills the profile, and scores fit per job — e.g. 87% match with strong React/Node and gaps in AWS/Docker.",
  },
  {
    title: "Kanban hiring pipeline",
    body: "Drag candidates across Applied → Resume Screening → Shortlisted → Technical → HR → Offer → Hired / Rejected so every stage stays visible.",
  },
  {
    title: "Interviews that stay in sync",
    body: "Assign interviewers, lock a time, send invites, and surface the same schedule in email plus the dashboard — no spreadsheet chase.",
  },
  {
    title: "Coding assessments",
    body: "MCQs, coding problems, and SQL with timers, auto-submit, and tab-switch detection so evaluations stay fair.",
  },
  {
    title: "Offers and funnel analytics",
    body: "Generate offer letters with accept/reject, then track time-to-hire, stage conversion, and where candidates stall.",
  },
];

const roles = [
  {
    name: "Candidate",
    body: "Build a profile, apply to jobs, take assessments, and track interviews and offers in one portal.",
  },
  {
    name: "Recruiter",
    body: "Post jobs, screen resumes, move the pipeline, and keep candidates progressing.",
  },
  {
    name: "Hiring Manager",
    body: "Review shortlists, compare match insights, and decide who advances.",
  },
  {
    name: "Interviewer",
    body: "Join scheduled rounds and leave structured feedback managers can actually use.",
  },
  {
    name: "Admin",
    body: "Manage company access, roles, and workspace settings for the hiring team.",
  },
];

const faqs = [
  {
    q: "Who is Elevate built for?",
    a: "Five roles on one system: Candidate, Recruiter, Hiring Manager, Interviewer, and Admin — each with their own view of the hiring flow.",
  },
  {
    q: "How does AI matching work?",
    a: "Resumes (PDF/DOCX) are parsed for skills, experience, and education, then scored against the job’s requirements with clear strengths and gaps.",
  },
  {
    q: "What does the pipeline look like?",
    a: "A drag-and-drop board: Applied → Resume Screening → Shortlisted → Technical Interview → HR Interview → Offer → Hired or Rejected.",
  },
  {
    q: "How do companies and candidates both use it?",
    a: "Companies post jobs and run the workflow. Candidates create profiles, apply, sit assessments, and follow offers — two sides, one ATS.",
  },
  {
    q: "How do I sign in?",
    a: "Sign up or log in from the header. Google OAuth and email/password auth are part of the product plan (Supabase).",
  },
];

export default function Home() {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [jobQuery, setJobQuery] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("elevate-theme");
    const preferDark =
      saved === "dark" ||
      (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(preferDark);
    document.documentElement.classList.toggle("dark", preferDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("elevate-theme", next ? "dark" : "light");
  }

  function goHireSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = candidateQuery.trim();
    const params = new URLSearchParams({ role: "company" });
    if (q) params.set("q", q);
    params.set("intent", "search-candidates");
    router.push(`/signup?${params.toString()}`);
  }

  function goJobSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = jobQuery.trim();
    const params = new URLSearchParams({ role: "candidate" });
    if (q) params.set("q", q);
    params.set("intent", "search-jobs");
    router.push(`/signup?${params.toString()}`);
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--brand)] focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Elevate home" className="flex items-center">
            <Logo className="h-12 sm:h-14" />
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? "Light" : "Dark"}
            </button>
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-deep)]"
            >
              Sign up
            </Link>
          </div>

          <button
            type="button"
            className="rounded-md border border-[var(--line)] px-3 py-1.5 text-sm md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            Menu
          </button>
        </div>

        {menuOpen && (
          <div
            id="mobile-nav"
            className="border-t border-[var(--line)] px-5 py-4 md:hidden"
          >
            <div className="flex flex-col gap-3">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-medium text-[var(--ink-muted)]"
                >
                  {l.label}
                </a>
              ))}
              <button
                type="button"
                onClick={toggleTheme}
                className="text-left text-sm"
              >
                {dark ? "Light mode" : "Dark mode"}
              </button>
              <Link href="/login" className="text-sm font-medium">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-[var(--brand)] px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Sign up
              </Link>
            </div>
          </div>
        )}
      </header>

      <main id="main">
        {/* Image hero — text left, image right */}
        <section className="relative overflow-hidden bg-[var(--bg)] px-5 py-12 sm:px-8 sm:py-16">
          <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="animate-rise flex flex-col items-center justify-center text-center">
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-[var(--brand-deep)] dark:text-[var(--brand)] sm:text-5xl">
                Elevate
              </h1>
              <p className="mx-auto mt-4 max-w-md text-base text-[var(--ink-muted)] sm:text-lg">
                Hire talent or find your next role — two sides, one desk.
              </p>
            </div>

            <div className="animate-rise-delay-1 w-full max-w-xl justify-self-center overflow-hidden lg:max-w-none lg:justify-self-end">
              <Image
                src="/frontimage.jpg"
                alt="Elevate — find jobs and hire candidates"
                width={1407}
                height={768}
                priority
                quality={100}
                unoptimized
                sizes="(max-width: 1024px) 90vw, 560px"
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        {/* Two paths — outside / below the image */}
        <section className="border-t border-[var(--line)] bg-[var(--bg)] py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:gap-14">
            <div className="border-t border-[var(--line)] pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand)]">
                For companies / recruiters
              </p>
              <h2 className="mt-2 font-display text-xl font-semibold text-[var(--brand-deep)] dark:text-[var(--brand)] sm:text-2xl">
                Hire candidates
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
                Search candidates by skill or role. Building a team? Create
                your company profile.
              </p>
              <form onSubmit={goHireSearch} className="mt-5 flex gap-2">
                <label className="sr-only" htmlFor="candidate-search">
                  Search candidates
                </label>
                <input
                  id="candidate-search"
                  value={candidateQuery}
                  onChange={(e) => setCandidateQuery(e.target.value)}
                  placeholder="Search candidates…"
                  className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-md bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-deep)]"
                >
                  Search
                </button>
              </form>
              <Link
                href="/signup?role=company&intent=create-company"
                className="mt-4 inline-flex text-sm font-semibold text-[var(--brand)] underline-offset-4 hover:underline"
              >
                Create company profile →
              </Link>
            </div>

            <div className="border-t border-[var(--line)] pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand)]">
                For candidates
              </p>
              <h2 className="mt-2 font-display text-xl font-semibold text-[var(--brand-deep)] dark:text-[var(--brand)] sm:text-2xl">
                Find jobs
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
                Search jobs and companies that are hiring. New here? Create
                your candidate profile.
              </p>
              <form onSubmit={goJobSearch} className="mt-5 flex gap-2">
                <label className="sr-only" htmlFor="job-search">
                  Search jobs and companies
                </label>
                <input
                  id="job-search"
                  value={jobQuery}
                  onChange={(e) => setJobQuery(e.target.value)}
                  placeholder="Search jobs & companies…"
                  className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-md bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-deep)]"
                >
                  Search
                </button>
              </form>
              <Link
                href="/signup?role=candidate&intent=create-profile"
                className="mt-4 inline-flex text-sm font-semibold text-[var(--brand)] underline-offset-4 hover:underline"
              >
                Create candidate profile →
              </Link>
            </div>
          </div>
        </section>

        <section
          id="workflow"
          className="border-t border-[var(--line)] py-20 sm:py-28"
        >
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              The hiring board, not a spreadsheet
            </h2>
            <p className="mt-3 max-w-2xl text-[var(--ink-muted)]">
              Every candidate moves through the same stages. Recruiters drag;
              managers see where the funnel stalls.
            </p>

            <div
              className="mt-12 flex gap-2 overflow-x-auto pb-2"
              aria-label="Hiring pipeline stages"
            >
              {pipelineStages.map((stage, i) => (
                <div
                  key={stage}
                  className="stage-chip shrink-0 border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3"
                  style={{ animationDelay: `${0.05 * i}s` }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                    Stage {i + 1}
                  </p>
                  <p className="mt-1 font-display text-sm font-semibold text-[var(--brand-deep)] dark:text-[var(--brand)]">
                    {stage}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <h3 className="font-display text-xl font-semibold">
                  AI match before the shortlist meeting
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--ink-muted)]">
                  Parse the resume once. Score it against the job. Show what
                  already fits and what is still missing — so screening is
                  evidence, not gut feel.
                </p>
              </div>

              <div
                className="match-panel border border-[var(--line)] bg-[var(--bg-elevated)] p-6"
                aria-label="Example AI match result"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                      Full Stack Engineer
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold">
                      Ananya Sharma
                    </p>
                  </div>
                  <p className="match-score font-display text-4xl font-bold text-[var(--brand)]">
                    87%
                  </p>
                </div>
                <div className="mt-6 h-1.5 overflow-hidden bg-[var(--accent-soft)]">
                  <div className="match-bar h-full w-[87%] bg-[var(--brand)]" />
                </div>
                <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                      Strong
                    </dt>
                    <dd className="mt-1 text-[var(--ink)]">React · Node.js</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                      Missing
                    </dt>
                    <dd className="mt-1 text-[var(--ink)]">AWS · Docker</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="border-t border-[var(--line)] bg-[var(--accent-soft)] py-20 sm:py-28"
        >
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              What Elevate covers
            </h2>
            <p className="mt-3 max-w-2xl text-[var(--ink-muted)]">
              From the job post to the signed offer — modules built around how
              campus and startup hiring actually runs.
            </p>
            <ul className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <li key={f.title} className="border-t border-[var(--line)] pt-6">
                  <h3 className="font-display text-lg font-semibold text-[var(--brand-deep)] dark:text-[var(--brand)]">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
                    {f.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="roles"
          className="border-t border-[var(--line)] py-20 sm:py-28"
        >
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Five roles. One system.
            </h2>
            <p className="mt-3 max-w-2xl text-[var(--ink-muted)]">
              No shared inbox chaos — each person opens Elevate and sees their
              part of the hire.
            </p>
            <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map((r) => (
                <li key={r.name} className="border-t border-[var(--line)] pt-5">
                  <h3 className="font-display text-lg font-semibold">
                    {r.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
                    {r.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="faq" className="border-t border-[var(--line)] py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              FAQ
            </h2>
            <p className="mt-3 text-[var(--ink-muted)]">
              Straight answers on roles, matching, pipeline, and access.
            </p>
            <div className="mt-10 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {faqs.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div key={item.q}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 py-4 text-left font-medium"
                      aria-expanded={open}
                      onClick={() => setOpenFaq(open ? null : i)}
                    >
                      {item.q}
                      <span className="text-[var(--brand)]" aria-hidden>
                        {open ? "−" : "+"}
                      </span>
                    </button>
                    {open && (
                      <p className="pb-4 text-sm leading-relaxed text-[var(--ink-muted)]">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)] py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 sm:flex-row sm:items-start sm:justify-between sm:px-8">
          <div>
            <Logo className="h-8" />
            <p className="mt-3 max-w-xs text-sm text-[var(--ink-muted)]">
              Dual-sided ATS: companies run the hire, candidates apply and
              track — with AI scoring in between.
            </p>
          </div>
          <div className="flex flex-wrap gap-10 text-sm">
            <div className="flex flex-col gap-2">
              <span className="font-semibold">Product</span>
              <a
                href="#workflow"
                className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                Workflow
              </a>
              <a
                href="#features"
                className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                Features
              </a>
              <a
                href="#roles"
                className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                Roles
              </a>
              <a
                href="#faq"
                className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                FAQ
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold">Account</span>
              <Link
                href="/login"
                className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl px-5 text-xs text-[var(--ink-muted)] sm:px-8">
          © {new Date().getFullYear()} Elevate · DevFusion — AI-Powered
          Recruitment & ATS
        </p>
      </footer>
    </>
  );
}
