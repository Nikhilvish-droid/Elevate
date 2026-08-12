"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { DocumentUpload, PhotoUpload, inputClass } from "@/components/Auth";
import { DeleteAccountPanel } from "@/components/DeleteAccountPanel";
import {
  EducationList,
  ExperienceList,
  CertificationList,
  GenderFields,
  parseGpa,
  type EduRow,
  type ExpRow,
  type CertRow,
} from "@/components/candidate/CandidateFormSections";
import {
  getCandidateFull,
  saveCandidateProfile,
  type CandidateFull,
} from "@/lib/candidate";
import { getProfile, homeFor, profilePath } from "@/lib/profile";
import { uploadAvatar, uploadResume, uploadCertificate } from "@/lib/storage";

const ROLE_OPTIONS = [
  "Machine Learning Engineer",
  "Full-Stack Engineer",
  "Backend Engineer",
  "Frontend Engineer",
  "Android Developer",
  "Data Engineer",
  "DevOps Engineer",
  "Product Designer",
];

const field =
  "mt-1.5 w-full rounded-md border border-line bg-elevated px-3 py-2 text-sm outline-none focus:border-brand";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-6 border-t border-line py-10 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{hint}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

type Edu = EduRow;
type Exp = ExpRow;

export default function CandidateProfilePage() {
  const [tab, setTab] = useState<"profile" | "resume">("profile");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [genderIdentity, setGenderIdentity] = useState("");
  const [showPronouns, setShowPronouns] = useState(false);
  const [homeHref, setHomeHref] = useState("/candidate");
  const [primaryRole, setPrimaryRole] = useState("");
  const [years, setYears] = useState("");
  const [openTo, setOpenTo] = useState<string[]>([]);
  const [rolePick, setRolePick] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [education, setEducation] = useState<Edu[]>([]);
  const [experience, setExperience] = useState<Exp[]>([]);
  const [certRows, setCertRows] = useState<CertRow[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumes, setResumes] = useState<CandidateFull["resumes"]>([]);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  function applyFull(c: CandidateFull) {
    setFullName([c.first_name, c.last_name].filter(Boolean).join(" "));
    setPhone(c.phone ?? "");
    setLocation(c.location ?? "");
    setPronouns(c.pronouns ?? "");
    setGenderIdentity(c.gender_identity ?? "");
    setShowPronouns(Boolean(c.show_pronouns_on_profile));
    setCertRows(
      (c.certifications || []).map((x) => ({
        certification_name: x.certification_name,
        issuing_organization: x.issuing_organization ?? "",
        file: null,
        existing_file_url: x.storage_path || null,
        existing_file_name: x.file_name || null,
      })),
    );
    setYears(
      c.total_experience_years != null ? String(c.total_experience_years) : "",
    );
    setBio(c.professional_summary ?? "");
    setWebsite(c.portfolio_url ?? "");
    setLinkedin(c.linkedin_url ?? "");
    setGithub(c.github_url ?? "");
    setExistingPhoto(c.profile_image_url);
    setResumes(c.resumes);
    setSkills(
      c.skills.filter((s) => s.category !== "desired_role").map((s) => s.name),
    );
    const roles = c.skills
      .filter((s) => s.category === "desired_role")
      .map((s) => s.name);
    setOpenTo(roles);
    setPrimaryRole(roles[0] ?? "");
    setEducation(
      c.education.map((e) => {
        const { gpa, gpa_max } = parseGpa(e.grade);
        return {
          institution_name: e.institution_name,
          degree: e.degree ?? "",
          field_of_study: e.field_of_study ?? "",
          start_year: e.start_date ? e.start_date.slice(0, 4) : "",
          end_year: e.end_date ? e.end_date.slice(0, 4) : "",
          gpa,
          gpa_max,
        };
      }),
    );
    setExperience(
      c.experience.map((e) => ({
        company_name: e.company_name,
        job_title: e.job_title,
        employment_type: e.employment_type ?? "full_time",
        start_date: e.start_date ?? "",
        end_date: e.end_date ?? "",
        is_current: e.is_current,
        description: e.description ?? "",
      })),
    );
  }

  useEffect(() => {
    getCandidateFull()
      .then((c) => {
        if (c) applyFull(c);
        setLoaded(true);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Could not load profile.");
        setLoaded(true);
      });
    getProfile().then((p) => {
      if (p) {
        setHomeHref(homeFor(p));
        setShareUrl(`${window.location.origin}${profilePath(p)}`);
        setAccountEmail(p.email);
      }
    });
  }, []);

  function addSkill() {
    const name = skillDraft.trim();
    if (!name || skills.includes(name)) return;
    setSkills([...skills, name]);
    setSkillDraft("");
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Your name is required.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved("");
    try {
      let profile_image_url = existingPhoto;
      if (photoFile) profile_image_url = await uploadAvatar(photoFile);
      const resume = resumeFile ? await uploadResume(resumeFile) : null;

      const certifications = [];
      for (const row of certRows.filter((c) => c.certification_name.trim())) {
        let file_url: string | null = row.existing_file_url || null;
        let file_name: string | null = row.existing_file_name || null;
        if (row.file) {
          const uploaded = await uploadCertificate(row.file);
          file_url = uploaded.file_url;
          file_name = uploaded.file_name;
        }
        certifications.push({
          certification_name: row.certification_name.trim(),
          issuing_organization: row.issuing_organization.trim() || null,
          file_url,
          file_name,
        });
      }

      const next = await saveCandidateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        location: location.trim() || null,
        pronouns: pronouns || null,
        gender_identity: genderIdentity || null,
        show_pronouns_on_profile: showPronouns,
        professional_summary: bio.trim() || null,
        total_experience_years: years ? Number(years) : null,
        portfolio_url: website.trim() || null,
        github_url: github.trim() || null,
        linkedin_url: linkedin.trim() || null,
        profile_image_url,
        skills,
        open_to_roles: openTo.length
          ? openTo
          : primaryRole
            ? [primaryRole]
            : [],
        certifications,
        education,
        experience: experience.map((x) => ({
          ...x,
          start_date: x.start_date || new Date().toISOString().slice(0, 10),
        })),
        resume,
      });
      if (next) applyFull(next);
      setPhotoFile(null);
      setResumeFile(null);
      setSaved("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return <p className="text-sm text-muted">Loading profile…</p>;
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <form onSubmit={onSave} className="mx-auto max-w-5xl pb-16">
      {shareUrl ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-line bg-elevated px-4 py-3 text-sm">
          <p className="text-muted">
            This page is only for editing. Share your unique profile:{" "}
            <span className="font-medium text-ink">{shareUrl}</span>
          </p>
          <button
            type="button"
            onClick={copyShareLink}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-soft"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line">
        <nav className="flex gap-5 text-sm" aria-label="Profile sections">
          <Link href={homeHref} className="py-3 text-muted hover:text-ink">
            Overview
          </Link>
          <button
            type="button"
            onClick={() => setTab("profile")}
            className={`py-3 ${
              tab === "profile"
                ? "border-b-2 border-brand font-semibold"
                : "text-muted hover:text-ink"
            }`}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setTab("resume")}
            className={`py-3 ${
              tab === "resume"
                ? "border-b-2 border-brand font-semibold"
                : "text-muted hover:text-ink"
            }`}
          >
            Resume / CV
          </button>
        </nav>
        <div className="flex items-center gap-2 py-2">
          <Link
            href={homeHref}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:bg-soft"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-ink px-4 py-1.5 text-sm font-semibold text-[var(--bg)] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-4 text-sm text-brand" role="status">
          {saved}
        </p>
      ) : null}

      {tab === "profile" ? (
        <>
          <Section
            title="About"
            hint="Tell companies who you are so they can find you."
          >
            <label className="block text-sm font-medium">
              Your name <span className="text-red-600">*</span>
              <input
                className={field}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </label>

            <div>
              <p className="text-sm font-medium">Profile photo</p>
              <PhotoUpload
                label=""
                file={photoFile}
                existingUrl={existingPhoto}
                onChange={setPhotoFile}
              />
            </div>

            <label className="block text-sm font-medium">
              Phone
              <input
                className={field}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 …"
              />
            </label>

            <label className="block text-sm font-medium">
              Where are you based?
              <input
                className={field}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Mumbai, Maharashtra"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
              <label className="block text-sm font-medium">
                Select your primary role
                <select
                  className={field}
                  value={primaryRole}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPrimaryRole(v);
                    if (v && !openTo.includes(v)) setOpenTo([...openTo, v]);
                  }}
                >
                  <option value="">Select role</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Years of experience
                <select
                  className={field}
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                >
                  <option value="">—</option>
                  <option value="0">&lt; 1 Year</option>
                  <option value="1">1 Year</option>
                  <option value="2">2 Years</option>
                  <option value="3">3 Years</option>
                  <option value="5">5 Years</option>
                  <option value="8">8+ Years</option>
                </select>
              </label>
            </div>

            <div>
              <p className="text-sm font-medium">Open to the following roles</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {openTo.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1 rounded-md bg-soft px-2.5 py-1 text-xs"
                  >
                    {role}
                    <button
                      type="button"
                      className="text-muted hover:text-ink"
                      onClick={() => setOpenTo(openTo.filter((r) => r !== role))}
                      aria-label={`Remove ${role}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <select
                className={`${field} mt-2`}
                value={rolePick}
                onChange={(e) => {
                  const v = e.target.value;
                  setRolePick("");
                  if (v && !openTo.includes(v)) setOpenTo([...openTo, v]);
                }}
              >
                <option value="">Select role</option>
                {ROLE_OPTIONS.filter((r) => !openTo.includes(r)).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <label className="block text-sm font-medium">
              <span className="flex justify-between">
                Your bio
                <span className="text-xs font-normal text-muted">
                  {bio.length}/2000
                </span>
              </span>
              <textarea
                rows={5}
                maxLength={2000}
                className={field}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="CS student, full stack generalist; internships, projects, what you're looking for."
              />
            </label>
          </Section>

          <Section title="Identity" hint="Optional — shown on your profile if you choose.">
            <GenderFields
              compact
              pronouns={pronouns}
              genderIdentity={genderIdentity}
              showPronouns={showPronouns}
              onPronouns={setPronouns}
              onGender={setGenderIdentity}
              onShowPronouns={setShowPronouns}
            />
          </Section>

          <Section
            title="Social Profiles"
            hint="Where can people find you online?"
          >
            <label className="block text-sm font-medium">
              Website
              <input
                className={field}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
              />
            </label>
            <label className="block text-sm font-medium">
              LinkedIn
              <input
                className={field}
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/…"
              />
            </label>
            <label className="block text-sm font-medium">
              GitHub
              <input
                className={field}
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="https://github.com/…"
              />
            </label>
          </Section>

          <Section
            title="Your work experience"
            hint="What other positions have you held?"
          >
            <ExperienceList rows={experience} onChange={setExperience} />
          </Section>

          <Section title="Education" hint="What schools have you studied at?">
            <EducationList rows={education} onChange={setEducation} />
          </Section>

          <Section
            title="Your Skills"
            hint="This helps companies hone in on your strengths."
          >
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-md bg-soft px-2.5 py-1 text-xs"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => setSkills(skills.filter((x) => x !== s))}
                    aria-label={`Remove ${s}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className={inputClass}
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="e.g. Python, React"
              />
              <button
                type="button"
                onClick={addSkill}
                className="shrink-0 rounded-md border border-line px-3 text-sm font-semibold hover:bg-soft"
              >
                Add
              </button>
            </div>
          </Section>

          <Section
            title="Certifications"
            hint="Named credentials (AWS, Coursera, etc.) — upload the file for each."
          >
            <CertificationList rows={certRows} onChange={setCertRows} />
          </Section>
        </>
      ) : (
        <Section title="Resume / CV" hint="PDF or DOCX, up to 10 MB.">
          {resumes.length ? (
            <ul className="space-y-2 text-sm">
              {resumes.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 border border-line px-3 py-2">
                  <span>
                    {r.file_name} {r.is_primary ? "· primary" : ""}
                  </span>
                  <a
                    href={r.file_url}
                    className="font-semibold text-brand"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No resume uploaded yet.</p>
          )}
          <DocumentUpload file={resumeFile} onChange={setResumeFile} />
          <p className="text-xs text-muted">Save to upload a new primary resume.</p>
        </Section>
      )}

      <Section
        title="Delete account"
        hint="We email a one-time code before anything is removed."
      >
        <DeleteAccountPanel email={accountEmail} />
      </Section>
    </form>
  );
}
