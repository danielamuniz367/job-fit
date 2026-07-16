"use client";
import * as React from "react";
import Link from "next/link";
import type { Job, TodaysFocus } from "@/lib/jobs";
import JobCard from "./JobCard";
import JobPanel from "./JobPanel";

const DailyFocus: React.FC<{ focus: TodaysFocus }> = ({ focus }) => {
  const [selectedJob, setSelectedJob] = React.useState<Job | null>(null);
  const { picks, handledToday, totalToday } = focus;

  const allDone = totalToday > 0 && picks.length === 0;
  const noJobs = totalToday === 0;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Today
        </h1>
        <p className="mt-1 text-zinc-500">
          {noJobs
            ? "No jobs to review right now."
            : allDone
              ? `All ${totalToday} handled. Nice work.`
              : `${handledToday} of ${totalToday} handled — a focused few, picked for you.`}
        </p>
        {totalToday > 0 && (
          <div className="mt-4 flex gap-1.5">
            {Array.from({ length: totalToday }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i < handledToday
                    ? "bg-indigo-500"
                    : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
            ))}
          </div>
        )}
      </header>

      {allDone || noJobs ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
          <div className="text-4xl">{noJobs ? "🌱" : "🎉"}</div>
          <h2 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {noJobs ? "Nothing queued yet" : "You're done for today"}
          </h2>
          <p className="mt-2 text-zinc-500">
            {noJobs
              ? "New roles get pulled in daily. Check back soon."
              : "Come back tomorrow for a fresh set. No need to keep scrolling."}
          </p>
          <Link
            href="/all"
            className="mt-6 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Browse all jobs instead →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {picks.map((job) => (
            <JobCard key={job.id} job={job} onOpen={setSelectedJob} />
          ))}
        </div>
      )}

      <JobPanel job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
};

export default DailyFocus;
