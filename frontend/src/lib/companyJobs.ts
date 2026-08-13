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

export type AiScreening = {
  candidate_name?: string | null;
  match_percentage?: number | null;
  resume_score?: number | null;
  fit_score?: number | null;
  why_score?: number | null;
  weights?: {
    resume?: number;
    fit?: number;
    why?: number;
  } | null;
  strong_skills?: string[];
  missing_skills?: string[];
  weak_areas?: string[];
  summary?: string | null;
  recommendation?: string | null;
  verdict?: string | null;
  questions?: {
    easy?: string[];
    medium?: string[];
    hard?: string[];
  } | null;
  screened_at?: string | null;
};

export type JobApplicant = {
  application_id: number;
  candidate_id: number;
  full_name: string;
  profile_image_url: string | null;
  expertise: string;
  location: string | null;
  total_experience_years: number | null;
  skills: string[];
  status: string;
  match_score: number | null;
  applied_at: string | null;
  cover_letter: string | null;
  how_you_fit?: string | null;
  why_role?: string | null;
  ai_screening?: AiScreening | null;
  resume?: {
    id: number;
    file_name: string | null;
    file_url: string | null;
    file_type: string | null;
  } | null;
};

export type JobApplicantsResponse = {
  job: {
    id: number;
    title: string;
    status: string;
    location: string | null;
    work_mode: string | null;
  };
  applicants: JobApplicant[];
};

export async function listJobApplicants(jobId: number) {
  return api<JobApplicantsResponse>(`/api/company/jobs/${jobId}/applicants`);
}

