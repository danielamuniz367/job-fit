"use server";

import { revalidatePath } from "next/cache";
import { getSql } from "@/lib/db";
import type { JobDecision } from "@/lib/jobs";
import {
  generateTailoredResume,
  generateContextQuestions,
  type JobForAI,
} from "@/lib/ai";

/**
 * Record the user's decision on a job (apply / save / dismiss). This moves the
 * job out of today's focus and into Application History.
 */
export async function recordDecision(id: number, decision: JobDecision) {
  const sql = getSql();
  await sql`
    UPDATE job_listing
    SET decision = ${decision}, decided_at = now()
    WHERE id = ${id}
  `;
  revalidatePath("/");
  revalidatePath("/applications-history");
}

/** Save the single base resume everything is tailored from. */
export async function saveBaseResume(text: string) {
  const sql = getSql();
  await sql`UPDATE profile SET base_resume = ${text}, updated_at = now() WHERE id = 1`;
  revalidatePath("/resumes");
}

export type TailoredResumeData = {
  draft_md: string | null;
  questions: string[];
  context_answers: Record<string, string>;
};

export type TailoredResumeState = {
  resume: TailoredResumeData | null;
  hasBaseResume: boolean;
};

async function fetchJobForAI(
  sql: ReturnType<typeof getSql>,
  listingId: number,
): Promise<JobForAI & { id: number }> {
  const rows = (await sql`
    SELECT id, title, company, description FROM job_listing WHERE id = ${listingId}
  `) as (JobForAI & { id: number })[];
  const job = rows[0];
  if (!job) throw new Error(`Job ${listingId} not found`);
  return job;
}

async function fetchBaseResume(
  sql: ReturnType<typeof getSql>,
): Promise<string> {
  const rows = (await sql`SELECT base_resume FROM profile WHERE id = 1`) as {
    base_resume: string | null;
  }[];
  return rows[0]?.base_resume ?? "";
}

/** Read-only: load a cached tailored resume (if any) plus whether a base resume exists. */
export async function loadTailoredResume(
  listingId: number,
): Promise<TailoredResumeState> {
  const sql = getSql();
  const rows = (await sql`
    SELECT draft_md, questions, context_answers
    FROM tailored_resume WHERE listing_id = ${listingId}
  `) as {
    draft_md: string | null;
    questions: string[] | null;
    context_answers: Record<string, string> | null;
  }[];
  const row = rows[0];
  const baseResume = await fetchBaseResume(sql);

  return {
    resume: row
      ? {
          draft_md: row.draft_md,
          questions: row.questions ?? [],
          context_answers: row.context_answers ?? {},
        }
      : null,
    hasBaseResume: baseResume.trim().length > 0,
  };
}

/** Generate (or regenerate) the tailored draft + context questions for a job. */
export async function generateTailoredResumeAction(
  listingId: number,
): Promise<TailoredResumeData> {
  const sql = getSql();
  const job = await fetchJobForAI(sql, listingId);
  const baseResume = await fetchBaseResume(sql);

  const existing = (await sql`
    SELECT context_answers FROM tailored_resume WHERE listing_id = ${listingId}
  `) as { context_answers: Record<string, string> | null }[];
  const answers = existing[0]?.context_answers ?? {};

  const [draft, questions] = await Promise.all([
    generateTailoredResume(baseResume, job, answers),
    generateContextQuestions(baseResume, job),
  ]);

  await sql`
    INSERT INTO tailored_resume (listing_id, draft_md, questions, context_answers, updated_at)
    VALUES (${listingId}, ${draft}, ${JSON.stringify(questions)}, ${JSON.stringify(answers)}, now())
    ON CONFLICT (listing_id) DO UPDATE
      SET draft_md = EXCLUDED.draft_md,
          questions = EXCLUDED.questions,
          updated_at = now()
  `;
  revalidatePath("/resumes");

  return { draft_md: draft, questions, context_answers: answers };
}

/** Store the user's answers to the context questions and regenerate the draft. */
export async function answerContextQuestions(
  listingId: number,
  answers: Record<string, string>,
): Promise<TailoredResumeData> {
  const sql = getSql();
  const job = await fetchJobForAI(sql, listingId);
  const baseResume = await fetchBaseResume(sql);

  const draft = await generateTailoredResume(baseResume, job, answers);

  const rows = (await sql`
    UPDATE tailored_resume
    SET draft_md = ${draft},
        context_answers = ${JSON.stringify(answers)},
        updated_at = now()
    WHERE listing_id = ${listingId}
    RETURNING questions
  `) as { questions: string[] | null }[];

  return {
    draft_md: draft,
    questions: rows[0]?.questions ?? [],
    context_answers: answers,
  };
}
