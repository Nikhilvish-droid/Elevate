"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile, homeFor } from "@/lib/profile";

export default function CandidateIndex() {
  const router = useRouter();

  useEffect(() => {
    getProfile().then((profile) => {
      if (profile) router.replace(homeFor(profile));
    });
  }, [router]);

  return (
    <p className="text-sm text-muted">Opening your profile…</p>
  );
}
