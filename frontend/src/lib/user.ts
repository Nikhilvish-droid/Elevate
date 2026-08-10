export type AppRole =
  | "candidate"
  | "recruiter"
  | "hiring_manager"
  | "interviewer"
  | "admin";

/** UI role grouping used by dashboards */
export type Role = "candidate" | "company";
export type TeamRole = "recruiter" | "manager" | "interviewer";

export type AppUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  profile_image_url: string | null;
  role: Role | null;
  team_role: TeamRole | null;
  /** candidate row id when role is candidate */
  candidate_id?: number | null;
  location?: string | null;
  company_name?: string | null;
  job_title?: string | null;
  headline?: string | null;
  onboarding_complete: boolean;
};

/** @deprecated alias — dashboards still import Profile */
export type Profile = AppUser;

export function homeFor(user: Pick<AppUser, "role" | "team_role">) {
  if (user.role === "candidate") return "/candidate";
  if (user.team_role === "manager") return "/manager";
  if (user.team_role === "interviewer") return "/interviewer";
  return "/recruiter";
}

export function teamLabel(team?: TeamRole | null) {
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

export function roleNameForTeam(team: TeamRole): AppRole {
  if (team === "manager") return "hiring_manager";
  if (team === "interviewer") return "interviewer";
  return "recruiter";
}

export function teamFromRoleName(name?: string | null): TeamRole | null {
  if (name === "hiring_manager") return "manager";
  if (name === "interviewer") return "interviewer";
  if (name === "recruiter") return "recruiter";
  return null;
}
