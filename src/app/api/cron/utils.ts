// src/app/api/cron/utils.ts
import { neon } from "@neondatabase/serverless";

export function extractSalary(description?: string): {
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

export async function insertJobsToDb(jobs: any[], databaseUrl: string) {
  const sql = neon(databaseUrl);
  for (const job of jobs) {
    const { salary_min, salary_max } = extractSalary(job.description);
    await sql`
      INSERT INTO job_listings (
        role_name,
        source,
        status,
        company_name,
        industry,
        salary_min,
        salary_max,
        date_posted
      ) VALUES (
        ${job.title ?? null},
        ${job.via ?? null},
        'Pending Application',
        ${job.company_name ?? null},
        null,
        ${salary_min},
        ${salary_max},
        NULLIF(
          (CASE
            WHEN job.detected_extensions && job.detected_extensions.posted_at IS NOT NULL THEN
              (CURRENT_DATE - (CASE
                WHEN job.detected_extensions.posted_at LIKE '%day%' THEN CAST(split_part(job.detected_extensions.posted_at, ' ', 1) AS INTEGER)
                WHEN job.detected_extensions.posted_at LIKE '%hour%' THEN 0
                ELSE NULL
              END))
            ELSE NULL
          END), NULL)
      )
      ON CONFLICT DO NOTHING;
    `;
  }
}
