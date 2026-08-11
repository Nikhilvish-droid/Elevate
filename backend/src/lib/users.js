const {
  unwrap,
  displayName,
  teamFromRoleName,
  teamLabel,
} = require("./helpers");

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
  const { data } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  return (data || [])
    .map((row) => unwrap(row.roles)?.name)
    .filter(Boolean);
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
  const isCandidate = names.includes("candidate");
  const teamRole =
    teamFromRoleName(
      names.find((n) =>
        ["recruiter", "hiring_manager", "interviewer"].includes(n),
      ),
    ) ?? null;

  let candidate_id = null;
  let location = null;
  let headline = null;
  let company_name = null;

  if (isCandidate) {
    const { data: cand } = await supabase
      .from("candidates")
      .select("id, location, professional_summary")
      .eq("user_id", user.id)
      .maybeSingle();
    candidate_id = cand?.id ?? null;
    location = cand?.location ?? null;
    headline = cand?.professional_summary ?? null;
  }

  if (teamRole) {
    const { data: membership } = await supabase
      .from("company_members")
      .select("companies(name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    company_name = unwrap(membership?.companies)?.name ?? null;
  }

  const role = isCandidate ? "candidate" : teamRole ? "company" : null;

  return {
    id: appUser.id,
    email: appUser.email,
    full_name: appUser.full_name,
    phone: appUser.phone,
    profile_image_url: appUser.profile_image_url,
    role,
    team_role: teamRole,
    candidate_id,
    location,
    headline,
    company_name,
    job_title: teamRole ? teamLabel(teamRole) : null,
    onboarding_complete: Boolean(role),
  };
}

module.exports = {
  getCandidateId,
  ensureAppUser,
  assignRole,
  roleNamesFor,
  buildSessionProfile,
};
