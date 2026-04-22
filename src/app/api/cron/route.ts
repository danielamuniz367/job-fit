// Helper to extract salary min/max from description
function extractSalary(description?: string): {
  salary_min: string | null;
  salary_max: string | null;
} {
  if (!description) return { salary_min: null, salary_max: null };
  // Match patterns like $120,000 - $170,000, $110–$170/hour, 160K–190K, $200k to $240k
  const regex =
    /\$?(\d{2,3}[,\d]*)[kK]?\s*(?:-|–|to)\s*\$?(\d{2,3}[,\d]*)[kK]?/;
  const match = description.match(regex);
  if (match) {
    // Normalize to plain numbers
    const parse = (val: string) =>
      val.replace(/[,]/g, "").toLowerCase().replace("k", "000");
    return {
      salary_min: parse(match[1]),
      salary_max: parse(match[2]),
    };
  }
  return { salary_min: null, salary_max: null };
}
import { NextResponse } from "next/server";
import { getJson } from "serpapi";
import { insertJobsToDb } from "./utils";

export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  return new Promise((resolve, reject) => {
    getJson(
      {
        api_key: process.env.SERPAPI_KEY,
        engine: "google_jobs",
        google_domain: "google.com",
        q: "full stack engineer frontend",
        hl: "en",
        gl: "us",
        location: "New York, New York, United States",
        lrad: "5",
      },
      (json) => {
        if (!json) {
          reject(new Error("No data received from SerpAPI"));
          return;
        }

        // Insert jobs into Neon
        (async () => {
          try {
            const jobs = json.jobs_results ?? [];
            await insertJobsToDb(jobs, process.env.DATABASE_URL!);
            resolve(NextResponse.json({ inserted: jobs.length, jobs }));
          } catch (err) {
            reject(err);
          }
        })();
      },
    );
  });
}
