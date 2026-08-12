const express = require("express");
const { unwrap, splitName, asyncHandler, fail } = require("../lib/helpers");
const { getCandidateId } = require("../lib/users");
const { loadFullProfile } = require("../lib/candidateProfile");
const { replaceEducation, replaceExperience, replaceCertifications } = require("../lib/candidateSave");

const router = express.Router();

async function syncSkillNames(supabase, candidateId, names, category) {
  const clean = (names || []).map((n) => String(n).trim()).filter(Boolean);

  const { data: existing } = await supabase
    .from("candidate_skills")
    .select("skill_id, skills(id, name, category)")
    .eq("candidate_id", candidateId);

  const toRemove = (existing || []).filter(
    (row) => unwrap(row.skills)?.category === category,
  );

  if (toRemove.length) {
    await supabase
      .from("candidate_skills")
      .delete()
      .eq("candidate_id", candidateId)
      .in(
        "skill_id",
        toRemove.map((r) => r.skill_id),
      );
  }

  for (const name of clean) {
    const { data: skill } = await supabase
      .from("skills")
      .upsert({ name, category }, { onConflict: "name" })
      .select("id")
      .single();
    if (skill?.id) {
      await supabase.from("candidate_skills").upsert(
        { candidate_id: candidateId, skill_id: skill.id },
        { onConflict: "candidate_id,skill_id" },
      );
    }
  }
}

router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const candidateId = await getCandidateId(req.supabase, req.user.id);
    if (!candidateId) {
      return fail(res, 404, "Finish candidate onboarding first.");
    }
    res.json(await loadFullProfile(req.supabase, req.user, candidateId));
  }),
);

router.put(
  "/profile",
  asyncHandler(async (req, res) => {
    const candidateId = await getCandidateId(req.supabase, req.user.id);
    if (!candidateId) {
      return fail(res, 404, "Finish candidate onboarding first.");
    }

    const draft = req.body || {};
    if (!draft.full_name?.trim()) {
      return fail(res, 400, "Your name is required.");
    }

    const { first_name, last_name } = splitName(draft.full_name);

    const phone =
      draft.phone === undefined ? undefined : draft.phone?.trim() || null;

    const userPatch = {
      full_name: draft.full_name.trim(),
      profile_image_url: draft.profile_image_url || undefined,
      updated_at: new Date().toISOString(),
    };
    if (phone !== undefined) userPatch.phone = phone;

    const { error: userErr } = await req.supabase
      .from("users")
      .update(userPatch)
      .eq("id", req.user.id);
    if (userErr) throw new Error(userErr.message);

    const candPatch = {
      first_name,
      last_name,
      location: draft.location || null,
      professional_summary: draft.professional_summary || null,
      total_experience_years: draft.total_experience_years ?? null,
      portfolio_url: draft.portfolio_url || null,
      github_url: draft.github_url || null,
      linkedin_url: draft.linkedin_url || null,
      profile_image_url: draft.profile_image_url || undefined,
      gender_identity: draft.gender_identity || null,
      pronouns: draft.pronouns || null,
      show_pronouns_on_profile: Boolean(draft.show_pronouns_on_profile),
      updated_at: new Date().toISOString(),
    };
    if (phone !== undefined) candPatch.phone = phone;

    const { error: candErr } = await req.supabase
      .from("candidates")
      .update(candPatch)
      .eq("id", candidateId);
    if (candErr) throw new Error(candErr.message);

    await replaceEducation(req.supabase, candidateId, draft.education || []);
    await replaceExperience(req.supabase, candidateId, draft.experience || []);

    if (draft.certifications) {
      await replaceCertifications(req.supabase, candidateId, draft.certifications);
    }

    await syncSkillNames(req.supabase, candidateId, draft.skills, "skill");
    await syncSkillNames(req.supabase, candidateId, draft.open_to_roles, "desired_role");

    if (draft.resume) {
      await req.supabase
        .from("resumes")
        .update({ is_primary: false })
        .eq("candidate_id", candidateId);
      const { error: resumeErr } = await req.supabase.from("resumes").insert({
        candidate_id: candidateId,
        file_name: draft.resume.file_name,
        file_url: draft.resume.file_url,
        file_type: draft.resume.file_type,
        file_size_bytes: draft.resume.file_size_bytes,
        is_primary: true,
        upload_status: "uploaded",
      });
      if (resumeErr) throw new Error(resumeErr.message);
    }

    res.json(await loadFullProfile(req.supabase, req.user, candidateId));
  }),
);

router.get(
  "/applications",
  asyncHandler(async (req, res) => {
    const candidateId = await getCandidateId(req.supabase, req.user.id);
    if (!candidateId) return res.json([]);

    const { data, error } = await req.supabase
      .from("applications")
      .select(
        "id, status, match_score, cover_letter, applied_at, job_id, jobs(id, title, location, employment_type, work_mode, salary_min, salary_max, company_id, companies(name, logo_url))",
      )
      .eq("candidate_id", candidateId)
      .order("applied_at", { ascending: false });
    if (error) throw new Error(error.message);
    res.json(data || []);
  }),
);

router.get(
  "/interviews",
  asyncHandler(async (req, res) => {
    const candidateId = await getCandidateId(req.supabase, req.user.id);
    if (!candidateId) return res.json([]);

    const { data: apps } = await req.supabase
      .from("applications")
      .select("id")
      .eq("candidate_id", candidateId);
    const ids = (apps || []).map((a) => a.id);
    if (!ids.length) return res.json([]);

    const { data, error } = await req.supabase
      .from("interviews")
      .select(
        "id, interview_type, scheduled_at, duration_minutes, meeting_link, location, status, application_id, applications(id, job_id, status, jobs(id, title, companies(name, logo_url)))",
      )
      .in("application_id", ids)
      .order("scheduled_at", { ascending: true });
    if (error) throw new Error(error.message);
    res.json(
      (data || []).map((row) => ({
        ...row,
        applications: Array.isArray(row.applications)
          ? row.applications[0] ?? null
          : row.applications,
      })),
    );
  }),
);

