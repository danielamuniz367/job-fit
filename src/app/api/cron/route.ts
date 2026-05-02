import { NextResponse } from "next/server";
import { fetchAndInsertJobs } from "./utils";
import { enrichJobs } from "./enrich";

export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  const db = process.env.DATABASE_URL;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!db) {
    return new Response("DATABASE_URL is not configured", { status: 500 });
  }

  const inserted = await fetchAndInsertJobs(db);
  const { kept, skipped, failed } = await enrichJobs(db);

  return NextResponse.json({ inserted, kept, skipped, failed });
}
