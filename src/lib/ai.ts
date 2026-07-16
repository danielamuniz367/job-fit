import Anthropic from "@anthropic-ai/sdk";
import { TARGET_DESCRIPTION, type LocationType } from "@/lib/profile";

// ─── AI module ────────────────────────────────────────────────────────────────
// The single place every Claude call lives. Swapping providers means changing
// only this file. Every function degrades gracefully to a null / empty result
// when ANTHROPIC_API_KEY is unset, mirroring how the pipeline already skips its
// AI pass without a key.
//
// Per the Anthropic SDK: forced tool_choice gives us reliable structured JSON
// (Claude has no OpenAI-style response_format), and plain text + adaptive
// thinking is used for the longer-form resume generation.

const MODEL = "claude-opus-4-8";

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

// Pull the first tool_use input off a forced-tool response.
function firstToolInput(msg: Anthropic.Message): Record<string, unknown> | null {
  const block = msg.content.find((b) => b.type === "tool_use");
  return block && block.type === "tool_use"
    ? (block.input as Record<string, unknown>)
    : null;
}

// Concatenate the text blocks of a response.
function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

export type JobForAI = {
  title: string;
  company: string | null;
  description: string | null;
};

export type FitResult = {
  score: number; // 0–100 alignment with the target profile
  strength: "strong" | "good" | "stretch";
  summary: string; // one or two sentences: why it aligns
  locationType: LocationType | null;
};

function strengthFromScore(score: number): FitResult["strength"] {
  if (score >= 75) return "strong";
  if (score >= 50) return "good";
  return "stretch";
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

const VALID_LOCATIONS: LocationType[] = ["nyc-hybrid", "nyc-onsite", "remote"];

/**
 * Score how well a single job aligns with the target profile. Returns null when
 * no API key is configured so callers can leave the row unscored.
 */
export async function scoreJobFit(job: JobForAI): Promise<FitResult | null> {
  const client = getClient();
  if (!client) return null;

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tool_choice: { type: "tool", name: "record_fit" },
    tools: [
      {
        name: "record_fit",
        description: "Record how well this job aligns with the target profile.",
        input_schema: {
          type: "object",
          properties: {
            score: {
              type: "integer",
              description: "0–100 alignment score with the target profile.",
            },
            location_type: {
              type: ["string", "null"],
              enum: ["nyc-hybrid", "nyc-onsite", "remote", null],
              description: "Best-guess work location, or null if unclear.",
            },
            summary: {
              type: "string",
              description:
                "One or two sentences on why it aligns, addressed to the candidate as 'you'.",
            },
          },
          required: ["score", "location_type", "summary"],
        },
      },
    ],
    system:
      "You score how well a software engineering job aligns with a candidate's target profile. " +
      "Weigh role/stack fit most heavily, then seniority, then location preference. " +
      "For location, prefer NYC hybrid over NYC on-site over remote; a strong role in a less-preferred location is still a good fit. " +
      "Be honest — reserve high scores for genuinely aligned roles.\n\n" +
      TARGET_DESCRIPTION,
    messages: [
      {
        role: "user",
        content:
          `Score this job.\n\nTitle: ${job.title}\nCompany: ${job.company ?? "Unknown"}\n` +
          `Description (excerpt):\n${(job.description ?? "").slice(0, 2500)}`,
      },
    ],
  });

  const input = firstToolInput(msg);
  if (!input) return null;

  const score = clampScore(input.score);
  const locationType: LocationType | null = VALID_LOCATIONS.includes(
    input.location_type as LocationType,
  )
    ? (input.location_type as LocationType)
    : null;

  return {
    score,
    strength: strengthFromScore(score),
    summary:
      typeof input.summary === "string" && input.summary.trim()
        ? input.summary.trim()
        : "",
    locationType,
  };
}

/**
 * Generate up to `count` short follow-up questions whose answers would let us
 * strengthen the tailored resume for this specific job. Returns [] with no key.
 */
export async function generateContextQuestions(
  baseResume: string,
  job: JobForAI,
  count = 3,
): Promise<string[]> {
  const client = getClient();
  if (!client) return [];
  if (!baseResume.trim()) return [];

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tool_choice: { type: "tool", name: "record_questions" },
    tools: [
      {
        name: "record_questions",
        description:
          "Record short, specific questions whose answers would strengthen the tailored resume.",
        input_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: { type: "string" },
              description: `Up to ${count} short questions about gaps or missing evidence (metrics, projects, tools) not already clear from the resume.`,
            },
          },
          required: ["questions"],
        },
      },
    ],
    system:
      "You help a candidate tailor their resume to a specific job. Ask only about things NOT already clear from the resume.",
    messages: [
      {
        role: "user",
        content:
          `TARGET PROFILE:\n${TARGET_DESCRIPTION}\n\n` +
          `BASE RESUME:\n${baseResume.slice(0, 4000)}\n\n` +
          `JOB: ${job.title} @ ${job.company ?? "Unknown"}\n${(job.description ?? "").slice(0, 2500)}`,
      },
    ],
  });

  const input = firstToolInput(msg);
  const questions = input?.questions;
  if (!Array.isArray(questions)) return [];
  return questions
    .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
    .slice(0, count);
}

/**
 * Produce a full tailored resume draft (markdown) reshaped for this job, folding
 * in any extra context answers. Returns "" with no key.
 */
export async function generateTailoredResume(
  baseResume: string,
  job: JobForAI,
  contextAnswers: Record<string, string> = {},
): Promise<string> {
  const client = getClient();
  if (!client) return "";
  if (!baseResume.trim()) return "";

  const contextBlock = Object.entries(contextAnswers)
    .filter(([, a]) => a && a.trim())
    .map(([q, a]) => `Q: ${q}\nA: ${a}`)
    .join("\n\n");

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system:
      "You are an expert resume writer. Reshape the candidate's base resume for a specific job WITHOUT inventing experience. " +
      "Reorder and rewrite for relevance: a targeted summary, a skills section ordered to match the job, and rewritten bullet points that emphasize the most relevant work (quantified where possible). " +
      "Only incorporate facts present in the base resume or the extra context provided. " +
      "Return clean Markdown only — no preamble, no explanation.",
    messages: [
      {
        role: "user",
        content:
          `TARGET PROFILE:\n${TARGET_DESCRIPTION}\n\n` +
          `JOB: ${job.title} @ ${job.company ?? "Unknown"}\n${(job.description ?? "").slice(0, 3000)}\n\n` +
          `BASE RESUME:\n${baseResume.slice(0, 6000)}\n\n` +
          (contextBlock
            ? `EXTRA CONTEXT FROM THE CANDIDATE (use to strengthen relevant bullets):\n${contextBlock}\n\n`
            : "") +
          `Produce the tailored resume in Markdown.`,
      },
    ],
  });

  return textOf(msg);
}
