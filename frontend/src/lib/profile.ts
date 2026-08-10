import { createClient } from "@/lib/supabase/client";
import {
  type AppRole,
  type AppUser,
  type Role,
  type TeamRole,
  homeFor,
  roleNameForTeam,
  splitName,
  teamFromRoleName,
  teamLabel,
} from "@/lib/user";

export type { AppUser as Profile, Role, TeamRole } from "@/lib/user";
export { homeFor, teamLabel } from "@/lib/user";

export async function getSessionUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function ensureRoleId(name: AppRole) {
  const supabase = createClient();
  const { data: existing, error } = await supabase
    .from("roles")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (error) throw new Error(`roles: ${error.message}`);
  if (!existing?.id) {
    throw new Error(
      `Role "${name}" is missing. Insert it into public.roles in Supabase.`,
    );
  }
  return existing.id as number;
}

async function assignRole(userId: string, roleName: AppRole) {
  const supabase = createClient();
  const roleId = await ensureRoleId(roleName);
  const { error } = await supabase.from("user_roles").upsert(
    { user_id: userId, role_id: roleId },
    { onConflict: "user_id,role_id" },
  );
  if (error) throw new Error(`user_roles: ${error.message}`);
}

/** Create public.users row for the logged-in auth user if missing */
export async function ensureAppUser(fullName?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return existing;

  const name =
    fullName?.trim() ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  const { data, error } = await supabase
    .from("users")
    .insert({
      id: user.id,
      full_name: name,
      email: user.email!,
      last_login_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw new Error(`users: ${error.message}`);
  return data;
}

export async function getProfile(): Promise<AppUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role_id, roles(name)")
    .eq("user_id", user.id);

  const roleNames =
    roleRows
      ?.map((r) => {
        const roles = r.roles as { name?: string } | { name?: string }[] | null;
        if (Array.isArray(roles)) return roles[0]?.name;
        return roles?.name;
      })
      .filter(Boolean) ?? [];

  const isCandidate = roleNames.includes("candidate");
  const teamRole =
    teamFromRoleName(
      roleNames.find((n) =>
        ["recruiter", "hiring_manager", "interviewer"].includes(n as string),
      ) as string | undefined,
    ) ?? null;

  let candidate_id: number | null = null;
  let location: string | null = null;
  let headline: string | null = null;
  let company_name: string | null = null;

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
      .select("company_id, companies(name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const companies = membership?.companies as
      | { name?: string }
      | { name?: string }[]
      | null;
    company_name = Array.isArray(companies)
      ? companies[0]?.name ?? null
      : companies?.name ?? null;
  }

  const role: Role | null = isCandidate
    ? "candidate"
    : teamRole
      ? "company"
      : null;

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

export type CandidateOnboardingInput = {
  full_name: string;
  phone?: string | null;
  location?: string | null;
  education?: string | null;
  experience?: string | null;
  skills?: string | null;
  certifications?: string | null;
  portfolio?: string | null;
  github?: string | null;
  linkedin?: string | null;
  cover_letter?: string | null;
  profile_image_url?: string | null;
  resume?: {
    file_name: string;
    file_url: string;
    file_type: "pdf" | "docx";
    file_size_bytes: number;
  } | null;
};

export async function saveCandidateOnboarding(input: CandidateOnboardingInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  await ensureAppUser(input.full_name);
  await assignRole(user.id, "candidate");

  const { error: userErr } = await supabase
    .from("users")
    .update({
      full_name: input.full_name.trim(),
      phone: input.phone || null,
      profile_image_url: input.profile_image_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (userErr) throw new Error(`users update: ${userErr.message}`);

  const { first_name, last_name } = splitName(input.full_name);

  const candidatePayload = {
    user_id: user.id,
    first_name,
    last_name,
    email: user.email!,
    phone: input.phone || null,
    profile_image_url: input.profile_image_url || null,
    location: input.location || null,
    portfolio_url: input.portfolio || null,
    github_url: input.github || null,
    linkedin_url: input.linkedin || null,
    professional_summary: input.cover_letter || null,
    updated_at: new Date().toISOString(),
  };

  const { data: existingCand } = await supabase
    .from("candidates")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let candidateId: number;

  if (existingCand?.id) {
    const { data, error } = await supabase
      .from("candidates")
      .update(candidatePayload)
      .eq("id", existingCand.id)
      .select("id")
      .single();
    if (error) throw new Error(`candidates: ${error.message}`);
    candidateId = data.id;
  } else {
    const { data, error } = await supabase
      .from("candidates")
      .insert(candidatePayload)
      .select("id")
      .single();
    if (error) throw new Error(`candidates: ${error.message}`);
    candidateId = data.id;
  }

  if (input.education?.trim()) {
    await supabase.from("candidate_education").insert({
      candidate_id: candidateId,
      institution_name: input.education.trim(),
      description: input.education.trim(),
    });
  }

  if (input.experience?.trim()) {
    await supabase.from("candidate_experience").insert({
      candidate_id: candidateId,
      company_name: "Experience",
      job_title: "Professional experience",
      start_date: new Date().toISOString().slice(0, 10),
      is_current: true,
      description: input.experience.trim(),
    });
  }

  if (input.certifications?.trim()) {
    await supabase.from("candidate_certifications").insert({
      candidate_id: candidateId,
      certification_name: input.certifications.trim(),
    });
  }

  if (input.skills?.trim()) {
    const names = input.skills
      .split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const name of names) {
      const { data: skill } = await supabase
        .from("skills")
        .upsert({ name }, { onConflict: "name" })
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

  if (input.resume) {
    await supabase
      .from("resumes")
      .update({ is_primary: false })
      .eq("candidate_id", candidateId);

    const { error: resumeErr } = await supabase.from("resumes").insert({
      candidate_id: candidateId,
      file_name: input.resume.file_name,
      file_url: input.resume.file_url,
      file_type: input.resume.file_type,
      file_size_bytes: input.resume.file_size_bytes,
      is_primary: true,
      upload_status: "uploaded",
    });
    if (resumeErr) throw new Error(`resumes: ${resumeErr.message}`);
  }

  return getProfile();
}

export type CompanyOnboardingInput = {
  full_name: string;
  company_name: string;
  team_role: TeamRole;
  website?: string | null;
  industry?: string | null;
  company_size?: string | null;
  description?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  logo_url?: string | null;
  office_locations?: string | null;
};

export async function saveCompanyOnboarding(input: CompanyOnboardingInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  await ensureAppUser(input.full_name);
  await assignRole(user.id, roleNameForTeam(input.team_role));

  await supabase
    .from("users")
    .update({
      full_name: input.full_name.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .insert({
      name: input.company_name.trim(),
      website_url: input.website || null,
      industry: input.industry || null,
      company_size: input.company_size || null,
      description: input.description || null,
      linkedin_url: input.linkedin_url || null,
      twitter_url: input.twitter_url || null,
      logo_url: input.logo_url || null,
    })
    .select("id")
    .single();

  if (companyErr) throw new Error(`companies: ${companyErr.message}`);

  const { error: memberErr } = await supabase.from("company_members").insert({
    company_id: company.id,
    user_id: user.id,
  });
  if (memberErr) throw new Error(`company_members: ${memberErr.message}`);

  if (input.office_locations?.trim()) {
    await supabase.from("company_locations").insert({
      company_id: company.id,
      city: input.office_locations.trim(),
      is_headquarters: true,
    });
  }

  if (input.team_role === "interviewer") {
    await supabase.from("interviewers").insert({
      user_id: user.id,
      company_id: company.id,
      designation: "Interviewer",
    });
  }

  return getProfile();
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
