import { NextResponse } from "next/server";
import { fetchAndInsertJobs } from "./utils";

export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const inserted = await fetchAndInsertJobs(process.env.DATABASE_URL!);

  return NextResponse.json({ inserted });
}
