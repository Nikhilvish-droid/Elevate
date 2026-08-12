"use client";

import { DocumentUpload, inputClass } from "@/components/Auth";

export type EduRow = {
  institution_name: string;
  degree: string;
  field_of_study: string;
  start_year: string;
  end_year: string;
  gpa: string;
  gpa_max: string;
};

export type ExpRow = {
  company_name: string;
  job_title: string;
  employment_type: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
};

export type CertRow = {
  certification_name: string;
  issuing_organization: string;
  file: File | null;
  /** Existing storage path or signed URL from DB */
  existing_file_url?: string | null;
  existing_file_name?: string | null;
};

export const PRONOUN_OPTIONS = [
  "She/Her",
  "He/Him",
  "They/Them",
  "Prefer not to say",
];

export const GENDER_OPTIONS = [
  "Woman",
  "Man",
  "Non-binary",
  "Prefer not to say",
];

export const DEGREE_OPTIONS = [
  "High school",
  "Associate",
  "Bachelor's",
  "Master's",
  "PhD",
  "Diploma",
  "Certificate",
  "Other",
];

export const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" },
];

const field =
  "mt-1.5 w-full rounded-md border border-line bg-elevated px-3 py-2 text-sm outline-none focus:border-brand";

export function parseGpa(grade?: string | null) {
  if (!grade) return { gpa: "", gpa_max: "" };
  const parts = String(grade).split("/");
  return { gpa: parts[0]?.trim() || "", gpa_max: parts[1]?.trim() || "" };
}

export function emptyEducation(): EduRow {
  return {
    institution_name: "",
    degree: "",
    field_of_study: "",
    start_year: "",
    end_year: "",
    gpa: "",
    gpa_max: "",
  };
}

export function emptyExperience(): ExpRow {
  return {
    company_name: "",
    job_title: "",
    employment_type: "full_time",
    start_date: "",
    end_date: "",
    is_current: false,
    description: "",
  };
}

export function emptyCertificate(): CertRow {
  return {
    certification_name: "",
    issuing_organization: "",
    file: null,
    existing_file_url: null,
    existing_file_name: null,
  };
}

export function GenderFields({
  pronouns,
  genderIdentity,
  showPronouns,
  onPronouns,
  onGender,
  onShowPronouns,
  compact,
}: {
  pronouns: string;
  genderIdentity: string;
  showPronouns: boolean;
  onPronouns: (v: string) => void;
  onGender: (v: string) => void;
  onShowPronouns: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-4" : "space-y-4 border border-line bg-elevated p-4"}>
      {!compact ? (
        <p className="text-sm font-medium">Identity (optional)</p>
      ) : null}
      <label className="block text-sm font-medium">
        Pronouns
        <select
          className={field}
          value={pronouns}
          onChange={(e) => onPronouns(e.target.value)}
        >
          <option value="">Select your pronouns…</option>
          {PRONOUN_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showPronouns}
          onChange={(e) => onShowPronouns(e.target.checked)}
        />
        Display pronouns on my profile
      </label>
      <label className="block text-sm font-medium">
        Gender identity
        <select
          className={field}
          value={genderIdentity}
          onChange={(e) => onGender(e.target.value)}
        >
          <option value="">Select your gender identity</option>
          {GENDER_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function EducationList({
  rows,
  onChange,
}: {
  rows: EduRow[];
  onChange: (rows: EduRow[]) => void;
}) {
  return (
    <div className="space-y-4">
      {rows.map((row, i) => (
        <div key={i} className="border border-line bg-elevated p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium sm:col-span-2">
              College / University
              <input
                className={field}
                value={row.institution_name}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, institution_name: e.target.value };
                  onChange(next);
                }}
                placeholder="College / University"
              />
            </label>
            <label className="block text-sm font-medium">
              Graduation year
              <input
                className={field}
                value={row.end_year}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, end_year: e.target.value };
                  onChange(next);
                }}
                placeholder="2029"
              />
            </label>
            <label className="block text-sm font-medium">
              Degree type
              <select
                className={field}
                value={row.degree}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, degree: e.target.value };
                  onChange(next);
                }}
              >
                <option value="">Degree type</option>
                {DEGREE_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Major / field of study
              <input
                className={field}
                value={row.field_of_study}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, field_of_study: e.target.value };
                  onChange(next);
                }}
                placeholder="Computer Science"
              />
            </label>
            <label className="block text-sm font-medium">
              GPA
              <input
                className={field}
                value={row.gpa}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, gpa: e.target.value };
                  onChange(next);
                }}
                placeholder="3.8"
              />
            </label>
            <label className="block text-sm font-medium">
              Max
              <input
                className={field}
                value={row.gpa_max}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, gpa_max: e.target.value };
                  onChange(next);
                }}
                placeholder="4.0"
              />
            </label>
          </div>
          <button
            type="button"
            className="mt-3 text-xs font-semibold text-muted hover:text-ink"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-sm font-semibold text-brand"
        onClick={() => onChange([...rows, emptyEducation()])}
      >
        + Add education
      </button>
    </div>
  );
}

