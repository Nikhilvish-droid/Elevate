"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthLayout,
  DocumentUpload,
  Field,
  PhotoUpload,
  btnGhost,
  btnPrimary,
  inputClass,
} from "@/components/Auth";
import {
  TeamRole,
  getSessionUser,
  homeFor,
  saveCandidateOnboarding,
  saveCompanyOnboarding,
  teamLabel,
} from "@/lib/profile";
import { uploadAvatar, uploadResume } from "@/lib/storage";

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
  const [email, setEmail] = useState("");

  // Candidate
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [education, setEducation] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [certifications, setCertifications] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Company
  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [companyAbout, setCompanyAbout] = useState("");
  const [socialLinks, setSocialLinks] = useState("");
  const [officeLocations, setOfficeLocations] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getSessionUser();
      if (!user) {
        router.replace("/auth?tab=login");
        return;
      }
      if (!cancelled) {
        setEmail(user.email ?? "");
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function saveCandidate(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Name is required, or skip for now.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const profile_image_url = avatarFile
        ? await uploadAvatar(avatarFile)
        : null;
      const resume = resumeFile ? await uploadResume(resumeFile) : null;

      const profile = await saveCandidateOnboarding({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        location: location.trim() || null,
        education: education.trim() || null,
        experience: experience.trim() || null,
        skills: skills.trim() || null,
        certifications: certifications.trim() || null,
        portfolio: portfolio.trim() || null,
        github: github.trim() || null,
        linkedin: linkedin.trim() || null,
        cover_letter: coverLetter.trim() || null,
        profile_image_url,
        resume,
      });

      if (!profile) throw new Error("Saved, but could not load profile.");
      router.push(homeFor(profile));
      router.refresh();
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
      const logo_url = logoFile ? await uploadAvatar(logoFile) : null;

      const profile = await saveCompanyOnboarding({
        full_name: contactName.trim(),
        company_name: companyName.trim(),
        team_role: teamRole,
        website: website.trim() || null,
        industry: industry.trim() || null,
        company_size: size || null,
        description: companyAbout.trim() || null,
        linkedin_url: socialLinks.trim() || null,
        logo_url,
        office_locations: officeLocations.trim() || null,
      });

      if (!profile) throw new Error("Saved, but could not load profile.");
      router.push(homeFor(profile));
      router.refresh();
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
        const profile = await saveCompanyOnboarding({
          full_name: contactName.trim() || "Team member",
          company_name: companyName.trim() || "My company",
          team_role: teamRole,
        });
        if (!profile) throw new Error("Could not finish onboarding.");
        router.push(homeFor(profile));
        router.refresh();
        return;
      }

      const profile = await saveCandidateOnboarding({
        full_name: fullName.trim() || "New Candidate",
      });
      if (!profile) throw new Error("Could not finish onboarding.");
      router.push(homeFor(profile));
      router.refresh();
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
          <PhotoUpload
            label="Profile picture"
            file={avatarFile}
            onChange={setAvatarFile}
          />

          <Field
            label="Name"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Field
            label="Email"
            name="email"
            type="email"
            value={email}
            readOnly
          />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 …"
          />
          <Field
            label="Location"
            name="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, Country"
          />
          <label className="block text-sm font-medium" htmlFor="education">
            Education
            <textarea
              id="education"
              rows={2}
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              className={inputClass}
              placeholder="Degree, school, year"
            />
          </label>
          <label className="block text-sm font-medium" htmlFor="experience">
            Experience
            <textarea
              id="experience"
              rows={3}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className={inputClass}
              placeholder="Roles, companies, years"
            />
          </label>
          <Field
            label="Skills"
            name="skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="React, Node, SQL"
          />
          <Field
            label="Certifications"
            name="certifications"
            value={certifications}
            onChange={(e) => setCertifications(e.target.value)}
          />
          <Field
            label="Portfolio"
            name="portfolio"
            type="url"
            value={portfolio}
            onChange={(e) => setPortfolio(e.target.value)}
            placeholder="https://"
          />
          <Field
            label="GitHub"
            name="github"
            type="url"
            value={github}
            onChange={(e) => setGithub(e.target.value)}
            placeholder="https://github.com/…"
          />
          <Field
            label="LinkedIn"
            name="linkedin"
            type="url"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/…"
          />
          <DocumentUpload
            label="Resume"
            file={resumeFile}
            onChange={setResumeFile}
          />
          <label className="block text-sm font-medium" htmlFor="coverLetter">
            Cover letter
            <textarea
              id="coverLetter"
              rows={4}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
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
        <PhotoUpload
          label="Company logo"
          hint="JPG or PNG · up to 2 MB"
          file={logoFile}
          onChange={setLogoFile}
        />
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
          Description
          <textarea
            id="companyAbout"
            rows={3}
            value={companyAbout}
            onChange={(e) => setCompanyAbout(e.target.value)}
            className={inputClass}
          />
        </label>
        <Field
          label="Social links"
          name="socialLinks"
          value={socialLinks}
          onChange={(e) => setSocialLinks(e.target.value)}
          placeholder="LinkedIn, Twitter, …"
        />
        <Field
          label="Office locations"
          name="officeLocations"
          value={officeLocations}
          onChange={(e) => setOfficeLocations(e.target.value)}
          placeholder="Mumbai, Bangalore"
        />

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
