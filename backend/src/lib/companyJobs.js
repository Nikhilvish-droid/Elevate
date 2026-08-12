const JOB_SELECT =
  "id, title, department, description, location, salary_min, salary_max, experience_min_years, experience_max_years, employment_type, work_mode, application_deadline, status, created_at, company_id, required_skills, company_details, created_by, companies(id, name, logo_url, industry, description, website_url)";

const JOB_SELECT_BASIC =
  "id, title, department, description, location, salary_min, salary_max, experience_min_years, experience_max_years, employment_type, work_mode, application_deadline, status, created_at, company_id, companies(id, name, logo_url, industry)";

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship", "temporary"];
const WORK_MODES = ["onsite", "remote", "hybrid"];
const JOB_STATUSES = ["draft", "published", "closed"];

function unwrap(rel) {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

function mapJob(row) {
  if (!row) return null;
  return { ...row, companies: unwrap(row.companies) };
}

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function toSkills(value) {
  if (Array.isArray(value)) {
    return value.map((s) => String(s).trim()).filter(Boolean).join(", ") || null;
  }
  if (typeof value === "string") {
    return value.trim() || null;
  }
  return null;
}

function normalizeEmployment(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (EMPLOYMENT_TYPES.includes(raw)) return raw;
  if (raw === "fulltime") return "full_time";
  if (raw === "parttime") return "part_time";
  return raw || "full_time";
}

function normalizeWorkMode(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "");
  if (raw === "on_site" || raw === "onsite" || raw === "office") return "onsite";
  if (raw === "remote") return "remote";
  if (raw === "hybrid") return "hybrid";
  return WORK_MODES.includes(raw) ? raw : "hybrid";
}

function parseJobBody(body, { partial = false } = {}) {
  const src = body || {};
  const out = {};

  if (!partial || src.title !== undefined) {
    const title = String(src.title || "").trim();
    if (!title) {
      const err = new Error("Job title is required.");
      err.status = 400;
      throw err;
    }
    out.title = title;
  }

  if (!partial || src.department !== undefined) {
    out.department = src.department?.trim?.() || src.department || null;
  }
  if (!partial || src.description !== undefined) {
    const description = String(src.description || "").trim();
    if (!partial && !description) {
      const err = new Error("Job description is required.");
      err.status = 400;
      throw err;
    }
    if (description || !partial) out.description = description || null;
  }
  if (!partial || src.location !== undefined) {
    out.location = src.location?.trim?.() || src.location || null;
  }
  if (!partial || src.salary_min !== undefined) {
    out.salary_min = toInt(src.salary_min);
  }
  if (!partial || src.salary_max !== undefined) {
    out.salary_max = toInt(src.salary_max);
  }
  if (!partial || src.experience_min_years !== undefined) {
    out.experience_min_years = toInt(src.experience_min_years);
  }
  if (!partial || src.experience_max_years !== undefined) {
    out.experience_max_years = toInt(src.experience_max_years);
  }
  if (!partial || src.employment_type !== undefined) {
    out.employment_type = normalizeEmployment(src.employment_type);
  }
  if (!partial || src.work_mode !== undefined) {
    out.work_mode = normalizeWorkMode(src.work_mode);
  }
  if (!partial || src.application_deadline !== undefined) {
    out.application_deadline = src.application_deadline || null;
  }
  if (!partial || src.required_skills !== undefined || src.skills !== undefined) {
    out.required_skills = toSkills(src.required_skills ?? src.skills);
  }
  if (!partial || src.company_details !== undefined) {
    out.company_details =
      src.company_details?.trim?.() || src.company_details || null;
  }
  if (!partial || src.status !== undefined) {
    const status = String(src.status || "published").toLowerCase();
    out.status = JOB_STATUSES.includes(status) ? status : "published";
  }

  return out;
}

module.exports = {
  JOB_SELECT,
  JOB_SELECT_BASIC,
  EMPLOYMENT_TYPES,
  WORK_MODES,
  JOB_STATUSES,
  mapJob,
  parseJobBody,
};
