import { createClient } from "@/lib/supabase/client";
import type { Profile, Role, TeamRole } from "@/lib/user";

export type { Profile, Role, TeamRole } from "@/lib/user";
export { homeFor, teamLabel } from "@/lib/user";

export async function getSessionUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getProfile:", error.message);
    return null;
  }

  return data as Profile | null;
}

type ProfileUpdate = {
  email?: string | null;
  full_name?: string | null;
  role?: Role | null;
  team_role?: TeamRole | null;
  company_name?: string | null;
  job_title?: string | null;
  headline?: string | null;
  location?: string | null;
  skills?: string | null;
  about?: string | null;
  website?: string | null;
  industry?: string | null;
  company_size?: string | null;
  onboarding_complete?: boolean;
};

export async function updateProfile(patch: ProfileUpdate) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        ...patch,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Profile;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
