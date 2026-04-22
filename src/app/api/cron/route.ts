import { NextResponse } from "next/server";
import { getJson } from "serpapi";
import { insertJobsToDb } from "./utils";

function getJsonAsync(params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    getJson(params, (json: any) => {
      if (!json) reject(new Error("No data received from SerpAPI"));
      else resolve(json);
    });
  });
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const json = await getJsonAsync({
    api_key: process.env.SERPAPI_KEY,
    engine: "google_jobs",
    google_domain: "google.com",
    q: "full stack engineer frontend",
    hl: "en",
    gl: "us",
    location: "New York, New York, United States",
    lrad: "5",
  });

  const jobs = json.jobs_results ?? [];
  await insertJobsToDb(jobs, process.env.DATABASE_URL!);

  return NextResponse.json({ inserted: jobs.length, jobs });
}
