"use client";

import { CandidatePortal } from "@/components/CandidatePortal";

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CandidatePortal>{children}</CandidatePortal>;
}
