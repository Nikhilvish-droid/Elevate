"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  DashShell,
  IconBrief,
  IconCal,
  IconCheck,
  IconHome,
  IconList,
  IconMsg,
  IconOffer,
  IconUser,
} from "@/components/DashShell";
import { listMyNotifications } from "@/lib/candidate";
import { getProfile, isOnboarded } from "@/lib/profile";

export function CandidatePortal({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    getProfile().then((profile) => {
      if (!profile) {
        router.replace("/auth?tab=login");
        return;
      }
      if (!isOnboarded(profile) || (profile.role && profile.role !== "candidate")) {
        router.replace(
          profile.role === "company"
            ? "/onboarding?hint=company"
            : "/onboarding?hint=candidate",
        );
      }
    });
  }, [router]);

  useEffect(() => {
    let alive = true;
    async function refresh() {
      try {
        const notes = await listMyNotifications();
        if (alive) setUnread(notes.filter((n) => !n.is_read).length);
      } catch {
        if (alive) setUnread(0);
      }
    }
    refresh();
    const timer = window.setInterval(refresh, 20000);
    const onFocus = () => refresh();
    const onInbox = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("elevate-inbox", onInbox);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("elevate-inbox", onInbox);
    };
  }, []);

  const nav = [
    { href: "/candidate", label: "Home", icon: <IconHome /> },
    { href: "/candidate/profile", label: "Profile", icon: <IconUser /> },
    { href: "/candidate/jobs", label: "Jobs", icon: <IconBrief /> },
    { href: "/candidate/applied", label: "Applied", icon: <IconList /> },
    { href: "/candidate/interviews", label: "Rounds", icon: <IconCal /> },
    { href: "/candidate/assessments", label: "Tests", icon: <IconCheck /> },
    { href: "/candidate/offers", label: "Offers", icon: <IconOffer /> },
    {
      href: "/candidate/inbox",
      label: "Inbox",
      icon: <IconMsg />,
      unread: unread > 0,
    },
  ].map((item) => ({
    ...item,
    active:
      item.href === "/candidate"
        ? path === "/candidate"
        : path.startsWith(item.href),
  }));

  return (
    <DashShell role="candidate" nav={nav}>
      {children}
    </DashShell>
  );
}
