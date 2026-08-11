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
  searchCompanies,
  requestToJoinCompany,
  refreshSession,
  type CompanyHit,
  type JoinRequestRow,
} from "@/lib/company";
import {
  TeamRole,
  getSessionUser,
  getProfile,
  homeFor,
  isOnboarded,
  saveCandidateOnboarding,
  saveCompanyOnboarding,
  teamFromRoleName,
  teamLabel,
} from "@/lib/profile";
import { uploadAvatar, uploadResume } from "@/lib/storage";

type Role = "candidate" | "company";
type CompanyPath =
  | "choose"
  | "create"
  | "create-founder"
  | "join-role"
  | "join-details"
  | "join-search"
  | "waiting";

const INDUSTRIES = [
  "Software / SaaS",
  "IT services",
  "Machine learning / AI",
  "Data / Analytics",
  "Fintech",
  "Healthcare",
  "Education",
  "E-commerce",
  "Manufacturing",
  "Other",
];

const JOIN_ROLES: { id: Exclude<TeamRole, "founder">; title: string; body: string }[] =
  [
    {
      id: "recruiter",
      title: "Recruiter",
      body: "Post jobs, view apps, shortlist, schedule, email, offers.",
    },
    {
      id: "manager",
      title: "Hiring manager",
      body: "Review shortlist, approve hires, feedback, analytics.",
    },
    {
      id: "interviewer",
      title: "Interviewer",
      body: "Join assigned rounds and leave structured feedback.",
    },
  ];

