const { unwrap, teamFromRoleName, teamLabel } = require("./helpers");

const MEMBER_ROLES = ["founder", "recruiter", "hiring_manager", "interviewer"];
const REQUEST_ROLES = ["recruiter", "hiring_manager", "interviewer"];

function membershipTeamRole(memberRole) {
  if (memberRole === "founder") return "founder";
  return teamFromRoleName(memberRole);
}

function membershipLabel(memberRole) {
  if (memberRole === "founder") return "Founder";
  return teamLabel(teamFromRoleName(memberRole));
}

async function getMembership(supabase, userId) {
  let query = await supabase
    .from("company_members")
    .select("company_id, role, companies(id, name, logo_url)")
    .eq("user_id", userId)
    .limit(1);
  if (query.error && /column .*role/i.test(query.error.message || "")) {
    query = await supabase
      .from("company_members")
      .select("company_id, companies(id, name, logo_url)")
      .eq("user_id", userId)
      .limit(1);
  }
  if (query.error) throw new Error(query.error.message);
  const data = query.data?.[0];
  if (!data) return null;
  const company = unwrap(data.companies);
  return {
    company_id: data.company_id,
    membership_role: data.role || null,
    company_name: company?.name ?? null,
    company_logo_url: company?.logo_url ?? null,
  };
}

async function getPendingJoinRequest(supabase, userId) {
  const { data, error } = await supabase
    .from("company_join_requests")
    .select("id, company_id, requested_role, status, created_at, companies(name)")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  if (!data?.[0]) return null;
  const row = data[0];
  return {
    id: row.id,
    company_id: row.company_id,
    requested_role: row.requested_role,
    status: row.status,
    company_name: unwrap(row.companies)?.name ?? null,
  };
}

async function assertFounder(supabase, userId, companyId) {
  const { data, error } = await supabase
    .from("company_members")
    .select("role")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .eq("role", "founder")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

function canManageJobs(membershipRole) {
  return membershipRole === "founder" || membershipRole === "recruiter";
}

async function requireCompanyMember(supabase, userId) {
  const membership = await getMembership(supabase, userId);
  if (!membership) {
    const err = new Error("You are not in a company.");
    err.status = 403;
    throw err;
  }
  return membership;
}

async function requireJobManager(supabase, userId) {
  const membership = await requireCompanyMember(supabase, userId);
  if (!canManageJobs(membership.membership_role)) {
    const err = new Error("Only founders and recruiters can manage jobs.");
    err.status = 403;
    throw err;
  }
  return membership;
}

module.exports = {
  MEMBER_ROLES,
  REQUEST_ROLES,
  membershipTeamRole,
  membershipLabel,
  getMembership,
  getPendingJoinRequest,
  assertFounder,
  canManageJobs,
  requireCompanyMember,
  requireJobManager,
};
