// Client-safe display helpers. This module has NO server imports (no db/neon),
// so it's safe to import into "use client" components. Types are pulled in
// type-only (erased at build time).

import type { LocationType } from "@/lib/profile";
import type { FitStrength, JobDecision } from "@/lib/jobs";

// Human-friendly labels for the location ranking.
export const LOCATION_LABELS: Record<LocationType, string> = {
  "nyc-hybrid": "NYC · Hybrid",
  "nyc-onsite": "NYC · On-site",
  remote: "Remote",
};

export function locationLabel(loc: LocationType | null): string | null {
  return loc ? LOCATION_LABELS[loc] : null;
}

type StrengthStyle = {
  label: string;
  // Tailwind classes for the badge (works in light + dark).
  badge: string;
  // Accent ring/border for the card.
  accent: string;
};

export const STRENGTH_STYLES: Record<FitStrength, StrengthStyle> = {
  strong: {
    label: "Strong fit",
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    accent: "border-emerald-300 dark:border-emerald-500/40",
  },
  good: {
    label: "Good fit",
    badge:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    accent: "border-indigo-300 dark:border-indigo-500/40",
  },
  stretch: {
    label: "A stretch",
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    accent: "border-amber-300 dark:border-amber-500/40",
  },
};

export const DECISION_LABELS: Record<JobDecision, string> = {
  applied: "Applied",
  saved: "Saved",
  dismissed: "Not interested",
};

export const DECISION_BADGES: Record<JobDecision, string> = {
  applied:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  saved: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  dismissed: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};
