"use client";

import { useEffect, useState } from "react";
import {
  listMyOffers,
  respondToOffer,
  type OfferRow,
} from "@/lib/candidate";

export default function OffersPage() {
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    try {
      setRows(await listMyOffers());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function respond(id: number, accept: boolean) {
    setBusyId(id);
    setError("");
    try {
      await respondToOffer(id, accept);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update offer.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Offer letters
      </h1>
      <p className="mt-1 text-sm text-muted">
        Download, accept, or reject offers sent to you.
      </p>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {rows.length === 0 && !error ? (
        <p className="mt-8 border border-line bg-elevated px-5 py-10 text-sm text-muted">
          No offers yet. They appear here when a recruiter generates a letter.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((row) => {
            const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
            const company = Array.isArray(job?.companies)
              ? job?.companies[0]?.name
              : job?.companies?.name;
            const canRespond = row.status === "sent";
            return (
              <li key={row.id} className="border border-line bg-elevated px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{job?.title ?? "Offer"}</p>
                    <p className="text-sm text-muted">{company ?? "Company"}</p>
                    {row.salary != null ? (
                      <p className="mt-1 text-sm">
                        ₹{Number(row.salary).toLocaleString("en-IN")}
                      </p>
                    ) : null}
                    {row.joining_date ? (
                      <p className="text-sm text-muted">
                        Joining {new Date(row.joining_date).toLocaleDateString()}
                      </p>
                    ) : null}
                    {row.location ? (
                      <p className="text-sm text-muted">{row.location}</p>
                    ) : null}
                  </div>
                  <span className="text-xs font-semibold capitalize text-brand">
                    {row.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {row.offer_pdf_url ? (
                    <a
                      href={row.offer_pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-line px-3 py-2 text-xs font-semibold hover:bg-soft"
                    >
                      Download PDF
                    </a>
                  ) : null}
                  {canRespond ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => respond(row.id, true)}
                        className="rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => respond(row.id, false)}
                        className="rounded-md border border-line px-3 py-2 text-xs font-semibold hover:bg-soft"
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
