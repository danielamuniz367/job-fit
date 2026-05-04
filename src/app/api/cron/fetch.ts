import { neon } from "@neondatabase/serverless";
import { getJson } from "serpapi";
import { inferIndustry } from "./db";

function getJsonAsync(params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    getJson(params, (json: any) => {
      if (!json) reject(new Error("No data received from SerpAPI"));
      else if (json.error) reject(new Error(`SerpAPI error: ${json.error}`));
      else resolve(json);
    });
  });
}

// ─── ATS Direct Search ───────────────────────────────────────────────────────
// Targets company career pages directly via Greenhouse, Lever, and Ashby.
// 1 consolidated query × 2 pages = 2 calls max per run.

const EXCLUDE_COMPANIES =
  '-"google" -"facebook" -"amazon" -"ibm" -"oracle" -"salesforce" -"uber" -"vmware" -"intuit" -"palantir"';

const EXCLUDE_SENIORITY =
  '-"junior" -"jr." -"jr" -"senior" -"sr." -"sr" -"lead" -"staff" -"principal" -"director" -"manager" -"head of" -"vp" -"vice president"';

const ATS_QUERIES = [
  `(site:greenhouse.io OR site:lever.co OR site:ashbyhq.com) ("full stack" OR "software engineer") ("react" OR "typescript") "new york" ${EXCLUDE_SENIORITY} ${EXCLUDE_COMPANIES}`,
] as const;

const ATS_HOSTS = ["greenhouse.io", "lever.co", "ashbyhq.com"];

function isAtsJobUrl(url: string): boolean {
  return ATS_HOSTS.some((host) => url.includes(host));
}

function extractCompanyFromAtsUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length > 0) {
      return parts[0]
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  } catch {}
  return "";
}

export async function fetchAndInsertAtsJobs(databaseUrl: string) {
  const sql = neon(databaseUrl);
  const seenLinks = new Set<string>();
  let totalInserted = 0;

  for (const query of ATS_QUERIES) {
    let start = 0;
    let pagesFetched = 0;
    let results: any[] = [];

    do {
      const params: Record<string, unknown> = {
        engine: "google",
        q: query,
        api_key: process.env.SERPAPI_KEY,
        gl: "us",
        hl: "en",
        num: 10,
        tbs: "qdr:w", // past week only — avoids stale cached results
        start,
      };

      const json = await getJsonAsync(params);
      results = json.organic_results ?? [];

      if (results.length === 0) break;

      let insertedThisPage = 0;

      for (const result of results) {
        const link: string = result.link ?? "";
        if (!link || seenLinks.has(link)) continue;
        if (!isAtsJobUrl(link)) continue;
        seenLinks.add(link);

        const title: string = result.title ?? "";
        const snippet: string = result.snippet ?? "";
        const company = extractCompanyFromAtsUrl(link);
        const industry = inferIndustry(snippet, company);

        const inserted = await sql`
          INSERT INTO job_listing (
            job_id,
            title,
            source_link,
            status,
            company,
            industry,
            posted_date
          ) VALUES (
            ${link},
            ${title},
            ${link},
            'Pending Application',
            ${company || null},
            ${industry},
            ${new Date().toISOString().split("T")[0]}
          )
          ON CONFLICT DO NOTHING
          RETURNING job_id;
        `;
        insertedThisPage += inserted.length;
      }

      pagesFetched++;
      totalInserted += insertedThisPage;

      console.log(
        `ATS query "${query.slice(0, 60)}..." | Page ${pagesFetched}: fetched ${results.length}, inserted ${insertedThisPage} new`,
      );

      start += 10;
    } while (results.length === 10 && start < 20); // max 2 pages per query
  }

  return totalInserted;
}

// ─── Main entry point ────────────────────────────────────────────────────────

export async function fetchAndInsertJobs(databaseUrl: string) {
  const inserted = await fetchAndInsertAtsJobs(databaseUrl);
  console.log(`\nTotal inserted: ${inserted}`);
  return inserted;
}
