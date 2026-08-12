"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { stageLabel } from "@/lib/candidate";
import {
  createCompanyOffer,
  listCompanyOffers,
  listShortlistedApplicants,
  updateApplicationStatus,
  type CompanyOffer,
  type PipelineApplicant,
} from "@/lib/companyJobs";
import { profileSlug } from "@/lib/user";

type Props = {
  onSchedule?: () => void;
  onEmail?: () => void;
  onOffer?: () => void;
};

function formatCtc(value: number | null) {
  if (value == null) return "—";
  if (value >= 100000) {
    const lakh = value / 100000;
    return `₹${lakh.toFixed(lakh % 1 === 0 ? 0 : 1)}L`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

export function ShortlistPanel({ onSchedule, onEmail, onOffer }: Props) {
  const [rows, setRows] = useState<PipelineApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");
      setRows(await listShortlistedApplicants());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load shortlist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(person: PipelineApplicant) {
    setBusyId(person.application_id);
    try {
      await updateApplicationStatus(person.application_id, "applied");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold">Shortlist</h2>
        <p className="mt-1 text-sm text-muted">
          Candidates in shortlist or interview stages. Offers need hiring
          manager approval first.
        </p>
      </div>
      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
          Loading shortlist…
        </p>
      ) : rows.length === 0 ? (
        <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
          No shortlisted candidates yet. Shortlist people from Apps.
        </p>
      ) : (
        <ul className="divide-y divide-line border border-line bg-elevated">
          {rows.map((person) => (
            <li
              key={person.application_id}
              className="flex flex-wrap items-start justify-between gap-4 px-5 py-5"
            >
              <div className="flex gap-3">
                {person.profile_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={person.profile_image_url}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-soft text-sm font-bold text-brand">
                    {person.full_name.slice(0, 1)}
                  </span>
                )}
                <div>
                  <p className="font-semibold">{person.full_name}</p>
                  <p className="text-sm text-muted">
                    {person.job.title}
                    {person.location ? ` · ${person.location}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {stageLabel(person.status)}
                    {person.approved_for_offer ? " · Approved for offer" : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onSchedule}
                      className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                    >
                      Interview
                    </button>
                    <button
                      type="button"
                      onClick={onEmail}
                      className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                    >
                      Email
                    </button>
                    {person.approved_for_offer ? (
                      <button
                        type="button"
                        onClick={onOffer}
                        className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                      >
                        Offer
                      </button>
                    ) : null}
                    <Link
                      href={`/u/${profileSlug(person.full_name)}-${person.candidate_id}`}
                      className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                    >
                      Profile
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === person.application_id}
                      onClick={() => remove(person)}
                      className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
              <span className="text-sm font-semibold text-brand">
                {person.match_score != null
                  ? `${Math.round(person.match_score)}% match`
                  : person.approved_for_offer
                    ? "Offer ready"
                    : "Shortlisted"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function OffersPanel({ isFounder = false }: { isFounder?: boolean }) {
  const [shortlist, setShortlist] = useState<PipelineApplicant[]>([]);
  const [offers, setOffers] = useState<CompanyOffer[]>([]);
  const [applicationId, setApplicationId] = useState<number | "">("");
  const [role, setRole] = useState("");
  const [ctc, setCtc] = useState("");
  const [location, setLocation] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const eligible = useMemo(() => {
    if (isFounder) return shortlist;
    return shortlist.filter((p) => p.approved_for_offer);
  }, [shortlist, isFounder]);

  const load = useCallback(async () => {
    try {
      setError("");
      const [s, o] = await Promise.all([
        listShortlistedApplicants(),
        listCompanyOffers(),
      ]);
      setShortlist(s);
      setOffers(o);
      const pool = isFounder ? s : s.filter((p) => p.approved_for_offer);
      if (!applicationId && pool[0]) {
        setApplicationId(pool[0].application_id);
        setRole(pool[0].job.title);
        setLocation(pool[0].job.location || "");
        if (pool[0].job.salary_max) {
          setCtc(String(pool[0].job.salary_max));
        } else if (pool[0].job.salary_min) {
          setCtc(String(pool[0].job.salary_min));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load offers.");
    } finally {
      setLoading(false);
    }
  }, [applicationId, isFounder]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPick(id: number) {
    setApplicationId(id);
    const person = shortlist.find((p) => p.application_id === id);
    if (!person) return;
    setRole(person.job.title);
    setLocation(person.job.location || "");
    if (person.job.salary_max) setCtc(String(person.job.salary_max));
    else if (person.job.salary_min) setCtc(String(person.job.salary_min));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!applicationId) {
      setError("Pick a candidate approved for offer.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await createCompanyOffer({
        application_id: Number(applicationId),
        salary: ctc,
        role: role.trim() || undefined,
        location: location.trim() || null,
        joining_date: joiningDate || null,
      });
      setMessage("Offer sent to the candidate.");
      setCtc("");
      setJoiningDate("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create offer.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        Loading offers…
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-bold">Offer letters</h2>
        <p className="mt-1 text-sm text-muted">
          {isFounder
            ? "Generate an offer for a shortlisted candidate (founder can bypass HM approval)."
            : "Generate an offer only after the hiring manager approves the hire."}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand">{message}</p> : null}

      <form onSubmit={onSubmit} className="border border-line bg-elevated px-5 py-6">
        {eligible.length === 0 ? (
          <p className="text-sm text-muted">
            {isFounder
              ? "No shortlisted candidates yet. Shortlist someone in Apps first."
              : "No candidates are approved for offer yet. Ask a hiring manager to approve from Shortlist."}
          </p>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm font-medium">
              Candidate
              <select
                required
                value={applicationId}
                onChange={(e) => onPick(Number(e.target.value))}
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
              >
                {eligible.map((p) => (
                  <option key={p.application_id} value={p.application_id}>
                    {p.full_name} · {p.job.title}
                    {p.approved_for_offer ? " · Approved" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Role
              <input
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-sm font-medium">
              CTC
              <input
                required
                value={ctc}
                onChange={(e) => setCtc(e.target.value)}
                placeholder="e.g. 1800000 or 18L"
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Location
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm font-medium">
                Joining date
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
            >
              {busy ? "Sending…" : "Generate offer"}
            </button>
          </div>
        )}
      </form>

      <div>
        <h3 className="text-sm font-semibold">Sent offers</h3>
        {offers.length === 0 ? (
          <p className="mt-3 border border-line bg-elevated px-5 py-8 text-sm text-muted">
            No offers sent yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line border border-line bg-elevated">
            {offers.map((offer) => (
              <li
                key={offer.id}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="font-semibold">{offer.candidate_name}</p>
                  <p className="text-sm text-muted">
                    {offer.job_title}
                    {offer.location ? ` · ${offer.location}` : ""}
                  </p>
                  <p className="mt-1 text-sm">{formatCtc(offer.salary)}</p>
                  {offer.joining_date ? (
                    <p className="text-xs text-muted">
                      Joining{" "}
                      {new Date(offer.joining_date).toLocaleDateString("en-IN")}
                    </p>
                  ) : null}
                </div>
                <span className="text-xs font-semibold capitalize text-brand">
                  {offer.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
