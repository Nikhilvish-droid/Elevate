const express = require("express");
const { asyncHandler, fail, unwrap } = require("../lib/helpers");
const { requireAdmin } = require("../middleware/admin");
const { writeAudit, requestMeta } = require("../lib/audit");
const { assignRole, roleNamesFor } = require("../lib/users");
const { normalizeStage } = require("../lib/applicationStages");

const router = express.Router();

router.use(requireAdmin);

function auditFrom(req, action, resourceType, resourceId, metadata) {
  const meta = requestMeta(req);
  return writeAudit(req.adminDb, {
    actorId: req.user.id,
    actorRole: "admin",
    action,
    resourceType,
    resourceId,
    ...meta,
    metadata,
  });
}

const STAFF_ROLES = [
  "admin",
  "founder",
  "recruiter",
  "hiring_manager",
  "interviewer",
  "candidate",
];

function parsePage(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 25));
  return { page, perPage, from: (page - 1) * perPage, to: page * perPage - 1 };
}

async function rolesByUserIds(db, userIds) {
  const map = {};
  if (!userIds.length) return map;
  const { data } = await db
    .from("user_roles")
    .select("user_id, roles(name)")
    .in("user_id", userIds);
  for (const row of data || []) {
    const name = unwrap(row.roles)?.name;
    if (!name) continue;
    if (!map[row.user_id]) map[row.user_id] = [];
    map[row.user_id].push(name);
  }
  return map;
}

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const { page, perPage, from, to } = parsePage(req);
    const q = String(req.query.q || "").trim().toLowerCase();
    const roleFilter = String(req.query.role || "").trim();
    const statusFilter = String(req.query.status || "").trim();

    let query = req.adminDb
      .from("users")
      .select(
        "id, email, full_name, phone, profile_image_url, status, last_login_at, created_at, suspended_at",
        { count: "exact" },
      )
      .order("last_login_at", { ascending: false, nullsFirst: false })
      .range(from, to);

    if (statusFilter) query = query.eq("status", statusFilter);
    if (q) {
      query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
    }

    let { data, error, count } = await query;
    if (error && /column .*status|suspended_at|created_at/i.test(error.message || "")) {
      const fallback = await req.adminDb
        .from("users")
        .select("id, email, full_name, phone, profile_image_url, last_login_at", {
          count: "exact",
        })
        .range(from, to);
      data = fallback.data;
      error = fallback.error;
      count = fallback.count;
    }
    if (error) throw new Error(error.message);

    const rows = data || [];
    const ids = rows.map((u) => u.id);
    const roleMap = await rolesByUserIds(req.adminDb, ids);

    const { data: members } = ids.length
      ? await req.adminDb
          .from("company_members")
          .select("user_id, role, company_id, companies(name)")
          .in("user_id", ids)
      : { data: [] };

    const memberByUser = {};
    for (const row of members || []) {
      memberByUser[row.user_id] = {
        company_id: row.company_id,
        company_name: unwrap(row.companies)?.name || null,
        membership_role: row.role || null,
      };
    }

    let users = rows.map((u) => ({
      ...u,
      status: u.status || "active",
      roles: roleMap[u.id] || [],
      ...(memberByUser[u.id] || {
        company_id: null,
        company_name: null,
        membership_role: null,
      }),
    }));

    if (roleFilter) {
      users = users.filter((u) => u.roles.includes(roleFilter));
    }

    res.json({
      users,
      page,
      perPage,
      total: roleFilter ? users.length : count || users.length,
    });
  }),
);

router.post(
  "/users",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const fullName = String(req.body?.full_name || "").trim() || email.split("@")[0];
    const roleName = String(req.body?.role || "").trim();
    const companyId = Number(req.body?.company_id);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(res, 400, "A valid email is required.");
    }
    if (password.length < 8) {
      return fail(res, 400, "Password must be at least 8 characters.");
    }
    if (!STAFF_ROLES.includes(roleName)) {
      return fail(res, 400, `Role must be one of: ${STAFF_ROLES.join(", ")}.`);
    }

    const { data: created, error: createErr } =
      await req.adminDb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
    if (createErr || !created?.user) {
      return fail(res, 400, createErr?.message || "Could not create auth user.");
    }

    const userId = created.user.id;
    await req.adminDb.from("users").upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        status: "active",
        last_login_at: null,
      },
      { onConflict: "id" },
    );

    await assignRole(req.adminDb, userId, roleName);

    if (Number.isFinite(companyId) && roleName !== "candidate" && roleName !== "admin") {
      await req.adminDb.from("company_members").upsert(
        { company_id: companyId, user_id: userId, role: roleName === "admin" ? "recruiter" : roleName },
        { onConflict: "company_id,user_id" },
      );
    }

    await auditFrom(req, "user.create", "users", userId, { email, role: roleName });
    res.status(201).json({ id: userId, email, full_name: fullName, role: roleName });
  }),
);

