export type AppRole =
  | "candidate"
  | "recruiter"
  | "hiring_manager"
  | "interviewer"
  | "admin";

/** UI role grouping used by dashboards */
export type Role = "candidate" | "company";
export type TeamRole = "founder" | "recruiter" | "manager" | "interviewer";
export type MembershipRole =
  | "founder"
  | "recruiter"
  | "hiring_manager"
  | "interviewer";

export type JoinRequest = {
  id: number;
  company_id: number;
  requested_role: string;
  status: string;
  company_name: string | null;
};

export type AppUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  profile_image_url: string | null;
  role: Role | null;
  team_role: TeamRole | null;
  membership_role?: MembershipRole | null;
  /** candidate row id when role is candidate */
  candidate_id?: number | null;
  location?: string | null;
  company_id?: number | null;
  company_name?: string | null;
  job_title?: string | null;
  headline?: string | null;
  join_request?: JoinRequest | null;
  onboarding_complete: boolean;
};

/** @deprecated alias — dashboards still import Profile */
export type Profile = AppUser;

export function profileSlug(name?: string | null) {
  const slug = (name || "profile")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "profile";
}

/** Unique share URL: /u/nikhil-vishwakarma-42 — id is the candidates.id PK */
export function profilePath(
  user: Pick<AppUser, "full_name" | "candidate_id" | "id">,
) {
  if (user.candidate_id) {
    return `/u/${profileSlug(user.full_name)}-${user.candidate_id}`;
  }
  return "/onboarding";
}

export function candidateIdFromSlug(slug: string) {
  const match = String(slug).match(/-(\d+)$/);
  if (!match) return null;
  return Number(match[1]);
}

export function isOnboarded(
  user: Pick<AppUser, "role" | "team_role" | "candidate_id" | "company_id">,
) {
  if (user.candidate_id) return true;
  if (user.company_id) return true;
  if (user.role === "candidate") return Boolean(user.candidate_id);
  if (user.role === "company") return Boolean(user.company_id);
  return false;
}

/** App home after a finished onboarding — never the public /u/ profile. */
export function homeFor(
  user: Pick<
    AppUser,
    "role" | "team_role" | "membership_role" | "full_name" | "candidate_id" | "id"
  >,
) {
  if (user.role === "candidate" || user.candidate_id) return "/candidate";
  if (user.membership_role === "founder" || user.team_role === "founder") {
    return "/recruiter";
  }
  if (user.team_role === "manager") return "/manager";
  if (user.team_role === "interviewer") return "/interviewer";
  if (user.role === "company") return "/recruiter";
  return "/onboarding";
}

/** Login / OAuth landing. Incomplete users always go to onboarding. */
export function afterAuthPath(
  user: Pick<AppUser, "role" | "team_role" | "candidate_id" | "company_id">,
  next?: string | null,
) {
  if (!isOnboarded(user)) {
    if (next && next.startsWith("/onboarding")) return next;
    return "/onboarding";
  }
  return homeFor(user);
}

export function teamLabel(team?: TeamRole | null) {
  if (team === "founder") return "Founder";
  if (team === "manager") return "Hiring manager";
  if (team === "interviewer") return "Interviewer";
  return "Recruiter";
}

export function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const first_name = parts[0] || "User";
  const last_name = parts.length > 1 ? parts.slice(1).join(" ") : null;
  return { first_name, last_name };
}

export function roleNameForTeam(team: TeamRole): AppRole | "founder" {
  if (team === "founder") return "founder";
  if (team === "manager") return "hiring_manager";
  if (team === "interviewer") return "interviewer";
  return "recruiter";
}

export function teamFromRoleName(name?: string | null): TeamRole | null {
  if (name === "founder") return "founder";
  if (name === "hiring_manager") return "manager";
  if (name === "interviewer") return "interviewer";
  if (name === "recruiter") return "recruiter";
  return null;
}
