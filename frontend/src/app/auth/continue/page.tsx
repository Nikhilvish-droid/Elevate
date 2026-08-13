"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout, btnPrimary } from "@/components/Auth";
import { afterAuthPath, getSessionUser, syncAuthUser } from "@/lib/profile";

function ContinueInner() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [error, setError] = useState("");
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const user = await getSessionUser();
      if (!user) {
        router.replace("/auth?tab=login");
        return;
      }

      try {
        const profile = await syncAuthUser();
        if (cancelled) return;
        router.replace(afterAuthPath(profile, next));
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load your profile. The API may still be waking up.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, next, tries]);

  return (
    <AuthLayout
      title={error ? "Almost there" : "Signing you in"}
      subtitle={
        error
          ? "Your login worked. We just need the API to respond."
          : "Loading your existing account…"
      }
    >
      {error ? (
        <div className="space-y-4">
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
          <p className="text-sm text-muted">
            Render free-tier APIs sleep after idle time. Wait about 30 seconds,
            then retry. You should land on your dashboard, not a new account.
          </p>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              setError("");
              setTries((n) => n + 1);
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="h-24 animate-pulse rounded-md bg-soft" />
      )}
    </AuthLayout>
  );
}

export default function AuthContinuePage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Signing you in">
          <div className="h-24 animate-pulse rounded-md bg-soft" />
        </AuthLayout>
      }
    >
      <ContinueInner />
    </Suspense>
  );
}
