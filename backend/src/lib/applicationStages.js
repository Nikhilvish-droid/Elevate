/** DevFusion Section 7 application stages (snake_case storage keys). */

const CANONICAL_STAGES = [
  "applied",
  "resume_screening",
  "shortlisted",
  "technical_interview",
  "hr_interview",
  "offer",
  "hired",
  "rejected",
];

const STAGE_LABELS = {
  applied: "Applied",
  resume_screening: "Resume Screening",
  shortlisted: "Shortlisted",
  technical_interview: "Technical Interview",
  hr_interview: "HR Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
  // legacy
  screening: "Resume Screening",
  interview: "Technical Interview",
  interviewing: "Technical Interview",
};

const LEGACY_TO_CANONICAL = {
  screening: "resume_screening",
  interview: "technical_interview",
  interviewing: "technical_interview",
  technical: "technical_interview",
  hr: "hr_interview",
};

function normalizeStage(status) {
  const raw = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!raw) return "applied";
  if (LEGACY_TO_CANONICAL[raw]) return LEGACY_TO_CANONICAL[raw];
  if (CANONICAL_STAGES.includes(raw)) return raw;
  return raw;
}

function isAllowedStage(status) {
  return CANONICAL_STAGES.includes(normalizeStage(status));
}

function stageLabel(status) {
  const key = normalizeStage(status);
  return STAGE_LABELS[key] || key.replace(/_/g, " ");
}

function pipelineIndex(status) {
  const key = normalizeStage(status);
  if (key === "rejected") return -1;
  return CANONICAL_STAGES.filter((s) => s !== "rejected").indexOf(key);
}

function activePipeline() {
  return CANONICAL_STAGES.filter((s) => s !== "rejected");
}

function statusMatchesShortlist(status) {
  return normalizeStage(status) === "shortlisted";
}

function statusMatchesInterview(status) {
  const key = normalizeStage(status);
  return key === "technical_interview" || key === "hr_interview";
}

function roundToAppStatus(interviewType) {
  const t = String(interviewType || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (t === "hr" || t === "hr_interview") return "hr_interview";
  if (t === "screening" || t === "resume_screening") return "resume_screening";
  return "technical_interview";
}

function canViewHiringPipeline(membershipRole) {
  return (
    membershipRole === "founder" ||
    membershipRole === "recruiter" ||
    membershipRole === "hiring_manager"
  );
}

module.exports = {
  CANONICAL_STAGES,
  STAGE_LABELS,
  normalizeStage,
  isAllowedStage,
  stageLabel,
  pipelineIndex,
  activePipeline,
  statusMatchesShortlist,
  statusMatchesInterview,
  roundToAppStatus,
  canViewHiringPipeline,
};
