"use client";

export type JobPickItem = {
  id: number;
  title: string;
  subtitle?: string | null;
  meta: string;
};

export function JobPickList({
  jobs,
  onSelect,
  empty,
  actionLabel = "View",
}: {
  jobs: JobPickItem[];
  onSelect: (id: number) => void;
  empty: string;
  actionLabel?: string;
}) {
  if (jobs.length === 0) {
    return (
      <p className="border border-line bg-elevated px-5 py-10 text-center text-sm text-muted">
        {empty}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line border border-line bg-elevated">
      {jobs.map((job) => (
        <li
          key={job.id}
          className="flex flex-wrap items-center justify-between gap-4 px-5 py-5"
        >
          <div className="min-w-0">
            <p className="font-semibold">{job.title}</p>
            {job.subtitle ? (
              <p className="mt-0.5 text-sm text-muted">{job.subtitle}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted">{job.meta}</p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(job.id)}
            className="shrink-0 rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:bg-soft"
          >
            {actionLabel}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function BackLink({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-semibold text-brand hover:underline"
    >
      ← {label}
    </button>
  );
}

export function BackToJobs({ onClick }: { onClick: () => void }) {
  return <BackLink onClick={onClick} label="All jobs" />;
}
