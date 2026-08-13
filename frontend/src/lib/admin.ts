import { api } from "@/lib/api";

export type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  status: string;
  last_login_at: string | null;
  roles: string[];
  company_id: number | null;
  company_name: string | null;
  membership_role: string | null;
};

export type AdminCompany = {
  id: number;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  industry: string | null;
  company_size: string | null;
  status: string;
  jobs_count: number;
  members_count: number;
};

export type AdminJob = {
  id: number;
  title: string;
  status: string;
  location: string | null;
  company_id: number;
  company_name: string | null;
  created_at: string | null;
};

export type AdminAuditLog = {
  id: number;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

export type AdminPermission = {
  id?: number;
  role: string;
  resource: string;
  action: string;
  allowed: boolean;
};

export type AdminOverview = {
  totals: {
    users: number;
    companies: number;
    jobs: number;
    applications: number;
    offers: number;
    interviews: number;
  };
  users_by_role: { role: string; count: number }[];
  funnel: { stage: string; count: number }[];
  offer_acceptance_rate: number;
  time_to_hire_days: number | null;
  monthly_hiring: { month: string; applications: number; hires: number }[];
  company_activity: {
    id: number;
    name: string;
    jobs: number;
    applications: number;
    hires: number;
  }[];
  interview_success_rate: number;
  audit_volume: { day: string; count: number }[];
};

export async function listAdminUsers(params?: {
  q?: string;
  role?: string;
  status?: string;
}) {
  const q = new URLSearchParams();
  if (params?.q) q.set("q", params.q);
  if (params?.role) q.set("role", params.role);
  if (params?.status) q.set("status", params.status);
  const suffix = q.toString() ? `?${q}` : "";
  return api<{ users: AdminUser[]; total: number }>(`/api/admin/users${suffix}`);
}

export async function createAdminUser(input: {
  email: string;
  password: string;
  full_name?: string;
  role: string;
  company_id?: number | null;
}) {
  return api<{ id: string; email: string; role: string }>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateAdminUser(
  id: string,
  input: {
    status?: "active" | "suspended";
    role?: string;
    force_logout?: boolean;
    full_name?: string;
  },
) {
  return api<{ ok: boolean; roles?: string[] }>(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function listAdminCompanies(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return api<{ companies: AdminCompany[]; total: number }>(
    `/api/admin/companies${q}`,
  );
}

export async function updateAdminCompanyStatus(
  id: number,
  status: "pending" | "approved" | "rejected",
) {
  return api<{ id: number; status: string }>(`/api/admin/companies/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function listAdminJobs(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return api<{ jobs: AdminJob[]; total: number }>(`/api/admin/jobs${q}`);
}

export async function updateAdminJobStatus(
  id: number,
  status: "draft" | "published" | "closed" | "flagged",
) {
  return api<{ id: number; status: string }>(`/api/admin/jobs/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getAdminOverview() {
  return api<AdminOverview>("/api/admin/analytics/overview");
}

export async function listAuditLogs() {
  return api<{ logs: AdminAuditLog[]; total: number }>("/api/admin/audit-logs");
}

export async function getAdminSettings() {
  return api<{ settings: Record<string, unknown> }>("/api/admin/settings");
}

export async function saveAdminSettings(settings: Record<string, unknown>) {
  return api<{ ok: boolean }>("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ settings }),
  });
}

export async function getAdminPermissions() {
  return api<{ permissions: AdminPermission[] }>("/api/admin/permissions");
}

export async function saveAdminPermissions(permissions: AdminPermission[]) {
  return api<{ ok: boolean }>("/api/admin/permissions", {
    method: "PUT",
    body: JSON.stringify({ permissions }),
  });
}
