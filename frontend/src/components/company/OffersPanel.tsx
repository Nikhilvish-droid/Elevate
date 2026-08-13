"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ApplicationMessageThread } from "@/components/company/ApplicationMessageThread";
import { CandidateMessageModal } from "@/components/company/CandidateMessageModal";
import { BackToJobs, JobPickList } from "@/components/company/JobPickList";
import { stageLabel } from "@/lib/candidate";
import {
  countLabel,
  createCompanyOffer,
  groupApplicantsByJob,
  listCompanyOffers,
  listShortlistedApplicants,
  updateApplicationStatus,
  type CompanyOffer,
  type PipelineApplicant,
} from "@/lib/companyJobs";
import { formatCtcLabel } from "@/lib/candidateMessages";
import { getCompanyWorkspace } from "@/lib/company";
import { profileSlug } from "@/lib/user";

type Props = {
  onSchedule?: () => void;
  onEmail?: (applicationId?: number) => void;
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
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const jobs = useMemo(() => groupApplicantsByJob(rows), [rows]);
  const activeJob =
    selectedJobId == null
      ? null
      : jobs.find((job) => job.id === selectedJobId) ?? null;

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
        {activeJob ? <BackToJobs onClick={() => setSelectedJobId(null)} /> : null}
        <h2 className={`${activeJob ? "mt-2 " : ""}font-display text-xl font-bold`}>
          Shortlist
        </h2>
        <p className="mt-1 text-sm text-muted">
          {activeJob
            ? `Candidates shortlisted for ${activeJob.title}. Offers need hiring manager approval first.`
            : "Pick a job to see who is shortlisted. Offers need hiring manager approval first."}
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
      ) : activeJob ? (
        activeJob.items.length === 0 ? (
          <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
            No shortlisted candidates for this job.
          </p>
        ) : (
          <ul className="divide-y divide-line border border-line bg-elevated">
            {activeJob.items.map((person) => (
              <li
                key={person.application_id}
                className="px-5 py-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
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
                      {person.location || "Location TBD"}
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
                        onClick={() => onEmail?.(person.application_id)}
                        className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-soft"
                      >
                        Message
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
                </div>
                <ApplicationMessageThread applicationId={person.application_id} />
              </li>
            ))}
          </ul>
        )
      ) : (
        <JobPickList
          jobs={jobs.map((job) => ({
            id: job.id,
            title: job.title,
            subtitle: job.location,
            meta: countLabel(job.items.length, "shortlisted", "shortlisted"),
          }))}
          onSelect={setSelectedJobId}
          empty="No shortlisted candidates yet. Shortlist people from Apps."
          actionLabel="View shortlist"
        />
      )}
    </section>
  );
}

