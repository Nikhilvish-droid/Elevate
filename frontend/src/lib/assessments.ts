import { api } from "@/lib/api";

export type QuestionType = "mcq" | "coding" | "sql" | "debug";

export type AssessmentQuestion = {
  id: number;
  assessment_id?: number;
  question_type: QuestionType;
  prompt: string;
  options?: string[] | { key?: string; label?: string; text?: string }[];
  correct_option?: string | null;
  test_cases?: { stdin?: string; stdout?: string; expected?: string; input?: string; output?: string; visible?: boolean }[];
  language?: string | null;
  points: number;
  sort_order?: number;
  source?: string;
};

export type CodingAssessment = {
  id: number;
  job_id: number;
  company_id?: number;
  title: string;
  description: string | null;
  duration_minutes: number;
  pass_score?: number | null;
  max_violations?: number;
  created_at?: string;
  job_title?: string | null;
  questions?: AssessmentQuestion[];
};

export type AssessmentAttemptRow = {
  id: number;
  assessment_id?: number;
  application_id?: number;
  candidate_id?: number;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  score: number | null;
  max_score?: number | null;
  violation_count?: number;
  plagiarism_flag?: boolean;
  can_start?: boolean;
  candidate_name?: string;
  profile_image_url?: string | null;
  coding_assessments?: {
    id?: number;
    title: string;
    duration_minutes: number | null;
    description?: string | null;
    max_violations?: number;
    pass_score?: number | null;
  } | null;
};

export type AttemptDetail = AssessmentAttemptRow & {
  remaining_seconds?: number;
  questions?: AssessmentQuestion[];
  answers?: {
    question_id: number;
    answer_text: string | null;
    is_correct?: boolean | null;
    points_awarded?: number | null;
  }[];
  coding_assessments?: CodingAssessment | AssessmentAttemptRow["coding_assessments"];
};

export async function listCompanyAssessments(jobId?: number) {
  const q = jobId ? `?job_id=${jobId}` : "";
  return api<CodingAssessment[]>(`/api/company/assessments${q}`);
}

export async function createCompanyAssessment(body: {
  job_id: number;
  title: string;
  description?: string;
  duration_minutes?: number;
  pass_score?: number;
  max_violations?: number;
}) {
  return api<CodingAssessment>("/api/company/assessments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getCompanyAssessment(id: number) {
  return api<CodingAssessment & { questions: AssessmentQuestion[] }>(
    `/api/company/assessments/${id}`,
  );
}

export async function updateCompanyAssessment(
  id: number,
  body: Partial<CodingAssessment>,
) {
  return api<CodingAssessment>(`/api/company/assessments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteCompanyAssessment(id: number) {
  return api<{ ok: boolean }>(`/api/company/assessments/${id}`, {
    method: "DELETE",
  });
}

export async function addAssessmentQuestion(
  assessmentId: number,
  body: Partial<AssessmentQuestion> & { question_type: QuestionType; prompt: string },
) {
  return api<AssessmentQuestion>(
    `/api/company/assessments/${assessmentId}/questions`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function deleteAssessmentQuestion(
  assessmentId: number,
  questionId: number,
) {
  return api<{ ok: boolean }>(
    `/api/company/assessments/${assessmentId}/questions/${questionId}`,
    { method: "DELETE" },
  );
}

export async function assignAssessment(
  assessmentId: number,
  applicationIds: number[],
) {
  return api<{ attempts: AssessmentAttemptRow[] }>(
    `/api/company/assessments/${assessmentId}/assign`,
    {
      method: "POST",
      body: JSON.stringify({ application_ids: applicationIds }),
    },
  );
}

export async function listAssessmentAttempts(assessmentId: number) {
  return api<AssessmentAttemptRow[]>(
    `/api/company/assessments/${assessmentId}/attempts`,
  );
}

export async function listApplicationAssessments(applicationId: number) {
  return api<AssessmentAttemptRow[]>(
    `/api/company/applications/${applicationId}/assessments`,
  );
}

export async function listMyAssessments() {
  return api<AssessmentAttemptRow[]>("/api/candidate/assessments");
}

export async function startAssessmentAttempt(id: number) {
  return api<AttemptDetail>(`/api/candidate/assessments/attempts/${id}/start`, {
    method: "POST",
  });
}

export async function getAssessmentAttempt(id: number) {
  return api<AttemptDetail>(`/api/candidate/assessments/attempts/${id}`);
}

export async function saveAssessmentAnswers(
  id: number,
  answers: { question_id: number; answer_text: string }[],
) {
  return api<{ ok: boolean }>(
    `/api/candidate/assessments/attempts/${id}/answers`,
    {
      method: "PUT",
      body: JSON.stringify({ answers }),
    },
  );
}

export async function reportAssessmentViolation(
  id: number,
  type: "tab_switch" | "window_blur",
) {
  return api<{
    ok: boolean;
    violation_count: number;
    auto_submitted: boolean;
  }>(`/api/candidate/assessments/attempts/${id}/violation`, {
    method: "POST",
    body: JSON.stringify({ type }),
  });
}

export async function submitAssessmentAttempt(
  id: number,
  opts?: {
    auto?: boolean;
    answers?: { question_id: number; answer_text: string }[];
  },
) {
  return api<AssessmentAttemptRow>(
    `/api/candidate/assessments/attempts/${id}/submit`,
    {
      method: "POST",
      body: JSON.stringify(opts || {}),
    },
  );
}
