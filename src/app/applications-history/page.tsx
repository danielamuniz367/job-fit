import type { Metadata } from "next";
import { getHistory, type Job, type JobDecision } from "@/lib/jobs";
import { DECISION_LABELS, DECISION_BADGES, locationLabel } from "@/lib/display";

export const metadata: Metadata = {
  title: "Application History | JobFit",
};

export const dynamic = "force-dynamic";

const ORDER: JobDecision[] = ["applied", "saved", "dismissed"];

const HistoryRow = ({ job }: { job: Job }) => {
  const location = locationLabel(job.location_type);
  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <div className="min-w-0">
        <a
          href={job.source_link}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
        >
          {job.title}
        </a>
        <p className="text-sm text-zinc-500 truncate">
          {job.company}
          {location ? ` · ${location}` : ""}
        </p>
      </div>
      {job.decision && (
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${DECISION_BADGES[job.decision]}`}
        >
          {DECISION_LABELS[job.decision]}
        </span>
      )}
    </li>
  );
};

const ApplicationHistoryPage = async () => {
  const history = await getHistory();
  const groups = ORDER.map((decision) => ({
    decision,
    jobs: history.filter((j) => j.decision === decision),
  })).filter((g) => g.jobs.length > 0);

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Application History
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Everything you&apos;ve acted on, most recent first.
        </p>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nothing yet. Decisions you make on the Today page show up here.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.decision}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              {DECISION_LABELS[group.decision]} ({group.jobs.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {group.jobs.map((job) => (
                <HistoryRow key={job.id} job={job} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
};

export default ApplicationHistoryPage;
