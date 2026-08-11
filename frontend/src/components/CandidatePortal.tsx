"use client";

import { useEffect } from "react";
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
import { getProfile, isOnboarded } from "@/lib/profile";

export function CandidatePortal({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();

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

  const nav = [
    { href: "/candidate", label: "Home", icon: <IconHome /> },
    { href: "/candidate/profile", label: "Profile", icon: <IconUser /> },
    { href: "/candidate/jobs", label: "Jobs", icon: <IconBrief /> },
    { href: "/candidate/applied", label: "Applied", icon: <IconList /> },
    { href: "/candidate/interviews", label: "Rounds", icon: <IconCal /> },
    { href: "/candidate/assessments", label: "Tests", icon: <IconCheck /> },
    { href: "/candidate/offers", label: "Offers", icon: <IconOffer /> },
    { href: "/candidate/inbox", label: "Inbox", icon: <IconMsg /> },
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
