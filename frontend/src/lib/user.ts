export type Role = "candidate" | "company";
export type TeamRole = "recruiter" | "manager" | "interviewer";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role | null;
  team_role: TeamRole | null;
  company_name: string | null;
  job_title: string | null;
  headline: string | null;
  location: string | null;
  onboarding_complete: boolean;
};

export function homeFor(profile: Pick<Profile, "role" | "team_role">) {
  if (profile.role === "candidate") return "/candidate";
  if (profile.team_role === "manager") return "/manager";
  if (profile.team_role === "interviewer") return "/interviewer";
  return "/recruiter";
}

export function teamLabel(team?: TeamRole | null) {
  if (team === "manager") return "Hiring manager";
  if (team === "interviewer") return "Interviewer";
  return "Recruiter";
}
