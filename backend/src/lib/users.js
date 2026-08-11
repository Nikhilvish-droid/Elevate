const {
  unwrap,
  displayName,
  teamFromRoleName,
  teamLabel,
} = require("./helpers");
const {
  getMembership,
  getPendingJoinRequest,
  membershipTeamRole,
  membershipLabel,
} = require("./company");

async function getCandidateId(supabase, userId) {
  const { data, error } = await supabase
    .from("candidates")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

async function ensureAppUser(supabase, user, fullName) {
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const name = fullName?.trim() || displayName(user);

  if (existing) {
    await supabase
      .from("users")
      .update({
        last_login_at: new Date().toISOString(),
        email: user.email || existing.email,
      })
      .eq("id", user.id);
    return existing;
  }

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        full_name: name,
        email: user.email,
        last_login_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function assignRole(supabase, userId, roleName) {
  const { data: role, error } = await supabase
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!role?.id) {
    throw new Error(`Role "${roleName}" is missing in public.roles`);
  }

  const { error: linkErr } = await supabase.from("user_roles").upsert(
    { user_id: userId, role_id: role.id },
    { onConflict: "user_id,role_id" },
  );
  if (linkErr) throw new Error(linkErr.message);
}

async function roleNamesFor(supabase, userId) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);
  if (error) return [];

  return (data || [])
    .map((row) => unwrap(row.roles)?.name)
    .filter(Boolean);
}

async function loadCandidateRow(supabase, userId) {
  const { data, error } = await supabase
    .from("candidates")
    .select("id, location, professional_summary")
    .eq("user_id", userId)
    .order("id", { ascending: true })
    .limit(1);
  if (error) return null;
  return data?.[0] ?? null;
}

async function buildSessionProfile(supabase, user) {
  const { data: appUser } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!appUser) {
    return {
      id: user.id,
      email: user.email ?? null,
      full_name: null,
      phone: null,
      profile_image_url: null,
      role: null,
      team_role: null,
      onboarding_complete: false,
    };
  }

  const names = await roleNamesFor(supabase, user.id);
  const cand = await loadCandidateRow(supabase, user.id);
  const isCandidate = names.includes("candidate") || Boolean(cand);

  let membership = null;
  let pendingJoin = null;
  try {
    membership = await getMembership(supabase, user.id);
  } catch {
    membership = null;
  }
  if (!membership) {
    try {
      pendingJoin = await getPendingJoinRequest(supabase, user.id);
    } catch {
      pendingJoin = null;
    }
  }

  const membershipRole = membership?.membership_role ?? null;
  const teamRole = membership
    ? membershipTeamRole(membershipRole)
    : pendingJoin
      ? teamFromRoleName(pendingJoin.requested_role)
      : null;

  const candidate_id = cand?.id ?? null;
  const location = cand?.location ?? null;
  const headline = cand?.professional_summary ?? null;

  const role = isCandidate
    ? "candidate"
    : membership || pendingJoin
      ? "company"
      : null;
  const onboarding_complete = isCandidate
    ? Boolean(candidate_id)
    : Boolean(membership?.company_id);

  return {
    id: appUser.id,
    email: appUser.email,
    full_name: appUser.full_name,
    phone: appUser.phone,
    profile_image_url: appUser.profile_image_url,
    role,
    team_role: teamRole,
    membership_role: membershipRole,
    candidate_id,
    location,
    headline,
    company_id: membership?.company_id ?? null,
    company_name: membership?.company_name ?? pendingJoin?.company_name ?? null,
    job_title: membershipRole
      ? membershipLabel(membershipRole)
      : teamRole
        ? teamLabel(teamRole)
        : null,
    join_request: pendingJoin,
    onboarding_complete,
  };
}

module.exports = {
  getCandidateId,
  ensureAppUser,
  assignRole,
  roleNamesFor,
  buildSessionProfile,
};
