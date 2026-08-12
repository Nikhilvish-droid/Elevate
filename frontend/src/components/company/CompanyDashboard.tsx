"use client";

import { useEffect, useState } from "react";
import {
  getCompanyDashboard,
  type CompanyDashboard,
} from "@/lib/company";

export function CompanyDashboardPanel() {
  const [data, setData] = useState<CompanyDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setError("");
        setData(await getCompanyDashboard());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        Loading dashboard…
      </p>
    );
  }

  if (error) {
    return (
      <p className="border border-line bg-elevated px-5 py-6 text-sm text-red-600" role="alert">
        {error}
      </p>
    );
  }

  if (!data) return null;

  const w = data.widgets;
  const stats = [
    { label: "Total jobs", value: w.total_jobs },
    { label: "Active candidates", value: w.active_candidates },
    { label: "Today's interviews", value: w.todays_interviews },
    { label: "Pending reviews", value: w.pending_reviews },
    { label: "Offer acceptance", value: `${w.offer_acceptance_rate}%` },
    { label: "Conversion rate", value: `${w.candidate_conversion_rate}%` },
  ];

  const maxFunnel = Math.max(1, ...data.hiring_funnel.map((s) => s.count));
  const maxMonthly = Math.max(
    1,
    ...data.monthly_hiring.map((m) => Math.max(m.applications, m.hires)),
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-bold">Dashboard</h2>
        <p className="mt-1 text-sm text-muted">
          Hiring pulse across jobs, candidates, interviews, and offers.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="border border-line bg-elevated px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {stat.label}
            </p>
            <p className="mt-2 font-display text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="border border-line bg-elevated px-5 py-5">
        <h3 className="text-sm font-semibold">Hiring funnel</h3>
        <ul className="mt-4 space-y-3">
          {data.hiring_funnel.map((stage) => (
            <li key={stage.key}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{stage.label}</span>
                <span className="font-semibold text-brand">{stage.count}</span>
              </div>
              <div className="h-2 bg-line">
                <div
                  className="h-2 bg-brand transition-all"
                  style={{ width: `${(stage.count / maxFunnel) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-line bg-elevated px-5 py-5">
        <h3 className="text-sm font-semibold">Monthly hiring</h3>
        <div className="mt-5 flex items-end gap-3">
          {data.monthly_hiring.map((month) => (
            <div key={month.key} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-28 w-full items-end justify-center gap-1">
                <div
                  className="w-2.5 bg-brand/70"
                  style={{
                    height: `${(month.applications / maxMonthly) * 100}%`,
                    minHeight: month.applications ? 4 : 0,
                  }}
                  title={`${month.applications} applications`}
                />
                <div
                  className="w-2.5 bg-brand"
                  style={{
                    height: `${(month.hires / maxMonthly) * 100}%`,
                    minHeight: month.hires ? 4 : 0,
                  }}
                  title={`${month.hires} hires`}
                />
              </div>
              <span className="text-xs text-muted">{month.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Light bar = applications · Solid bar = accepted offers
        </p>
      </section>

      <section className="border border-line bg-elevated">
        <div className="border-b border-line px-5 py-3">
          <h3 className="text-sm font-semibold">Recent activity</h3>
        </div>
        {data.recent_activity.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.recent_activity.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold">{row.title}</p>
                  <p className="text-sm text-muted">{row.detail}</p>
                </div>
                <time className="shrink-0 text-xs text-muted">
                  {new Date(row.at).toLocaleDateString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