function Onboarding() {
  const router = useRouter();
  const hint = useSearchParams().get("hint");
  const [role, setRole] = useState<Role | null>(
    hint === "company" || hint === "candidate" ? hint : null,
  );
  const [companyPath, setCompanyPath] = useState<CompanyPath>("choose");
  const [teamRole, setTeamRole] = useState<Exclude<TeamRole, "founder"> | null>(
    null,
  );
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
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [founderPhoto, setFounderPhoto] = useState<File | null>(null);
  const [founderPhone, setFounderPhone] = useState("");

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CompanyHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<CompanyHit | null>(null);
  const [waiting, setWaiting] = useState<JoinRequestRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getSessionUser();
      if (!user) {
        router.replace("/auth?tab=login");
        return;
      }
      const profile = await getProfile().catch(() => null);
      if (profile && isOnboarded(profile)) {
        router.replace(homeFor(profile));
        return;
      }
      if (!cancelled) {
        setEmail(user.email ?? "");
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "";
        setFullName((prev) => prev || name);
        setContactName((prev) => prev || name);
        if (profile?.join_request?.status === "pending") {
          setRole("company");
          setCompanyPath("waiting");
          setWaiting(profile.join_request);
        }
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (companyPath !== "join-search") return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      setSearching(true);
      searchCompanies(q)
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(t);
  }, [query, companyPath]);

  useEffect(() => {
    if (companyPath !== "waiting") return;
    const tick = window.setInterval(() => {
      refreshSession()
        .then((profile) => {
          if (isOnboarded(profile)) {
            router.replace(homeFor(profile));
            return;
          }
          if (profile.join_request) setWaiting(profile.join_request);
        })
        .catch(() => {});
    }, 8000);
    return () => window.clearInterval(tick);
  }, [companyPath, router]);

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

  function continueToFounder(e: FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    setError("");
    setCompanyPath("create-founder");
  }

  async function saveFounder(e: FormEvent) {
    e.preventDefault();
    if (!contactName.trim() || !companyName.trim()) {
      setError("Add your name and company name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const logo_url = logoFile ? await uploadAvatar(logoFile) : null;
      const profile_image_url = founderPhoto
        ? await uploadAvatar(founderPhoto)
        : null;
      const profile = await saveCompanyOnboarding({
        full_name: contactName.trim(),
        phone: founderPhone.trim() || null,
        profile_image_url,
        company_name: companyName.trim(),
        website: website.trim() || null,
        industry: industry.trim() || null,
        company_size: size || null,
        description: companyAbout.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        logo_url,
        address_line: addressLine.trim() || null,
        city: city.trim() || null,
        state: stateRegion.trim() || null,
        country: country.trim() || null,
        postal_code: postalCode.trim() || null,
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

  function continueToCompanySearch(e: FormEvent) {
    e.preventDefault();
    if (!contactName.trim()) {
      setError("Add your name.");
      return;
    }
    setError("");
    setCompanyPath("join-search");
  }

  async function sendJoinRequest() {
    if (!teamRole || !picked) return;
    setBusy(true);
    setError("");
    try {
      const profile_image_url = founderPhoto
        ? await uploadAvatar(founderPhoto)
        : null;
      const row = await requestToJoinCompany(picked.id, teamRole, {
        full_name: contactName.trim() || undefined,
        phone: founderPhone.trim() || null,
        profile_image_url,
      });
      setWaiting(row);
      setCompanyPath("waiting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send request.");
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    setBusy(true);
    setError("");
    try {
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
            onClick={() => {
              setRole("company");
              setCompanyPath("choose");
            }}
            className={`w-full border px-5 py-5 text-left transition hover:border-brand ${
              hint === "company"
                ? "border-brand bg-soft"
                : "border-line bg-elevated"
            }`}
          >
            <p className="font-display text-lg font-semibold">I&apos;m hiring</p>
            <p className="mt-1 text-sm text-muted">
              Create a company as founder, or request to join an existing one.
            </p>
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (role === "company" && companyPath === "choose") {
    return (
      <AuthLayout
        title="How are you joining?"
        subtitle="One company profile, owned by the founder. Everyone else requests access."
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setCompanyPath("create")}
            className="w-full border border-line bg-elevated px-5 py-5 text-left transition hover:border-brand"
          >
            <p className="font-display text-lg font-semibold">
              Create company (Founder)
            </p>
            <p className="mt-1 text-sm text-muted">
              You own the company profile and approve who joins.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setCompanyPath("join-role")}
            className="w-full border border-line bg-elevated px-5 py-5 text-left transition hover:border-brand"
          >
            <p className="font-display text-lg font-semibold">Join a company</p>
            <p className="mt-1 text-sm text-muted">
              Recruiter, hiring manager, or interviewer — search and request.
            </p>
          </button>
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

  if (role === "company" && companyPath === "join-role") {
    return (
      <AuthLayout
        title="Your team role"
        subtitle="The founder will approve this role for one company."
      >
        <div className="space-y-3">
          {JOIN_ROLES.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setTeamRole(opt.id);
                setCompanyPath("join-details");
              }}
              className="w-full border border-line bg-elevated px-5 py-5 text-left transition hover:border-brand"
            >
              <p className="font-display text-lg font-semibold">{opt.title}</p>
              <p className="mt-1 text-sm text-muted">{opt.body}</p>
            </button>
          ))}
          <button
            type="button"
            className={btnGhost}
            onClick={() => setCompanyPath("choose")}
          >
            Back
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (role === "company" && companyPath === "join-details") {
    return (
      <AuthLayout
        eyebrow={`${teamLabel(teamRole)} · step 1 of 2`}
        title="Your details"
        subtitle="The founder will see this when they review your request."
      >
        <form onSubmit={continueToCompanySearch} className="space-y-4" noValidate>
          <PhotoUpload
            label="Your photo"
            hint="JPG or PNG · up to 2 MB"
            file={founderPhoto}
            onChange={setFounderPhoto}
          />
          <Field
            label="Full name"
            name="contactName"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
          />
          <Field
            label="Work email"
            name="joinEmail"
            type="email"
            value={email}
            readOnly
          />
          <Field
            label="Phone"
            name="founderPhone"
            type="tel"
            value={founderPhone}
            onChange={(e) => setFounderPhone(e.target.value)}
            placeholder="+91 …"
          />
          <p className="text-sm text-muted">
            You are requesting to join as {teamLabel(teamRole)}. Company details
            are owned by the founder — you only add your own profile here.
          </p>
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
                setCompanyPath("join-role");
              }}
            >
              Back
            </button>
            <button type="submit" className={`flex-1 ${btnPrimary}`}>
              Continue
            </button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  if (role === "company" && companyPath === "join-search") {
    return (
      <AuthLayout
        eyebrow={`${teamLabel(teamRole)} · step 2 of 2`}
        title="Find your company"
        subtitle="Search by name, pick one, and send a join request."
      >
        <div className="space-y-4">
          <p className="border border-line bg-elevated px-4 py-3 text-sm text-muted">
            Requesting as <span className="font-semibold text-ink">{contactName || "you"}</span>
            {email ? ` · ${email}` : ""}.
          </p>
          <label className="block text-sm font-medium" htmlFor="companySearch">
            Company
            <input
              id="companySearch"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPicked(null);
              }}
              className={inputClass}
              placeholder="Start typing a company name…"
              autoComplete="off"
            />
          </label>
          {searching ? (
            <p className="text-sm text-muted">Searching…</p>
          ) : null}
          {hits.length > 0 ? (
            <ul className="divide-y divide-line border border-line bg-elevated">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPicked(hit);
                      setQuery(hit.name);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-soft ${
                      picked?.id === hit.id ? "bg-soft" : ""
                    }`}
                  >
                    {hit.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={hit.logo_url}
                        alt=""
                        className="h-9 w-9 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-soft text-sm font-bold text-brand">
                        {hit.name.slice(0, 1)}
                      </span>
                    )}
                    <span>
                      <span className="block text-sm font-semibold">
                        {hit.name}
                      </span>
                      <span className="block text-xs text-muted">
                        {[hit.industry, hit.website_url]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim().length >= 2 && !searching ? (
            <p className="text-sm text-muted">No companies match that name.</p>
          ) : null}

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
                setPicked(null);
                setCompanyPath("join-details");
              }}
            >
              Back
            </button>
            <button
              type="button"
              disabled={busy || !picked}
              onClick={sendJoinRequest}
              className={`flex-1 ${btnPrimary}`}
            >
              {busy ? "Sending…" : "Request to join"}
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (role === "company" && companyPath === "waiting") {
    const rejected = waiting?.status === "rejected";
    return (
      <AuthLayout
        title={rejected ? "Request declined" : "Waiting for approval"}
        subtitle={
          rejected
            ? `${waiting?.company_name ?? "The company"} declined this request. You can search again.`
            : `The founder at ${waiting?.company_name ?? "the company"} will approve you as ${teamLabel(teamRole ?? teamFromRoleName(waiting?.requested_role))}. You will land on their dashboard after that — not before.`
        }
      >
        <div className="space-y-4">
          {!rejected ? (
            <p className="border border-line bg-elevated px-4 py-3 text-sm text-muted">
              Stay on this page. We check for approval every few seconds.
            </p>
          ) : null}
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              setWaiting(null);
              setPicked(null);
              setQuery("");
              setCompanyPath("join-search");
            }}
          >
            {rejected ? "Search again" : "Pick a different company"}
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

  if (role === "company" && companyPath === "create-founder") {
    return (
      <AuthLayout
        eyebrow="Step 2 of 2"
        title="Founder details"
        subtitle="This person owns the company profile and approves who joins."
      >
        <form onSubmit={saveFounder} className="space-y-4" noValidate>
          <PhotoUpload
            label="Your photo"
            hint="JPG or PNG · up to 2 MB"
            file={founderPhoto}
            onChange={setFounderPhoto}
          />
          <Field
            label="Your name"
            name="contactName"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
          />
          <Field
            label="Work email"
            name="founderEmail"
            type="email"
            value={email}
            readOnly
          />
          <Field
            label="Phone"
            name="founderPhone"
            type="tel"
            value={founderPhone}
            onChange={(e) => setFounderPhone(e.target.value)}
            placeholder="+91 …"
          />
          <p className="text-sm text-muted">
            You are creating <span className="font-semibold text-ink">{companyName}</span>{" "}
            as founder.
          </p>

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
                setCompanyPath("create");
              }}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`flex-1 ${btnPrimary}`}
            >
              {busy ? "Creating…" : "Create company"}
            </button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Step 1 of 2"
      title="Company profile"
      subtitle="Recruiters and interviewers will request to join this company. Fill in as much as you can."
    >
      <form onSubmit={continueToFounder} className="space-y-4" noValidate>
        <PhotoUpload
          label="Company logo"
          hint="JPG or PNG · up to 2 MB"
          file={logoFile}
          onChange={setLogoFile}
        />
        <Field
          label="Company name"
          name="companyName"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />
        <Field
          label="Website"
          name="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://"
        />
        <label className="block text-sm font-medium" htmlFor="industry">
          Industry
          <select
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className={inputClass}
          >
            <option value="">Select…</option>
            {INDUSTRIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
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
          About the company
          <textarea
            id="companyAbout"
            rows={4}
            value={companyAbout}
            onChange={(e) => setCompanyAbout(e.target.value)}
            className={inputClass}
            placeholder="What you do, who you hire, and what makes the team distinct."
          />
        </label>
        <Field
          label="Company LinkedIn"
          name="linkedinUrl"
          type="url"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="https://linkedin.com/company/…"
        />
        <Field
          label="Twitter / X"
          name="twitterUrl"
          type="url"
          value={twitterUrl}
          onChange={(e) => setTwitterUrl(e.target.value)}
          placeholder="https://x.com/…"
        />
        <Field
          label="GitHub"
          name="githubUrl"
          type="url"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          placeholder="https://github.com/…"
        />
        <Field
          label="HQ address"
          name="addressLine"
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          placeholder="Street, building"
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="City"
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Mumbai"
          />
          <Field
            label="State"
            name="stateRegion"
            value={stateRegion}
            onChange={(e) => setStateRegion(e.target.value)}
            placeholder="Maharashtra"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Country"
            name="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="India"
          />
          <Field
            label="PIN / ZIP"
            name="postalCode"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
          />
        </div>

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
              setCompanyPath("choose");
            }}
          >
            Back
          </button>
          <button type="submit" className={`flex-1 ${btnPrimary}`}>
            Continue
          </button>
        </div>
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
