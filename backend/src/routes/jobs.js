const express = require("express");
const { unwrap, asyncHandler, fail } = require("../lib/helpers");
const { getCandidateId } = require("../lib/users");

const router = express.Router();

const JOB_SELECT =
  "id, title, department, description, location, salary_min, salary_max, experience_min_years, experience_max_years, employment_type, work_mode, application_deadline, status, created_at, company_id, companies(id, name, logo_url, industry)";

function mapJob(row) {
  if (!row) return null;
  return { ...row, companies: unwrap(row.companies) };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { q, location, work_mode, employment_type } = req.query;
    let query = req.supabase
      .from("jobs")
      .select(JOB_SELECT)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (work_mode) query = query.eq("work_mode", work_mode);
    if (employment_type) query = query.eq("employment_type", employment_type);
    if (location?.trim()) query = query.ilike("location", `%${location.trim()}%`);
    if (q?.trim()) {
      query = query.or(
        `title.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%,location.ilike.%${q.trim()}%`,
      );
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    let rows = (data || []).map(mapJob);
    if (q?.trim()) {
      const needle = q.trim().toLowerCase();
      rows = rows.filter(
        (j) =>
          j.title.toLowerCase().includes(needle) ||
          (j.companies?.name || "").toLowerCase().includes(needle) ||
          (j.location || "").toLowerCase().includes(needle),
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

    const { data: existing } = await req.supabase
      .from("applications")
      .select("id")
      .eq("candidate_id", candidateId)
      .eq("job_id", req.params.id)
      .maybeSingle();
    if (existing) {
      return fail(res, 409, "You already applied to this role.");
    }

    const { data: resume } = await req.supabase
      .from("resumes")
      .select("id")
      .eq("candidate_id", candidateId)
      .eq("is_primary", true)
      .maybeSingle();

    const { error } = await req.supabase.from("applications").insert({
      candidate_id: candidateId,
      job_id: Number(req.params.id),
      resume_id: resume?.id ?? null,
      cover_letter: req.body?.cover_letter?.trim() || null,
      status: "applied",
    });
    if (error) throw new Error(error.message);

    await req.supabase.from("notifications").insert({
      user_id: req.user.id,
      notification_type: "application",
      title: "Application submitted",
      message: "Your application was sent. Track it under Applied.",
      entity_type: "job",
      entity_id: Number(req.params.id),
    });

    res.status(201).json({ ok: true });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { data, error } = await req.supabase
      .from("jobs")
      .select(JOB_SELECT)
      .eq("id", req.params.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return fail(res, 404, "Job not found");
    res.json(mapJob(data));
  }),
);

module.exports = router;
