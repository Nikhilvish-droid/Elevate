const express = require("express");
const { unwrap, asyncHandler, fail, teamLabel, teamFromRoleName } = require("../lib/helpers");
const { assignRole, ensureAppUser } = require("../lib/users");
const {
  REQUEST_ROLES,
  getMembership,
  assertFounder,
  membershipLabel,
} = require("../lib/company");
const { mountCompanyHiringRoutes } = require("./companyHiring");
const { mountCompanyAssessmentRoutes } = require("./assessments");

const requests = express.Router();
const admin = express.Router();
mountCompanyHiringRoutes(admin);
mountCompanyAssessmentRoutes(admin);

requests.post(
  "/",
  asyncHandler(async (req, res) => {
    const company_id = Number(req.body?.company_id);
    const requested_role = String(req.body?.requested_role || "");
    if (!Number.isFinite(company_id)) {
      return fail(res, 400, "Pick a company.");
    }
    if (!REQUEST_ROLES.includes(requested_role)) {
      return fail(res, 400, "Pick recruiter, hiring manager, or interviewer.");
    }

    const existingMember = await getMembership(req.supabase, req.user.id);
    if (existingMember) {
      return fail(res, 409, "You already belong to a company.");
    }

    await ensureAppUser(req.supabase, req.user, req.body?.full_name);
    const userPatch = {
      updated_at: new Date().toISOString(),
    };
    if (req.body?.full_name?.trim()) userPatch.full_name = req.body.full_name.trim();
    if (req.body?.phone !== undefined) userPatch.phone = req.body.phone || null;
    if (req.body?.profile_image_url !== undefined) {
      userPatch.profile_image_url = req.body.profile_image_url || null;
    }
    if (Object.keys(userPatch).length > 1) {
      await req.supabase.from("users").update(userPatch).eq("id", req.user.id);
    }

    const { data: company } = await req.supabase
      .from("companies")
      .select("id, name")
      .eq("id", company_id)
      .maybeSingle();
    if (!company) return fail(res, 404, "Company not found.");

    const { data: pending } = await req.supabase
      .from("company_join_requests")
      .select("id")
      .eq("user_id", req.user.id)
      .eq("status", "pending")
      .maybeSingle();
    if (pending) {
      return fail(res, 409, "You already have a pending join request.");
    }

    const { data, error } = await req.supabase
      .from("company_join_requests")
      .insert({
        company_id,
        user_id: req.user.id,
        requested_role,
        status: "pending",
      })
      .select("id, company_id, requested_role, status, created_at")
      .single();
    if (error) throw new Error(error.message);

    res.status(201).json({
      ...data,
      company_name: company.name,
    });
  }),
);

requests.get(
  "/mine",
  asyncHandler(async (req, res) => {
    const { data, error } = await req.supabase
      .from("company_join_requests")
      .select("id, company_id, requested_role, status, created_at, companies(name)")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);
    res.json(
      (data || []).map((row) => ({
        id: row.id,
        company_id: row.company_id,
        requested_role: row.requested_role,
        status: row.status,
        created_at: row.created_at,
        company_name: unwrap(row.companies)?.name ?? null,
      })),
    );
  }),
);

admin.get(
  "/members",
  asyncHandler(async (req, res) => {
    const membership = await getMembership(req.supabase, req.user.id);
    if (!membership) return fail(res, 403, "You are not in a company.");

    const { data: members, error } = await req.supabase
      .from("company_members")
      .select("user_id, role, users!user_id(id, full_name, email, profile_image_url)")
      .eq("company_id", membership.company_id);
    if (error) throw new Error(error.message);

    const grouped = {
      founder: [],
      recruiter: [],
      hiring_manager: [],
      interviewer: [],
    };
    for (const row of members || []) {
      const u = unwrap(row.users);
      const bucket = grouped[row.role] ? row.role : "recruiter";
      grouped[bucket].push({
        user_id: row.user_id,
        role: row.role,
        label: membershipLabel(row.role),
        full_name: u?.full_name ?? "Member",
        email: u?.email ?? null,
        profile_image_url: u?.profile_image_url ?? null,
      });
    }

    const isFounder = membership.membership_role === "founder";
    let pending = [];
    if (isFounder) {
      const { data: requests, error: reqErr } = await req.supabase
        .from("company_join_requests")
        .select(
          "id, user_id, requested_role, status, created_at, users!user_id(id, full_name, email, profile_image_url)",
        )
        .eq("company_id", membership.company_id)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (reqErr) throw new Error(reqErr.message);
      pending = (requests || []).map((row) => {
        const u = unwrap(row.users);
        return {
          id: row.id,
          user_id: row.user_id,
          requested_role: row.requested_role,
          role_label: teamLabel(teamFromRoleName(row.requested_role)),
          full_name: u?.full_name ?? "User",
          email: u?.email ?? null,
          profile_image_url: u?.profile_image_url ?? null,
          created_at: row.created_at,
        };
      });
    }

    res.json({
      company_id: membership.company_id,
      company_name: membership.company_name,
      is_founder: isFounder,
      groups: grouped,
      pending,
    });
  }),
);

requests.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const action = req.body?.action;
    if (action !== "approve" && action !== "reject") {
      return fail(res, 400, "action must be approve or reject.");
    }

    const membership = await getMembership(req.supabase, req.user.id);
    if (!membership || membership.membership_role !== "founder") {
      return fail(res, 403, "Only the founder can review join requests.");
    }

    const { data: request, error: loadErr } = await req.supabase
      .from("company_join_requests")
      .select("id, company_id, user_id, requested_role, status")
      .eq("id", req.params.id)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!request) return fail(res, 404, "Request not found.");
    if (request.company_id !== membership.company_id) {
      return fail(res, 403, "That request is not for your company.");
    }
    if (request.status !== "pending") {
      return fail(res, 409, "This request was already reviewed.");
    }

    const founder = await assertFounder(
      req.supabase,
      req.user.id,
      request.company_id,
    );
    if (!founder) return fail(res, 403, "Only the founder can review join requests.");

    const { data: reviewed, error: rpcErr } = await req.supabase.rpc(
      "review_company_join_request",
      { p_id: request.id, p_action: action },
    );
    if (!rpcErr) {
      res.json(reviewed || { ok: true, status: action === "approve" ? "approved" : "rejected" });
      return;
    }

    if (action === "approve") {
      const { data: otherRows } = await req.supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", request.user_id)
        .limit(1);
      const otherMember = otherRows?.[0];
      if (otherMember && otherMember.company_id !== request.company_id) {
        return fail(res, 409, "That user already belongs to another company.");
      }
      if (!otherMember) {
        const { error: memErr } = await req.supabase.from("company_members").insert({
          company_id: request.company_id,
          user_id: request.user_id,
          role: request.requested_role,
        });
        if (memErr) {
          throw new Error(
            /row-level security/i.test(memErr.message)
              ? "Approve is blocked by RLS. Re-run supabase/company-join.sql, then try again."
              : memErr.message,
          );
        }
      }

      try {
        await assignRole(req.supabase, request.user_id, request.requested_role);
      } catch {
        // membership is the source of access; global role is best-effort
      }

      if (request.requested_role === "interviewer") {
        await req.supabase.from("interviewers").insert({
          user_id: request.user_id,
          company_id: request.company_id,
          designation: "Interviewer",
        });
      }
    }

    const { error: updErr } = await req.supabase
      .from("company_join_requests")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id);
    if (updErr) throw new Error(updErr.message);

    res.json({ ok: true, status: action === "approve" ? "approved" : "rejected" });
  }),
);

module.exports = { requests, admin };
