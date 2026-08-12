import { api } from "@/lib/api";
import { setProfileCache, type Profile } from "@/lib/profile";
import { roleNameForTeam, type TeamRole } from "@/lib/user";

export type CompanyHit = {
  id: number;
  name: string;
  logo_url: string | null;
  industry: string | null;
  website_url: string | null;
};

export type JoinRequestRow = {
  id: number;
  company_id: number;
  requested_role: string;
  status: string;
  created_at?: string;
  company_name: string | null;
};

export type TeamMember = {
  user_id: string;
  role: string;
  label: string;
  full_name: string;
  email: string | null;
  profile_image_url: string | null;
};

export type PendingJoin = {
  id: number;
  user_id: string;
  requested_role: string;
  role_label: string;
  full_name: string;
  email: string | null;
  profile_image_url: string | null;
  created_at: string;
};

export type CompanyTeam = {
  company_id: number;
  company_name: string | null;
  is_founder: boolean;
  groups: {
    founder: TeamMember[];
    recruiter: TeamMember[];
    hiring_manager: TeamMember[];
    interviewer: TeamMember[];
  };
  pending: PendingJoin[];
};

export async function searchCompanies(q: string) {
  if (q.trim().length < 2) return [];
  return api<CompanyHit[]>(`/api/companies?q=${encodeURIComponent(q.trim())}`);
}

export async function requestToJoinCompany(
  companyId: number,
  teamRole: Exclude<TeamRole, "founder">,
  details?: {
    full_name?: string;
    phone?: string | null;
    profile_image_url?: string | null;
  },
) {
  const requested_role = roleNameForTeam(teamRole);
  return api<JoinRequestRow>("/api/company-requests", {
    method: "POST",
    body: JSON.stringify({
      company_id: companyId,
      requested_role,
      full_name: details?.full_name || undefined,
      phone: details?.phone || undefined,
      profile_image_url: details?.profile_image_url || undefined,
    }),
  });
}

export async function myJoinRequests() {
  return api<JoinRequestRow[]>("/api/company-requests/mine");
}

export async function getCompanyTeam() {
  return api<CompanyTeam>("/api/company/members");
}

export async function reviewJoinRequest(
  id: number,
  action: "approve" | "reject",
) {
  return api<{ ok: boolean; status: string }>(`/api/company-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
}

export type CompanyProfile = {
  id: number;
  name: string;
  website_url: string | null;
  industry: string | null;
  company_size: string | null;
  description: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  logo_url: string | null;
  created_at?: string;
};

export type CompanyLocation = {
  id: number;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  is_headquarters: boolean;
};

export type CompanyWorkspace = {
  is_founder: boolean;
  can_edit_company: boolean;
  can_manage_jobs: boolean;
  membership_role: string | null;
  company: CompanyProfile;
  locations: CompanyLocation[];
  me: {
    id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    profile_image_url: string | null;
    job_title: string | null;
    team_role: string | null;
  };
};

export async function getCompanyWorkspace() {
  return api<CompanyWorkspace>("/api/company/profile");
}

export async function updateCompanyProfile(input: {
  name?: string;
  website_url?: string | null;
  industry?: string | null;
  company_size?: string | null;
  description?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  github_url?: string | null;
  logo_url?: string | null;
  location?: {
    address_line?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postal_code?: string | null;
  };
}) {
  return api<{ company: CompanyProfile; locations: CompanyLocation[] }>(
    "/api/company/profile",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function updateCompanyMemberProfile(input: {
  full_name?: string;
  phone?: string | null;
  profile_image_url?: string | null;
}) {
  const profile = await api<Profile>("/api/company/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  setProfileCache(profile);
  return profile;
}

export type DashboardWidgets = {
  total_jobs: number;
  open_jobs: number;
  active_candidates: number;
  todays_interviews: number;
  pending_reviews: number;
  offer_acceptance_rate: number;
  candidate_conversion_rate: number;
};

export type HiringFunnelStage = {
  key: string;
  label: string;
  count: number;
};

export type MonthlyHiring = {
  key: string;
  label: string;
  applications: number;
  hires: number;
};

export type RecentActivity = {
  id: string;
  type: string;
  title: string;
  detail: string;
  at: string;
};

export type CompanyDashboard = {
  widgets: DashboardWidgets;
  hiring_funnel: HiringFunnelStage[];
  monthly_hiring: MonthlyHiring[];
  recent_activity: RecentActivity[];
};

export async function getCompanyDashboard() {
  return api<CompanyDashboard>("/api/company/dashboard");
}

export type PlatformCandidate = {
  id: number;
  full_name: string;
  profile_image_url: string | null;
  expertise: string;
  location: string | null;
  total_experience_years: number | null;
  skills: string[];
  open_to_roles: string[];
  headline: string | null;
  details: string;
  updated_at: string | null;
};

export async function listPlatformCandidates(limit = 40) {
  const data = await api<{ candidates: PlatformCandidate[] }>(
    `/api/company/candidates?limit=${limit}`,
  );
  return data.candidates;
}

export async function refreshSession(): Promise<Profile> {
  const profile = await api<Profile>("/api/me");
  setProfileCache(profile);
  return profile;
}
