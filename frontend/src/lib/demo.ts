export type Role = "candidate" | "company";
export type TeamRole = "recruiter" | "manager" | "interviewer";

export type DemoUser = {
  email: string;
  role: Role;
  name: string;
  headline?: string;
  location?: string;
  companyName?: string;
  jobTitle?: string;
  teamRole?: TeamRole;
};

const KEY = "elevate-demo-user";

export function getUser(): DemoUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DemoUser) : null;
  } catch {
    return null;
  }
}

export function setUser(user: DemoUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(KEY);
}

export function homeFor(user: Pick<DemoUser, "role" | "teamRole"> | Role) {
  if (typeof user === "string") {
    return user === "company" ? "/recruiter" : "/candidate";
  }
  if (user.role === "candidate") return "/candidate";
  if (user.teamRole === "manager") return "/manager";
  if (user.teamRole === "interviewer") return "/interviewer";
  return "/recruiter";
}

export function teamLabel(team?: TeamRole) {
  if (team === "manager") return "Hiring manager";
  if (team === "interviewer") return "Interviewer";
  return "Recruiter";
}
