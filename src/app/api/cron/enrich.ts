import * as cheerio from "cheerio";
import { neon } from "@neondatabase/serverless";
import OpenAI from "openai";

const NYC_PATTERN = /(new york(,\s*ny)?|new york city|nyc|\bny\b)/i;
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

async function verifyEnrichedJobsWithAI(
  databaseUrl: string,
  jobIds: string[],
): Promise<number> {
  if (jobIds.length === 0) return 0;

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.log("⚠ OPENAI_API_KEY not set — skipping AI verification");
    return 0;
  }

  const sql = neon(databaseUrl);
  const jobs = (await sql`
    SELECT job_id, title, company, description
    FROM job_listing
    WHERE job_id = ANY(${jobIds})
  `) as {
    job_id: string;
    title: string;
    company: string;
    description: string;
  }[];

  if (jobs.length === 0) return 0;

  const snapshot = jobs
    .map(
      (job, i) =>
        `[${i}] ${job.title} @ ${job.company}\n${(job.description ?? "").slice(0, 300)}`,
    )
    .join("\n\n");

  const client = new OpenAI({ apiKey: openaiKey });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a job listing filter. Identify which jobs are NOT based in New York City. " +
          "A job is NYC-based if its description explicitly lists New York, NY / New York City / NYC as the primary work location. " +
          "Flag remote-only jobs or jobs in other cities even if they mention NYC in passing.",
      },
      {
        role: "user",
        content:
          `Here are ${jobs.length} enriched job listings (index, title, company, excerpt). ` +
          `Return JSON in this exact shape: {"remove": [<0-based indexes to delete>]}. ` +
          `If all are legitimately NYC, return {"remove": []}.\n\n${snapshot}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  const toRemove: number[] = Array.isArray(parsed.remove) ? parsed.remove : [];

  for (const idx of toRemove) {
    const job = jobs[idx];
    if (!job) continue;
    await sql`DELETE FROM job_listing WHERE job_id = ${job.job_id}`;
    console.log(`✗ AI removed (not NYC): ${job.title} @ ${job.company}`);
  }

  console.log(
    `AI verification done: ${toRemove.length} non-NYC job(s) removed, ${jobs.length - toRemove.length} confirmed.`,
  );
  return toRemove.length;
}

export async function enrichJobs(databaseUrl: string, jobIds?: string[]) {
  const sql = neon(databaseUrl);

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

      const hasNyc = NYC_PATTERN.test(description);
      const hasStack = STACK_PATTERN.test(description);

      if (hasNyc && hasStack) {
        await sql`
          UPDATE job_listing
          SET enriched = true, description = ${description}
          WHERE job_id = ${job.job_id}
        `;
        kept++;
        keptJobIds.push(job.job_id);
        console.log(`✓ kept: ${job.job_id}`);
      } else {
        skipped++;
        console.log(
          `⚠ skipped (nyc=${hasNyc}, stack=${hasStack}): ${job.job_id}`,
        );
      }

      // polite delay between requests
      await new Promise((r) => setTimeout(r, 1000));
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

  console.log("\nRunning AI verification pass on all enriched jobs...");
  const aiRemoved = await verifyEnrichedJobsWithAI(databaseUrl, keptJobIds);

  return { kept, skipped, failed, aiRemoved };
}
