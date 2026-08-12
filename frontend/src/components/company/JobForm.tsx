"use client";

import { useState } from "react";
import type { CompanyJob, JobInput } from "@/lib/companyJobs";

const EMPLOYMENT = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" },
];

const WORK_MODES = [
  { value: "onsite", label: "On-site" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
];

type Props = {
  initial?: CompanyJob | null;
  companyName?: string;
  companyDetailsDefault?: string;
  submitting?: boolean;
  onSubmit: (input: JobInput) => Promise<void> | void;
  onCancel: () => void;
};

function num(v: string) {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function JobForm({
  initial,
  companyName,
  companyDetailsDefault,
  submitting,
  onSubmit,
  onCancel,
}: Props) {
  const [error, setError] = useState("");
  const [title, setTitle] = useState(initial?.title || "");
  const [department, setDepartment] = useState(initial?.department || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [salaryMin, setSalaryMin] = useState(
    initial?.salary_min != null ? String(initial.salary_min) : "",
  );
  const [salaryMax, setSalaryMax] = useState(
    initial?.salary_max != null ? String(initial.salary_max) : "",
  );
  const [expMin, setExpMin] = useState(
    initial?.experience_min_years != null
      ? String(initial.experience_min_years)
      : "",
  );
  const [skills, setSkills] = useState(initial?.required_skills || "");
  const [employmentType, setEmploymentType] = useState(
    initial?.employment_type || "full_time",
  );
  const [workMode, setWorkMode] = useState(initial?.work_mode || "hybrid");
  const [deadline, setDeadline] = useState(
    initial?.application_deadline
      ? String(initial.application_deadline).slice(0, 10)
      : "",
  );
  const [description, setDescription] = useState(initial?.description || "");
  const [companyDetails, setCompanyDetails] = useState(
    initial?.company_details || companyDetailsDefault || "",
  );
  const [status, setStatus] = useState<"draft" | "published" | "closed">(
    (initial?.status as "draft" | "published" | "closed") || "published",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Job title is required.");
      return;
    }
    if (!description.trim()) {
      setError("Job description is required.");
      return;
    }
    try {
      await onSubmit({
        title: title.trim(),
        department: department.trim() || null,
        location: location.trim() || null,
        salary_min: num(salaryMin),
        salary_max: num(salaryMax),
        experience_min_years: num(expMin),
        experience_max_years: null,
        required_skills: skills.trim() || null,
        employment_type: employmentType,
        work_mode: workMode,
        application_deadline: deadline || null,
        description: description.trim(),
        company_details: companyDetails.trim() || null,
        status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save job.");
    }
  }

  const field =
    "mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm";

  return (
    <form onSubmit={handleSubmit} className="border border-line bg-elevated px-5 py-6">
      <div className="mb-5">
        <h3 className="font-display text-lg font-bold">
          {initial ? "Edit job" : "Post a job"}
        </h3>
        <p className="mt-1 text-sm text-muted">
          {companyName
            ? `Role will appear under ${companyName}.`
            : "Fill in the role details below."}
        </p>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium sm:col-span-2">
          Job title
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="block text-sm font-medium">
          Department
          <input className={field} value={department} onChange={(e) => setDepartment(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Location
          <input className={field} value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Salary min (₹)
          <input className={field} type="number" min={0} value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Salary max (₹)
          <input className={field} type="number" min={0} value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Experience required (years)
          <input className={field} type="number" min={0} value={expMin} onChange={(e) => setExpMin(e.target.value)} />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Skills required
          <input
            className={field}
            placeholder="React, Node.js, PostgreSQL"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Employment type
          <select className={field} value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
            {EMPLOYMENT.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Work mode
          <select className={field} value={workMode} onChange={(e) => setWorkMode(e.target.value)}>
            {WORK_MODES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Deadline
          <input className={field} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Status
          <select
            className={field}
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published" | "closed")}
          >
            <option value="published">Open (published)</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Job description
          <textarea
            className={field}
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Company details
          <textarea
            className={field}
            rows={3}
            value={companyDetails}
            onChange={(e) => setCompanyDetails(e.target.value)}
            placeholder="Shown on the job posting"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
        >
          {submitting ? "Saving…" : initial ? "Save changes" : "Publish job"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold hover:bg-soft"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
