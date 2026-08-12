import { api } from "@/lib/api";

export type CompanyJob = {
  id: number;
  title: string;
  department: string | null;
  description: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  experience_min_years: number | null;
  experience_max_years: number | null;
  employment_type: string;
  work_mode: string;
  application_deadline: string | null;
  status: string;
  created_at: string;
  company_id: number;
  required_skills?: string | null;
  company_details?: string | null;
  created_by?: string | null;
  applicants_count?: number;
  companies?: {
    id: number;
    name: string;
    logo_url: string | null;
    industry: string | null;
    description?: string | null;
    website_url?: string | null;
  } | null;
};

export type JobInput = {
  title: string;
  department?: string | null;
  description: string;
  location?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  experience_min_years?: number | null;
  experience_max_years?: number | null;
  employment_type?: string;
  work_mode?: string;
  application_deadline?: string | null;
  required_skills?: string | null;
  company_details?: string | null;
  status?: "draft" | "published" | "closed";
};

export async function listCompanyJobs(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return api<CompanyJob[]>(`/api/company/jobs${q}`);
}

export async function getCompanyJob(id: number) {
  return api<CompanyJob>(`/api/company/jobs/${id}`);
}

export async function createCompanyJob(input: JobInput) {
  return api<CompanyJob>("/api/company/jobs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCompanyJob(id: number, input: Partial<JobInput>) {
  return api<CompanyJob>(`/api/company/jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function closeCompanyJob(id: number) {
  return api<CompanyJob>(`/api/company/jobs/${id}/close`, { method: "POST" });
}

export async function duplicateCompanyJob(id: number) {
  return api<CompanyJob>(`/api/company/jobs/${id}/duplicate`, {
    method: "POST",
  });
}

export async function deleteCompanyJob(id: number) {
  return api<{ ok: boolean }>(`/api/company/jobs/${id}`, { method: "DELETE" });
}

export function formatSalary(min?: number | null, max?: number | null) {
  if (min == null && max == null) return "Not set";
  const fmt = (n: number) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
      : `₹${n.toLocaleString("en-IN")}`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

export function formatEmployment(type?: string | null) {
  const map: Record<string, string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    internship: "Internship",
    temporary: "Temporary",
  };
  return map[String(type || "")] || type || "—";
}

export function formatWorkMode(mode?: string | null) {
  const map: Record<string, string> = {
    onsite: "On-site",
    remote: "Remote",
    hybrid: "Hybrid",
  };
  return map[String(mode || "")] || mode || "—";
}

export function jobStatusLabel(status?: string | null) {
  const s = String(status || "").toLowerCase();
  if (s === "published") return "Open";
  if (s === "closed") return "Closed";
  if (s === "draft") return "Draft";
  return status || "—";
}
