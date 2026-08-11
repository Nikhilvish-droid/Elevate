"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CandidateHome from "@/components/CandidateHome";
import { CandidatePortal } from "@/components/CandidatePortal";
import {
  PublicProfileView,
  PublicShell,
} from "@/components/PublicProfile";
import { getPublicCandidate, type PublicCandidate } from "@/lib/candidate";
import {
  candidateIdFromSlug,
  getProfile,
  getSessionUser,
  homeFor,
  type Profile,
} from "@/lib/profile";

export default function NamedProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [viewer, setViewer] = useState<Profile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [publicProfile, setPublicProfile] = useState<PublicCandidate | null>(
    null,
  );
  const [missing, setMissing] = useState(false);

  const candidateId = candidateIdFromSlug(slug);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getSessionUser();
      const profile = session ? await getProfile().catch(() => null) : null;
      if (cancelled) return;
      setViewer(profile);
      setSessionReady(true);

      if (
        profile?.role === "candidate" &&
        candidateId &&
        profile.candidate_id === candidateId
      ) {
        const dest = homeFor(profile);
        if (dest !== `/u/${slug}`) router.replace(dest);
        return;
      }

      if (!candidateId) {
        setMissing(true);
        return;
      }

      const data = await getPublicCandidate(candidateId);
      if (cancelled) return;
      if (!data) setMissing(true);
      else setPublicProfile(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, candidateId, router]);

  const isOwner =
    Boolean(viewer?.candidate_id) && viewer?.candidate_id === candidateId;

  if (!sessionReady) {
    return <p className="p-6 text-sm text-muted">Loading profile…</p>;
  }

  if (isOwner) {
    return (
      <CandidatePortal>
        <CandidateHome />
      </CandidatePortal>
    );
  }

  if (missing) {
    return (
      <PublicShell>
        <p className="mx-auto max-w-lg text-sm text-muted">
          This profile link is invalid or the profile is not public yet.
        </p>
      </PublicShell>
    );
  }

  if (!publicProfile) {
    return (
      <PublicShell>
        <p className="text-sm text-muted">Loading profile…</p>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <PublicProfileView profile={publicProfile} />
    </PublicShell>
  );
}