export function OffersPanel({ isFounder = false }: { isFounder?: boolean }) {
  const [shortlist, setShortlist] = useState<PipelineApplicant[]>([]);
  const [offers, setOffers] = useState<CompanyOffer[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [applicationId, setApplicationId] = useState<number | "">("");
  const [role, setRole] = useState("");
  const [ctc, setCtc] = useState("");
  const [location, setLocation] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [companyName, setCompanyName] = useState("Company");
  const [offerMsg, setOfferMsg] = useState<{
    applicationId: number;
    name: string;
    job: string;
    ctc: string;
    location: string;
    joining_date: string;
  } | null>(null);

  const eligible = useMemo(() => {
    if (isFounder) return shortlist;
    return shortlist.filter((p) => p.approved_for_offer);
  }, [shortlist, isFounder]);

  const jobOptions = useMemo(() => {
    const map = new Map<
      number,
      { id: number; title: string; location: string | null; ready: number; sent: number }
    >();
    for (const person of eligible) {
      const existing = map.get(person.job.id);
      if (existing) {
        existing.ready += 1;
        continue;
      }
      map.set(person.job.id, {
        id: person.job.id,
        title: person.job.title,
        location: person.job.location,
        ready: 1,
        sent: 0,
      });
    }
    for (const offer of offers) {
      const existing = map.get(offer.job_id);
      if (existing) {
        existing.sent += 1;
        continue;
      }
      map.set(offer.job_id, {
        id: offer.job_id,
        title: offer.job_title,
        location: offer.location,
        ready: 0,
        sent: 1,
      });
    }
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [eligible, offers]);

  const activeJob =
    selectedJobId == null
      ? null
      : jobOptions.find((job) => job.id === selectedJobId) ?? null;
  const jobEligible = activeJob
    ? eligible.filter((person) => person.job.id === activeJob.id)
    : [];
  const jobOffers = activeJob
    ? offers.filter((offer) => offer.job_id === activeJob.id)
    : [];

  const load = useCallback(async () => {
    try {
      setError("");
      const [s, o] = await Promise.all([
        listShortlistedApplicants(),
        listCompanyOffers(),
      ]);
      setShortlist(s);
      setOffers(o);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load offers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    getCompanyWorkspace()
      .then((ws) => setCompanyName(ws.company.name || "Company"))
      .catch(() => {});
  }, [load]);

  function fillFromPerson(person: PipelineApplicant | undefined) {
    if (!person) {
      setApplicationId("");
      setRole("");
      setLocation("");
      setCtc("");
      return;
    }
    setApplicationId(person.application_id);
    setRole(person.job.title);
    setLocation(person.job.location || "");
    if (person.job.salary_max) setCtc(String(person.job.salary_max));
    else if (person.job.salary_min) setCtc(String(person.job.salary_min));
    else setCtc("");
  }

  function openJob(id: number) {
    setSelectedJobId(id);
    setMessage("");
    const pool = eligible.filter((person) => person.job.id === id);
    fillFromPerson(pool[0]);
  }

  function onPick(id: number) {
    fillFromPerson(shortlist.find((p) => p.application_id === id));
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
      const person = shortlist.find(
        (row) => row.application_id === Number(applicationId),
      );
      setOfferMsg({
        applicationId: Number(applicationId),
        name: person?.full_name || "Candidate",
        job: role.trim() || activeJob?.title || "the role",
        ctc: formatCtcLabel(ctc),
        location: location.trim() || person?.job.location || "TBD",
        joining_date: joiningDate
          ? new Date(joiningDate).toLocaleDateString("en-IN")
          : "TBD",
      });
      setMessage("Offer created. Send the CTC note to their Inbox.");
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

  if (!activeJob) {
    return (
      <section>
        <div className="mb-4">
          <h2 className="font-display text-xl font-bold">Offer letters</h2>
          <p className="mt-1 text-sm text-muted">
            {isFounder
              ? "Pick a job, then generate an offer for a shortlisted candidate."
              : "Pick a job, then generate an offer after the hiring manager approves."}
          </p>
        </div>
        {error ? (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <JobPickList
          jobs={jobOptions.map((job) => ({
            id: job.id,
            title: job.title,
            subtitle: job.location,
            meta: [
              job.ready
                ? countLabel(job.ready, "ready for offer", "ready for offer")
                : null,
              job.sent ? countLabel(job.sent, "sent", "sent") : null,
            ]
              .filter(Boolean)
              .join(" · "),
          }))}
          onSelect={openJob}
          empty={
            isFounder
              ? "No shortlisted candidates yet. Shortlist someone in Apps first."
              : "No candidates are approved for offer yet. Ask a hiring manager to approve from Shortlist."
          }
          actionLabel="View offers"
        />
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {offerMsg ? (
        <CandidateMessageModal
          open
          applicationId={offerMsg.applicationId}
          candidateName={offerMsg.name}
          kind="offer_ctc"
          vars={{
            name: offerMsg.name,
            job: offerMsg.job,
            company: companyName,
            ctc: offerMsg.ctc,
            location: offerMsg.location,
            joining_date: offerMsg.joining_date,
          }}
          onClose={() => setOfferMsg(null)}
          onSent={() => {
            setOfferMsg(null);
            setMessage("CTC offer sent to the candidate Inbox.");
          }}
          onSkip={() => {
            setOfferMsg(null);
            setMessage("Offer saved. Inbox note was skipped.");
          }}
        />
      ) : null}
      <div>
        <BackToJobs onClick={() => setSelectedJobId(null)} />
        <h2 className="mt-2 font-display text-xl font-bold">Offer letters</h2>
        <p className="mt-1 text-sm text-muted">
          {activeJob.title}
          {isFounder
            ? " — generate an offer for a shortlisted candidate (founder can bypass HM approval)."
            : " — generate an offer only after the hiring manager approves the hire."}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand">{message}</p> : null}

      <form onSubmit={onSubmit} className="border border-line bg-elevated px-5 py-6">
        {jobEligible.length === 0 ? (
          <p className="text-sm text-muted">
            {jobOffers.length > 0
              ? "No more candidates are ready for an offer on this job."
              : isFounder
                ? "No shortlisted candidates for this job yet."
                : "No candidates are approved for offer on this job yet."}
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
                {jobEligible.map((p) => (
                  <option key={p.application_id} value={p.application_id}>
                    {p.full_name}
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
            {applicationId ? (
              <ApplicationMessageThread applicationId={Number(applicationId)} />
            ) : null}
          </div>
        )}
      </form>

      <div>
        <h3 className="text-sm font-semibold">Sent offers</h3>
        {jobOffers.length === 0 ? (
          <p className="mt-3 border border-line bg-elevated px-5 py-8 text-sm text-muted">
            No offers sent for this job yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line border border-line bg-elevated">
            {jobOffers.map((offer) => (
              <li
                key={offer.id}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="font-semibold">{offer.candidate_name}</p>
                  <p className="text-sm text-muted">
                    {offer.location || activeJob.title}
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