export function ExperienceList({
  rows,
  onChange,
}: {
  rows: ExpRow[];
  onChange: (rows: ExpRow[]) => void;
}) {
  return (
    <div className="space-y-4">
      {rows.map((row, i) => (
        <div key={i} className="grid gap-3 border border-line bg-elevated p-4 sm:grid-cols-2">
          <label className="block text-sm font-medium sm:col-span-2">
            Company
            <input
              className={field}
              value={row.company_name}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, company_name: e.target.value };
                onChange(next);
              }}
              placeholder="Company name"
            />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Title
            <input
              className={field}
              value={row.job_title}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, job_title: e.target.value };
                onChange(next);
              }}
              placeholder="Title"
            />
          </label>
          <label className="block text-sm font-medium">
            Start date
            <input
              type="date"
              className={field}
              value={row.start_date}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, start_date: e.target.value };
                onChange(next);
              }}
            />
          </label>
          <label className="block text-sm font-medium">
            End date
            <input
              type="date"
              className={field}
              disabled={row.is_current}
              value={row.end_date}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, end_date: e.target.value };
                onChange(next);
              }}
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={row.is_current}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, is_current: e.target.checked };
                onChange(next);
              }}
            />
            I currently work here
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            This position is a…
            <select
              className={field}
              value={row.employment_type}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, employment_type: e.target.value };
                onChange(next);
              }}
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Description
            <textarea
              rows={3}
              className={inputClass}
              value={row.description}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, description: e.target.value };
                onChange(next);
              }}
              placeholder="What you worked on"
            />
          </label>
          <button
            type="button"
            className="text-left text-xs font-semibold text-muted hover:text-ink sm:col-span-2"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-sm font-semibold text-brand"
        onClick={() => onChange([...rows, emptyExperience()])}
      >
        + Add experience
      </button>
    </div>
  );
}

export function CertificationList({
  rows,
  onChange,
}: {
  rows: CertRow[];
  onChange: (rows: CertRow[]) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Professional certificates (AWS, Coursera, etc.) — name each one and
        upload the PDF or image from the issuer.
      </p>
      {rows.map((row, i) => (
        <div key={i} className="space-y-3 border border-line bg-elevated p-4">
          <label className="block text-sm font-medium">
            Certificate name
            <input
              className={field}
              value={row.certification_name}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, certification_name: e.target.value };
                onChange(next);
              }}
              placeholder="e.g. AWS Cloud Practitioner"
            />
          </label>
          <label className="block text-sm font-medium">
            Issuing organization
            <input
              className={field}
              value={row.issuing_organization}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, issuing_organization: e.target.value };
                onChange(next);
              }}
              placeholder="e.g. Amazon Web Services"
            />
          </label>
          <DocumentUpload
            label="Certificate file"
            hint={
              row.existing_file_name
                ? `Saved: ${row.existing_file_name}`
                : "PDF, JPG, or PNG · up to 10 MB"
            }
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            file={row.file}
            onChange={(file) => {
              const next = [...rows];
              next[i] = { ...row, file };
              onChange(next);
            }}
          />
          <button
            type="button"
            className="text-xs font-semibold text-muted hover:text-ink"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-sm font-semibold text-brand"
        onClick={() => onChange([...rows, emptyCertificate()])}
      >
        + Add certificate
      </button>
    </div>
  );
}
