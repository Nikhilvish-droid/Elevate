const express = require("express");
const { asyncHandler, splitName, fail } = require("../lib/helpers");
const { ensureAppUser, assignRole, buildSessionProfile } = require("../lib/users");

const router = express.Router();

router.post(
  "/candidate",
  asyncHandler(async (req, res) => {
    const input = req.body || {};
    if (!input.full_name?.trim()) {
      return fail(res, 400, "Name is required.");
    }

    await ensureAppUser(req.supabase, req.user, input.full_name);
    await assignRole(req.supabase, req.user.id, "candidate");

    const { error: userErr } = await req.supabase
      .from("users")
      .update({
        full_name: input.full_name.trim(),
        phone: input.phone || null,
        profile_image_url: input.profile_image_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.user.id);
    if (userErr) throw new Error(userErr.message);

    const { first_name, last_name } = splitName(input.full_name);
    const payload = {
      user_id: req.user.id,
      first_name,
      last_name,
      email: req.user.email,
      phone: input.phone || null,
      profile_image_url: input.profile_image_url || null,
      location: input.location || null,
      portfolio_url: input.portfolio || null,
      github_url: input.github || null,
      linkedin_url: input.linkedin || null,
      professional_summary: input.cover_letter || null,
      updated_at: new Date().toISOString(),
    };

    const { data: existingRows } = await req.supabase
      .from("candidates")
      .select("id")
      .eq("user_id", req.user.id)
      .order("id", { ascending: true })
      .limit(1);
    const existing = existingRows?.[0];

    let candidateId;
    if (existing?.id) {
      const { data, error } = await req.supabase
        .from("candidates")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      candidateId = data.id;
    } else {
      const { data, error } = await req.supabase
        .from("candidates")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      candidateId = data.id;
    }

    if (input.education?.trim()) {
      await req.supabase.from("candidate_education").insert({
        candidate_id: candidateId,
        institution_name: input.education.trim(),
        description: input.education.trim(),
      });
    }
    if (input.experience?.trim()) {
      await req.supabase.from("candidate_experience").insert({
        candidate_id: candidateId,
        company_name: "Experience",
        job_title: "Professional experience",
        start_date: new Date().toISOString().slice(0, 10),
        is_current: true,
        description: input.experience.trim(),
      });
    }
    if (input.certifications?.trim()) {
      await req.supabase.from("candidate_certifications").insert({
        candidate_id: candidateId,
        certification_name: input.certifications.trim(),
      });
    }
    if (input.skills?.trim()) {
      const names = input.skills.split(/[,|]/).map((s) => s.trim()).filter(Boolean);
      for (const name of names) {
        const { data: skill } = await req.supabase
          .from("skills")
          .upsert({ name, category: "skill" }, { onConflict: "name" })
          .select("id")
          .single();
        if (skill?.id) {
          await req.supabase.from("candidate_skills").upsert(
            { candidate_id: candidateId, skill_id: skill.id },
            { onConflict: "candidate_id,skill_id" },
          );
        }
      }
    }
    if (input.resume) {
      await req.supabase
        .from("resumes")
        .update({ is_primary: false })
        .eq("candidate_id", candidateId);
      const { error: resumeErr } = await req.supabase.from("resumes").insert({
        candidate_id: candidateId,
        file_name: input.resume.file_name,
        file_url: input.resume.file_url,
        file_type: input.resume.file_type,
        file_size_bytes: input.resume.file_size_bytes,
        is_primary: true,
        upload_status: "uploaded",
      });
      if (resumeErr) throw new Error(resumeErr.message);
    }

    res.json(await buildSessionProfile(req.supabase, req.user));
  }),
);

router.post(
  "/company",
  asyncHandler(async (req, res) => {
    const input = req.body || {};
    if (!input.full_name?.trim() || !input.company_name?.trim()) {
      return fail(res, 400, "Founder name and company name are required.");
    }

    const { getMembership } = require("../lib/company");
    const existing = await getMembership(req.supabase, req.user.id);
    if (existing) {
      return fail(res, 409, "You already belong to a company.");
    }

    await ensureAppUser(req.supabase, req.user, input.full_name);

    await req.supabase
      .from("users")
      .update({
        full_name: input.full_name.trim(),
        phone: input.phone || null,
        profile_image_url: input.profile_image_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.user.id);

    const payload = {
      name: input.company_name.trim(),
      website_url: input.website || null,
      industry: input.industry || null,
      company_size: input.company_size || null,
      description: input.description || null,
      linkedin_url: input.linkedin_url || null,
      twitter_url: input.twitter_url || null,
      github_url: input.github_url || null,
      logo_url: input.logo_url || null,
      address_line: input.address_line || null,
      city: input.city || input.office_locations || null,
      state: input.state || null,
      country: input.country || null,
      postal_code: input.postal_code || null,
    };

    const { data: rpcId, error: rpcErr } = await req.supabase.rpc(
      "create_company_as_founder",
      { payload },
    );

    if (rpcErr) {
      if (/already belong/i.test(rpcErr.message || "")) {
        return fail(res, 409, "You already belong to a company.");
      }
      const { data: company, error: companyErr } = await req.supabase
        .from("companies")
        .insert({
          name: payload.name,
          website_url: payload.website_url,
          industry: payload.industry,
          company_size: payload.company_size,
          description: payload.description,
          linkedin_url: payload.linkedin_url,
          twitter_url: payload.twitter_url,
          github_url: payload.github_url,
          logo_url: payload.logo_url,
        })
        .select("id")
        .single();
      if (companyErr) {
        throw new Error(
          companyErr.message.includes("row-level security")
            ? 'Company create is blocked by RLS. Run supabase/company-join.sql in the Supabase SQL editor, then try again.'
            : companyErr.message,
        );
      }

      const { error: memberErr } = await req.supabase.from("company_members").insert({
        company_id: company.id,
        user_id: req.user.id,
        role: "founder",
      });
      if (memberErr) throw new Error(memberErr.message);

      if (payload.city || payload.address_line) {
        await req.supabase.from("company_locations").insert({
          company_id: company.id,
          address_line: payload.address_line,
          city: payload.city,
          state: payload.state,
          country: payload.country,
          postal_code: payload.postal_code,
          is_headquarters: true,
        });
      }
    } else if (!rpcId) {
      throw new Error("Could not create company.");
    }

    res.json(await buildSessionProfile(req.supabase, req.user));
  }),
);

module.exports = router;
