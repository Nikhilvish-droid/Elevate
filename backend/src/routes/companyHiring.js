const { asyncHandler, fail, unwrap } = require("../lib/helpers");
const { buildSessionProfile } = require("../lib/users");
const {
  requireCompanyMember,
  requireJobManager,
  requireRecruiter,
  requireHiringManager,
  requireInterviewer,
} = require("../lib/company");
const { JOB_SELECT, JOB_SELECT_BASIC, mapJob, parseJobBody } = require("../lib/companyJobs");
const {
  isAllowedStage,
  normalizeStage,
  roundToAppStatus,
  stageLabel: appStageLabel,
  canViewHiringPipeline,
} = require("../lib/applicationStages");
const { screenApplication } = require("../lib/resumeScreener/screenApplication");

const COMPANY_SELECT =
  "id, name, website_url, industry, company_size, description, linkedin_url, twitter_url, github_url, logo_url, created_at";

function companyFieldsFromBody(body) {
  const src = body || {};
  const out = {};
  const keys = [
    "name",
    "website_url",
    "industry",
    "company_size",
    "description",
    "linkedin_url",
    "twitter_url",
    "github_url",
    "logo_url",
  ];
  for (const key of keys) {
    if (src[key] !== undefined) {
      const val = typeof src[key] === "string" ? src[key].trim() : src[key];
      out[key] = val || null;
    }
  }
  if (src.company_name !== undefined) {
    out.name = String(src.company_name || "").trim() || null;
  }
  if (src.website !== undefined) {
    out.website_url = String(src.website || "").trim() || null;
  }
  return out;
}

async function loadCompany(supabase, companyId) {
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_SELECT)
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function loadLocations(supabase, companyId) {
  const { data, error } = await supabase
    .from("company_locations")
    .select(
      "id, address_line, city, state, country, postal_code, is_headquarters",
    )
    .eq("company_id", companyId)
    .order("is_headquarters", { ascending: false });
  if (error) return [];
  return data || [];
}

async function applicantCounts(supabase, jobIds) {
  const counts = {};
  for (const id of jobIds) counts[id] = 0;
  if (!jobIds.length) return counts;

  const { data, error } = await supabase
    .from("applications")
    .select("job_id")
    .in("job_id", jobIds);
  if (error) return counts;
  for (const row of data || []) {
    counts[row.job_id] = (counts[row.job_id] || 0) + 1;
  }
  return counts;
}