export async function updateApplicationStatus(
  applicationId: number,
  status: string,
) {
  return api<{
    id: number;
    status: string;
    match_score: number | null;
    applied_at: string | null;
    candidate_id: number;
    job_id: number;
  }>(`/api/company/applications/${applicationId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function runAiScreen(applicationId: number) {
  return api<{
    id: number;
    status: string;
    match_score: number | null;
    ai_screening?: AiScreening | null;
  }>(`/api/company/applications/${applicationId}/screen`, {
    method: "POST",
  });
}

export async function getApplicationResume(applicationId: number) {
  return api<{ url: string; file_name: string }>(
    `/api/company/applications/${applicationId}/resume`,
  );
}

export type PipelineApplicant = {
  application_id: number;
  candidate_id: number;
  full_name: string;
  profile_image_url: string | null;
  email?: string | null;
  location: string | null;
  status: string;
  match_score: number | null;
  applied_at: string | null;
  how_you_fit?: string | null;
  why_role?: string | null;
  cover_letter?: string | null;
  approved_for_offer?: boolean;
  approved_at?: string | null;
  status_label?: string;
  ai_screening?: AiScreening | null;
  job: {
    id: number;
    title: string;
    location: string | null;
    salary_min: number | null;
    salary_max: number | null;
  };
};

export type CompanyOffer = {
  id: number;
  salary: number | null;
  joining_date: string | null;
  location: string | null;
  offer_pdf_url: string | null;
  status: string;
  created_at: string;
  candidate_id: number;
  job_id: number;
  candidate_name: string;
  job_title: string;
  profile_image_url: string | null;
};

export type ApplicantsByJob = {
  id: number;
  title: string;
  location: string | null;
  items: PipelineApplicant[];
};

export function groupApplicantsByJob(
  rows: PipelineApplicant[],
): ApplicantsByJob[] {
  const map = new Map<number, ApplicantsByJob>();
  for (const row of rows) {
    const existing = map.get(row.job.id);
    if (existing) {
      existing.items.push(row);
      continue;
    }
    map.set(row.job.id, {
      id: row.job.id,
      title: row.job.title,
      location: row.job.location,
      items: [row],
    });
  }
  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export function countLabel(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function applicantStage(row: { status?: string | null }) {
  return String(row.status || "").toLowerCase();
}

export function isRejectedApplicant(row: {
  status?: string | null;
}) {
  return applicantStage(row) === "rejected";
}

export function isApprovedOrHired(row: {
  status?: string | null;
  approved_for_offer?: boolean | null;
}) {
  const status = applicantStage(row);
  return (
    Boolean(row.approved_for_offer) || status === "offer" || status === "hired"
  );
}

export function isPendingReview(row: {
  status?: string | null;
  approved_for_offer?: boolean | null;
}) {
  if (isRejectedApplicant(row) || isApprovedOrHired(row)) return false;
  return [
    "shortlisted",
    "technical_interview",
    "hr_interview",
    "interview",
    "interviewing",
  ].includes(applicantStage(row));
}

export async function listShortlistedApplicants() {
  const data = await api<{ applicants: PipelineApplicant[] }>(
    "/api/company/shortlist",
  );
  return data.applicants;
}

export async function listPipelineApplicants(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await api<{ applicants: PipelineApplicant[] }>(
    `/api/company/pipeline${q}`,
  );
  return data.applicants;
}

export async function listCompanyOffers() {
  const data = await api<{ offers: CompanyOffer[] }>("/api/company/offers");
  return data.offers;
}

export async function createCompanyOffer(input: {
  application_id: number;
  salary: string | number;
  role?: string;
  location?: string | null;
  joining_date?: string | null;
}) {
  return api<CompanyOffer>("/api/company/offers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type CompanyInterviewer = {
  user_id: string;
  role: string;
  full_name: string;
  email: string | null;
  profile_image_url: string | null;
};

export type AssignedInterview = {
  id: number;
  interview_type: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link: string | null;
  location: string | null;
  status: string;
  application_id: number;
  candidate_name: string;
  candidate_id: number;
  profile_image_url: string | null;
  candidate_location: string | null;
  expertise?: string | null;
  skills?: string[];
  total_experience_years?: number | null;
  professional_summary?: string | null;
  how_you_fit?: string | null;
  why_role?: string | null;
  cover_letter?: string | null;
  match_score?: number | null;
  job_title: string;
  company_name: string | null;
  ai_screening?: AiScreening | null;
  resume?: {
    id: number;
    file_name: string | null;
    file_url: string | null;
    file_type: string | null;
  } | null;
  screening_questions?: {
    easy?: string[];
    medium?: string[];
    hard?: string[];
  } | null;
  match_summary?: {
    match_percentage: number | null;
    strong_skills: string[];
    missing_skills: string[];
    recommendation: string | null;
  } | null;
  feedback: {
    technical: number | null;
    communication: number | null;
    problem_solving: number | null;
    teamwork: number | null;
    leadership: number | null;
    overall: number | null;
    comments: string | null;
    submitted_at: string | null;
  } | null;
};

export type ApplicationFeedbackRow = {
  interview_id: number;
  interview_type: string;
  scheduled_at: string;
  status: string;
  interviewer_name: string;
  technical: number | null;
  communication: number | null;
  problem_solving: number | null;
  teamwork: number | null;
  leadership: number | null;
  overall: number | null;
  comments: string | null;
  submitted_at: string | null;
};

export async function approveApplication(applicationId: number) {
  return api(`/api/company/applications/${applicationId}/approve`, {
    method: "POST",
  });
}

export async function rejectApplication(applicationId: number) {
  return api(`/api/company/applications/${applicationId}/reject`, {
    method: "POST",
  });
}

export async function listCompanyInterviewers() {
  const data = await api<{ interviewers: CompanyInterviewer[] }>(
    "/api/company/interviewers",
  );
  return data.interviewers;
}

export async function listAssignedInterviews() {
  const data = await api<{ interviews: AssignedInterview[] }>(
    "/api/company/interviews/assigned",
  );
  return data.interviews;
}

export async function endCompanyInterview(interviewId: number) {
  return api<{ id: number; status: string }>(
    `/api/company/interviews/${interviewId}/end`,
    { method: "POST" },
  );
}

export async function submitInterviewFeedback(
  interviewId: number,
  input: {
    technical: number;
    communication: number;
    problem_solving: number;
    teamwork: number;
    leadership: number;
    overall: number;
    comments?: string;
  },
) {
  return api(`/api/company/interviews/${interviewId}/feedback`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listApplicationFeedback(applicationId: number) {
  const data = await api<{ feedback: ApplicationFeedbackRow[] }>(
    `/api/company/applications/${applicationId}/feedback`,
  );
  return data.feedback;
}

export type CompanyInterview = {
  id: number;
  application_id: number;
  job_id: number | null;
  job_title: string;
  company_name?: string | null;
  interview_type: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link: string | null;
  location: string | null;
  status: string;
  interviewer_id: string | null;
  interviewer_name: string | null;
  candidate_name: string;
};

export async function listCompanyInterviews() {
  const data = await api<{ interviews: CompanyInterview[] }>(
    "/api/company/interviews",
  );
  return data.interviews;
}

export async function updateCompanyInterview(
  interviewId: number,
  input: {
    scheduled_at?: string;
    interviewer_id?: string;
    interview_type?: string;
    duration_minutes?: number;
    meeting_link?: string | null;
    location?: string | null;
    create_google_meet?: boolean;
  },
) {
  return api(`/api/company/interviews/${interviewId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function cancelCompanyInterview(interviewId: number) {
  return api(`/api/company/interviews/${interviewId}/cancel`, {
    method: "POST",
  });
}

export async function getGoogleMeetStatus() {
  return api<{ configured: boolean }>("/api/company/interviews/meet-status");
}

export async function scheduleCompanyInterview(input: {
  application_id: number;
  interviewer_id: string;
  scheduled_at: string;
  interview_type?: string;
  duration_minutes?: number;
  meeting_link?: string | null;
  location?: string | null;
  create_google_meet?: boolean;
}) {
  return api("/api/company/interviews", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type ApplicationMessage = {
  id: number;
  application_id: number;
  template_key: string | null;
  subject: string;
  body: string;
  email_sent: boolean;
  created_at: string;
  sender_name: string;
};

export async function listApplicationMessages(applicationId: number) {
  const data = await api<{ messages: ApplicationMessage[] }>(
    `/api/company/applications/${applicationId}/messages`,
  );
  return data.messages || [];
}

export async function sendCompanyMessage(input: {
  application_id: number;
  subject: string;
  message: string;
  template_key?: string | null;
}) {
  return api<{ ok: boolean; inbox?: boolean; email?: boolean }>(
    "/api/company/messages",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export type CompanyNotification = {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  entity_type: string | null;
  entity_id: number | null;
};

export async function listCompanyNotifications() {
  const data = await api<{ notifications: CompanyNotification[] }>(
    "/api/company/notifications",
  );
  return data.notifications || [];
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
