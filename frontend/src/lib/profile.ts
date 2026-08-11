import { api } from "@/lib/api";
import { clearTokenCache } from "@/lib/auth/jwt";
import { createClient } from "@/lib/supabase/client";
import {
  type AppUser,
  type Role,
  type TeamRole,
  homeFor,
} from "@/lib/user";

export type { AppUser as Profile, Role, TeamRole } from "@/lib/user";
export {
  afterAuthPath,
  candidateIdFromSlug,
  homeFor,
  isOnboarded,
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

let profileCache: AppUser | null | undefined;
let profileInflight: Promise<AppUser | null> | null = null;

export function peekProfile() {
  return profileCache;
}

export function setProfileCache(profile: AppUser | null) {
  profileCache = profile ?? undefined;
}

export function clearProfileCache() {
  profileCache = undefined;
  profileInflight = null;
}

export async function getProfile(): Promise<AppUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (profileCache?.id === user.id) return profileCache;
  if (profileInflight) return profileInflight;

  profileInflight = api<AppUser>("/api/me")
    .then((profile) => {
      profileCache = profile;
      return profile;
    })
    .finally(() => {
      profileInflight = null;
    });

  return profileInflight;
}

export async function syncAuthUser(): Promise<AppUser> {
  const profile = await api<AppUser>("/api/auth/sync", { method: "POST" });
  setProfileCache(profile);
  return profile;
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
  const profile = await api<AppUser>("/api/onboarding/candidate", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setProfileCache(profile);
  return profile;
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
  const profile = await api<AppUser>("/api/onboarding/company", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setProfileCache(profile);
  return profile;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  clearProfileCache();
  clearTokenCache();
}
