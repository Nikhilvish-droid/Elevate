import { api, apiPublic } from "@/lib/api";
import { clearProfileCache } from "@/lib/profile";

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
  required_skills?: string | null;
  company_details?: string | null;
  companies: {
    id: number;
    name: string;
    logo_url: string | null;
    industry: string | null;
    description?: string | null;
    website_url?: string | null;
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
  application_id?: number;
  applications: {
    id?: number;
    job_id: number;
    status?: string;
    jobs: {
      id?: number;
      title: string;
      companies: { name: string; logo_url?: string | null } | null;
    } | null;
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
  entity_type?: string | null;
  entity_id?: number | null;
  company_name?: string | null;
  job_title?: string | null;
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
  gender_identity: string | null;
  pronouns: string | null;
  show_pronouns_on_profile: boolean;
  profile_completion_percentage: number;
  education: {
    id: number;
    institution_name: string;
    degree: string | null;
    field_of_study: string | null;
    start_date: string | null;
    end_date: string | null;
    grade: string | null;
  }[];
  experience: {
    id: number;
    company_name: string;
    job_title: string;
    employment_type: string | null;
    is_current: boolean;
    start_date: string | null;
    end_date: string | null;
    location: string | null;
    description: string | null;
  }[];
  skills: { name: string; category?: string | null }[];
  certifications: {
    id?: number;
    certification_name: string;
    issuing_organization?: string | null;
    file_url?: string | null;
    file_name?: string | null;
    storage_path?: string | null;
    credential_url?: string | null;
  }[];
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
  pronouns?: string | null;
  gender_identity?: string | null;
  show_pronouns_on_profile?: boolean;
  skills: string[];
  open_to_roles: string[];
  education: {
    institution_name: string;
    degree?: string | null;
    field_of_study?: string | null;
    start_year?: string | null;
    end_year?: string | null;
    gpa?: string | null;
    gpa_max?: string | null;
  }[];
  experience: {
    company_name: string;
    job_title: string;
    employment_type?: string | null;
    start_date: string;
    end_date?: string | null;
    is_current: boolean;
    location?: string | null;
    description?: string | null;
  }[];
  certifications?: {
    certification_name: string;
    issuing_organization?: string | null;
    file_url?: string | null;
    file_name?: string | null;
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

export function formatPostedAt(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  const absolute = d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (days <= 0) return `Posted today · ${absolute}`;
  if (days === 1) return `Posted yesterday · ${absolute}`;
  if (days < 7) return `Posted ${days} days ago · ${absolute}`;
  return `Posted ${absolute}`;
}

export function parseSkillList(value?: string | null) {
  if (!value) return [];
  return String(value)
    .split(/[,|•\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function stageLabel(status: string) {
  const s = String(status || "").toLowerCase();
  const map: Record<string, string> = {
    applied: "Applied",
    screening: "Resume Screening",
    resume_screening: "Resume Screening",
    shortlisted: "Shortlisted",
    interview: "Technical Interview",
    interviewing: "Technical Interview",
    technical_interview: "Technical Interview",
    hr_interview: "HR Interview",
    offer: "Offer",
    hired: "Hired",
    rejected: "Rejected",
  };
  return map[s] || s.replace(/_/g, " ");
}

export const APPLICATION_PIPELINE = [
  "applied",
  "resume_screening",
  "shortlisted",
  "technical_interview",
  "hr_interview",
  "offer",
  "hired",
] as const;

export function normalizeAppStage(status: string) {
  const s = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (s === "screening") return "resume_screening";
  if (s === "interview" || s === "interviewing" || s === "technical") {
    return "technical_interview";
  }
  if (s === "hr") return "hr_interview";
  return s;
}

export function pipelineIndex(status: string) {
  const key = normalizeAppStage(status);
  if (key === "rejected") return -1;
  const idx = APPLICATION_PIPELINE.indexOf(
    key as (typeof APPLICATION_PIPELINE)[number],
  );
  return idx;
}

export function roundLabel(type: string) {
  const t = String(type || "").toLowerCase();
  const map: Record<string, string> = {
    screening: "Screening round",
    technical: "Technical round",
    hr: "HR round",
    system_design: "System design round",
  };
  return map[t] || `${t.replace(/_/g, " ")} round`;
}

export function computeCompletion(c: CandidateFull) {
  const skillCount = c.skills.filter((s) => s.category !== "desired_role").length;
  const checks = [
    Boolean(c.profile_image_url),
    Boolean(c.phone),
    Boolean(c.location),
    Boolean(c.professional_summary),
    c.education.length > 0,
    c.experience.length > 0,
    skillCount > 0,
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
  return api<JobRow>(`/api/jobs/${id}`);
}

export async function getMyApplicationForJob(jobId: number) {
  return api<{ id: number; status: string; applied_at: string } | null>(
    `/api/jobs/${jobId}/application`,
  );
}

export async function applyToJob(
  jobId: number,
  input: {
    fit: string;
    why: string;
    resume_id?: number | null;
    resume?: {
      file_name: string;
      file_url: string;
      file_type: "pdf" | "docx";
      file_size_bytes: number;
    } | null;
  },
) {
  await api(`/api/jobs/${jobId}/apply`, {
    method: "POST",
    body: JSON.stringify({
      fit: input.fit,
      why: input.why,
      resume_id: input.resume_id || undefined,
      resume: input.resume || undefined,
    }),
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
  clearProfileCache();
  return { ...data, profile_completion_percentage: computeCompletion(data) };
}

export async function latestResumeScore() {
  return api<{
    match_percentage: number | null;
    recommendations: unknown;
    strengths: unknown;
  } | null>("/api/candidate/resume-score");
}
