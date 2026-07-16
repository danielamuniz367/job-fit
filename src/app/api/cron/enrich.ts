import * as cheerio from "cheerio";
import { neon } from "@neondatabase/serverless";
import { scoreJobFit } from "@/lib/ai";
import type { LocationType } from "@/lib/profile";

const NYC_PATTERN = /(new york(,\s*ny)?|new york city|nyc|\bny\b)/i;
const REMOTE_PATTERN = /\bremote\b/i;
const HYBRID_PATTERN = /\bhybrid\b/i;
const STACK_PATTERN = /\b(react|js|ts|javascript|typescript)\b/i;

class JobNotFoundError extends Error {}

const LEVER_SELECTORS = [".content", ".posting-description"];

function extractLeverDescription($: cheerio.CheerioAPI): string {
  for (const selector of LEVER_SELECTORS) {
    const text = $(selector).first().text().trim();
    if (text.length > 100) return text;
  }
  return $("body").text().trim();
}

// Strip known ATS trailing slugs (e.g. /application, /apply) before fetching
function normalizeJobUrl(url: string): string {
  return url.replace(/\/(application|apply|submit)(\/.*)?$/i, "");
}

// Greenhouse uses client-side rendering, so raw fetch() returns an empty JS
// shell. Use the Greenhouse boards API to get structured job data instead.
// Ashby embeds job data in a JSON-LD <script> tag — parse that directly.
async function fetchJobText(rawUrl: string): Promise<string> {
  const url = normalizeJobUrl(rawUrl);
  const parsed = new URL(url);

  // Ashby: parse JSON-LD structured data embedded in the HTML
  if (parsed.hostname === "jobs.ashbyhq.com") {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
    if (res.status === 404)
      throw new JobNotFoundError(`Ashby job not found: ${url}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const jsonLd =
      $('script[type="application/ld+json"]').text() ||
      $("script[type='application/ld+json']").text();
    if (jsonLd) {
      const data = JSON.parse(jsonLd);
      // jobLocation can be a single object or an array of locations
      const locations = Array.isArray(data.jobLocation)
        ? data.jobLocation
        : [data.jobLocation].filter(Boolean);
      const location = locations
        .map(
          (l: any) =>
            l?.address?.addressLocality ?? l?.address?.addressRegion ?? "",
        )
        .join(" ");
      const $desc = cheerio.load(data.description ?? "");
      // Insert spaces between elements to prevent keywords merging (e.g. "ReactTypeScript")
      $desc("*").each((_, el) => {
        if (el.type === "tag") $desc(el).after(" ");
      });
      const description = $desc("body").text().replace(/\s+/g, " ").trim();
      return `${location} ${description}`;
    }
    return "";
  }

  // Greenhouse (job-boards.greenhouse.io, job-boards.eu.greenhouse.io, boards.greenhouse.io)
  // newer board URLs are client-side rendered — use the boards API
  if (parsed.hostname.includes("greenhouse.io")) {
    const parts = parsed.pathname.split("/").filter(Boolean);
    const jobsIdx = parts.indexOf("jobs");
    if (jobsIdx >= 1 && parts.length > jobsIdx) {
      const company = parts[jobsIdx - 1];
      const jobId = (parts[jobsIdx + 1] ?? "").split("?")[0];
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}`,
      );
      if (!res.ok)
        throw res.status === 404
          ? new JobNotFoundError(
              `Greenhouse job not found: ${company}/${jobId}`,
            )
          : new Error(`Greenhouse API ${res.status} for ${company}/${jobId}`);
      const data = await res.json();
      const location: string = data.location?.name ?? "";
      const $ = cheerio.load(data.content ?? "");
      const description = $.text().trim();
      return `${location} ${description}`;
    }
  }

  // Lever renders server-side — HTML scraping works
  const leverRes = await fetch(url);
  if (leverRes.status === 404)
    throw new JobNotFoundError(`Lever job not found: ${url}`);
  const html = await leverRes.text();
  const $ = cheerio.load(html);
  return extractLeverDescription($);
}

// Rough classification from the description text. The AI scorer refines this;
// this is the fallback when no API key is configured.
function classifyLocation(description: string): LocationType | null {
  const hasNyc = NYC_PATTERN.test(description);
  const hasRemote = REMOTE_PATTERN.test(description);
  const hasHybrid = HYBRID_PATTERN.test(description);
  if (hasNyc && hasHybrid) return "nyc-hybrid";
  if (hasNyc) return "nyc-onsite";
  if (hasRemote) return "remote";
  return null;
}

const ROLE_FOCUS_PATTERN =
  /\b(frontend|front[-\s]?end|full[-\s]?stack|product engineer)\b/i;
const SENIOR_PATTERN = /\b(senior|sr\.?|lead)\b/i;
const LOCATION_POINTS: Record<LocationType, number> = {
  "nyc-hybrid": 20,
  "nyc-onsite": 14,
  remote: 8,
};

type HeuristicFit = {
  score: number;
  strength: "strong" | "good" | "stretch";
  summary: string;
};

