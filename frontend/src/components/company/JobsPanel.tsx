"use client";

import { useCallback, useEffect, useState } from "react";
import { JobForm } from "@/components/company/JobForm";
import {
  closeCompanyJob,
  createCompanyJob,
  deleteCompanyJob,
  duplicateCompanyJob,
  formatEmployment,
  formatSalary,
  formatWorkMode,
  jobStatusLabel,
  listCompanyJobs,
  updateCompanyJob,
  type CompanyJob,
  type JobInput,
} from "@/lib/companyJobs";

type Props = {
  canManage: boolean;
  companyName?: string;
  companyDetailsDefault?: string;
  openCreate?: boolean;
  onCreateHandled?: () => void;
};

export function JobsPanel({
  canManage,
  companyName,
  companyDetailsDefault,
  openCreate,
  onCreateHandled,
}: Props) {
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editing, setEditing] = useState<CompanyJob | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      setJobs(await listCompanyJobs());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (openCreate && canManage) {
      setMode("create");
      setEditing(null);
      onCreateHandled?.();
    }
  }, [openCreate, canManage, onCreateHandled]);

  async function handleCreate(input: JobInput) {
    setSubmitting(true);
    try {
      await createCompanyJob(input);
      setMode("list");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(input: JobInput) {
    if (!editing) return;
    setSubmitting(true);
    try {
      await updateCompanyJob(editing.id, input);
      setEditing(null);
      setMode("list");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(
    id: number,
    action: "close" | "duplicate" | "delete",
  ) {
    setBusyId(id);
    setError("");
    try {
      if (action === "close") await closeCompanyJob(id);
      if (action === "duplicate") await duplicateCompanyJob(id);
      if (action === "delete") {
        if (!window.confirm("Delete this job permanently?")) return;
        await deleteCompanyJob(id);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (!canManage) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        Job management is available to founders and recruiters.
      </p>
    );
  }

  if (mode === "create") {
    return (
      <JobForm
        companyName={companyName}
        companyDetailsDefault={companyDetailsDefault}
        submitting={submitting}
        onSubmit={handleCreate}
        onCancel={() => setMode("list")}
      />
    );
  }

  if (mode === "edit" && editing) {
    return (
      <JobForm
        initial={editing}
        companyName={companyName}
        companyDetailsDefault={companyDetailsDefault}
        submitting={submitting}
        onSubmit={handleEdit}
        onCancel={() => {
          setEditing(null);
          setMode("list");
        }}
      />
    );
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Jobs</h2>
          <p className="mt-1 text-sm text-muted">
            Create and manage open roles for {companyName || "your company"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMode("create")}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
        >
          Post a job
        </button>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
          Loading jobs…
        </p>
      ) : jobs.length === 0 ? (
        <div className="border border-line bg-elevated px-5 py-10 text-center">
          <p className="text-sm text-muted">No jobs posted yet.</p>
          <button
            type="button"
            onClick={() => setMode("create")}
            className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
          >
            Post your first job
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-line border border-line bg-elevated">
          {jobs.map((job) => (
            <li key={job.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{job.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {[
                      job.department,
                      job.location,
                      formatEmployment(job.employment_type),
                      formatWorkMode(job.work_mode),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {formatSalary(job.salary_min, job.salary_max)} ·{" "}
                    {job.applicants_count ?? 0} applicants · Posted{" "}
                    {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    job.status === "published"
                      ? "bg-soft text-brand"
                      : "bg-line text-muted"
                  }`}
                >
                  {jobStatusLabel(job.status)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === job.id}
                  onClick={() => {
                    setEditing(job);
                    setMode("edit");
                  }}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                >
                  Edit
                </button>
                {job.status !== "closed" ? (
                  <button
                    type="button"
                    disabled={busyId === job.id}
                    onClick={() => runAction(job.id, "close")}
                    className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                  >
                    Close
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busyId === job.id}
                  onClick={() => runAction(job.id, "duplicate")}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  disabled={busyId === job.id}
                  onClick={() => runAction(job.id, "delete")}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-soft"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
