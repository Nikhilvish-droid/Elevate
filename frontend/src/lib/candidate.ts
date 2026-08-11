import { api, apiPublic } from "@/lib/api";

export type JobRow = {
  id: number;
  title: string;
  department: string | null;
  description: string;
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
  companies: {
    id: number;
    name: string;
    logo_url: string | null;
    industry: string | null;
  } | null;
};

export type ApplicationRow = {
  id: number;
  status: string;
  match_score: number | null;
  cover_letter: string | null;
  applied_at: string;
  job_id: number;
  jobs: JobRow | null;
};

export type InterviewRow = {
  id: number;
  interview_type: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link: string | null;
  location: string | null;
  status: string;
  applications: {
    job_id: number;
    jobs: { title: string; companies: { name: string } | null } | null;
  } | null;
};

export type AssessmentAttempt = {
  id: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  coding_assessments: {
    title: string;
    duration_minutes: number | null;
    description: string | null;
  } | null;
};

export type OfferRow = {
  id: number;
  salary: number | null;
  joining_date: string | null;
  location: string | null;
  offer_pdf_url: string | null;
  status: string;
  jobs: { title: string; companies: { name: string } | null } | null;
};

export type NotificationRow = {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
};

export type JobFilters = {
  q?: string;
  location?: string;
  work_mode?: string;
  employment_type?: string;
};

export type CandidateFull = {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  profile_image_url: string | null;
  location: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  professional_summary: string | null;
  total_experience_years: number | null;
  profile_completion_percentage: number;
  education: {
    id: number;
    institution_name: string;
    degree: string | null;
    field_of_study: string | null;
    start_date: string | null;
    end_date: string | null;
  }[];
  experience: {
    id: number;
    company_name: string;
    job_title: string;
    is_current: boolean;
    start_date: string | null;
    end_date: string | null;
    location: string | null;
    description: string | null;
  }[];
  skills: { name: string; category?: string | null }[];
  certifications: { certification_name: string }[];
  resumes: {
    id: number;
    file_name: string;
    file_url: string;
    is_primary: boolean;
    file_type: string;
  }[];
};

export type ProfileDraft = {
  full_name: string;
  phone?: string | null;
  location?: string | null;
  professional_summary?: string | null;
  total_experience_years?: number | null;
  portfolio_url?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  profile_image_url?: string | null;
  skills: string[];
  open_to_roles: string[];
  education: {
    institution_name: string;
    degree?: string | null;
    field_of_study?: string | null;
    end_year?: string | null;
  }[];
  experience: {
    company_name: string;
    job_title: string;
    start_date: string;
    end_date?: string | null;
    is_current: boolean;
  }[];
  resume?: {
    file_name: string;
    file_url: string;
    file_type: "pdf" | "docx";
    file_size_bytes: number;
  } | null;
};

export function formatPay(min: number | null, max: number | null) {
  if (min == null && max == null) return "Salary not listed";
  const fmt = (n: number) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
      : `₹${n.toLocaleString("en-IN")}`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

export function formatWorkMode(mode: string) {
  if (mode === "onsite") return "On-site";
  if (mode === "hybrid") return "Hybrid";
  if (mode === "remote") return "Remote";
  return mode;
}

export function formatEmployment(type: string) {
  return type.replace(/_/g, " ");
}

export function stageLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function computeCompletion(c: CandidateFull) {
  const checks = [
    Boolean(c.profile_image_url),
    Boolean(c.phone),
    Boolean(c.location),
    Boolean(c.professional_summary),
    c.education.length > 0,
    c.experience.length > 0,
    c.skills.length > 0,
    c.resumes.length > 0,
    Boolean(c.linkedin_url || c.github_url || c.portfolio_url),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function qs(filters: JobFilters) {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  if (filters.location) p.set("location", filters.location);
  if (filters.work_mode) p.set("work_mode", filters.work_mode);
  if (filters.employment_type) p.set("employment_type", filters.employment_type);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function listPublishedJobs(filters: JobFilters = {}) {
  return api<JobRow[]>(`/api/jobs${qs(filters)}`);
}

export async function getPublishedJob(id: number) {
  try {
    return await api<JobRow>(`/api/jobs/${id}`);
  } catch {
    return null;
  }
}

export async function getMyApplicationForJob(jobId: number) {
  return api<{ id: number; status: string; applied_at: string } | null>(
    `/api/jobs/${jobId}/application`,
  );
}

export async function applyToJob(jobId: number, coverLetter?: string) {
  await api(`/api/jobs/${jobId}/apply`, {
    method: "POST",
    body: JSON.stringify({ cover_letter: coverLetter || "" }),
  });
}

export async function listMyApplications() {
  return api<ApplicationRow[]>("/api/candidate/applications");
}

export async function listMyInterviews() {
  return api<InterviewRow[]>("/api/candidate/interviews");
}

export async function listMyAssessments() {
  return api<AssessmentAttempt[]>("/api/candidate/assessments");
}

export async function listMyOffers() {
  return api<OfferRow[]>("/api/candidate/offers");
}

export async function respondToOffer(offerId: number, accept: boolean) {
  await api(`/api/candidate/offers/${offerId}`, {
    method: "PATCH",
    body: JSON.stringify({ accept }),
  });
}

export async function listMyNotifications() {
  return api<NotificationRow[]>("/api/candidate/notifications");
}

export async function markNotificationRead(id: number) {
  await api(`/api/candidate/notifications/${id}`, { method: "PATCH" });
}

export type PublicCandidate = Omit<
  CandidateFull,
  "email" | "phone" | "resumes" | "profile_completion_percentage"
> & {
  email?: string | null;
  phone?: string | null;
  resumes?: CandidateFull["resumes"];
};

export async function getPublicCandidate(
  candidateId: number,
): Promise<PublicCandidate | null> {
  try {
    return await apiPublic<PublicCandidate>(`/api/profiles/${candidateId}`);
  } catch {
    return null;
  }
}

export async function getCandidateFull(): Promise<CandidateFull | null> {
  try {
    const data = await api<CandidateFull>("/api/candidate/profile");
    return { ...data, profile_completion_percentage: computeCompletion(data) };
  } catch {
    return null;
  }
}

export async function saveCandidateProfile(draft: ProfileDraft) {
  const data = await api<CandidateFull>("/api/candidate/profile", {
    method: "PUT",
    body: JSON.stringify(draft),
  });
  return { ...data, profile_completion_percentage: computeCompletion(data) };
}

export async function latestResumeScore() {
  return api<{
    match_percentage: number | null;
    recommendations: unknown;
    strengths: unknown;
  } | null>("/api/candidate/resume-score");
}