router.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const userId = String(req.params.id);
    if (!userId) return fail(res, 400, "Invalid user id.");

    const patch = {};
    const status = req.body?.status;
    if (status === "active" || status === "suspended") {
      patch.status = status;
      patch.suspended_at = status === "suspended" ? new Date().toISOString() : null;
    }
    if (req.body?.full_name != null) {
      patch.full_name = String(req.body.full_name).trim() || null;
    }

    if (Object.keys(patch).length) {
      const { error } = await req.adminDb.from("users").update(patch).eq("id", userId);
      if (error && /column .*status|suspended_at/i.test(error.message || "")) {
        delete patch.status;
        delete patch.suspended_at;
        if (Object.keys(patch).length) {
          const retry = await req.adminDb.from("users").update(patch).eq("id", userId);
          if (retry.error) throw new Error(retry.error.message);
        }
      } else if (error) {
        throw new Error(error.message);
      }
    }

    if (status === "suspended") {
      try {
        await req.adminDb.auth.admin.updateUserById(userId, {
          ban_duration: "876000h",
        });
      } catch {
        /* older supabase may not support ban_duration */
      }
    }
    if (status === "active") {
      try {
        await req.adminDb.auth.admin.updateUserById(userId, { ban_duration: "none" });
      } catch {
        /* ignore */
      }
    }

    if (req.body?.force_logout) {
      try {
        await req.adminDb.auth.admin.signOut(userId, "global");
      } catch (err) {
        console.warn("force logout skipped:", err.message);
      }
    }

    const nextRole = String(req.body?.role || "").trim();
    if (nextRole) {
      if (!STAFF_ROLES.includes(nextRole)) {
        return fail(res, 400, `Role must be one of: ${STAFF_ROLES.join(", ")}.`);
      }
      await assignRole(req.adminDb, userId, nextRole);
    }

    await auditFrom(req, "user.update", "users", userId, req.body || {});
    const names = await roleNamesFor(req.adminDb, userId);
    res.json({ ok: true, id: userId, roles: names, status: patch.status || undefined });
  }),
);

router.get(
  "/companies",
  asyncHandler(async (req, res) => {
    const { page, perPage, from, to } = parsePage(req);
    const statusFilter = String(req.query.status || "").trim();

    let query = req.adminDb
      .from("companies")
      .select(
        "id, name, logo_url, website_url, industry, company_size, status, created_at, description",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (statusFilter) query = query.eq("status", statusFilter);

    let { data, error, count } = await query;
    if (error && /column .*status/i.test(error.message || "")) {
      const fallback = await req.adminDb
        .from("companies")
        .select(
          "id, name, logo_url, website_url, industry, company_size, created_at, description",
          { count: "exact" },
        )
        .order("id", { ascending: false })
        .range(from, to);
      data = fallback.data;
      error = fallback.error;
      count = fallback.count;
    }
    if (error) throw new Error(error.message);

    const companies = data || [];
    const ids = companies.map((c) => c.id);
    const jobCounts = {};
    const memberCounts = {};
    if (ids.length) {
      const { data: jobs } = await req.adminDb
        .from("jobs")
        .select("id, company_id")
        .in("company_id", ids);
      for (const j of jobs || []) {
        jobCounts[j.company_id] = (jobCounts[j.company_id] || 0) + 1;
      }
      const { data: members } = await req.adminDb
        .from("company_members")
        .select("company_id")
        .in("company_id", ids);
      for (const m of members || []) {
        memberCounts[m.company_id] = (memberCounts[m.company_id] || 0) + 1;
      }
    }

    res.json({
      companies: companies.map((c) => ({
        ...c,
        status: c.status || "approved",
        jobs_count: jobCounts[c.id] || 0,
        members_count: memberCounts[c.id] || 0,
      })),
      page,
      perPage,
      total: count || companies.length,
    });
  }),
);

router.patch(
  "/companies/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return fail(res, 400, "Invalid company id.");
    const status = String(req.body?.status || "").trim();
    if (!["pending", "approved", "rejected"].includes(status)) {
      return fail(res, 400, "status must be pending, approved, or rejected.");
    }
    const { data, error } = await req.adminDb
      .from("companies")
      .update({ status })
      .eq("id", id)
      .select("id, name, status")
      .single();
    if (error) throw new Error(error.message);
    await auditFrom(req, "company.status", "companies", id, { status });
    res.json(data);
  }),
);