async function selectCompanyJobs(supabase, companyId, { id, status } = {}) {
  let query = supabase
    .from("jobs")
    .select(JOB_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (id) query = query.eq("id", id);
  if (status) query = query.eq("status", status);

  let { data, error } = id ? await query.maybeSingle() : await query;
  if (error && /required_skills|company_details|created_by/i.test(error.message)) {
    let fallback = supabase
      .from("jobs")
      .select(JOB_SELECT_BASIC)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (id) fallback = fallback.eq("id", id);
    if (status) fallback = fallback.eq("status", status);
    ({ data, error } = id ? await fallback.maybeSingle() : await fallback);
  }
  if (error) throw new Error(error.message);
  return data;
}

async function listPlatformCandidates(supabase, { limit = 40 } = {}) {
  const take = Math.min(Math.max(Number(limit) || 40, 1), 100);
  const { data: rows, error } = await supabase
    .from("candidates")
    .select(
      "id, first_name, last_name, profile_image_url, location, professional_summary, total_experience_years, created_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(take);

  if (error) {
    // Older schemas may lack updated_at — fall back to id order.
    if (/updated_at/i.test(error.message || "")) {
      const fallback = await supabase
        .from("candidates")
        .select(
          "id, first_name, last_name, profile_image_url, location, professional_summary, total_experience_years, created_at",
        )
        .order("id", { ascending: false })
        .limit(take);
      if (fallback.error) throw new Error(fallback.error.message);
      return enrichCandidateList(supabase, fallback.data || []);
    }
    throw new Error(error.message);
  }

  return enrichCandidateList(supabase, rows || []);
}

async function enrichCandidateList(supabase, rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);

  const [{ data: skillRows }, { data: expRows }] = await Promise.all([
    supabase
      .from("candidate_skills")
      .select("candidate_id, skills(name, category)")
      .in("candidate_id", ids),
    supabase
      .from("candidate_experience")
      .select("candidate_id, job_title, company_name, is_current, start_date")
      .in("candidate_id", ids)
      .order("is_current", { ascending: false })
      .order("start_date", { ascending: false }),
  ]);

  const skillsById = {};
  const rolesById = {};
  for (const row of skillRows || []) {
    const skill = unwrap(row.skills);
    if (!skill?.name) continue;
    if (skill.category === "desired_role") {
      if (!rolesById[row.candidate_id]) rolesById[row.candidate_id] = [];
      rolesById[row.candidate_id].push(skill.name);
    } else {
      if (!skillsById[row.candidate_id]) skillsById[row.candidate_id] = [];
      skillsById[row.candidate_id].push(skill.name);
    }
  }

  const experienceById = {};
  for (const row of expRows || []) {
    if (experienceById[row.candidate_id]) continue;
    experienceById[row.candidate_id] = row;
  }

  return rows.map((cand) => {
    const name = [cand.first_name, cand.last_name].filter(Boolean).join(" ").trim();
    const openRoles = rolesById[cand.id] || [];
    const skills = (skillsById[cand.id] || []).slice(0, 4);
    const exp = experienceById[cand.id];
    const expertise =
      openRoles[0] ||
      exp?.job_title ||
      skills[0] ||
      "Candidate";

    const details = [];
    if (cand.location) details.push(cand.location);
    if (cand.total_experience_years != null) {
      details.push(
        `${cand.total_experience_years} yr${cand.total_experience_years === 1 ? "" : "s"} exp`,
      );
    }
    if (exp?.company_name) {
      details.push(
        exp.is_current
          ? `At ${exp.company_name}`
          : `Previously at ${exp.company_name}`,
      );
    } else if (skills.length) {
      details.push(skills.slice(0, 3).join(" · "));
    }

    return {
      id: cand.id,
      full_name: name || "Candidate",
      profile_image_url: cand.profile_image_url || null,
      expertise,
      location: cand.location || null,
      total_experience_years: cand.total_experience_years ?? null,
      skills,
      open_to_roles: openRoles,
      headline: cand.professional_summary
        ? String(cand.professional_summary).slice(0, 120)
        : null,
      details: details.join(" · "),
      updated_at: cand.updated_at || cand.created_at || null,
    };
  });
}

function mountCompanyHiringRoutes(admin) {
  admin.get(
    "/candidates",
    asyncHandler(async (req, res) => {
      await requireCompanyMember(req.supabase, req.user.id);
      const candidates = await listPlatformCandidates(req.supabase, {
        limit: req.query.limit,
      });
      res.json({ candidates });
    }),
  );

  admin.get(
    "/profile",
    asyncHandler(async (req, res) => {
      const membership = await requireCompanyMember(req.supabase, req.user.id);
      const [company, locations, session] = await Promise.all([
        loadCompany(req.supabase, membership.company_id),
        loadLocations(req.supabase, membership.company_id),
        buildSessionProfile(req.supabase, req.user),
      ]);
      if (!company) return fail(res, 404, "Company not found.");

      res.json({
        is_founder: membership.membership_role === "founder",
        can_edit_company: membership.membership_role === "founder",
        can_manage_jobs:
          membership.membership_role === "founder" ||
          membership.membership_role === "recruiter",
        membership_role: membership.membership_role,
        company,
        locations,
        me: {
          id: session.id,
          email: session.email,
          full_name: session.full_name,
          phone: session.phone,
          profile_image_url: session.profile_image_url,
          job_title: session.job_title,
          team_role: session.team_role,
        },
      });
    }),
  );

  admin.patch(
    "/profile",
    asyncHandler(async (req, res) => {
      const membership = await requireCompanyMember(req.supabase, req.user.id);
      if (membership.membership_role !== "founder") {
        return fail(res, 403, "Only the founder can update company profile.");
      }

      const patch = companyFieldsFromBody(req.body);
      if (!Object.keys(patch).length) {
        return fail(res, 400, "No company fields to update.");
      }
      if (patch.name !== undefined && !patch.name) {
        return fail(res, 400, "Company name is required.");
      }

      const { data, error } = await req.supabase
        .from("companies")
        .update(patch)
        .eq("id", membership.company_id)
        .select(COMPANY_SELECT)
        .single();
      if (error) throw new Error(error.message);

      const loc = req.body?.location || {};
      if (
        loc.address_line !== undefined ||
        loc.city !== undefined ||
        loc.state !== undefined ||
        loc.country !== undefined ||
        loc.postal_code !== undefined
      ) {
        const { data: existing } = await req.supabase
          .from("company_locations")
          .select("id")
          .eq("company_id", membership.company_id)
          .eq("is_headquarters", true)
          .maybeSingle();

        const locPatch = {
          address_line: loc.address_line ?? null,
          city: loc.city ?? null,
          state: loc.state ?? null,
          country: loc.country ?? null,
          postal_code: loc.postal_code ?? null,
          is_headquarters: true,
        };

        if (existing?.id) {
          await req.supabase
            .from("company_locations")
            .update(locPatch)
            .eq("id", existing.id);
        } else if (locPatch.city || locPatch.address_line) {
          await req.supabase.from("company_locations").insert({
            company_id: membership.company_id,
            ...locPatch,
          });
        }
      }

      const locations = await loadLocations(req.supabase, membership.company_id);
      res.json({ company: data, locations });
    }),
  );

  admin.patch(
    "/me",
    asyncHandler(async (req, res) => {
      await requireCompanyMember(req.supabase, req.user.id);
      const patch = { updated_at: new Date().toISOString() };
      if (req.body?.full_name !== undefined) {
        const name = String(req.body.full_name || "").trim();
        if (!name) return fail(res, 400, "Full name is required.");
        patch.full_name = name;
      }
      if (req.body?.phone !== undefined) {
        patch.phone = req.body.phone || null;
      }
      if (req.body?.profile_image_url !== undefined) {
        patch.profile_image_url = req.body.profile_image_url || null;
      }

      if (Object.keys(patch).length === 1) {
        return fail(res, 400, "No profile fields to update.");
      }

      const { error } = await req.supabase
        .from("users")
        .update(patch)
        .eq("id", req.user.id);
      if (error) throw new Error(error.message);

      res.json(await buildSessionProfile(req.supabase, req.user));
    }),
  );

  admin.get(
    "/jobs",
    asyncHandler(async (req, res) => {
      const membership = await requireJobManager(req.supabase, req.user.id);
      const data = await selectCompanyJobs(req.supabase, membership.company_id, {
        status: req.query.status ? String(req.query.status) : undefined,
      });
      const rows = (data || []).map(mapJob);
      const counts = await applicantCounts(
        req.supabase,
        rows.map((j) => j.id),
      );

      res.json(
        rows.map((job) => ({
          ...job,
          applicants_count: counts[job.id] || 0,
        })),
      );
    }),
  );

  admin.post(
    "/jobs",
    asyncHandler(async (req, res) => {
      const membership = await requireJobManager(req.supabase, req.user.id);
      const fields = parseJobBody(req.body);
      if (!fields.status) fields.status = "published";

      const company = await loadCompany(req.supabase, membership.company_id);
      if (!fields.company_details && company) {
        fields.company_details = [
          company.name,
          company.industry,
          company.description,
        ]
          .filter(Boolean)
          .join(" — ");
      }

      const insert = {
        ...fields,
        company_id: membership.company_id,
        created_by: req.user.id,
      };

      let { data, error } = await req.supabase
        .from("jobs")
        .insert(insert)
        .select(JOB_SELECT)
        .single();

      if (error && /required_skills|company_details|created_by/i.test(error.message)) {
        const fallback = { ...insert };
        delete fallback.required_skills;
        delete fallback.company_details;
        delete fallback.created_by;
        ({ data, error } = await req.supabase
          .from("jobs")
          .insert(fallback)
          .select(
            "id, title, department, description, location, salary_min, salary_max, experience_min_years, experience_max_years, employment_type, work_mode, application_deadline, status, created_at, company_id, companies(id, name, logo_url, industry)",
          )
          .single());
      }
      if (error) {
        throw new Error(
          /row-level security/i.test(error.message)
            ? "Job create is blocked by RLS. Run supabase/company-jobs.sql in the Supabase SQL editor, then try again."
            : error.message,
        );
      }

      res.status(201).json({ ...mapJob(data), applicants_count: 0 });
    }),
  );

  admin.get(
    "/jobs/:id",
    asyncHandler(async (req, res) => {
      const membership = await requireJobManager(req.supabase, req.user.id);
      const data = await selectCompanyJobs(req.supabase, membership.company_id, {
        id: req.params.id,
      });
      if (!data) return fail(res, 404, "Job not found.");

      const counts = await applicantCounts(req.supabase, [data.id]);
      res.json({ ...mapJob(data), applicants_count: counts[data.id] || 0 });
    }),
  );

  admin.get(
    "/jobs/:id/applicants",
    asyncHandler(async (req, res) => {
      const membership = await requireCompanyMember(req.supabase, req.user.id);
      if (!canViewHiringPipeline(membership.membership_role)) {
        return fail(res, 403, "Applicants are for recruiters and hiring managers.");
      }
      const jobId = Number(req.params.id);
      if (!Number.isFinite(jobId)) return fail(res, 400, "Invalid job id.");

      const { data: job, error: jobErr } = await req.supabase
        .from("jobs")
        .select("id, title, status, company_id, location, work_mode")
        .eq("id", jobId)
        .eq("company_id", membership.company_id)
        .maybeSingle();
      if (jobErr) throw new Error(jobErr.message);
      if (!job) return fail(res, 404, "Job not found.");

      const { data: apps, error: appErr } = await req.supabase
        .from("applications")
        .select(
          "id, status, match_score, applied_at, cover_letter, how_you_fit, why_role, resume_id, ai_screening, candidate_id, candidates(id, first_name, last_name, profile_image_url, location, total_experience_years, professional_summary), resumes(id, file_name, file_url, file_type, is_primary)",
        )
        .eq("job_id", jobId)
        .order("applied_at", { ascending: false });

      let rows = apps || [];
      let selectErr = appErr;
      if (selectErr && /ai_screening/i.test(selectErr.message || "")) {
        const fallbackAi = await req.supabase
          .from("applications")
          .select(
            "id, status, match_score, applied_at, cover_letter, how_you_fit, why_role, resume_id, candidate_id, candidates(id, first_name, last_name, profile_image_url, location, total_experience_years, professional_summary), resumes(id, file_name, file_url, file_type, is_primary)",
          )
          .eq("job_id", jobId)
          .order("applied_at", { ascending: false });
        rows = fallbackAi.data || [];
        selectErr = fallbackAi.error;
      }
      if (selectErr && /how_you_fit|why_role|resumes/i.test(selectErr.message || "")) {
        const fallback = await req.supabase
          .from("applications")
          .select(
            "id, status, match_score, applied_at, cover_letter, resume_id, candidate_id, candidates(id, first_name, last_name, profile_image_url, location, total_experience_years, professional_summary)",
          )
          .eq("job_id", jobId)
          .order("applied_at", { ascending: false });
        rows = fallback.data || [];
        selectErr = fallback.error;
      }
      if (selectErr) throw new Error(selectErr.message);

      // If resumes weren't joined (common: resumes RLS is candidate-only), load via service role.
      const missingResumeIds = rows
        .filter((row) => row.resume_id && !unwrap(row.resumes)?.file_url)
        .map((row) => row.resume_id);
      const resumesById = {};
      if (missingResumeIds.length) {
        const { supabaseAdmin } = require("../supabase");
        const admin = supabaseAdmin();
        const client = admin || req.supabase;
        const { data: resumeRows } = await client
          .from("resumes")
          .select("id, file_name, file_url, file_type, is_primary")
          .in("id", missingResumeIds);
        for (const r of resumeRows || []) resumesById[r.id] = r;
      }

      const candidateIds = rows
        .map((row) => {
          const cand = unwrap(row.candidates);
          return cand?.id || row.candidate_id;
        })
        .filter(Boolean);

      const skillsById = {};
      const rolesById = {};
      if (candidateIds.length) {
        const { data: skillRows } = await req.supabase
          .from("candidate_skills")
          .select("candidate_id, skills(name, category)")
          .in("candidate_id", candidateIds);
        for (const row of skillRows || []) {
          const skill = unwrap(row.skills);
          if (!skill?.name) continue;
          if (skill.category === "desired_role") {
            if (!rolesById[row.candidate_id]) rolesById[row.candidate_id] = [];
            rolesById[row.candidate_id].push(skill.name);
          } else {
            if (!skillsById[row.candidate_id]) skillsById[row.candidate_id] = [];
            skillsById[row.candidate_id].push(skill.name);
          }
        }
      }

      function parseCoverParts(cover) {
        const text = String(cover || "");
        const fitMatch = text.match(
          /How I fit this role:\s*([\s\S]*?)(?:\n\s*Why I want this role:|$)/i,
        );
        const whyMatch = text.match(/Why I want this role:\s*([\s\S]*)$/i);
        return {
          fit: fitMatch?.[1]?.trim() || null,
          why: whyMatch?.[1]?.trim() || null,
        };
      }

      const applicants = rows.map((row) => {
        const cand = unwrap(row.candidates) || {};
        const resume = unwrap(row.resumes) || resumesById[row.resume_id] || null;
        const cid = cand.id || row.candidate_id;
        const name = [cand.first_name, cand.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        const openRoles = rolesById[cid] || [];
        const skills = (skillsById[cid] || []).slice(0, 4);
        const expertise =
          openRoles[0] || skills[0] || job.title || "Applicant";
        const parsed = parseCoverParts(row.cover_letter);
        const howYouFit = row.how_you_fit || parsed.fit || null;
        const whyRole = row.why_role || parsed.why || null;

        return {
          application_id: row.id,
          candidate_id: cid,
          full_name: name || "Candidate",
          profile_image_url: cand.profile_image_url || null,
          expertise,
          location: cand.location || null,
          total_experience_years: cand.total_experience_years ?? null,
          skills,
          status: row.status || "applied",
          match_score: row.match_score ?? null,
          applied_at: row.applied_at || null,
          cover_letter: row.cover_letter || null,
          how_you_fit: howYouFit,
          why_role: whyRole,
          ai_screening: row.ai_screening || null,
          resume: resume
            ? {
                id: resume.id,
                file_name: resume.file_name,
                file_url: resume.file_url,
                file_type: resume.file_type,
              }
            : row.resume_id
              ? { id: row.resume_id, file_name: "Resume", file_url: null, file_type: null }
              : null,
        };
      });

      res.json({
        job: {
          id: job.id,
          title: job.title,
          status: job.status,
          location: job.location,
          work_mode: job.work_mode,
        },
        applicants,
      });
    }),
  );

  admin.patch(
    "/applications/:id",
    asyncHandler(async (req, res) => {
      const membership = await requireRecruiter(req.supabase, req.user.id);
      const appId = Number(req.params.id);
      if (!Number.isFinite(appId)) return fail(res, 400, "Invalid application id.");

      const status = normalizeStage(req.body?.status);
      if (!isAllowedStage(status)) {
        return fail(res, 400, "Invalid application status.");
      }
      if (status === "offer" || status === "hired") {
        return fail(
          res,
          400,
          "Use Offers to send an offer. Hired is set when the candidate accepts.",
        );
      }

      const { data: app, error: findErr } = await req.supabase
        .from("applications")
        .select("id, job_id, jobs(company_id)")
        .eq("id", appId)
        .maybeSingle();
      if (findErr) throw new Error(findErr.message);
      if (!app) return fail(res, 404, "Application not found.");

      const job = unwrap(app.jobs);
      if (!job || job.company_id !== membership.company_id) {
        return fail(res, 403, "This application is not for your company.");
      }

      const patch = { status, approved_for_offer: false };

      let { data, error } = await req.supabase
        .from("applications")
        .update(patch)
        .eq("id", appId)
        .select(
          "id, status, match_score, applied_at, candidate_id, job_id, approved_for_offer",
        )
        .single();

      if (error && /approved_for_offer/i.test(error.message || "")) {
        ({ data, error } = await req.supabase
          .from("applications")
          .update({ status })
          .eq("id", appId)
          .select("id, status, match_score, applied_at, candidate_id, job_id")
          .single());
      }
      if (error) throw new Error(error.message);
      res.json(data);
    }),
  );

  admin.post(
    "/applications/:id/approve",
    asyncHandler(async (req, res) => {
      const membership = await requireHiringManager(req.supabase, req.user.id);
      const appId = Number(req.params.id);
      if (!Number.isFinite(appId)) return fail(res, 400, "Invalid application id.");

      const { data: app, error: findErr } = await req.supabase
        .from("applications")
        .select(
          "id, status, candidate_id, job_id, jobs(company_id, title, companies(name)), candidates(user_id, first_name)",
        )
        .eq("id", appId)
        .maybeSingle();
      if (findErr) throw new Error(findErr.message);
      if (!app) return fail(res, 404, "Application not found.");
      const job = unwrap(app.jobs);
      if (!job || job.company_id !== membership.company_id) {
        return fail(res, 403, "This application is not for your company.");
      }

      const patch = {
        approved_for_offer: true,
        approved_at: new Date().toISOString(),
        approved_by: req.user.id,
      };

      let { data, error } = await req.supabase
        .from("applications")
        .update(patch)
        .eq("id", appId)
        .select(
          "id, status, approved_for_offer, approved_at, candidate_id, job_id",
        )
        .single();

      if (error && /approved_for_offer|approved_at|approved_by/i.test(error.message || "")) {
        return fail(
          res,
          400,
          "Run supabase/interview-feedback.sql to enable hiring approvals.",
        );
      }
      if (error) throw new Error(error.message);

      const cand = unwrap(app.candidates);
      const companyName = unwrap(job.companies)?.name || "Company";
      if (cand?.user_id) {
        await req.supabase.from("notifications").insert({
          user_id: cand.user_id,
          notification_type: "application",
          title: `Approved for offer · ${companyName}`,
          message: [
            `From ${companyName}`,
            `Role: ${job.title}`,
            "A hiring manager approved you for an offer. The recruiter will send details next.",
          ].join("\n"),
          entity_type: "application",
          entity_id: appId,
        });
      }

      res.json(data);
    }),
  );

  admin.post(
    "/applications/:id/reject",
    asyncHandler(async (req, res) => {
      const membership = await requireCompanyMember(req.supabase, req.user.id);
      const role = membership.membership_role;
      if (
        role !== "founder" &&
        role !== "recruiter" &&
        role !== "hiring_manager"
      ) {
        return fail(res, 403, "You cannot reject applications.");
      }

      const appId = Number(req.params.id);
      if (!Number.isFinite(appId)) return fail(res, 400, "Invalid application id.");

      const { data: app, error: findErr } = await req.supabase
        .from("applications")
        .select(
          "id, jobs(company_id, title, companies(name)), candidates(user_id)",
        )
        .eq("id", appId)
        .maybeSingle();
      if (findErr) throw new Error(findErr.message);
      if (!app) return fail(res, 404, "Application not found.");
      const job = unwrap(app.jobs);
      if (!job || job.company_id !== membership.company_id) {
        return fail(res, 403, "This application is not for your company.");
      }

      const { data, error } = await req.supabase
        .from("applications")
        .update({
          status: "rejected",
          approved_for_offer: false,
        })
        .eq("id", appId)
        .select("id, status, candidate_id, job_id")
        .single();

      if (error && /approved_for_offer/i.test(error.message || "")) {
        const fallback = await req.supabase
          .from("applications")
          .update({ status: "rejected" })
          .eq("id", appId)
          .select("id, status, candidate_id, job_id")
          .single();
        if (fallback.error) throw new Error(fallback.error.message);
        res.json(fallback.data);
        return;
      }
      if (error) throw new Error(error.message);

      const cand = unwrap(app.candidates);
      const companyName = unwrap(job.companies)?.name || "Company";
      if (cand?.user_id) {
        await req.supabase.from("notifications").insert({
          user_id: cand.user_id,
          notification_type: "application",
          title: `Update from ${companyName}`,
          message: [
            `From ${companyName}`,
            `Role: ${job.title}`,
            "Your application was not moved forward.",
          ].join("\n"),
          entity_type: "application",
          entity_id: appId,
        });
      }

      res.json(data);
    }),
  );

  admin.post(
    "/applications/:id/screen",
    asyncHandler(async (req, res) => {
      const membership = await requireRecruiter(req.supabase, req.user.id);
      const appId = Number(req.params.id);
      if (!Number.isFinite(appId)) return fail(res, 400, "Invalid application id.");

      const { data: app, error: findErr } = await req.supabase
        .from("applications")
        .select("id, jobs(company_id)")
        .eq("id", appId)
        .maybeSingle();
      if (findErr) throw new Error(findErr.message);
      if (!app) return fail(res, 404, "Application not found.");
      const job = unwrap(app.jobs);
      if (!job || job.company_id !== membership.company_id) {
        return fail(res, 403, "This application is not for your company.");
      }

      try {
        const result = await screenApplication(req.supabase, appId);
        res.json(result);
      } catch (err) {
        const status = err.status || 500;
        return fail(res, status, err.message || "AI screening failed.");
      }
    }),
  );

  admin.patch(
    "/jobs/:id",
    asyncHandler(async (req, res) => {
      const membership = await requireJobManager(req.supabase, req.user.id);
      const fields = parseJobBody(req.body, { partial: true });
      if (!Object.keys(fields).length) {
        return fail(res, 400, "No job fields to update.");
      }

      const { data: existing } = await req.supabase
        .from("jobs")
        .select("id")
        .eq("id", req.params.id)
        .eq("company_id", membership.company_id)
        .maybeSingle();
      if (!existing) return fail(res, 404, "Job not found.");

      let { data, error } = await req.supabase
        .from("jobs")
        .update(fields)
        .eq("id", req.params.id)
        .eq("company_id", membership.company_id)
        .select(JOB_SELECT)
        .single();

      if (error && /required_skills|company_details|created_by|updated_at/i.test(error.message)) {
        const fallback = { ...fields };
        delete fallback.required_skills;
        delete fallback.company_details;
        delete fallback.created_by;
        ({ data, error } = await req.supabase
          .from("jobs")
          .update(fallback)
          .eq("id", req.params.id)
          .eq("company_id", membership.company_id)
          .select(
            "id, title, department, description, location, salary_min, salary_max, experience_min_years, experience_max_years, employment_type, work_mode, application_deadline, status, created_at, company_id, companies(id, name, logo_url, industry)",
          )
          .single());
      }
      if (error) throw new Error(error.message);

      const counts = await applicantCounts(req.supabase, [data.id]);
      res.json({ ...mapJob(data), applicants_count: counts[data.id] || 0 });
    }),
  );

  admin.post(
    "/jobs/:id/close",
    asyncHandler(async (req, res) => {
      const membership = await requireJobManager(req.supabase, req.user.id);
      const { data: existing } = await req.supabase
        .from("jobs")
        .select("id")
        .eq("id", req.params.id)
        .eq("company_id", membership.company_id)
        .maybeSingle();
      if (!existing) return fail(res, 404, "Job not found.");

      const { error } = await req.supabase
        .from("jobs")
        .update({ status: "closed" })
        .eq("id", req.params.id)
        .eq("company_id", membership.company_id);
      if (error) throw new Error(error.message);

      const data = await selectCompanyJobs(req.supabase, membership.company_id, {
        id: req.params.id,
      });
      const counts = await applicantCounts(req.supabase, [data.id]);
      res.json({ ...mapJob(data), applicants_count: counts[data.id] || 0 });
    }),
  );

  admin.post(
    "/jobs/:id/duplicate",
    asyncHandler(async (req, res) => {
      const membership = await requireJobManager(req.supabase, req.user.id);
      const { data: source, error: loadErr } = await req.supabase
        .from("jobs")
        .select("*")
        .eq("id", req.params.id)
        .eq("company_id", membership.company_id)
        .maybeSingle();
      if (loadErr) throw new Error(loadErr.message);
      if (!source) return fail(res, 404, "Job not found.");

      const copy = {
        title: `${source.title} (Copy)`,
        department: source.department,
        description: source.description,
        location: source.location,
        salary_min: source.salary_min,
        salary_max: source.salary_max,
        experience_min_years: source.experience_min_years,
        experience_max_years: source.experience_max_years,
        employment_type: source.employment_type,
        work_mode: source.work_mode,
        application_deadline: source.application_deadline,
        status: "draft",
        company_id: membership.company_id,
        created_by: req.user.id,
      };
      if (source.required_skills !== undefined) {
        copy.required_skills = source.required_skills;
      }
      if (source.company_details !== undefined) {
        copy.company_details = source.company_details;
      }

      let { data, error } = await req.supabase
        .from("jobs")
        .insert(copy)
        .select(JOB_SELECT)
        .single();
      if (error && /required_skills|company_details|created_by/i.test(error.message)) {
        delete copy.required_skills;
        delete copy.company_details;
        delete copy.created_by;
        ({ data, error } = await req.supabase
          .from("jobs")
          .insert(copy)
          .select(
            "id, title, department, description, location, salary_min, salary_max, experience_min_years, experience_max_years, employment_type, work_mode, application_deadline, status, created_at, company_id, companies(id, name, logo_url, industry)",
          )
          .single());
      }
      if (error) throw new Error(error.message);
      res.status(201).json({ ...mapJob(data), applicants_count: 0 });
    }),
  );

  admin.delete(
    "/jobs/:id",
    asyncHandler(async (req, res) => {
      const membership = await requireJobManager(req.supabase, req.user.id);
      const { data: existing } = await req.supabase
        .from("jobs")
        .select("id")
        .eq("id", req.params.id)
        .eq("company_id", membership.company_id)
        .maybeSingle();
      if (!existing) return fail(res, 404, "Job not found.");

      const { error } = await req.supabase
        .from("jobs")
        .delete()
        .eq("id", req.params.id)
        .eq("company_id", membership.company_id);
      if (error) throw new Error(error.message);
      res.json({ ok: true });
    }),
  );

  admin.get(
    "/dashboard",
    asyncHandler(async (req, res) => {
      const membership = await requireCompanyMember(req.supabase, req.user.id);
      const companyId = membership.company_id;

      const { data: jobs, error: jobsErr } = await req.supabase
        .from("jobs")
        .select("id, title, status, created_at")
        .eq("company_id", companyId);
      if (jobsErr) throw new Error(jobsErr.message);

      const jobList = jobs || [];
      const jobIds = jobList.map((j) => j.id);
      const totalJobs = jobList.length;
      const openJobs = jobList.filter((j) => j.status === "published").length;

      let applications = [];
      let interviews = [];
      let offers = [];

      if (jobIds.length) {
        const { data: apps } = await req.supabase
          .from("applications")
          .select("id, job_id, status, applied_at, match_score")
          .in("job_id", jobIds);
        applications = apps || [];

        const appIds = applications.map((a) => a.id);
        if (appIds.length) {
          const { data: ints } = await req.supabase
            .from("interviews")
            .select("id, application_id, scheduled_at, status, interview_type")
            .in("application_id", appIds);
          interviews = ints || [];
        }

        const { data: offs } = await req.supabase
          .from("offer_letters")
          .select("id, job_id, status, created_at, salary")
          .in("job_id", jobIds);
        offers = offs || [];
      }

      const activeStatuses = new Set([
        "applied",
        "resume_screening",
        "screening",
        "shortlisted",
        "technical_interview",
        "hr_interview",
        "interview",
        "interviewing",
        "offer",
      ]);
      const activeCandidates = applications.filter((a) =>
        activeStatuses.has(String(a.status || "").toLowerCase()),
      ).length;

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const todaysInterviews = interviews.filter((i) => {
        if (!i.scheduled_at) return false;
        const t = new Date(i.scheduled_at).getTime();
        return t >= startOfDay.getTime() && t <= endOfDay.getTime();
      }).length;

      const pendingReviews = applications.filter((a) =>
        ["applied", "resume_screening", "screening"].includes(
          String(a.status || "").toLowerCase(),
        ),
      ).length;

      const acceptedOffers = offers.filter((o) =>
        ["accepted", "accept"].includes(String(o.status || "").toLowerCase()),
      ).length;
      const decidedOffers = offers.filter((o) =>
        ["accepted", "accept", "rejected", "reject", "declined"].includes(
          String(o.status || "").toLowerCase(),
        ),
      ).length;
      const offerAcceptanceRate = decidedOffers
        ? Math.round((acceptedOffers / decidedOffers) * 100)
        : 0;

      const funnelStages = [
        { key: "applied", label: "Applied" },
        { key: "resume_screening", label: "Resume Screening" },
        { key: "shortlisted", label: "Shortlisted" },
        { key: "technical_interview", label: "Technical Interview" },
        { key: "hr_interview", label: "HR Interview" },
        { key: "offer", label: "Offer" },
        { key: "hired", label: "Hired" },
      ];
      const hiringFunnel = funnelStages.map((stage) => ({
        ...stage,
        count: applications.filter((a) => {
          const s = normalizeStage(a.status || "");
          return s === stage.key;
        }).length,
      }));

      const conversionRate = applications.length
        ? Math.round((acceptedOffers / applications.length) * 100)
        : 0;

      const months = [];
      const now = new Date();
      for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({
          key,
          label: d.toLocaleString("en", { month: "short" }),
          applications: 0,
          hires: 0,
        });
      }
      for (const app of applications) {
        if (!app.applied_at) continue;
        const d = new Date(app.applied_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const bucket = months.find((m) => m.key === key);
        if (bucket) bucket.applications += 1;
      }
      for (const offer of offers) {
        const s = String(offer.status || "").toLowerCase();
        if (!["accepted", "accept"].includes(s) || !offer.created_at) continue;
        const d = new Date(offer.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const bucket = months.find((m) => m.key === key);
        if (bucket) bucket.hires += 1;
      }

      const jobTitleById = Object.fromEntries(
        jobList.map((j) => [j.id, j.title]),
      );
      const recentActivity = [
        ...applications.slice(0, 20).map((a) => ({
          id: `app-${a.id}`,
          type: "application",
          title: "New application",
          detail: jobTitleById[a.job_id] || "Job",
          at: a.applied_at,
        })),
        ...interviews.slice(0, 20).map((i) => ({
          id: `int-${i.id}`,
          type: "interview",
          title: "Interview scheduled",
          detail: i.interview_type || "Interview",
          at: i.scheduled_at,
        })),
        ...offers.slice(0, 20).map((o) => ({
          id: `off-${o.id}`,
          type: "offer",
          title: `Offer ${o.status || "updated"}`,
          detail: jobTitleById[o.job_id] || "Job",
          at: o.created_at,
        })),
        ...jobList.slice(0, 10).map((j) => ({
          id: `job-${j.id}`,
          type: "job",
          title: "Job posted",
          detail: j.title,
          at: j.created_at,
        })),
      ]
        .filter((row) => row.at)
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 12);

      res.json({
        widgets: {
          total_jobs: totalJobs,
          open_jobs: openJobs,
          active_candidates: activeCandidates,
          todays_interviews: todaysInterviews,
          pending_reviews: pendingReviews,
          offer_acceptance_rate: offerAcceptanceRate,
          candidate_conversion_rate: conversionRate,
        },
        hiring_funnel: hiringFunnel,
        monthly_hiring: months,
        recent_activity: recentActivity,
      });
    }),
  );

  async function companyJobIds(supabase, companyId) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id")
      .eq("company_id", companyId);
    if (error) throw new Error(error.message);
    return (data || []).map((j) => j.id);
  }

  function parseSalaryInput(value) {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
    const raw = String(value).trim().toLowerCase().replace(/,/g, "");
    const lakh = raw.match(/^₹?\s*([\d.]+)\s*l(?:akh|acs|pa)?s?$/i) || raw.match(/^([\d.]+)\s*l$/);
    if (lakh) return Math.round(Number(lakh[1]) * 100000);
    const digits = raw.replace(/[^\d.]/g, "");
    if (!digits) return null;
    const n = Number(digits);
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  function mapPipelineApplicant(row, job) {
    const cand = unwrap(row.candidates) || {};
    const name = [cand.first_name, cand.last_name].filter(Boolean).join(" ").trim();
    return {
      application_id: row.id,
      candidate_id: cand.id || row.candidate_id,
      full_name: name || "Candidate",
      profile_image_url: cand.profile_image_url || null,
      email: cand.email || null,
      user_id: cand.user_id || null,
      location: cand.location || null,
      status: normalizeStage(row.status || "applied"),
      status_label: appStageLabel(row.status || "applied"),
      match_score: row.match_score ?? null,
      applied_at: row.applied_at || null,
      how_you_fit: row.how_you_fit || null,
      why_role: row.why_role || null,
      cover_letter: row.cover_letter || null,
      approved_for_offer: Boolean(row.approved_for_offer),
      approved_at: row.approved_at || null,
      ai_screening: row.ai_screening || null,
      job: job
        ? {
            id: job.id,
            title: job.title,
            location: job.location,
            salary_min: job.salary_min,
            salary_max: job.salary_max,
          }
        : {
            id: row.job_id,
            title: unwrap(row.jobs)?.title || "Role",
            location: unwrap(row.jobs)?.location || null,
            salary_min: unwrap(row.jobs)?.salary_min ?? null,
            salary_max: unwrap(row.jobs)?.salary_max ?? null,
          },
    };
  }

  admin.get(
    "/shortlist",
    asyncHandler(async (req, res) => {
      const membership = await requireCompanyMember(req.supabase, req.user.id);
      if (!canViewHiringPipeline(membership.membership_role)) {
        return fail(res, 403, "Shortlist is for recruiters and hiring managers.");
      }
      const jobIds = await companyJobIds(req.supabase, membership.company_id);
      if (!jobIds.length) return res.json({ applicants: [] });

      const shortlistStatuses = [
        "shortlisted",
        "technical_interview",
        "hr_interview",
        "interview",
        "interviewing",
      ];

      let { data, error } = await req.supabase
        .from("applications")
        .select(
          "id, status, match_score, applied_at, cover_letter, how_you_fit, why_role, approved_for_offer, approved_at, ai_screening, candidate_id, job_id, candidates(id, first_name, last_name, profile_image_url, location, user_id), jobs(id, title, location, salary_min, salary_max)",
        )
        .in("job_id", jobIds)
        .in("status", shortlistStatuses)
        .order("applied_at", { ascending: false });

      if (error && /ai_screening/i.test(error.message || "")) {
        ({ data, error } = await req.supabase
          .from("applications")
          .select(
            "id, status, match_score, applied_at, cover_letter, how_you_fit, why_role, approved_for_offer, approved_at, candidate_id, job_id, candidates(id, first_name, last_name, profile_image_url, location, user_id), jobs(id, title, location, salary_min, salary_max)",
          )
          .in("job_id", jobIds)
          .in("status", shortlistStatuses)
          .order("applied_at", { ascending: false }));
      }

      if (error && /how_you_fit|why_role|approved_for_offer/i.test(error.message || "")) {
        ({ data, error } = await req.supabase
          .from("applications")
          .select(
            "id, status, match_score, applied_at, cover_letter, approved_for_offer, approved_at, candidate_id, job_id, candidates(id, first_name, last_name, profile_image_url, location, user_id), jobs(id, title, location, salary_min, salary_max)",
          )
          .in("job_id", jobIds)
          .in("status", shortlistStatuses)
          .order("applied_at", { ascending: false }));
      }

      if (error && /approved_for_offer|approved_at/i.test(error.message || "")) {
        ({ data, error } = await req.supabase
          .from("applications")
          .select(
            "id, status, match_score, applied_at, cover_letter, candidate_id, job_id, candidates(id, first_name, last_name, profile_image_url, location, user_id), jobs(id, title, location, salary_min, salary_max)",
          )
          .in("job_id", jobIds)
          .in("status", ["shortlisted", "technical_interview", "hr_interview", "interview", "interviewing"])
          .order("applied_at", { ascending: false }));
      }
      if (error) throw new Error(error.message);

      res.json({
        applicants: (data || []).map((row) => mapPipelineApplicant(row)),
      });
    }),
  );

  admin.get(
    "/pipeline",
    asyncHandler(async (req, res) => {
      const membership = await requireCompanyMember(req.supabase, req.user.id);
      if (!canViewHiringPipeline(membership.membership_role)) {
        return fail(res, 403, "Pipeline is for recruiters and hiring managers.");
      }
      const jobIds = await companyJobIds(req.supabase, membership.company_id);
      if (!jobIds.length) return res.json({ applicants: [] });

      const statusRaw = String(req.query.status || "").trim().toLowerCase();
      const status = statusRaw ? normalizeStage(statusRaw) : "";
      let query = req.supabase
        .from("applications")
        .select(
          "id, status, match_score, applied_at, cover_letter, how_you_fit, why_role, approved_for_offer, ai_screening, candidate_id, job_id, candidates(id, first_name, last_name, profile_image_url, location, user_id), jobs(id, title, location, salary_min, salary_max)",
        )
        .in("job_id", jobIds)
        .order("applied_at", { ascending: false });

      if (status) query = query.eq("status", status);

      let { data, error } = await query;
      if (error && /ai_screening|approved_for_offer|how_you_fit|why_role/i.test(error.message || "")) {
        let fallback = req.supabase
          .from("applications")
          .select(
            "id, status, match_score, applied_at, cover_letter, candidate_id, job_id, candidates(id, first_name, last_name, profile_image_url, location, user_id), jobs(id, title, location, salary_min, salary_max)",
          )
          .in("job_id", jobIds)
          .order("applied_at", { ascending: false });
        if (status) fallback = fallback.eq("status", status);
        ({ data, error } = await fallback);
      }
      if (error) throw new Error(error.message);
      res.json({
        applicants: (data || []).map((row) => mapPipelineApplicant(row)),
      });
    }),
  );

  admin.get(
    "/offers",
    asyncHandler(async (req, res) => {
      const membership = await requireCompanyMember(req.supabase, req.user.id);
      if (!canViewHiringPipeline(membership.membership_role)) {
        return fail(res, 403, "Offers are for recruiters and hiring managers.");
      }
      const jobIds = await companyJobIds(req.supabase, membership.company_id);
      if (!jobIds.length) return res.json({ offers: [] });

      const { data, error } = await req.supabase
        .from("offer_letters")
        .select(
          "id, salary, joining_date, location, offer_pdf_url, status, created_at, candidate_id, job_id, candidates(id, first_name, last_name, profile_image_url), jobs(id, title)",
        )
        .in("job_id", jobIds)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      res.json({
        offers: (data || []).map((row) => {
          const cand = unwrap(row.candidates) || {};
          const job = unwrap(row.jobs) || {};
          const name = [cand.first_name, cand.last_name]
            .filter(Boolean)
            .join(" ")
            .trim();
          return {
            id: row.id,
            salary: row.salary,
            joining_date: row.joining_date,
            location: row.location,
            offer_pdf_url: row.offer_pdf_url,
            status: row.status,
            created_at: row.created_at,
            candidate_id: row.candidate_id,
            job_id: row.job_id,
            candidate_name: name || "Candidate",
            job_title: job.title || "Role",
            profile_image_url: cand.profile_image_url || null,
          };
        }),
      });
    }),
  );

  admin.post(
    "/offers",
    asyncHandler(async (req, res) => {
      const membership = await requireRecruiter(req.supabase, req.user.id);
      const applicationId = Number(req.body?.application_id);
      if (!Number.isFinite(applicationId)) {
        return fail(res, 400, "Pick a shortlisted candidate.");
      }

      const salary = parseSalaryInput(req.body?.salary ?? req.body?.ctc);
      if (salary == null || salary <= 0) {
        return fail(res, 400, "Enter a valid CTC / salary.");
      }

      const { data: app, error: appErr } = await req.supabase
        .from("applications")
        .select(
          "id, status, candidate_id, job_id, approved_for_offer, jobs(id, title, location, company_id, companies(name)), candidates(id, user_id, first_name, last_name)",
        )
        .eq("id", applicationId)
        .maybeSingle();
      if (appErr) throw new Error(appErr.message);
      if (!app) return fail(res, 404, "Application not found.");

      const job = unwrap(app.jobs);
      if (!job || job.company_id !== membership.company_id) {
        return fail(res, 403, "This application is not for your company.");
      }

      const isFounder = membership.membership_role === "founder";
      if (!isFounder && !app.approved_for_offer) {
        return fail(
          res,
          403,
          "Hiring manager must approve this candidate before you can send an offer.",
        );
      }

      const roleTitle = String(req.body?.role || req.body?.title || job.title || "")
        .trim();
      const location =
        String(req.body?.location || job.location || "").trim() || null;
      const joining_date = req.body?.joining_date
        ? String(req.body.joining_date).slice(0, 10)
        : null;

      const insert = {
        candidate_id: app.candidate_id,
        job_id: app.job_id,
        salary,
        joining_date,
        location,
        status: "sent",
        offer_pdf_url: null,
      };

      let { data: offer, error } = await req.supabase
        .from("offer_letters")
        .insert(insert)
        .select(
          "id, salary, joining_date, location, offer_pdf_url, status, created_at, candidate_id, job_id",
        )
        .single();

      if (error && /row-level security/i.test(error.message || "")) {
        return fail(
          res,
          403,
          "Offer create is blocked by RLS. Run supabase/offer-letters.sql in the Supabase SQL editor, then try again.",
        );
      }
      if (error) throw new Error(error.message);

      await req.supabase
        .from("applications")
        .update({ status: "offer" })
        .eq("id", applicationId);

      const cand = unwrap(app.candidates);
      const companyName = unwrap(job.companies)?.name || "Company";
      if (cand?.user_id) {
        await req.supabase.from("notifications").insert({
          user_id: cand.user_id,
          notification_type: "offer",
          title: `Offer from ${companyName}`,
          message: [
            `From ${companyName}`,
            `Role: ${roleTitle || job.title}`,
            "You received an offer letter. Open Offers to accept or reject.",
          ].join("\n"),
          entity_type: "offer",
          entity_id: offer.id,
        });
      }

      const name = [cand?.first_name, cand?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

      res.status(201).json({
        ...offer,
        candidate_name: name || "Candidate",
        job_title: roleTitle || job.title,
      });
    }),
  );

  admin.post(
    "/interviews",
    asyncHandler(async (req, res) => {
      const membership = await requireRecruiter(req.supabase, req.user.id);
      const applicationId = Number(req.body?.application_id);
      const scheduledAt = String(req.body?.scheduled_at || "").trim();
      const interviewerId = String(req.body?.interviewer_id || "").trim();
      if (!Number.isFinite(applicationId)) {
        return fail(res, 400, "Pick a candidate.");
      }
      if (!scheduledAt) return fail(res, 400, "Pick a date and time.");
      if (!interviewerId) {
        return fail(res, 400, "Pick an interviewer.");
      }

      const { data: interviewerMember } = await req.supabase
        .from("company_members")
        .select("user_id, role")
        .eq("company_id", membership.company_id)
        .eq("user_id", interviewerId)
        .maybeSingle();
      if (
        !interviewerMember ||
        (interviewerMember.role !== "interviewer" &&
          interviewerMember.role !== "founder")
      ) {
        return fail(res, 400, "Pick a company interviewer.");
      }

      const { data: app, error: appErr } = await req.supabase
        .from("applications")
        .select(
          "id, candidate_id, job_id, jobs(company_id, title, companies(name)), candidates(user_id, first_name, last_name)",
        )
        .eq("id", applicationId)
        .maybeSingle();
      if (appErr) throw new Error(appErr.message);
      if (!app) return fail(res, 404, "Application not found.");
      const job = unwrap(app.jobs);
      if (!job || job.company_id !== membership.company_id) {
        return fail(res, 403, "This application is not for your company.");
      }

      const interviewType = String(req.body?.interview_type || "technical").trim();
      const insert = {
        application_id: applicationId,
        interviewer_id: interviewerId,
        interview_type: interviewType,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: Number(req.body?.duration_minutes) || 60,
        meeting_link: String(req.body?.meeting_link || "").trim() || null,
        location: String(req.body?.location || "").trim() || null,
        status: "scheduled",
      };

      let { data, error } = await req.supabase
        .from("interviews")
        .insert(insert)
        .select(
          "id, interview_type, scheduled_at, duration_minutes, status, meeting_link, interviewer_id",
        )
        .single();

      if (error && /interviewer_id/i.test(error.message || "")) {
        return fail(
          res,
          400,
          "Run supabase/interview-feedback.sql so interviews can be assigned to interviewers.",
        );
      }
      if (error && /row-level security/i.test(error.message || "")) {
        return fail(
          res,
          403,
          "Interview create is blocked by RLS. Run supabase/offer-letters.sql and supabase/interview-feedback.sql, then try again.",
        );
      }
      if (error) throw new Error(error.message);

      const appStatus = roundToAppStatus(interviewType);
      await req.supabase
        .from("applications")
        .update({ status: appStatus })
        .eq("id", applicationId);

      const cand = unwrap(app.candidates);
      const companyName = unwrap(job.companies)?.name || "Company";
      if (cand?.user_id) {
        await req.supabase.from("notifications").insert({
          user_id: cand.user_id,
          notification_type: "interview",
          title: `Interview with ${companyName}`,
          message: [
            `From ${companyName}`,
            `Role: ${job.title}`,
            `Round: ${interviewType.replace(/_/g, " ")}`,
            `When: ${new Date(scheduledAt).toLocaleString("en-IN")}`,
            insert.meeting_link ? `Join: ${insert.meeting_link}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          entity_type: "interview",
          entity_id: data.id,
        });
      }

      if (interviewerId && interviewerId !== req.user.id) {
        await req.supabase.from("notifications").insert({
          user_id: interviewerId,
          notification_type: "interview",
          title: "Interview assigned",
          message: [
            `You were assigned an interview for ${job.title}.`,
            `When: ${new Date(scheduledAt).toLocaleString("en-IN")}`,
          ].join("\n"),
          entity_type: "interview",
          entity_id: data.id,
        });
      }

      res.status(201).json(data);
    }),
  );

  admin.get(
    "/interviewers",
    asyncHandler(async (req, res) => {
      const membership = await requireRecruiter(req.supabase, req.user.id);
      const { data, error } = await req.supabase
        .from("company_members")
        .select("user_id, role, users(id, full_name, email, profile_image_url)")
        .eq("company_id", membership.company_id)
        .in("role", ["interviewer", "founder"]);
      if (error) throw new Error(error.message);

      res.json({
        interviewers: (data || []).map((row) => {
          const u = unwrap(row.users) || {};
          return {
            user_id: row.user_id,
            role: row.role,
            full_name: u.full_name || "Teammate",
            email: u.email || null,
            profile_image_url: u.profile_image_url || null,
          };
        }),
      });
    }),
  );

  admin.get(
    "/interviews/assigned",
    asyncHandler(async (req, res) => {
      await requireInterviewer(req.supabase, req.user.id);

      let { data, error } = await req.supabase
        .from("interviews")
        .select(
          "id, interview_type, scheduled_at, duration_minutes, meeting_link, location, status, interviewer_id, feedback_technical, feedback_communication, feedback_problem_solving, feedback_teamwork, feedback_leadership, feedback_overall, feedback_comments, feedback_submitted_at, application_id, applications(id, status, candidate_id, ai_screening, candidates(id, first_name, last_name, profile_image_url, location), jobs(id, title, companies(name)))",
        )
        .eq("interviewer_id", req.user.id)
        .order("scheduled_at", { ascending: true });

      if (error && /ai_screening/i.test(error.message || "")) {
        ({ data, error } = await req.supabase
          .from("interviews")
          .select(
            "id, interview_type, scheduled_at, duration_minutes, meeting_link, location, status, interviewer_id, feedback_technical, feedback_communication, feedback_problem_solving, feedback_teamwork, feedback_leadership, feedback_overall, feedback_comments, feedback_submitted_at, application_id, applications(id, status, candidate_id, candidates(id, first_name, last_name, profile_image_url, location), jobs(id, title, companies(name)))",
          )
          .eq("interviewer_id", req.user.id)
          .order("scheduled_at", { ascending: true }));
      }

      if (error && /interviewer_id|feedback_/i.test(error.message || "")) {
        return fail(
          res,
          400,
          "Run supabase/interview-feedback.sql to enable assigned interviews.",
        );
      }
      if (error) throw new Error(error.message);

      res.json({
        interviews: (data || []).map((row) => {
          const app = unwrap(row.applications) || {};
          const cand = unwrap(app.candidates) || {};
          const job = unwrap(app.jobs) || {};
          const company = unwrap(job.companies);
          const name = [cand.first_name, cand.last_name]
            .filter(Boolean)
            .join(" ")
            .trim();
          const screening = app.ai_screening || null;
          const questions = screening?.questions || null;
          return {
            id: row.id,
            interview_type: row.interview_type,
            scheduled_at: row.scheduled_at,
            duration_minutes: row.duration_minutes,
            meeting_link: row.meeting_link,
            location: row.location,
            status: row.status,
            application_id: row.application_id,
            candidate_name: name || "Candidate",
            candidate_id: cand.id || app.candidate_id,
            profile_image_url: cand.profile_image_url || null,
            candidate_location: cand.location || null,
            job_title: job.title || "Role",
            company_name: company?.name || null,
            screening_questions: questions,
            match_summary: screening
              ? {
                  match_percentage: screening.match_percentage ?? null,
                  strong_skills: screening.strong_skills || [],
                  missing_skills: screening.missing_skills || [],
                  recommendation: screening.recommendation || null,
                }
              : null,
            feedback: row.feedback_submitted_at
              ? {
                  technical: row.feedback_technical,
                  communication: row.feedback_communication,
                  problem_solving: row.feedback_problem_solving,
                  teamwork: row.feedback_teamwork,
                  leadership: row.feedback_leadership,
                  overall: row.feedback_overall,
                  comments: row.feedback_comments,
                  submitted_at: row.feedback_submitted_at,
                }
              : null,
          };
        }),
      });
    }),
  );

  admin.post(
    "/interviews/:id/feedback",
    asyncHandler(async (req, res) => {
      await requireInterviewer(req.supabase, req.user.id);
      const interviewId = Number(req.params.id);
      if (!Number.isFinite(interviewId)) {
        return fail(res, 400, "Invalid interview id.");
      }

      const { data: existing, error: findErr } = await req.supabase
        .from("interviews")
        .select("id, interviewer_id, application_id")
        .eq("id", interviewId)
        .maybeSingle();
      if (findErr) throw new Error(findErr.message);
      if (!existing) return fail(res, 404, "Interview not found.");
      if (existing.interviewer_id !== req.user.id) {
        return fail(res, 403, "This interview is not assigned to you.");
      }

      const num = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 1 || n > 5) return null;
        return n;
      };

      const patch = {
        feedback_technical: num(req.body?.technical),
        feedback_communication: num(req.body?.communication),
        feedback_problem_solving: num(req.body?.problem_solving),
        feedback_teamwork: num(req.body?.teamwork),
        feedback_leadership: num(req.body?.leadership),
        feedback_overall: num(req.body?.overall),
        feedback_comments: String(req.body?.comments || "").trim() || null,
        feedback_submitted_at: new Date().toISOString(),
        status: "completed",
      };

      if (
        !patch.feedback_technical ||
        !patch.feedback_communication ||
        !patch.feedback_problem_solving ||
        !patch.feedback_teamwork ||
        !patch.feedback_leadership ||
        !patch.feedback_overall
      ) {
        return fail(res, 400, "Rate all categories from 1 to 5.");
      }

      const { data, error } = await req.supabase
        .from("interviews")
        .update(patch)
        .eq("id", interviewId)
        .eq("interviewer_id", req.user.id)
        .select(
          "id, status, feedback_technical, feedback_communication, feedback_problem_solving, feedback_teamwork, feedback_leadership, feedback_overall, feedback_comments, feedback_submitted_at",
        )
        .single();

      if (error && /feedback_|interviewer_id/i.test(error.message || "")) {
        return fail(
          res,
          400,
          "Run supabase/interview-feedback.sql to enable feedback.",
        );
      }
      if (error) throw new Error(error.message);
      res.json(data);
    }),
  );

  admin.get(
    "/applications/:id/feedback",
    asyncHandler(async (req, res) => {
      const membership = await requireHiringManager(req.supabase, req.user.id);
      const appId = Number(req.params.id);
      if (!Number.isFinite(appId)) return fail(res, 400, "Invalid application id.");

      const { data: app, error: appErr } = await req.supabase
        .from("applications")
        .select("id, job_id, jobs(company_id, title)")
        .eq("id", appId)
        .maybeSingle();
      if (appErr) throw new Error(appErr.message);
      if (!app) return fail(res, 404, "Application not found.");
      const job = unwrap(app.jobs);
      if (!job || job.company_id !== membership.company_id) {
        return fail(res, 403, "This application is not for your company.");
      }

      let { data, error } = await req.supabase
        .from("interviews")
        .select(
          "id, interview_type, scheduled_at, status, interviewer_id, feedback_technical, feedback_communication, feedback_problem_solving, feedback_teamwork, feedback_leadership, feedback_overall, feedback_comments, feedback_submitted_at, users:interviewer_id(full_name)",
        )
        .eq("application_id", appId)
        .order("scheduled_at", { ascending: true });

      if (error) {
        ({ data, error } = await req.supabase
          .from("interviews")
          .select(
            "id, interview_type, scheduled_at, status, interviewer_id, feedback_technical, feedback_communication, feedback_problem_solving, feedback_teamwork, feedback_leadership, feedback_overall, feedback_comments, feedback_submitted_at",
          )
          .eq("application_id", appId)
          .order("scheduled_at", { ascending: true }));
      }
      if (error && /feedback_/i.test(error.message || "")) {
        return res.json({ feedback: [] });
      }
      if (error) throw new Error(error.message);

      res.json({
        feedback: (data || []).map((row) => {
          const interviewer = unwrap(row.users);
          return {
            interview_id: row.id,
            interview_type: row.interview_type,
            scheduled_at: row.scheduled_at,
            status: row.status,
            interviewer_name: interviewer?.full_name || "Interviewer",
            technical: row.feedback_technical,
            communication: row.feedback_communication,
            problem_solving: row.feedback_problem_solving,
            teamwork: row.feedback_teamwork,
            leadership: row.feedback_leadership,
            overall: row.feedback_overall,
            comments: row.feedback_comments,
            submitted_at: row.feedback_submitted_at,
          };
        }),
      });
    }),
  );

  admin.post(
    "/messages",
    asyncHandler(async (req, res) => {
      const membership = await requireRecruiter(req.supabase, req.user.id);
      const applicationId = Number(req.body?.application_id);
      const subject = String(req.body?.subject || "").trim();
      const message = String(req.body?.message || "").trim();
      if (!Number.isFinite(applicationId)) {
        return fail(res, 400, "Pick a candidate.");
      }
      if (!subject || !message) {
        return fail(res, 400, "Subject and message are required.");
      }

      const { data: app, error: appErr } = await req.supabase
        .from("applications")
        .select(
          "id, jobs(company_id, title, companies(name)), candidates(user_id, first_name)",
        )
        .eq("id", applicationId)
        .maybeSingle();
      if (appErr) throw new Error(appErr.message);
      if (!app) return fail(res, 404, "Application not found.");
      const job = unwrap(app.jobs);
      if (!job || job.company_id !== membership.company_id) {
        return fail(res, 403, "This application is not for your company.");
      }

      const cand = unwrap(app.candidates);
      if (!cand?.user_id) {
        return fail(res, 400, "Candidate account not found for messaging.");
      }

      const companyName = unwrap(job.companies)?.name || "Company";
      const jobTitle = job.title || "the role";
      const composed = [
        `From ${companyName}`,
        `Role: ${jobTitle}`,
        "",
        message,
      ].join("\n");

      const { error } = await req.supabase.from("notifications").insert({
        user_id: cand.user_id,
        notification_type: "message",
        title: subject,
        message: composed,
        entity_type: "application",
        entity_id: applicationId,
      });
      if (error && /row-level security/i.test(error.message || "")) {
        return fail(
          res,
          403,
          "Message is blocked by RLS. Run supabase/notifications.sql in the Supabase SQL editor, then try again.",
        );
      }
      if (error) throw new Error(error.message);

      res.status(201).json({ ok: true });
    }),
  );
}

module.exports = { mountCompanyHiringRoutes, companyFieldsFromBody };
