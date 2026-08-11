"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  PublicProfileView,
  PublicShell,
} from "@/components/PublicProfile";
import { getPublicCandidate, type PublicCandidate } from "@/lib/candidate";
import {
  candidateIdFromSlug,
  getProfile,
  getSessionUser,
} from "@/lib/profile";

export default function NamedProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [publicProfile, setPublicProfile] = useState<PublicCandidate | null>(
    null,
  );
  const [missing, setMissing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const candidateId = candidateIdFromSlug(slug);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!candidateId) {
        setMissing(true);
        return;
      }

      const [data, session] = await Promise.all([
        getPublicCandidate(candidateId),
        getSessionUser(),
      ]);
      if (cancelled) return;
      if (!data) {
        setMissing(true);
        return;
      }
      setPublicProfile(data);

      if (session) {
        const profile = await getProfile().catch(() => null);
        if (!cancelled) {
          setIsOwner(profile?.candidate_id === candidateId);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, candidateId]);

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
      {isOwner ? (
        <p className="mx-auto mb-4 max-w-3xl text-sm text-muted">
          This is your public profile.{" "}
          <Link href="/candidate" className="font-semibold text-brand hover:underline">
            Open dashboard
          </Link>
        </p>
      ) : null}
      <PublicProfileView profile={publicProfile} />
    </PublicShell>
  );
}
