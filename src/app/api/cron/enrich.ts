import * as cheerio from "cheerio";
import { neon } from "@neondatabase/serverless";

const NYC_PATTERN = /(new york(,\s*ny)?|new york city|nyc|\bny\b)/i;
const REACT_PATTERN = /\b(react|js|ts|javascript|typescript)\b/i;

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
    const html = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }).then((r) => r.text());
    const $ = cheerio.load(html);
    const jsonLd = $("script[type='application/ld+json']").text();
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
      const description = $desc.text().trim();
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
        throw new Error(`Greenhouse API ${res.status} for ${company}/${jobId}`);
      const data = await res.json();
      const location: string = data.location?.name ?? "";
      const $ = cheerio.load(data.content ?? "");
      const description = $.text().trim();
      return `${location} ${description}`;
    }
  }

  // Lever renders server-side — HTML scraping works
  const html = await fetch(url).then((r) => r.text());
  const $ = cheerio.load(html);
  return extractLeverDescription($);
}

export async function enrichJobs(databaseUrl: string) {
  const sql = neon(databaseUrl);

  const jobs = (await sql`
    SELECT job_id FROM job_listing WHERE enriched = false
  `) as { job_id: string }[];

  let kept = 0;
  let skipped = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const description = await fetchJobText(job.job_id);

      const hasNyc = NYC_PATTERN.test(description);
      const hasReact = REACT_PATTERN.test(description);

      if (hasNyc && hasReact) {
        await sql`
          UPDATE job_listing
          SET enriched = true, description = ${description}
          WHERE job_id = ${job.job_id}
        `;
        kept++;
        console.log(`✓ kept: ${job.job_id}`);
      } else {
        skipped++;
        console.log(
          `⚠ skipped (nyc=${hasNyc}, react=${hasReact}): ${job.job_id}`,
        );
      }

      // polite delay between requests
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      failed++;
      console.error(`✗ failed to enrich ${job.job_id}:`, err);
    }
  }

  console.log(
    `\nEnrichment done: ${kept} kept, ${skipped} skipped, ${failed} failed`,
  );
  return { kept, skipped, failed };
}
