"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  listPlatformCandidates,
  type PlatformCandidate,
} from "@/lib/company";
import { profileSlug } from "@/lib/user";

function profileHref(person: PlatformCandidate) {
  return `/u/${profileSlug(person.full_name)}-${person.id}`;
}

function relativeTime(iso: string | null) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 7) return `Updated ${days} days ago`;
  if (days < 30) return `Updated ${Math.floor(days / 7)} wk ago`;
  return `Updated ${Math.floor(days / 30)} mo ago`;
}

export function HomeCandidatesPanel() {
  const [rows, setRows] = useState<PlatformCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listPlatformCandidates(40);
        if (alive) setRows(data);
      } catch (err) {
        if (alive) {
          setError(
            err instanceof Error ? err.message : "Could not load candidates.",
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold">Candidates</h2>
          <p className="mt-1 text-sm text-muted">
            People on Elevate you can review for your open roles.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
          Loading candidates…
        </p>
      ) : rows.length === 0 ? (
        <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
          No candidates on the platform yet.
        </p>
      ) : (
        <ul className="divide-y divide-line border border-line bg-elevated">
          {rows.map((person) => {
            const when = relativeTime(person.updated_at);
            return (
              <li key={person.id}>
                <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
                  <div className="flex min-w-0 flex-1 gap-3">
                    {person.profile_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={person.profile_image_url}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-soft text-sm font-bold text-brand">
                        {person.full_name.slice(0, 1)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold">{person.full_name}</p>
                      <p className="text-sm text-muted">{person.expertise}</p>
                      {person.details ? (
                        <p className="mt-1 text-sm text-muted">{person.details}</p>
                      ) : null}
                      {person.headline ? (
                        <p className="mt-1 line-clamp-1 text-sm text-muted">
                          {person.headline}
                        </p>
                      ) : null}
                      {when ? (
                        <p className="mt-1 text-xs text-muted">{when}</p>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    href={profileHref(person)}
                    className="shrink-0 rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:bg-soft"
                  >
                    View
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
