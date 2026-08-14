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
import { KeepAlive } from "@/components/KeepAlive";
import { AppsPanel } from "@/components/company/AppsPanel";
import { CompanyDashboardPanel } from "@/components/company/CompanyDashboard";
import { CompanyInboxNote } from "@/components/company/CompanyInboxNote";
import { HomeCandidatesPanel } from "@/components/company/HomeCandidatesPanel";
import {
  EmailPanel,
  InterviewPanel,
} from "@/components/company/InterviewEmailPanels";
import { JobsPanel } from "@/components/company/JobsPanel";
import { OffersPanel, ShortlistPanel } from "@/components/company/OffersPanel";
import { ProfilesPanel } from "@/components/company/ProfilesPanel";
import {
  getCompanyTeam,
  getCompanyWorkspace,
  reviewJoinRequest,
  type CompanyTeam,
  type CompanyWorkspace,
} from "@/lib/company";
import { getPresence, setPresence, type PresenceStatus } from "@/lib/presence";
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
  const [team, setTeam] = useState<CompanyTeam | null>(null);
  const [teamError, setTeamError] = useState("");
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [openJobCreate, setOpenJobCreate] = useState(false);
  const [hiringActive, setHiringActive] = useState(true);
  const [emailApplicationId, setEmailApplicationId] = useState<number | null>(
    null,
  );

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
    getProfile().then((profile) => {
      setLocal(profile);
      if (profile?.id) {
        setHiringActive(getPresence(profile.id) === "active");
      }
    });
    loadTeam();
    loadWorkspace();
  }, [loadTeam, loadWorkspace]);

  useEffect(() => {
    if (!user?.id) return;
    const sync = () => setHiringActive(getPresence(user.id) === "active");
    window.addEventListener("elevate-presence", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("elevate-presence", sync);
      window.removeEventListener("storage", sync);
    };
  }, [user?.id]);

  const company =
    workspace?.company.name || user?.company_name || "Your company";
  const name = user?.full_name || workspace?.me.full_name || "Recruiter";
  const title = user?.job_title || "Recruiter";
  const canManageJobs = workspace?.can_manage_jobs ?? false;
  const isFounder = workspace?.is_founder ?? false;
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
    { label: "Apps", icon: <IconList />, id: "apps" as View },
    { label: "Shortlist", icon: <IconStar />, id: "shortlist" as View },
    { label: "Interview", icon: <IconCal />, id: "interviews" as View },
    { label: "Email", icon: <IconMsg />, id: "email" as View },
    { label: "Offers", icon: <IconOffer />, id: "offers" as View },
    ...(isFounder
      ? [
          { label: "Profiles", icon: <IconUser />, id: "profiles" as View },
          { label: "Team", icon: <IconUsers />, id: "team" as View },
        ]
      : []),
  ];

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
        onClick: () => {
          if (item.id === "email") setEmailApplicationId(null);
          setView(item.id);
        },
      }))}
    >
      <div className="mx-auto max-w-3xl">
        <KeepAlive active={view === "home"}>
          <ProfileCard
            company={company}
            name={name}
            title={title}
            logoUrl={workspace?.company.logo_url}
            canPost={canManageJobs}
            isFounder={isFounder}
            hiringActive={hiringActive}
            onToggleHiring={() => {
              if (!user?.id) return;
              const next: PresenceStatus = hiringActive ? "away" : "active";
              setPresence(user.id, next);
              setHiringActive(next === "active");
            }}
            onPost={goPostJob}
            onTeam={() => setView("team")}
            onProfiles={() => setView("profiles")}
            onDashboard={() => setView("dashboard")}
          />
          <CompanyInboxNote />
          <HomeCandidatesPanel />
        </KeepAlive>

        <KeepAlive active={view === "dashboard"}>
          <CompanyDashboardPanel />
        </KeepAlive>

        <KeepAlive active={view === "jobs"}>
          <JobsPanel
            canManage={canManageJobs}
            companyName={company}
            companyDetailsDefault={companyDetailsDefault}
            openCreate={openJobCreate}
            onCreateHandled={() => setOpenJobCreate(false)}
          />
        </KeepAlive>

        <KeepAlive active={view === "profiles"}>
          <ProfilesPanel
            onProfileUpdated={(profile) => {
              setLocal(profile);
              loadWorkspace();
            }}
          />
        </KeepAlive>

        <KeepAlive active={view === "apps"}>
          <AppsPanel
            onSchedule={() => setView("interviews")}
            onEmail={(applicationId) => {
              setEmailApplicationId(applicationId ?? null);
              setView("email");
            }}
          />
        </KeepAlive>

        <KeepAlive active={view === "shortlist"}>
          <ShortlistPanel
            onSchedule={() => setView("interviews")}
            onEmail={(applicationId) => {
              setEmailApplicationId(applicationId ?? null);
              setView("email");
            }}
            onOffer={() => setView("offers")}
          />
        </KeepAlive>

        <KeepAlive active={view === "interviews"}>
          <InterviewPanel />
        </KeepAlive>

        <KeepAlive active={view === "email"}>
          <EmailPanel initialApplicationId={emailApplicationId} />
        </KeepAlive>

        <KeepAlive active={view === "team"}>
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
        </KeepAlive>

        <KeepAlive active={view === "offers"}>
          <OffersPanel isFounder={isFounder} />
        </KeepAlive>
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
  isFounder,
  hiringActive,
  onToggleHiring,
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
  isFounder: boolean;
  hiringActive: boolean;
  onToggleHiring: () => void;
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
          {isFounder ? (
            <>
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
            </>
          ) : null}
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
          onClick={onToggleHiring}
          className="mt-2 inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm hover:bg-soft"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              hiringActive ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          {hiringActive ? "Actively hiring" : "Hiring paused"}
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
