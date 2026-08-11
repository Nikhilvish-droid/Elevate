import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import {
  type AppUser,
  type Role,
  type TeamRole,
  homeFor,
} from "@/lib/user";

export type { AppUser as Profile, Role, TeamRole } from "@/lib/user";
export {
  candidateIdFromSlug,
  homeFor,
  profilePath,
  profileSlug,
  teamLabel,
} from "@/lib/user";

export async function getSessionUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<AppUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return api<AppUser>("/api/me");
}

export async function syncAuthUser(): Promise<AppUser> {
  return api<AppUser>("/api/auth/sync", { method: "POST" });
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
  return api<AppUser>("/api/onboarding/candidate", {
    method: "POST",
    body: JSON.stringify(input),
  });
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
  return api<AppUser>("/api/onboarding/company", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