router.get(
  "/assessments",
  asyncHandler(async (req, res) => {
    const candidateId = await getCandidateId(req.supabase, req.user.id);
    if (!candidateId) return res.json([]);

    const { data, error } = await req.supabase
      .from("assessment_attempts")
      .select(
        "id, status, started_at, submitted_at, score, coding_assessments(title, duration_minutes, description)",
      )
      .eq("candidate_id", candidateId)
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    res.json(data || []);
  }),
);

router.get(
  "/offers",
  asyncHandler(async (req, res) => {
    const candidateId = await getCandidateId(req.supabase, req.user.id);
    if (!candidateId) return res.json([]);

    const { data, error } = await req.supabase
      .from("offer_letters")
      .select(
        "id, salary, joining_date, location, offer_pdf_url, status, jobs(title, companies(name))",
      )
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    res.json(data || []);
  }),
);

router.patch(
  "/offers/:id",
  asyncHandler(async (req, res) => {
    const candidateId = await getCandidateId(req.supabase, req.user.id);
    if (!candidateId) {
      return fail(res, 404, "Finish candidate onboarding first.");
    }
    const accept = Boolean(req.body?.accept);
    const offerId = Number(req.params.id);
    if (!Number.isFinite(offerId)) return fail(res, 400, "Invalid offer id.");

    const { data: offer, error: findErr } = await req.supabase
      .from("offer_letters")
      .select("id, candidate_id, job_id, status")
      .eq("id", offerId)
      .eq("candidate_id", candidateId)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);
    if (!offer) return fail(res, 404, "Offer not found.");

    const { error } = await req.supabase
      .from("offer_letters")
      .update({
        status: accept ? "accepted" : "rejected",
        responded_at: new Date().toISOString(),
      })
      .eq("id", offerId)
      .eq("candidate_id", candidateId);
    if (error) throw new Error(error.message);

    if (accept) {
      await req.supabase
        .from("applications")
        .update({ status: "hired" })
        .eq("candidate_id", candidateId)
        .eq("job_id", offer.job_id);
    } else {
      await req.supabase
        .from("applications")
        .update({ status: "rejected", approved_for_offer: false })
        .eq("candidate_id", candidateId)
        .eq("job_id", offer.job_id);
    }

    res.json({ ok: true });
  }),
);

router.get(
  "/notifications",
  asyncHandler(async (req, res) => {
    const { data, error } = await req.supabase
      .from("notifications")
      .select(
        "id, title, message, notification_type, is_read, created_at, entity_type, entity_id",
      )
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);

    const rows = data || [];
    const appIds = rows
      .filter((n) => n.entity_type === "application" && n.entity_id)
      .map((n) => n.entity_id);
    const offerIds = rows
      .filter((n) => n.entity_type === "offer" && n.entity_id)
      .map((n) => n.entity_id);
    const interviewIds = rows
      .filter((n) => n.entity_type === "interview" && n.entity_id)
      .map((n) => n.entity_id);

    const metaByKey = {};

    if (appIds.length) {
      const { data: apps } = await req.supabase
        .from("applications")
        .select("id, jobs(title, companies(name))")
        .in("id", appIds);
      for (const app of apps || []) {
        const job = unwrap(app.jobs);
        const company = unwrap(job?.companies);
        metaByKey[`application:${app.id}`] = {
          company_name: company?.name || null,
          job_title: job?.title || null,
        };
      }
    }

    if (offerIds.length) {
      const { data: offers } = await req.supabase
        .from("offer_letters")
        .select("id, jobs(title, companies(name))")
        .in("id", offerIds);
      for (const offer of offers || []) {
        const job = unwrap(offer.jobs);
        const company = unwrap(job?.companies);
        metaByKey[`offer:${offer.id}`] = {
          company_name: company?.name || null,
          job_title: job?.title || null,
        };
      }
    }

    if (interviewIds.length) {
      const { data: ints } = await req.supabase
        .from("interviews")
        .select(
          "id, applications(jobs(title, companies(name)))",
        )
        .in("id", interviewIds);
      for (const row of ints || []) {
        const app = unwrap(row.applications);
        const job = unwrap(app?.jobs);
        const company = unwrap(job?.companies);
        metaByKey[`interview:${row.id}`] = {
          company_name: company?.name || null,
          job_title: job?.title || null,
        };
      }
    }

    res.json(
      rows.map((n) => {
        const key =
          n.entity_type && n.entity_id
            ? `${n.entity_type}:${n.entity_id}`
            : null;
        const meta = (key && metaByKey[key]) || {};
        return {
          ...n,
          company_name: meta.company_name || null,
          job_title: meta.job_title || null,
        };
      }),
    );
  }),
);

router.patch(
  "/notifications/:id",
  asyncHandler(async (req, res) => {
    const { error } = await req.supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) throw new Error(error.message);
    res.json({ ok: true });
  }),
);

router.get(
  "/resume-score",
  asyncHandler(async (req, res) => {
    const candidateId = await getCandidateId(req.supabase, req.user.id);
    if (!candidateId) return res.json(null);

    const { data: resume } = await req.supabase
      .from("resumes")
      .select("id")
      .eq("candidate_id", candidateId)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!resume) return res.json(null);

    const { data } = await req.supabase
      .from("resume_analyses")
      .select("match_percentage, recommendations, strengths")
      .eq("resume_id", resume.id)
      .order("analyzed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    res.json(data);
  }),
);

module.exports = router;
