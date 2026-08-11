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

export async function refreshSession(): Promise<Profile> {
  const profile = await api<Profile>("/api/me");
  setProfileCache(profile);
  return profile;
}