router.get(
  "/jobs",
  asyncHandler(async (req, res) => {
    const { page, perPage, from, to } = parsePage(req);
    const statusFilter = String(req.query.status || "").trim();

    let query = req.adminDb
      .from("jobs")
      .select(
        "id, title, status, location, work_mode, employment_type, created_at, company_id, companies(id, name, logo_url)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (statusFilter) query = query.eq("status", statusFilter);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    res.json({
      jobs: (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        location: row.location,
        work_mode: row.work_mode,
        employment_type: row.employment_type,
        created_at: row.created_at,
        company_id: row.company_id,
        company_name: unwrap(row.companies)?.name || null,
      })),
      page,
      perPage,
      total: count || (data || []).length,
    });
  }),
);

router.patch(
  "/jobs/:id/status",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return fail(res, 400, "Invalid job id.");
    const status = String(req.body?.status || "").trim();
    if (!["draft", "published", "closed", "flagged"].includes(status)) {
      return fail(res, 400, "status must be draft, published, closed, or flagged.");
    }
    const { data, error } = await req.adminDb
      .from("jobs")
      .update({ status })
      .eq("id", id)
      .select("id, title, status, company_id")
      .single();
    if (error) throw new Error(error.message);
    await auditFrom(req, "job.status", "jobs", id, { status });
    res.json(data);
  }),
);

router.get(
  "/analytics/overview",
  asyncHandler(async (req, res) => {
    const db = req.adminDb;

    const [{ data: users }, { data: rolesRows }, { data: members }, { data: apps }, { data: offers }, { data: interviews }, { data: companies }, { data: jobs }, { data: logs }] =
      await Promise.all([
        db.from("users").select("id"),
        db.from("user_roles").select("user_id, roles(name)"),
        db.from("company_members").select("user_id, role"),
        db.from("applications").select("id, status, applied_at, candidate_id, job_id"),
        db.from("offer_letters").select("id, status, created_at, job_id"),
        db.from("interviews").select("id, status, scheduled_at, feedback_submitted_at, feedback_overall"),
        db.from("companies").select("id, name, created_at"),
        db.from("jobs").select("id, company_id, status, created_at"),
        db.from("audit_logs").select("id, created_at").order("created_at", { ascending: false }).limit(500),
      ]);

    const usersByRole = {};
    const counted = new Set();
    for (const row of rolesRows || []) {
      const name = unwrap(row.roles)?.name || "unknown";
      usersByRole[name] = (usersByRole[name] || 0) + 1;
      if (row.user_id) counted.add(`${row.user_id}:${name}`);
    }
    // Founders (and some staff) live on company_members, not user_roles.
    for (const row of members || []) {
      const name = row.role || "unknown";
      const key = `${row.user_id}:${name}`;
      if (counted.has(key)) continue;
      usersByRole[name] = (usersByRole[name] || 0) + 1;
      counted.add(key);
    }

    const funnelMap = {};
    for (const app of apps || []) {
      const stage = normalizeStage(app.status) || "applied";
      funnelMap[stage] = (funnelMap[stage] || 0) + 1;
    }
    const funnelOrder = [
      "applied",
      "resume_screening",
      "shortlisted",
      "technical_interview",
      "hr_interview",
      "offer",
      "hired",
      "rejected",
    ];
    const funnel = funnelOrder.map((stage) => ({
      stage,
      count: funnelMap[stage] || 0,
    }));

    const offerList = offers || [];
    const accepted = offerList.filter((o) =>
      ["accepted", "accept"].includes(String(o.status || "").toLowerCase()),
    ).length;
    const decided = offerList.filter((o) =>
      ["accepted", "accept", "rejected", "reject", "declined"].includes(
        String(o.status || "").toLowerCase(),
      ),
    ).length;
    const offer_acceptance_rate = decided
      ? Math.round((accepted / decided) * 100)
      : 0;

    const hiredApps = (apps || []).filter(
      (a) => normalizeStage(a.status) === "hired" && a.applied_at,
    );
    let time_to_hire_days = null;
    if (hiredApps.length) {
      const days = hiredApps.map((a) => {
        const start = new Date(a.applied_at).getTime();
        return Math.max(0, (Date.now() - start) / (1000 * 60 * 60 * 24));
      });
      time_to_hire_days = Math.round(
        days.reduce((s, n) => s + n, 0) / days.length,
      );
    }

    const monthly = {};
    for (const app of apps || []) {
      if (!app.applied_at) continue;
      const d = new Date(app.applied_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthly[key]) monthly[key] = { month: key, applications: 0, hires: 0 };
      monthly[key].applications += 1;
      if (normalizeStage(app.status) === "hired") monthly[key].hires += 1;
    }
    const monthly_hiring = Object.values(monthly)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    const jobsByCompany = {};
    for (const j of jobs || []) {
      jobsByCompany[j.company_id] = (jobsByCompany[j.company_id] || 0) + 1;
    }
    const appsByJob = {};
    for (const a of apps || []) {
      if (!a.job_id) continue;
      appsByJob[a.job_id] = (appsByJob[a.job_id] || 0) + 1;
    }
    const jobCompany = {};
    for (const j of jobs || []) jobCompany[j.id] = j.company_id;
    const appsByCompany = {};
    const hiresByCompany = {};
    for (const a of apps || []) {
      const cid = jobCompany[a.job_id];
      if (!cid) continue;
      appsByCompany[cid] = (appsByCompany[cid] || 0) + 1;
      if (normalizeStage(a.status) === "hired") {
        hiresByCompany[cid] = (hiresByCompany[cid] || 0) + 1;
      }
    }

    const company_activity = (companies || []).map((c) => ({
      id: c.id,
      name: c.name,
      jobs: jobsByCompany[c.id] || 0,
      applications: appsByCompany[c.id] || 0,
      hires: hiresByCompany[c.id] || 0,
    }));

    const interviewList = interviews || [];
    const submitted = interviewList.filter(
      (i) => i.feedback_submitted_at || i.feedback_overall != null,
    ).length;
    const passed = interviewList.filter(
      (i) => Number(i.feedback_overall) >= 3,
    ).length;
    const interview_success_rate = submitted
      ? Math.round((passed / submitted) * 100)
      : 0;

    const audit_volume = {};
    for (const log of logs || []) {
      if (!log.created_at) continue;
      const day = String(log.created_at).slice(0, 10);
      audit_volume[day] = (audit_volume[day] || 0) + 1;
    }

    res.json({
      totals: {
        users: (users || []).length,
        companies: (companies || []).length,
        jobs: (jobs || []).length,
        applications: (apps || []).length,
        offers: offerList.length,
        interviews: interviewList.length,
      },
      users_by_role: Object.entries(usersByRole).map(([role, count]) => ({
        role,
        count,
      })),
      funnel,
      offer_acceptance_rate,
      time_to_hire_days,
      monthly_hiring,
      company_activity,
      interview_success_rate,
      audit_volume: Object.entries(audit_volume)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([day, count]) => ({ day, count })),
    });
  }),
);

