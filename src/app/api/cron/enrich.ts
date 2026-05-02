import * as cheerio from "cheerio";
import { neon } from "@neondatabase/serverless";

const NYC_PATTERN = /\b(new york|new york city|nyc|ny,|, ny)\b/i;
const REACT_PATTERN = /\breact\b/i;

const SELECTORS = [
  ".job-post-container", // Greenhouse
  ".content", // Lever
  "#content", // Greenhouse fallback
  ".posting-description", // Lever fallback
  "#root", // Ashby
];

function extractDescription($: cheerio.CheerioAPI): string {
  for (const selector of SELECTORS) {
    const text = $(selector).first().text().trim();
    if (text.length > 100) return text;
  }
  return "";
}

// Strip known ATS trailing slugs (e.g. /application, /apply) before fetching
function normalizeJobUrl(url: string): string {
  return url.replace(/\/(application|apply|submit)(\/.*)?$/i, "");
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
      const url = normalizeJobUrl(job.job_id);
      const html = await fetch(url).then((r) => r.text());
      const $ = cheerio.load(html);
      const description = extractDescription($);

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
