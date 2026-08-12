const { asyncHandler, fail, unwrap } = require("../lib/helpers");
const { buildSessionProfile } = require("../lib/users");
const {
  requireCompanyMember,
  requireJobManager,
} = require("../lib/company");
const { JOB_SELECT, JOB_SELECT_BASIC, mapJob, parseJobBody } = require("../lib/companyJobs");

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
        "screening",
        "shortlisted",
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
        ["applied", "screening"].includes(String(a.status || "").toLowerCase()),
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
        { key: "screening", label: "Screening" },
        { key: "shortlisted", label: "Shortlisted" },
        { key: "interview", label: "Interview" },
        { key: "offer", label: "Offer" },
        { key: "hired", label: "Hired" },
      ];
      const hiringFunnel = funnelStages.map((stage) => ({
        ...stage,
        count: applications.filter((a) => {
          const s = String(a.status || "").toLowerCase();
          if (stage.key === "interview") {
            return s === "interview" || s === "interviewing";
          }
          if (stage.key === "hired") {
            return s === "hired" || s === "accepted";
          }
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
}

module.exports = { mountCompanyHiringRoutes, companyFieldsFromBody };
