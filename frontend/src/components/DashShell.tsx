"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  Profile,
  TeamRole,
  getProfile,
  getSessionUser,
  homeFor,
  isOnboarded,
  peekProfile,
  signOut,
  teamLabel,
} from "@/lib/profile";
import { ThemeToggle } from "@/lib/theme";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  active?: boolean;
};

export function DashShell({
  role,
  teamRole,
  nav,
  children,
}: {
  role: "candidate" | "company";
  teamRole?: TeamRole;
  nav: NavItem[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [user, setLocal] = useState<Profile | null>(() => peekProfile() ?? null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sessionUser = await getSessionUser();
      if (!sessionUser) {
        router.replace("/auth?tab=login");
        return;
      }
      const profile = await getProfile();
      if (cancelled) return;

      if (role === "candidate") {
        if (!profile) {
          router.replace("/auth?tab=login");
          return;
        }
        if (profile.candidate_id || (isOnboarded(profile) && profile.role === "candidate")) {
          setLocal(profile);
          return;
        }
        router.replace("/onboarding?hint=candidate");
        return;
      }

      if (!profile || !isOnboarded(profile) || !profile.company_id) {
        router.replace("/onboarding?hint=company");
        return;
      }

      const actual = profile.team_role;
      if (teamRole && actual && actual !== teamRole) {
        const allowed =
          (teamRole === "recruiter" &&
            (actual === "recruiter" || actual === "founder")) ||
          actual === teamRole;
        if (!allowed) {
          router.replace(homeFor(profile));
          return;
        }
      }

      setLocal(profile);
    })();
    return () => {
      cancelled = true;
    };
  }, [role, teamRole, router]);

  useEffect(() => {
    if (role !== "candidate" || !user?.full_name) return;
    const previous = document.title;
    document.title = `${user.full_name} · Elevate`;
    return () => {
      document.title = previous;
    };
  }, [role, user?.full_name]);

  async function logout() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  const display =
    user.full_name ||
    (role === "company" ? user.company_name : null) ||
    user.email ||
    "User";

  const badge =
    role === "candidate"
      ? display
      : `${user.company_name ?? "Company"} · ${teamLabel(user.team_role ?? teamRole)}`;

  const navClass = (active?: boolean) =>
    `flex flex-col items-center gap-1 rounded-md px-2 py-2.5 text-[10px] font-medium hover:bg-soft hover:text-ink ${
      active ? "bg-soft text-ink" : "text-muted"
    }`;

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="sticky top-0 flex h-screen w-[4.5rem] shrink-0 flex-col items-center border-r border-line bg-elevated py-4 sm:w-20">
        <Link
          href={homeFor(user)}
          className="mb-6 flex h-9 w-9 items-center justify-center rounded-md bg-brand text-sm font-bold text-white"
          aria-label="Home"
        >
          E
        </Link>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {nav.map((item) =>
            item.onClick ? (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={navClass(item.active)}
              >
                {item.icon}
                {item.label}
              </button>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                prefetch
                className={navClass(item.active)}
              >
                {item.icon}
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-line bg-elevated px-4 sm:px-6">
          <p className="truncate text-sm font-semibold">{badge}</p>
          <div className="relative flex items-center gap-3">
            <ThemeToggle className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-soft hover:text-ink" />
            <button
              type="button"
              className="hidden rounded-md border border-line px-3 py-1.5 text-xs font-semibold sm:inline-flex"
            >
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {role === "candidate" ? "Ready to interview" : "Active"}
            </button>
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-soft"
            >
              {user.profile_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profile_image_url}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-soft text-xs font-bold text-brand">
                  {display.slice(0, 1).toUpperCase()}
                </span>
              )}
            </button>
            {menu ? (
              <div className="absolute right-0 top-11 z-20 w-56 border border-line bg-elevated py-2 shadow-sm">
                <div className="border-b border-line px-3 pb-2">
                  <p className="text-sm font-semibold">{display}</p>
                  <p className="text-xs text-muted">{user.email}</p>
                </div>
                <p className="px-3 py-2 text-xs text-muted">
                  {role === "company"
                    ? "Access is limited to your approved company."
                    : "Candidate workspace"}
                </p>
                <button
                  type="button"
                  onClick={logout}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-soft"
                >
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

export function IconUsers() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="7" cy="8" r="2.5" />
      <circle cx="13" cy="8" r="2.5" />
      <path d="M3 16c.6-2.2 2.2-3.5 4-3.5s3.4 1.3 4 3.5M10 16c.6-2.2 2.2-3.5 4-3.5s3.4 1.3 4 3.5" />
    </svg>
  );
}

export function IconHome() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 10.5 10 4l7 6.5V18a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1v-7.5z" />
    </svg>
  );
}

export function IconUser() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="7" r="3" />
      <path d="M4 17c1.5-3 10.5-3 12 0" />
    </svg>
  );
}

export function IconBrief() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="7" width="14" height="10" rx="1" />
      <path d="M7 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 11h14" />
    </svg>
  );
}

export function IconList() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 6h12M4 10h12M4 14h8" />
    </svg>
  );
}

export function IconMsg() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 4h12v9H8l-4 3V4z" />
    </svg>
  );
}

export function IconStar() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 3l2.2 4.5 5 .7-3.6 3.5.9 5L10 14.4 5.5 16.7l.9-5L2.8 8.2l5-.7L10 3z" />
    </svg>
  );
}

export function IconCal() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="14" height="12" rx="1" />
      <path d="M3 9h14M7 3v4M13 3v4" />
    </svg>
  );
}

export function IconOffer() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 5h12v12H4z" />
      <path d="M7 9h6M7 12h4" />
    </svg>
  );
}

export function IconChart() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 16V9M10 16V5M16 16v-4" />
    </svg>
  );
}

export function IconCheck() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="10" r="7" />
      <path d="M7 10.5l2 2 4-4" />
    </svg>
  );
}
