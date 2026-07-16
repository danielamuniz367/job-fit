import { getSql } from "@/lib/db";
import { DAILY_PICK_COUNT, type LocationType } from "@/lib/profile";

export type FitStrength = "strong" | "good" | "stretch";
export type JobDecision = "applied" | "saved" | "dismissed";

export type Job = {
  id: number;
  job_id: string | null;
  title: string;
  company: string;
  industry: string;
  posted_date: string;
  source_link: string;
  status: string;
  fit_score: number | null;
  fit_strength: FitStrength | null;
  fit_summary: string | null;
  location_type: LocationType | null;
  decision: JobDecision | null;
};

function normalize(row: Record<string, unknown>): Job {
  return {
    ...row,
    posted_date: row.posted_date
      ? new Date(row.posted_date as string).toISOString().split("T")[0]
      : "",
  } as Job;
}

export type TodaysFocus = {
  picks: Job[]; // still-undecided jobs surfaced today
  handledToday: number; // surfaced today AND already acted on
  totalToday: number; // total surfaced today (the day's fixed set)
};

/**
 * The heart of the ADHD-friendly view. Returns today's small, fixed set of
 * jobs. The first time it runs each day it "stamps" the top-scoring unseen jobs
 * as today's picks (up to DAILY_PICK_COUNT); after that the set is stable —
 * acting on a job removes it from focus but never triggers a refill, so the day
 * always has a finite, finishable list.
 */
export async function getTodaysFocus(): Promise<TodaysFocus> {
  const sql = getSql();

  const surfaced = (await sql`
    SELECT count(*)::int AS n FROM job_listing WHERE surfaced_on = CURRENT_DATE
  `) as { n: number }[];
  const alreadySurfaced = surfaced[0]?.n ?? 0;
  const need = Math.max(0, DAILY_PICK_COUNT - alreadySurfaced);

  if (need > 0) {
    await sql`
      UPDATE job_listing
      SET surfaced_on = CURRENT_DATE
      WHERE id IN (
        SELECT id FROM job_listing
        WHERE enriched = true
          AND surfaced_on IS NULL
          AND decision IS NULL
        ORDER BY fit_score DESC NULLS LAST, posted_date DESC
        LIMIT ${need}
      )
    `;
  }

  const rows = await sql`
    SELECT * FROM job_listing
    WHERE surfaced_on = CURRENT_DATE
    ORDER BY fit_score DESC NULLS LAST
  `;
  const all = rows.map(normalize);

  return {
    picks: all.filter((j) => j.decision === null),
    handledToday: all.filter((j) => j.decision !== null).length,
    totalToday: all.length,
  };
}

export async function getAllJobs(): Promise<Job[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM job_listing
    WHERE enriched = true
    ORDER BY fit_score DESC NULLS LAST, posted_date DESC
  `;
  return rows.map(normalize);
}

export async function getHistory(): Promise<Job[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM job_listing
    WHERE decision IS NOT NULL
    ORDER BY decided_at DESC NULLS LAST
  `;
  return rows.map(normalize);
}

export async function getBaseResume(): Promise<string> {
  const sql = getSql();
  const rows = (await sql`SELECT base_resume FROM profile WHERE id = 1`) as {
    base_resume: string | null;
  }[];
  return rows[0]?.base_resume ?? "";
}

export type TailoredListItem = {
  listing_id: number;
  title: string;
  company: string;
  source_link: string;
  updated_at: string;
};

export async function getTailoredList(): Promise<TailoredListItem[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT t.listing_id, j.title, j.company, j.source_link, t.updated_at
    FROM tailored_resume t
    JOIN job_listing j ON j.id = t.listing_id
    WHERE t.draft_md IS NOT NULL AND length(trim(t.draft_md)) > 0
    ORDER BY t.updated_at DESC
  `) as (Omit<TailoredListItem, "updated_at"> & {
    updated_at: string | Date | null;
  })[];
  return rows.map((r) => ({
    ...r,
    updated_at: r.updated_at
      ? new Date(r.updated_at).toISOString().split("T")[0]
      : "",
  }));
}