// A keyword-based fit estimate used when no API key is configured, and as the
// initial value the AI scorer later overrides. Keeps the daily focus view
// meaningful without any external calls.
function heuristicFit(
  title: string,
  description: string,
  locationType: LocationType | null,
): HeuristicFit {
  const text = `${title} ${description}`;
  let score = 30;
  const reasons: string[] = [];

  if (/\breact\b/i.test(text)) {
    score += 22;
    reasons.push("uses React");
  }
  if (/\b(typescript|\bts\b)\b/i.test(text)) {
    score += 12;
    reasons.push("TypeScript in the stack");
  }
  if (ROLE_FOCUS_PATTERN.test(text)) {
    score += 14;
    reasons.push("frontend-leaning role");
  }
  if (SENIOR_PATTERN.test(text)) score += 6;
  if (locationType) {
    score += LOCATION_POINTS[locationType];
    reasons.push(
      locationType === "remote" ? "remote" : locationType.replace("-", " "),
    );
  }

  score = Math.max(0, Math.min(100, score));
  const strength = score >= 75 ? "strong" : score >= 50 ? "good" : "stretch";
  const summary = reasons.length
    ? `Matches on ${reasons.join(", ")}.`
    : "Partial match to your target profile.";
  return { score, strength, summary };
}

/**
 * Score already-enriched jobs against the target profile and persist the result
 * (fit_score / fit_strength / fit_summary, and location_type when the scorer
 * resolves it). Non-destructive — low-fit jobs simply never reach the daily
 * focus view rather than being deleted. No-ops without an API key.
 */
export async function scoreEnrichedJobs(
  databaseUrl: string,
  jobIds?: string[],
): Promise<number> {
  if (jobIds !== undefined && jobIds.length === 0) return 0;
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("⚠ ANTHROPIC_API_KEY not set — skipping AI fit scoring");
    return 0;
  }

  const sql = neon(databaseUrl);
  const jobs = (await sql`
    SELECT job_id, title, company, description
    FROM job_listing
    WHERE ${jobIds ? sql`job_id = ANY(${jobIds})` : sql`enriched = true`}
  `) as {
    job_id: string;
    title: string;
    company: string | null;
    description: string | null;
  }[];

  let scored = 0;
  for (const job of jobs) {
    try {
      const fit = await scoreJobFit(job);
      if (!fit) continue;
      const locationType =
        fit.locationType ?? classifyLocation(job.description ?? "");
      await sql`
        UPDATE job_listing
        SET fit_score = ${fit.score},
            fit_strength = ${fit.strength},
            fit_summary = ${fit.summary},
            location_type = ${locationType}
        WHERE job_id = ${job.job_id}
      `;
      scored++;
      console.log(
        `★ scored ${fit.score} (${fit.strength}): ${job.title} @ ${job.company}`,
      );
    } catch (err) {
      console.error(`✗ failed to score ${job.job_id}:`, err);
    }
  }

  console.log(`Fit scoring done: ${scored} job(s) scored.`);
  return scored;
}

export async function enrichJobs(databaseUrl: string, jobIds?: string[]) {
  const sql = neon(databaseUrl);

  // When called from the cron with an explicit (possibly empty) list,
  // only process those IDs. An empty list means nothing was inserted — skip.
  // When called from the CLI (no jobIds), process all unenriched rows.
  if (jobIds !== undefined && jobIds.length === 0) {
    console.log("No new jobs to enrich.");
    return { kept: 0, skipped: 0, failed: 0, scored: 0 };
  }

  const jobs = (
    jobIds && jobIds.length > 0
      ? await sql`SELECT job_id FROM job_listing WHERE job_id = ANY(${jobIds}) AND enriched = false`
      : await sql`SELECT job_id FROM job_listing WHERE enriched = false`
  ) as { job_id: string }[];

  let kept = 0;
  let skipped = 0;
  let failed = 0;
  const keptJobIds: string[] = [];

  for (const job of jobs) {
    try {
      const description = await fetchJobText(job.job_id);

      // Location is now a ranking, not a hard filter: keep NYC *or* remote
      // roles (as long as the stack matches). The scorer ranks them later.
      const hasLocation =
        NYC_PATTERN.test(description) || REMOTE_PATTERN.test(description);
      const hasStack = STACK_PATTERN.test(description);

      if (hasLocation && hasStack) {
        const locationType = classifyLocation(description);
        const fit = heuristicFit("", description, locationType);
        await sql`
          UPDATE job_listing
          SET enriched = true,
              description = ${description},
              location_type = ${locationType},
              fit_score = ${fit.score},
              fit_strength = ${fit.strength},
              fit_summary = ${fit.summary}
          WHERE job_id = ${job.job_id}
        `;
        kept++;
        keptJobIds.push(job.job_id);
        console.log(`✓ kept (${locationType ?? "?"}): ${job.job_id}`);
      } else {
        skipped++;
        console.log(
          `⚠ skipped (location=${hasLocation}, stack=${hasStack}): ${job.job_id}`,
        );
      }

      // polite delay — only needed for CLI runs to avoid rate-limiting
      if (!jobIds) await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      if (err instanceof JobNotFoundError) {
        await sql`DELETE FROM job_listing WHERE job_id = ${job.job_id}`;
        console.log(`✗ removed (not found): ${job.job_id}`);
      } else {
        failed++;
        console.error(`✗ failed to enrich ${job.job_id}:`, err);
      }
    }
  }

  console.log(
    `\nEnrichment done: ${kept} kept, ${skipped} skipped, ${failed} failed`,
  );

  console.log("\nScoring newly enriched jobs against target profile...");
  const scored = await scoreEnrichedJobs(databaseUrl, keptJobIds);

  return { kept, skipped, failed, scored };
}
