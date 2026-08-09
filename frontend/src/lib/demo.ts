export type Role = "candidate" | "company";

export type DemoUser = {
  email: string;
  role: Role;
  name: string;
  headline?: string;
  location?: string;
  companyName?: string;
  jobTitle?: string;
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

export function homeFor(role: Role) {
  return role === "company" ? "/recruiter" : "/candidate";
}
