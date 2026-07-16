"use client";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { useRouter } from "next/navigation";
import type { Job, JobDecision } from "@/lib/jobs";
import { STRENGTH_STYLES, locationLabel } from "@/lib/display";
import { recordDecision } from "@/app/actions";
import TailoredResume from "./TailoredResume";

const JobPanel: React.FC<{
  job: Job | null;
  onClose: () => void;
}> = ({ job, onClose }) => {
  const [mounted, setMounted] = React.useState(false);
  const [pending, setPending] = React.useState<JobDecision | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  const decide = async (decision: JobDecision) => {
    if (!job) return;
    setPending(decision);
    try {
      await recordDecision(job.id, decision);
      router.refresh();
      onClose();
    } finally {
      setPending(null);
    }
  };

  const strength = job?.fit_strength
    ? STRENGTH_STYLES[job.fit_strength]
    : null;
  const location = job ? locationLabel(job.location_type) : null;

  return ReactDOM.createPortal(
    <>
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          job ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[520px] bg-white dark:bg-zinc-950 shadow-2xl z-50 overflow-y-auto transition-transform duration-300 ${
          job ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {job && (
          <div className="flex flex-col gap-5 p-6 sm:p-8">
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-2xl leading-none w-fit -ml-1"
              aria-label="Close panel"
            >
              ×
            </button>

            {/* Fit banner */}
            {strength && (
              <div
                className={`rounded-2xl border px-5 py-4 ${strength.accent}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${strength.badge}`}
                  >
                    {strength.label}
                  </span>
                  {typeof job.fit_score === "number" && (
                    <span className="text-sm text-zinc-400">
                      {job.fit_score}/100
                    </span>
                  )}
                </div>
                {job.fit_summary && (
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {job.fit_summary}
                  </p>
                )}
              </div>
            )}

            {/* Job info */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {location && (
                  <span className="rounded-full border border-zinc-300 dark:border-zinc-700 px-3 py-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                    {location}
                  </span>
                )}
                {job.industry && (
                  <span className="rounded-full border border-zinc-300 dark:border-zinc-700 px-3 py-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                    {job.industry}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">
                {job.title}
              </h2>
              <p className="text-lg text-zinc-500 mt-1">{job.company}</p>
            </div>

            {/* Tailored resume + context Q&A */}
            <TailoredResume listingId={job.id} />

            {/* Decisions */}
            <div className="mt-2 flex flex-col gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-5">
              <a
                href={job.source_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => decide("applied")}
                className="w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
              >
                Apply now →
              </a>
              <div className="flex gap-2">
                <button
                  onClick={() => decide("saved")}
                  disabled={pending !== null}
                  className="flex-1 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-200 font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {pending === "saved" ? "Saving…" : "Save for later"}
                </button>
                <button
                  onClick={() => decide("dismissed")}
                  disabled={pending !== null}
                  className="flex-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {pending === "dismissed" ? "…" : "Not interested"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>,
    document.body,
  );
};

export default JobPanel;
