"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
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
import { getProfile, homeFor } from "@/lib/profile";

export function CandidatePortal({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [home, setHome] = useState("/candidate");

  useEffect(() => {
    getProfile().then((p) => {
      if (p?.role === "candidate") setHome(homeFor(p));
    });
  }, []);

  const nav = [
    { href: home, label: "Home", icon: <IconHome /> },
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
      item.href === home
        ? path === "/candidate" || path.startsWith("/u/")
        : path.startsWith(item.href),
  }));

  return (
    <DashShell role="candidate" nav={nav}>
      {children}
    </DashShell>
  );
}
