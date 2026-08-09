"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthLayout,
  Field,
  btnGhost,
  btnPrimary,
  inputClass,
} from "@/components/Auth";

type Role = "candidate" | "company";

function Onboarding() {
  const router = useRouter();
  const hint = useSearchParams().get("hint");
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("");
  const [about, setAbout] = useState("");

  const [contactName, setContactName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [companyAbout, setCompanyAbout] = useState("");

  function done() {
    router.push("/");
  }

  async function saveCandidate(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !headline.trim()) {
      setError("Add your name and headline, or skip for now.");
      return;
    }
    setBusy(true);
    await delay(300);
    setBusy(false);
    done();
  }

  async function saveCompany(e: FormEvent) {
    e.preventDefault();
    if (!contactName.trim() || !jobTitle.trim() || !companyName.trim()) {
      setError("Add your name, role, and company — or skip for now.");
      return;
    }
    setBusy(true);
    await delay(300);
    setBusy(false);
    done();
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
              Set up your company and start recruiting.
            </p>
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
            onClick={done}
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
      eyebrow="Company"
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
          label="Your role"
          name="jobTitle"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="e.g. Recruiter"
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
          onClick={done}
          className={`w-full ${btnGhost} text-muted`}
        >
          Skip for now
        </button>
      </form>
    </AuthLayout>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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
