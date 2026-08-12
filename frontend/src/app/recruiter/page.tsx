"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DashShell,
  IconBrief,
  IconCal,
  IconHome,
  IconList,
  IconMsg,
  IconOffer,
  IconStar,
  IconUsers,
} from "@/components/DashShell";
import { CompanyDashboardPanel } from "@/components/company/CompanyDashboard";
import { HomeCandidatesPanel } from "@/components/company/HomeCandidatesPanel";
import { JobsPanel } from "@/components/company/JobsPanel";
import { ProfilesPanel } from "@/components/company/ProfilesPanel";
import { applicants } from "@/data/mock";
import {
  getCompanyTeam,
  getCompanyWorkspace,
  reviewJoinRequest,
  type CompanyTeam,
  type CompanyWorkspace,
} from "@/lib/company";
import { Profile, getProfile } from "@/lib/profile";

type View =
  | "home"
  | "dashboard"
  | "jobs"
  | "profiles"
  | "apps"
  | "shortlist"
  | "interviews"
  | "email"
  | "offers"
  | "team";

function IconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19V5M4 19h16M8 17V11M12 17V7M16 17v-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function RecruiterPage() {
  const [user, setLocal] = useState<Profile | null>(null);
  const [workspace, setWorkspace] = useState<CompanyWorkspace | null>(null);
  const [view, setView] = useState<View>("home");
  const [shortlisted, setShortlisted] = useState<string[]>(["a3", "a4"]);
  const [team, setTeam] = useState<CompanyTeam | null>(null);
  const [teamError, setTeamError] = useState("");
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [openJobCreate, setOpenJobCreate] = useState(false);

  const loadTeam = useCallback(async () => {
    try {
      setTeamError("");
      setTeam(await getCompanyTeam());
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Could not load team.");
    }
  }, []);

  const loadWorkspace = useCallback(async () => {
    try {
      setWorkspace(await getCompanyWorkspace());
    } catch {
      setWorkspace(null);
    }
  }, []);

  useEffect(() => {
    getProfile().then(setLocal);
    loadTeam();
    loadWorkspace();
  }, [loadTeam, loadWorkspace]);

  const company =
    workspace?.company.name || user?.company_name || "Your company";
  const name = user?.full_name || workspace?.me.full_name || "Recruiter";
  const title = user?.job_title || "Recruiter";
  const isFounder =
    workspace?.is_founder ||
    user?.membership_role === "founder" ||
    user?.team_role === "founder";
  const canManageJobs = workspace?.can_manage_jobs ?? true;
  const companyDetailsDefault = [
    workspace?.company.name,
    workspace?.company.industry,
    workspace?.company.description,
  ]
    .filter(Boolean)
    .join(" — ");

  const nav = [
    { label: "Home", icon: <IconHome />, id: "home" as View },
    { label: "Dashboard", icon: <IconChart />, id: "dashboard" as View },
    { label: "Jobs", icon: <IconBrief />, id: "jobs" as View },
    { label: "Profiles", icon: <IconUser />, id: "profiles" as View },
    { label: "Apps", icon: <IconList />, id: "apps" as View },
    { label: "Shortlist", icon: <IconStar />, id: "shortlist" as View },
    { label: "Interview", icon: <IconCal />, id: "interviews" as View },
    { label: "Email", icon: <IconMsg />, id: "email" as View },
    { label: "Offers", icon: <IconOffer />, id: "offers" as View },
    { label: "Team", icon: <IconUsers />, id: "team" as View },
  ];

  function toggleShortlist(id: string) {
    setShortlisted((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function goPostJob() {
    setOpenJobCreate(true);
    setView("jobs");
  }

  return (
    <DashShell
      role="company"
      teamRole="recruiter"
      nav={nav.map((item) => ({
        href: "#",
        label: item.label,
        icon: item.icon,
        active: view === item.id,
        onClick: () => setView(item.id),
      }))}
    >
      <div className="mx-auto max-w-3xl">
        {view === "home" ? (
          <>
            <ProfileCard
              company={company}
              name={name}
              title={title}
              logoUrl={workspace?.company.logo_url}
              canPost={canManageJobs}
              onPost={goPostJob}
              onTeam={() => setView("team")}
              onProfiles={() => setView("profiles")}
              onDashboard={() => setView("dashboard")}
            />
            <HomeCandidatesPanel />
          </>
        ) : null}

        {view === "dashboard" ? <CompanyDashboardPanel /> : null}

        {view === "jobs" ? (
          <JobsPanel
            canManage={canManageJobs}
            companyName={company}
            companyDetailsDefault={companyDetailsDefault}
            openCreate={openJobCreate}
            onCreateHandled={() => setOpenJobCreate(false)}
          />
        ) : null}

        {view === "profiles" ? (
          <ProfilesPanel
            onProfileUpdated={(profile) => {
              setLocal(profile);
              loadWorkspace();
            }}
          />
        ) : null}

        {view === "apps" ? (
          <Panel title="Applications" sub="Everyone who applied to your jobs.">
            <CandidateList
              rows={applicants}
              shortlisted={shortlisted}
              onShortlist={toggleShortlist}
              onSchedule={() => setView("interviews")}
              onEmail={() => setView("email")}
            />
          </Panel>
        ) : null}

        {view === "shortlist" ? (
          <Panel title="Shortlist" sub="Candidates ready for hiring manager review.">
            <CandidateList
              rows={applicants.filter((a) => shortlisted.includes(a.id))}
              shortlisted={shortlisted}
              onShortlist={toggleShortlist}
              onSchedule={() => setView("interviews")}
              onEmail={() => setView("email")}
            />
          </Panel>
        ) : null}

        {view === "interviews" ? (
          <Panel title="Schedule interviews" sub="Book a round and notify the candidate.">
            <SimpleForm
              fields={[
                {
                  label: "Candidate",
                  type: "select",
                  options: applicants.map((a) => a.name),
                },
                { label: "Date & time", type: "datetime" },
              ]}
              cta="Schedule"
            />
          </Panel>
        ) : null}

        {view === "email" ? (
          <Panel title="Send email" sub="Message an applicant.">
            <SimpleForm
              fields={[
                {
                  label: "To",
                  type: "select",
                  options: applicants.map((a) => a.name),
                },
                {
                  label: "Subject",
                  type: "text",
                  value: "Next steps for your application",
                },
                {
                  label: "Message",
                  type: "area",
                  value: "Hi — thanks for applying. We'd like to move forward…",
                },
              ]}
              cta="Send"
            />
          </Panel>
        ) : null}

        {view === "team" ? (
          <TeamPanel
            team={team}
            error={teamError}
            reviewing={reviewing}
            onReview={async (id, action) => {
              setReviewing(id);
              try {
                await reviewJoinRequest(id, action);
                await loadTeam();
              } catch (err) {
                setTeamError(
                  err instanceof Error
                    ? err.message
                    : "Could not update request.",
                );
              } finally {
                setReviewing(null);
              }
            }}
          />
        ) : null}

        {view === "offers" ? (
          <Panel
            title="Offer letters"
            sub={
              isFounder
                ? "Generate an offer for a shortlisted candidate."
                : "Generate an offer. Company settings stay with the founder."
            }
          >
            <SimpleForm
              fields={[
                {
                  label: "Candidate",
                  type: "select",
                  options: applicants.map((a) => a.name),
                },
                { label: "Role", type: "text", value: "Full Stack Developer" },
                { label: "CTC", type: "text", value: "₹18L" },
              ]}
              cta="Generate offer"
            />
          </Panel>
        ) : null}
      </div>
    </DashShell>
  );
}

function ProfileCard({
  company,
  name,
  title,
  logoUrl,
  canPost,
  onPost,
  onTeam,
  onProfiles,
  onDashboard,
}: {
  company: string;
  name: string;
  title: string;
  logoUrl?: string | null;
  canPost: boolean;
  onPost: () => void;
  onTeam: () => void;
  onProfiles: () => void;
  onDashboard: () => void;
}) {
  return (
    <section className="border border-line bg-elevated px-5 py-6 sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-soft text-xl font-bold text-brand">
              {company.slice(0, 1)}
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {company}
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {name} · {title}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onDashboard}
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold hover:bg-soft"
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={onProfiles}
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold hover:bg-soft"
          >
            Profiles
          </button>
          <button
            type="button"
            onClick={onTeam}
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold hover:bg-soft"
          >
            Team
          </button>
          {canPost ? (
            <button
              type="button"
              onClick={onPost}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
            >
              Post a job
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-6 border-t border-line pt-5">
        <p className="text-sm font-medium">Hiring status</p>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Actively hiring
        </button>
      </div>
    </section>
  );
}

function TeamPanel({
  team,
  error,
  reviewing,
  onReview,
}: {
  team: CompanyTeam | null;
  error: string;
  reviewing: number | null;
  onReview: (id: number, action: "approve" | "reject") => void;
}) {
  const groups: { key: keyof CompanyTeam["groups"]; title: string }[] = [
    { key: "founder", title: "Founder" },
    { key: "recruiter", title: "Recruiters" },
    { key: "hiring_manager", title: "Hiring managers" },
    { key: "interviewer", title: "Interviewers" },
  ];

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold">Team</h2>
        <p className="mt-1 text-sm text-muted">
          Everyone here belongs to {team?.company_name ?? "this company"} only.
          {team?.is_founder ? " Approve join requests to grant access." : ""}
        </p>
      </div>
      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {!team ? (
        <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
          Loading team…
        </p>
      ) : (
        <div className="space-y-5">
          {team.is_founder ? (
            <div className="border border-line bg-elevated">
              <div className="border-b border-line px-5 py-3">
                <p className="text-sm font-semibold">Pending requests</p>
              </div>
              {team.pending.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted">
                  No one is waiting to join.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {team.pending.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                    >
                      <div>
                        <p className="font-semibold">{row.full_name}</p>
                        <p className="text-sm text-muted">
                          {row.role_label}
                          {row.email ? ` · ${row.email}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={reviewing === row.id}
                          onClick={() => onReview(row.id, "reject")}
                          className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-soft"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={reviewing === row.id}
                          onClick={() => onReview(row.id, "approve")}
                          className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep"
                        >
                          {reviewing === row.id ? "Saving…" : "Approve"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {groups.map((group) => {
            const members = team.groups[group.key] || [];
            return (
              <div key={group.key} className="border border-line bg-elevated">
                <div className="border-b border-line px-5 py-3">
                  <p className="text-sm font-semibold">
                    {group.title}
                    <span className="ml-2 font-normal text-muted">
                      {members.length}
                    </span>
                  </p>
                </div>
                {members.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-muted">None yet.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {members.map((member) => (
                      <li
                        key={member.user_id}
                        className="flex items-center gap-3 px-5 py-4"
                      >
                        {member.profile_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.profile_image_url}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
                            {member.full_name.slice(0, 1)}
                          </span>
                        )}
                        <div>
                          <p className="font-semibold">{member.full_name}</p>
                          <p className="text-sm text-muted">
                            {member.label}
                            {member.email ? ` · ${member.email}` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Panel({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{sub}</p>
      </div>
      {children}
    </section>
  );
}

function SimpleForm({
  fields,
  cta,
}: {
  fields: {
    label: string;
    type: "text" | "area" | "select" | "datetime";
    options?: string[];
    value?: string;
  }[];
  cta: string;
}) {
  return (
    <div className="border border-line bg-elevated px-5 py-6">
      {fields.map((f) => (
        <label key={f.label} className="mt-4 block text-sm font-medium first:mt-0">
          {f.label}
          {f.type === "select" ? (
            <select className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm">
              {f.options?.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : null}
          {f.type === "text" ? (
            <input
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
              defaultValue={f.value}
            />
          ) : null}
          {f.type === "datetime" ? (
            <input
              type="datetime-local"
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
            />
          ) : null}
          {f.type === "area" ? (
            <textarea
              rows={5}
              className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
              defaultValue={f.value}
            />
          ) : null}
        </label>
      ))}
      <button
        type="button"
        className="mt-5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
      >
        {cta}
      </button>
    </div>
  );
}

function CandidateList({
  rows,
  shortlisted,
  onShortlist,
  onSchedule,
  onEmail,
}: {
  rows: typeof applicants;
  shortlisted: string[];
  onShortlist: (id: string) => void;
  onSchedule: () => void;
  onEmail: () => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        No candidates here yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line border border-line bg-elevated">
      {rows.map((person) => (
        <li
          key={person.id}
          className="flex flex-wrap items-start justify-between gap-4 px-5 py-5"
        >
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
              {person.name.slice(0, 1)}
            </div>
            <div>
              <p className="font-semibold">{person.name}</p>
              <p className="text-sm text-muted">
                {person.role} · {person.job}
              </p>
              <p className="mt-1 text-sm text-muted">{person.location}</p>
              <p className="mt-1 text-xs text-muted">
                {person.stage} · Applied {person.applied}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onShortlist(person.id)}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                >
                  {shortlisted.includes(person.id) ? "Shortlisted" : "Shortlist"}
                </button>
                <button
                  type="button"
                  onClick={onSchedule}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                >
                  Interview
                </button>
                <button
                  type="button"
                  onClick={onEmail}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                >
                  Email
                </button>
              </div>
            </div>
          </div>
          <span className="text-sm font-semibold text-brand">
            {person.match}% match
          </span>
        </li>
      ))}
    </ul>
  );
}
