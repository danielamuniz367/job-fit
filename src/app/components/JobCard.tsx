"use client";
import * as React from "react";
import type { Job } from "@/lib/jobs";
import { STRENGTH_STYLES, locationLabel } from "@/lib/display";

const JobCard: React.FC<{ job: Job; onOpen: (job: Job) => void }> = ({
  job,
  onOpen,
}) => {
  const strength = job.fit_strength ? STRENGTH_STYLES[job.fit_strength] : null;
  const location = locationLabel(job.location_type);

  return (
    <button
      onClick={() => onOpen(job)}
      className={`group w-full text-left rounded-2xl border bg-white dark:bg-zinc-900 p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${
        strength ? strength.accent : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-center gap-2">
        {strength && (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${strength.badge}`}
          >
            {strength.label}
          </span>
        )}
        {location && (
          <span className="rounded-full border border-zinc-300 dark:border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-500">
            {location}
          </span>
        )}
      </div>

      <h3 className="mt-4 text-xl font-bold leading-snug text-zinc-900 dark:text-zinc-50">
        {job.title}
      </h3>
      <p className="text-zinc-500 mt-0.5">{job.company}</p>

      {job.fit_summary && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 line-clamp-2">
          {job.fit_summary}
        </p>
      )}

      <span className="mt-4 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400 group-hover:underline">
        View &amp; tailor resume →
      </span>
    </button>
  );
};

export default JobCard;
