"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  DashShell,
  IconBrief,
  IconChart,
  IconList,
  IconUsers,
} from "@/components/DashShell";
import { KeepAlive } from "@/components/KeepAlive";
import {
  createAdminUser,
  getAdminOverview,
  getAdminPermissions,
  getAdminSettings,
  listAdminCompanies,
  listAdminJobs,
  listAdminUsers,
  listAuditLogs,
  saveAdminPermissions,
  saveAdminSettings,
  updateAdminCompanyStatus,
  updateAdminJobStatus,
  updateAdminUser,
  type AdminAuditLog,
  type AdminCompany,
  type AdminJob,
  type AdminOverview,
  type AdminPermission,
  type AdminUser,
} from "@/lib/admin";

type View =
  | "overview"
  | "users"
  | "companies"
  | "jobs"
  | "audit"
  | "permissions"
  | "settings";

const STAGE_LABEL: Record<string, string> = {
  applied: "Applied",
  resume_screening: "Screening",
  shortlisted: "Shortlisted",
  technical_interview: "Technical",
  hr_interview: "HR",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l7 3v6c0 4.5-2.8 7.6-7 9-4.2-1.4-7-4.5-7-9V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCog() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconClip() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 7h11M8 12h11M8 17h7M5 7h.01M5 12h.01M5 17h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AdminPage() {
  const [view, setView] = useState<View>("overview");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const nav = [
    { label: "Overview", icon: <IconChart />, id: "overview" as View },
    { label: "Users", icon: <IconUsers />, id: "users" as View },
    { label: "Companies", icon: <IconBrief />, id: "companies" as View },
    { label: "Jobs", icon: <IconList />, id: "jobs" as View },
    { label: "Audit", icon: <IconClip />, id: "audit" as View },
    { label: "RBAC", icon: <IconShield />, id: "permissions" as View },
    { label: "Settings", icon: <IconCog />, id: "settings" as View },
  ];

  return (
    <DashShell
      role="admin"
      nav={nav.map((item) => ({
        href: "#",
        label: item.label,
        icon: item.icon,
        active: view === item.id,
        onClick: () => {
          setError("");
          setMessage("");
          setView(item.id);
        },
      }))}
    >
      <div className="mx-auto max-w-5xl">
        {error ? (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mb-4 text-sm text-brand" role="status">
            {message}
          </p>
        ) : null}

        <KeepAlive active={view === "overview"}>
          <OverviewPanel onError={setError} />
        </KeepAlive>
        <KeepAlive active={view === "users"}>
          <UsersPanel onError={setError} onMessage={setMessage} />
        </KeepAlive>
        <KeepAlive active={view === "companies"}>
          <CompaniesPanel onError={setError} onMessage={setMessage} />
        </KeepAlive>
        <KeepAlive active={view === "jobs"}>
          <JobsPanel onError={setError} onMessage={setMessage} />
        </KeepAlive>
        <KeepAlive active={view === "audit"}>
          <AuditPanel onError={setError} />
        </KeepAlive>
        <KeepAlive active={view === "permissions"}>
          <PermissionsPanel onError={setError} onMessage={setMessage} />
        </KeepAlive>
        <KeepAlive active={view === "settings"}>
          <SettingsPanel onError={setError} onMessage={setMessage} />
        </KeepAlive>
      </div>
    </DashShell>
  );
}

function OverviewPanel({ onError }: { onError: (m: string) => void }) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await getAdminOverview());
      } catch (err) {
        onError(err instanceof Error ? err.message : "Could not load analytics.");
      } finally {
        setLoading(false);
      }
    })();
  }, [onError]);

  if (loading) {
    return <p className="text-sm text-muted">Loading platform analytics…</p>;
  }
  if (!data) return null;

  const maxFunnel = Math.max(1, ...data.funnel.map((s) => s.count));
  const maxRole = Math.max(1, ...data.users_by_role.map((r) => r.count));
  const stats = [
    { label: "Users", value: data.totals.users },
    { label: "Companies", value: data.totals.companies },
    { label: "Jobs", value: data.totals.jobs },
    { label: "Applications", value: data.totals.applications },
    { label: "Offer accept %", value: `${data.offer_acceptance_rate}%` },
    { label: "Interview pass %", value: `${data.interview_success_rate}%` },
    {
      label: "Time to hire",
      value: data.time_to_hire_days != null ? `${data.time_to_hire_days}d` : "—",
    },
    { label: "Interviews", value: data.totals.interviews },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-bold">Platform overview</h2>
        <p className="mt-1 text-sm text-muted">
          Live aggregations across every company — this is the Admin wow screen.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-line bg-elevated px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {s.label}
            </p>
            <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-line bg-elevated px-5 py-5">
          <h3 className="text-sm font-semibold">Users by role</h3>
          <ul className="mt-4 space-y-3">
            {data.users_by_role.map((row) => (
              <li key={row.role}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="capitalize">{row.role.replace(/_/g, " ")}</span>
                  <span className="font-semibold text-brand">{row.count}</span>
                </div>
                <div className="h-2 bg-line">
                  <div
                    className="h-2 bg-brand"
                    style={{ width: `${(row.count / maxRole) * 100}%` }}
                  />
                </div>
              </li>
            ))}
            {!data.users_by_role.length ? (
              <p className="text-sm text-muted">No role assignments yet.</p>
            ) : null}
          </ul>
        </section>

        <section className="border border-line bg-elevated px-5 py-5">
          <h3 className="text-sm font-semibold">Hiring funnel</h3>
          <ul className="mt-4 space-y-3">
            {data.funnel.map((row) => (
              <li key={row.stage}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{STAGE_LABEL[row.stage] || row.stage}</span>
                  <span className="font-semibold text-brand">{row.count}</span>
                </div>
                <div className="h-2 bg-line">
                  <div
                    className="h-2 bg-brand"
                    style={{ width: `${(row.count / maxFunnel) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="border border-line bg-elevated">
        <div className="border-b border-line px-5 py-3">
          <h3 className="text-sm font-semibold">Company activity</h3>
        </div>
        {data.company_activity.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">No companies yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase text-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Company</th>
                  <th className="px-5 py-2 font-medium">Jobs</th>
                  <th className="px-5 py-2 font-medium">Apps</th>
                  <th className="px-5 py-2 font-medium">Hires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.company_activity.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-2.5 font-medium">{c.name}</td>
                    <td className="px-5 py-2.5">{c.jobs}</td>
                    <td className="px-5 py-2.5">{c.applications}</td>
                    <td className="px-5 py-2.5">{c.hires}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function UsersPanel({
  onError,
  onMessage,
}: {
  onError: (m: string) => void;
  onMessage: (m: string) => void;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("recruiter");

  const load = useCallback(async () => {
    try {
      const data = await listAdminUsers({ q: q || undefined });
      setUsers(data.users);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, [onError, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    onError("");
    onMessage("");
    try {
      await createAdminUser({
        email,
        password,
        full_name: fullName || undefined,
        role,
      });
      setEmail("");
      setPassword("");
      setFullName("");
      onMessage("Staff account created.");
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not create user.");
    }
  }

  async function patch(id: string, input: Parameters<typeof updateAdminUser>[1]) {
    setBusyId(id);
    onError("");
    try {
      await updateAdminUser(id, input);
      await load();
      onMessage("User updated.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update user.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Users & roles</h2>
        <p className="mt-1 text-sm text-muted">
          Admin is the only role that can create staff accounts. Candidates still
          self-register.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="grid gap-3 border border-line bg-elevated px-5 py-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <input
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          required
          type="email"
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          required
          type="password"
          minLength={8}
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm"
          placeholder="Password (8+)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <select
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="recruiter">Recruiter</option>
          <option value="hiring_manager">Hiring manager</option>
          <option value="interviewer">Interviewer</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
        >
          Create user
        </button>
      </form>

      <div className="flex gap-2">
        <input
          className="w-full max-w-sm rounded-md border border-line bg-surface px-3 py-2 text-sm"
          placeholder="Search email or name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading users…</p>
      ) : (
        <div className="overflow-x-auto border border-line bg-elevated">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Roles</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.full_name || "—"}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.roles.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{u.company_name || "—"}</td>
                  <td className="px-4 py-3 capitalize">{u.status || "active"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() =>
                          patch(u.id, {
                            status:
                              u.status === "suspended" ? "active" : "suspended",
                          })
                        }
                        className="rounded-md border border-line px-2 py-1 text-xs font-semibold hover:bg-soft"
                      >
                        {u.status === "suspended" ? "Reactivate" : "Suspend"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => patch(u.id, { force_logout: true })}
                        className="rounded-md border border-line px-2 py-1 text-xs font-semibold hover:bg-soft"
                      >
                        Force logout
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CompaniesPanel({
  onError,
  onMessage,
}: {
  onError: (m: string) => void;
  onMessage: (m: string) => void;
}) {
  const [rows, setRows] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await listAdminCompanies();
      setRows(data.companies);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not load companies.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: number, status: "approved" | "rejected" | "pending") {
    try {
      await updateAdminCompanyStatus(id, status);
      onMessage(`Company ${status}.`);
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update company.");
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading companies…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Companies</h2>
        <p className="mt-1 text-sm text-muted">
          Approve, reject, or review every tenant on the platform.
        </p>
      </div>
      <div className="overflow-x-auto border border-line bg-elevated">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Company</th>
              <th className="px-4 py-2 font-medium">Industry</th>
              <th className="px-4 py-2 font-medium">Jobs</th>
              <th className="px-4 py-2 font-medium">Members</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-muted">{c.industry || "—"}</td>
                <td className="px-4 py-3">{c.jobs_count}</td>
                <td className="px-4 py-3">{c.members_count}</td>
                <td className="px-4 py-3 capitalize">{c.status}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStatus(c.id, "approved")}
                      className="rounded-md border border-line px-2 py-1 text-xs font-semibold hover:bg-soft"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(c.id, "rejected")}
                      className="rounded-md border border-line px-2 py-1 text-xs font-semibold hover:bg-soft"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobsPanel({
  onError,
  onMessage,
}: {
  onError: (m: string) => void;
  onMessage: (m: string) => void;
}) {
  const [rows, setRows] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await listAdminJobs(status || undefined);
      setRows(data.jobs);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }, [onError, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: number, next: "published" | "closed" | "flagged") {
    try {
      await updateAdminJobStatus(id, next);
      onMessage(`Job marked ${next}.`);
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update job.");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Job oversight</h2>
        <p className="mt-1 text-sm text-muted">
          Admin does not post jobs — recruiters do. You can close or flag any
          listing.
        </p>
      </div>
      <select
        className="rounded-md border border-line bg-surface px-3 py-2 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">All statuses</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="closed">Closed</option>
        <option value="flagged">Flagged</option>
      </select>
      {loading ? (
        <p className="text-sm text-muted">Loading jobs…</p>
      ) : (
        <div className="overflow-x-auto border border-line bg-elevated">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Job</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((j) => (
                <tr key={j.id}>
                  <td className="px-4 py-3 font-medium">{j.title}</td>
                  <td className="px-4 py-3">{j.company_name || "—"}</td>
                  <td className="px-4 py-3 capitalize">{j.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => patch(j.id, "closed")}
                        className="rounded-md border border-line px-2 py-1 text-xs font-semibold hover:bg-soft"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => patch(j.id, "flagged")}
                        className="rounded-md border border-line px-2 py-1 text-xs font-semibold hover:bg-soft"
                      >
                        Flag
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AuditPanel({ onError }: { onError: (m: string) => void }) {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await listAuditLogs();
        setLogs(data.logs);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Could not load audit logs.");
      } finally {
        setLoading(false);
      }
    })();
  }, [onError]);

  if (loading) return <p className="text-sm text-muted">Loading audit trail…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Audit logs</h2>
        <p className="mt-1 text-sm text-muted">
          Who did what, when. Written on every Admin mutating request.
        </p>
      </div>
      {!logs.length ? (
        <p className="border border-line bg-elevated px-5 py-8 text-sm text-muted">
          No audit events yet. Suspend a user or close a job to generate one.
        </p>
      ) : (
        <div className="overflow-x-auto border border-line bg-elevated">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Resource</th>
                <th className="px-4 py-2 font-medium">Actor</th>
                <th className="px-4 py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{log.action}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {log.resource_type}
                    {log.resource_id ? ` #${log.resource_id}` : ""}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {log.actor_role || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{log.ip_address || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PermissionsPanel({
  onError,
  onMessage,
}: {
  onError: (m: string) => void;
  onMessage: (m: string) => void;
}) {
  const [rows, setRows] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAdminPermissions();
        setRows(data.permissions);
      } catch (err) {
        onError(
          err instanceof Error ? err.message : "Could not load permissions.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [onError]);

  const roles = useMemo(
    () => Array.from(new Set(rows.map((r) => r.role))),
    [rows],
  );
  const resources = useMemo(() => {
    const keys = Array.from(
      new Set(rows.map((r) => `${r.resource}:${r.action}`)),
    );
    return keys.sort();
  }, [rows]);

  function allowed(role: string, key: string) {
    const [resource, action] = key.split(":");
    return rows.find(
      (r) => r.role === role && r.resource === resource && r.action === action,
    )?.allowed;
  }

  function toggle(role: string, key: string) {
    const [resource, action] = key.split(":");
    setRows((prev) =>
      prev.map((r) =>
        r.role === role && r.resource === resource && r.action === action
          ? { ...r, allowed: !r.allowed }
          : r,
      ),
    );
  }

  async function save() {
    setSaving(true);
    onError("");
    try {
      await saveAdminPermissions(rows);
      onMessage("Permissions saved.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save permissions.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading RBAC matrix…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Permissions matrix</h2>
          <p className="mt-1 text-sm text-muted">
            Rows = roles, columns = resource:action. This is the demo-friendly
            proof of RBAC.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save matrix"}
        </button>
      </div>
      {!rows.length ? (
        <p className="border border-line bg-elevated px-5 py-8 text-sm text-muted">
          Run supabase/admin-platform.sql to seed the permissions table.
        </p>
      ) : (
        <div className="overflow-x-auto border border-line bg-elevated">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Role</th>
                {resources.map((key) => (
                  <th key={key} className="px-2 py-2 font-medium whitespace-nowrap">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {roles.map((role) => (
                <tr key={role}>
                  <td className="px-3 py-2 font-semibold capitalize">
                    {role.replace(/_/g, " ")}
                  </td>
                  {resources.map((key) => (
                    <td key={key} className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(allowed(role, key))}
                        onChange={() => toggle(role, key)}
                        aria-label={`${role} ${key}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SettingsPanel({
  onError,
  onMessage,
}: {
  onError: (m: string) => void;
  onMessage: (m: string) => void;
}) {
  const [templates, setTemplates] = useState("");
  const [flags, setFlags] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAdminSettings();
        setTemplates(
          JSON.stringify(data.settings.email_templates || {}, null, 2),
        );
        setFlags(JSON.stringify(data.settings.feature_flags || {}, null, 2));
      } catch (err) {
        onError(err instanceof Error ? err.message : "Could not load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [onError]);

  async function save() {
    setSaving(true);
    onError("");
    try {
      await saveAdminSettings({
        email_templates: JSON.parse(templates || "{}"),
        feature_flags: JSON.parse(flags || "{}"),
      });
      onMessage("Settings saved.");
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : "Could not save settings. Check JSON.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading settings…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Platform settings</h2>
        <p className="mt-1 text-sm text-muted">
          Email templates and feature flags. Keep secrets in backend/.env, not
          here.
        </p>
      </div>
      <label className="block text-sm font-medium">
        Email templates (JSON)
        <textarea
          className="mt-1.5 h-48 w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs"
          value={templates}
          onChange={(e) => setTemplates(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Feature flags (JSON)
        <textarea
          className="mt-1.5 h-32 w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs"
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
