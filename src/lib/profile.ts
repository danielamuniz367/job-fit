// ─── The profile ────────────────────────────────────────────────────────────
// The single source of truth for "what I'm looking for in my next role."
// It lives in code for now (focused on one person); a settings UI can later
// override these via the `profile.preferences` jsonb column without a migration.
//
// Used in two places:
//   1. Building the SerpAPI search query (src/app/api/cron/fetch.ts)
//   2. The AI fit-scoring + resume prompts (src/lib/ai.ts)

export const TARGET = {
  // Mid-level, but happy to stretch toward senior. Excludes staff+ and junior.
  seniority: "mid-to-senior",

  // All frontend-leaning. React/TypeScript is the anchor.
  roleFocus: ["frontend-react-ts", "full-stack", "product-engineer"] as const,
  stackAnchor: ["react", "typescript"] as const,

  // A ranking, not a hard filter. Higher index = less preferred.
  // Remote is acceptable only at a NYC pay band.
  locationRanking: ["nyc-hybrid", "nyc-onsite", "remote"] as const,
} as const;

export type LocationType = (typeof TARGET.locationRanking)[number];

// Number of jobs to surface in the daily focus view.
export const DAILY_PICK_COUNT = 3;

// A plain-language description of the target, injected into AI prompts so the
// model scores/tailors against the same profile the crawler searches for.
export const TARGET_DESCRIPTION = `
Target role for the candidate's NEXT position:
- Level: mid-level, ideally stretching toward senior. NOT junior, NOT staff/principal/director/manager/VP.
- Focus: frontend-leaning engineering. Strong React + TypeScript. Open to full-stack and "product engineer" roles as long as they are frontend-leaning.
- Location preference (ranked, best first):
    1. New York City — hybrid
    2. New York City — on-site
    3. Remote (only acceptable if it pays at a NYC pay band)
`.trim();
