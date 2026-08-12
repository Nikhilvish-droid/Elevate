const express = require("express");
const { unwrap, asyncHandler, fail } = require("../lib/helpers");
const { getCandidateId } = require("../lib/users");
const { supabaseAdmin } = require("../supabase");
const { screenApplicationInBackground } = require("../lib/resumeScreener/screenApplication");

const router = express.Router();

const JOB_SELECT =
  "id, title, department, description, location, salary_min, salary_max, experience_min_years, experience_max_years, employment_type, work_mode, application_deadline, status, created_at, company_id, required_skills, company_details, companies(id, name, logo_url, industry, description, website_url)";

const JOB_SELECT_BASIC =
  "id, title, department, description, location, salary_min, salary_max, experience_min_years, experience_max_years, employment_type, work_mode, application_deadline, status, created_at, company_id, companies(id, name, logo_url, industry, description, website_url)";

function mapJob(row) {
  if (!row) return null;
  return { ...row, companies: unwrap(row.companies) };
}

async function selectPublishedJobs(supabase, { id, filters } = {}) {
  const { q, location, work_mode, employment_type } = filters || {};
  let query = supabase.from("jobs").select(JOB_SELECT);

  if (id) {
    query = query.eq("id", id).maybeSingle();
  } else {
    query = query.eq("status", "published").order("created_at", { ascending: false });
    if (work_mode) query = query.eq("work_mode", work_mode);
    if (employment_type) query = query.eq("employment_type", employment_type);
    if (location?.trim()) query = query.ilike("location", `%${location.trim()}%`);
    if (q?.trim()) {
      query = query.or(
        `title.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%,location.ilike.%${q.trim()}%`,
      );
    }
  }

  let { data, error } = await query;
  if (error && /required_skills|company_details/i.test(error.message || "")) {
    let fallback = supabase.from("jobs").select(JOB_SELECT_BASIC);
    if (id) {
      fallback = fallback.eq("id", id).maybeSingle();
    } else {
      fallback = fallback
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (work_mode) fallback = fallback.eq("work_mode", work_mode);
      if (employment_type) fallback = fallback.eq("employment_type", employment_type);
      if (location?.trim()) {
        fallback = fallback.ilike("location", `%${location.trim()}%`);
      }
      if (q?.trim()) {
        fallback = fallback.or(
          `title.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%,location.ilike.%${q.trim()}%`,
        );
      }
    }
    ({ data, error } = await fallback);
  }
  if (error) throw new Error(error.message);
  return data;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filters = req.query;
    const data = await selectPublishedJobs(req.supabase, { filters });
    let rows = (data || []).map(mapJob);
    if (filters.q?.trim()) {
      const needle = String(filters.q).trim().toLowerCase();
      rows = rows.filter(
        (j) =>
          j.title.toLowerCase().includes(needle) ||
          (j.companies?.name || "").toLowerCase().includes(needle) ||
          (j.location || "").toLowerCase().includes(needle) ||
          String(j.required_skills || "")
            .toLowerCase()
            .includes(needle),
      );
    }
    res.json(rows);
  }),
);