router.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    const { page, perPage, from, to } = parsePage(req);
    const action = String(req.query.action || "").trim();
    let query = req.adminDb
      .from("audit_logs")
      .select(
        "id, actor_id, actor_role, action, resource_type, resource_id, ip_address, user_agent, metadata, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (action) query = query.eq("action", action);
    const { data, error, count } = await query;
    if (error) {
      if (/does not exist|relation/i.test(error.message || "")) {
        return res.json({ logs: [], page, perPage, total: 0 });
      }
      throw new Error(error.message);
    }
    res.json({ logs: data || [], page, perPage, total: count || 0 });
  }),
);

router.get(
  "/settings",
  asyncHandler(async (req, res) => {
    const { data, error } = await req.adminDb
      .from("platform_settings")
      .select("key, value, updated_at, updated_by");
    if (error) {
      if (/does not exist|relation/i.test(error.message || "")) {
        return res.json({ settings: {} });
      }
      throw new Error(error.message);
    }
    const settings = {};
    for (const row of data || []) settings[row.key] = row.value;
    res.json({ settings });
  }),
);

router.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const entries = req.body?.settings || req.body || {};
    if (!entries || typeof entries !== "object") {
      return fail(res, 400, "Send { settings: { key: value } }.");
    }
    const rows = Object.entries(entries).map(([key, value]) => ({
      key,
      value,
      updated_by: req.user.id,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await req.adminDb
      .from("platform_settings")
      .upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
    await auditFrom(req, "settings.update", "settings", "platform", {
      keys: Object.keys(entries),
    });
    res.json({ ok: true });
  }),
);

router.get(
  "/permissions",
  asyncHandler(async (req, res) => {
    const { data, error } = await req.adminDb
      .from("role_permissions")
      .select("id, role, resource, action, allowed")
      .order("role")
      .order("resource");
    if (error) {
      if (/does not exist|relation/i.test(error.message || "")) {
        return res.json({ permissions: [] });
      }
      throw new Error(error.message);
    }
    res.json({ permissions: data || [] });
  }),
);

router.put(
  "/permissions",
  asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
    if (!items.length) return fail(res, 400, "Send { permissions: [...] }.");
    const rows = items.map((p) => ({
      role: String(p.role),
      resource: String(p.resource),
      action: String(p.action),
      allowed: Boolean(p.allowed),
    }));
    const { error } = await req.adminDb
      .from("role_permissions")
      .upsert(rows, { onConflict: "role,resource,action" });
    if (error) throw new Error(error.message);
    await auditFrom(req, "permissions.update", "permissions", "matrix", {
      count: rows.length,
    });
    res.json({ ok: true });
  }),
);

module.exports = router;
