"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthLayout,
  Field,
  btnGhost,
  btnPrimary,
  inputClass,
} from "@/components/Auth";
import {
  TeamRole,
  getSessionUser,
  homeFor,
  teamLabel,
  updateProfile,
} from "@/lib/profile";

type Role = "candidate" | "company";

function Onboarding() {
  const router = useRouter();
  const hint = useSearchParams().get("hint");
  const [role, setRole] = useState<Role | null>(
    hint === "company" || hint === "candidate" ? hint : null,
  );
  const [teamRole, setTeamRole] = useState<TeamRole | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("");
  const [about, setAbout] = useState("");

  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [companyAbout, setCompanyAbout] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getSessionUser();
      if (!user) {
        router.replace("/auth?tab=login");
        return;
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function finishCandidate(data: {
    full_name: string;
    headline?: string;
    location?: string;
    skills?: string;
    about?: string;
    onboarding_complete: boolean;
  }) {
    const profile = await updateProfile({
      role: "candidate",
      team_role: null,
      ...data,
    });
    router.push(homeFor(profile));
    router.refresh();
  }

  async function finishCompany(
    team: TeamRole,
    data: {
      full_name: string;
      company_name: string;
      website?: string;
      industry?: string;
      company_size?: string;
      about?: string;
      onboarding_complete: boolean;
    },
  ) {
    const profile = await updateProfile({
      role: "company",
      team_role: team,
      job_title: teamLabel(team),
      ...data,
    });
    router.push(homeFor(profile));
    router.refresh();
  }

  async function saveCandidate(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !headline.trim()) {
      setError("Add your name and headline, or skip for now.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await finishCandidate({
        full_name: fullName.trim(),
        headline: headline.trim(),
        location: location.trim() || undefined,
        skills: skills.trim() || undefined,
        about: about.trim() || undefined,
        onboarding_complete: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCompany(e: FormEvent) {
    e.preventDefault();
    if (!teamRole) return;
    if (!contactName.trim() || !companyName.trim()) {
      setError("Add your name and company — or skip for now.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await finishCompany(teamRole, {
        full_name: contactName.trim(),
        company_name: companyName.trim(),
        website: website.trim() || undefined,
        industry: industry.trim() || undefined,
        company_size: size || undefined,
        about: companyAbout.trim() || undefined,
        onboarding_complete: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    setBusy(true);
    setError("");
    try {
      if (role === "company" && teamRole) {
        await finishCompany(teamRole, {
          full_name:
            teamRole === "manager"
              ? "Jordan Lee"
              : teamRole === "interviewer"
                ? "Sam Ortiz"
                : "Alex Rivera",
          company_name: "Elevate Labs",
          onboarding_complete: true,
        });
        return;
      }
      await finishCandidate({
        full_name: "New Candidate",
        headline: "Open to work",
        location: "Remote",
        onboarding_complete: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <AuthLayout title="Almost there">
        <div className="h-32 animate-pulse rounded-md bg-soft" />
      </AuthLayout>
    );
  }

  if (!role) {
    return (
      <AuthLayout
        title="What brings you here?"
        subtitle="Pick one so we can set up the right profile."
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setRole("candidate")}
            className={`w-full border px-5 py-5 text-left transition hover:border-brand ${
              hint === "candidate"
                ? "border-brand bg-soft"
                : "border-line bg-elevated"
            }`}
          >
            <p className="font-display text-lg font-semibold">
              I&apos;m looking for a job
            </p>
            <p className="mt-1 text-sm text-muted">
              Build a profile and apply to open roles.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setRole("company")}
            className={`w-full border px-5 py-5 text-left transition hover:border-brand ${
              hint === "company"
                ? "border-brand bg-soft"
                : "border-line bg-elevated"
            }`}
          >
            <p className="font-display text-lg font-semibold">I&apos;m hiring</p>
            <p className="mt-1 text-sm text-muted">
              Join as recruiter, hiring manager, or interviewer.
            </p>
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (role === "company" && !teamRole) {
    return (
      <AuthLayout
        title="Your team role"
        subtitle="Each role has limited features — pick the one that fits you."
      >
        <div className="space-y-3">
          {(
            [
              {
                id: "recruiter" as TeamRole,
                title: "Recruiter",
                body: "Post jobs, view apps, shortlist, schedule, email, offers.",
              },
              {
                id: "manager" as TeamRole,
                title: "Hiring manager",
                body: "Review shortlist, approve hires, feedback, analytics.",
              },
              {
                id: "interviewer" as TeamRole,
                title: "Interviewer",
                body: "Join assigned rounds and leave structured feedback.",
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTeamRole(opt.id)}
              className="w-full border border-line bg-elevated px-5 py-5 text-left transition hover:border-brand"
            >
              <p className="font-display text-lg font-semibold">{opt.title}</p>
              <p className="mt-1 text-sm text-muted">{opt.body}</p>
            </button>
          ))}
          <button
            type="button"
            className={btnGhost}
            onClick={() => setRole(null)}
          >
            Back
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (role === "candidate") {
    return (
      <AuthLayout
        eyebrow="Candidate"
        title="Your profile"
        subtitle="Fill this out now, or skip and finish later."
      >
        <form onSubmit={saveCandidate} className="space-y-4" noValidate>
          <Field
            label="Full name"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Field
            label="Headline"
            name="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Full Stack Engineer"
          />
          <Field
            label="Skills"
            name="skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="React, Node, SQL"
          />
          <Field
            label="Location"
            name="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <label className="block text-sm font-medium" htmlFor="about">
            About
            <textarea
              id="about"
              rows={3}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium" htmlFor="resume">
            Resume
            <input
              id="resume"
              type="file"
              accept=".pdf,.doc,.docx"
              className="mt-1.5 block w-full text-sm text-muted"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                setError("");
                setRole(null);
              }}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`flex-1 ${btnPrimary}`}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
          <button
            type="button"
            onClick={skip}
            disabled={busy}
            className={`w-full ${btnGhost} text-muted`}
          >
            Skip for now
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow={teamLabel(teamRole ?? undefined)}
      title="Company details"
      subtitle="Fill this out now, or skip and finish later."
    >
      <form onSubmit={saveCompany} className="space-y-4" noValidate>
        <Field
          label="Your name"
          name="contactName"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
        <Field
          label="Company name"
          name="companyName"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <Field
          label="Website"
          name="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://"
        />
        <Field
          label="Industry"
          name="industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        />
        <label className="block text-sm font-medium" htmlFor="size">
          Company size
          <select
            id="size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className={inputClass}
          >
            <option value="">Select…</option>
            <option value="1-10">1–10</option>
            <option value="11-50">11–50</option>
            <option value="51-200">51–200</option>
            <option value="201-1000">201–1000</option>
            <option value="1000+">1000+</option>
          </select>
        </label>
        <label className="block text-sm font-medium" htmlFor="companyAbout">
          About
          <textarea
            id="companyAbout"
            rows={3}
            value={companyAbout}
            onChange={(e) => setCompanyAbout(e.target.value)}
            className={inputClass}
          />
        </label>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              setError("");
              setTeamRole(null);
            }}
          >
            Back
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`flex-1 ${btnPrimary}`}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
        <button
          type="button"
          onClick={skip}
          disabled={busy}
          className={`w-full ${btnGhost} text-muted`}
        >
          Skip for now
        </button>
      </form>
    </AuthLayout>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Almost there">
          <div className="h-32 animate-pulse rounded-md bg-soft" />
        </AuthLayout>
      }
    >
      <Onboarding />
    </Suspense>
  );
}