router.get(
  "/:id/application",
  asyncHandler(async (req, res) => {
    const candidateId = await getCandidateId(req.supabase, req.user.id);
    if (!candidateId) return res.json(null);

    const { data, error } = await req.supabase
      .from("applications")
      .select("id, status, applied_at")
      .eq("candidate_id", candidateId)
      .eq("job_id", req.params.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    res.json(data);
  }),
);

router.post(
  "/:id/apply",
  asyncHandler(async (req, res) => {
    const candidateId = await getCandidateId(req.supabase, req.user.id);
    if (!candidateId) {
      return fail(res, 404, "Finish candidate onboarding first.");
    }

    const fit = String(req.body?.fit || req.body?.how_you_fit || "").trim();
    const why = String(req.body?.why || req.body?.why_role || "").trim();
    if (fit.length < 20) {
      return fail(res, 400, "Describe how you fit this role (at least 20 characters).");
    }
    if (why.length < 20) {
      return fail(res, 400, "Explain why you want this role (at least 20 characters).");
    }

    const { data: existing } = await req.supabase
      .from("applications")
      .select("id")
      .eq("candidate_id", candidateId)
      .eq("job_id", req.params.id)
      .maybeSingle();
    if (existing) {
      return fail(res, 409, "You already applied to this role.");
    }

    let resumeId = Number(req.body?.resume_id);
    if (!Number.isFinite(resumeId)) resumeId = null;

    if (req.body?.resume?.file_url) {
      const resume = req.body.resume;
      await req.supabase
        .from("resumes")
        .update({ is_primary: false })
        .eq("candidate_id", candidateId);
      const { data: inserted, error: resumeErr } = await req.supabase
        .from("resumes")
        .insert({
          candidate_id: candidateId,
          file_name: resume.file_name,
          file_url: resume.file_url,
          file_type: resume.file_type,
          file_size_bytes: resume.file_size_bytes ?? null,
          is_primary: true,
          upload_status: "uploaded",
        })
        .select("id")
        .single();
      if (resumeErr) throw new Error(resumeErr.message);
      resumeId = inserted.id;
    }

    if (!resumeId) {
      const { data: resume } = await req.supabase
        .from("resumes")
        .select("id")
        .eq("candidate_id", candidateId)
        .eq("is_primary", true)
        .maybeSingle();
      resumeId = resume?.id ?? null;
    }

    if (!resumeId) {
      return fail(res, 400, "Add your latest resume before applying.");
    }

    const { data: ownedResume } = await req.supabase
      .from("resumes")
      .select("id")
      .eq("id", resumeId)
      .eq("candidate_id", candidateId)
      .maybeSingle();
    if (!ownedResume) {
      return fail(res, 400, "Choose one of your own resumes.");
    }

    const cover_letter = [
      "How I fit this role:",
      fit,
      "",
      "Why I want this role:",
      why,
    ].join("\n");

    const fullRow = {
      candidate_id: candidateId,
      job_id: Number(req.params.id),
      resume_id: resumeId,
      cover_letter,
      how_you_fit: fit,
      why_role: why,
      status: "applied",
    };
    const basicRow = {
      candidate_id: candidateId,
      job_id: Number(req.params.id),
      resume_id: resumeId,
      cover_letter,
      status: "applied",
    };

    async function insertApplication(client, row) {
      return client.from("applications").insert(row).select("id").single();
    }

    let { data: created, error } = await insertApplication(req.supabase, fullRow);
    if (error && /how_you_fit|why_role/i.test(error.message || "")) {
      ({ data: created, error } = await insertApplication(req.supabase, basicRow));
    }

    // If RLS blocks the user JWT client, use service role after ownership checks above.
    if (error && /row-level security/i.test(error.message || "")) {
      const admin = supabaseAdmin();
      if (admin) {
        ({ data: created, error } = await insertApplication(admin, fullRow));
        if (error && /how_you_fit|why_role/i.test(error.message || "")) {
          ({ data: created, error } = await insertApplication(admin, basicRow));
        }
      }
      if (error && /row-level security/i.test(error.message || "")) {
        return fail(
          res,
          403,
          'Apply is blocked by RLS. Run supabase/applications.sql in the Supabase SQL editor, then try again.',
        );
      }
    }

    if (error) throw new Error(error.message);

    await req.supabase.from("notifications").insert({
      user_id: req.user.id,
      notification_type: "application",
      title: "Application submitted",
      message: "Your application was sent. Track it under Applied.",
      entity_type: "job",
      entity_id: Number(req.params.id),
    });

    if (created?.id) {
      screenApplicationInBackground(req.supabase, created.id);
    }

    res.status(201).json({ ok: true, id: created?.id ?? null });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = await selectPublishedJobs(req.supabase, { id: req.params.id });
    if (!data) return fail(res, 404, "Job not found");
    if (data.status && data.status !== "published") {
      return fail(res, 404, "Job not found");
    }
    res.json(mapJob(data));
  }),
);

module.exports = router;
