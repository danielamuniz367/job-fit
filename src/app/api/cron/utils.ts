// src/app/api/cron/utils.ts
import { neon } from "@neondatabase/serverless";
import { getJson } from "serpapi";

function getJsonAsync(params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    getJson(params, (json: any) => {
      if (!json) reject(new Error("No data received from SerpAPI"));
      else resolve(json);
    });
  });
}

export async function fetchAndInsertJobs(databaseUrl: string) {
  const json = await getJsonAsync({
    api_key: process.env.SERPAPI_KEY,
    engine: "google_jobs",
    google_domain: "google.com",
    q: "full stack software react",
    hl: "en",
    gl: "us",
    location: "New York, New York, United States",
    lrad: "5",
  });

  const jobs = json.jobs_results ?? [];
  await insertJobsToDb(jobs, databaseUrl);
  return jobs.length;
}

const parseSalaryValue = (val: string): string =>
  val.replace(/[,]/g, "").toLowerCase().replace("k", "000");

const SALARY_RANGE_REGEX =
  /\$?(\d{2,3}[,\d]*)[kK]?\s*(?:-|–|to)\s*\$?(\d{2,3}[,\d]*)[kK]?/;
const SALARY_SINGLE_REGEX = /\$?(\d{2,3}[,\d]*)[kK]?/;

export function extractSalary(
  salaryExtension?: string,
  description?: string,
): {
  salary_min: string | null;
  salary_max: string | null;
} {
  // Prefer the structured salary field from detected_extensions (e.g. "180K–250K a year")
  for (const source of [salaryExtension, description]) {
    if (!source) continue;
    const rangeMatch = source.match(SALARY_RANGE_REGEX);
    if (rangeMatch) {
      return {
        salary_min: parseSalaryValue(rangeMatch[1]),
        salary_max: parseSalaryValue(rangeMatch[2]),
      };
    }
    // Only try single-value match on the structured extension, not the full description
    if (source === salaryExtension) {
      const singleMatch = source.match(SALARY_SINGLE_REGEX);
      if (singleMatch) {
        const val = parseSalaryValue(singleMatch[1]);
        return { salary_min: val, salary_max: val };
      }
    }
  }
  return { salary_min: null, salary_max: null };
}

export function inferIndustry(
  description?: string,
  companyName?: string,
): string | null {
  const text = `${description ?? ""} ${companyName ?? ""}`.toLowerCase();

  if (
    /\b(bank|banking|financial services|finance|trading|investment|asset management|wealth management|capital markets|hedge fund|fintech|jpmorgan|jp morgan|chase|goldman|morgan stanley|bloomberg|brokerage)\b/.test(
      text,
    )
  )
    return "Financial Services";

  if (
    /\b(health|medical|clinical|therapy|therapist|mental health|wellness|hospital|pharma|pharmaceutical|biotech|healthcare|telemedicine|insurance)\b/.test(
      text,
    )
  )
    return "Healthcare";

  if (
    /\b(e-commerce|ecommerce|retail|marketplace|consumer goods|shopping|direct-to-consumer|dtc)\b/.test(
      text,
    )
  )
    return "Retail & E-Commerce";

  if (
    /\b(media|entertainment|gaming|game|streaming|content|advertising|adtech|marketing technology|martech)\b/.test(
      text,
    )
  )
    return "Media & Entertainment";

  if (
    /\b(education|edtech|e-learning|learning management|university|school|academic|tutoring|curriculum)\b/.test(
      text,
    )
  )
    return "Education";

  if (
    /\b(logistics|supply chain|transportation|shipping|delivery|freight|warehouse|fleet)\b/.test(
      text,
    )
  )
    return "Logistics";

  if (
    /\b(consulting|agency|staffing|outsourcing|professional services|systems integrator)\b/.test(
      text,
    )
  )
    return "Consulting";

  // Default for software/tech roles
  return "Technology";
}

function parsePostedAt(postedAt?: string): string | null {
  if (!postedAt) return null;
  const daysMatch = postedAt.match(/(\d+)\s*day/i);
  if (daysMatch) {
    const date = new Date();
    date.setDate(date.getDate() - parseInt(daysMatch[1]));
    return date.toISOString().split("T")[0];
  }
  if (/hour/i.test(postedAt)) {
    return new Date().toISOString().split("T")[0];
  }
  return null;
}

export async function insertJobsToDb(jobs: any[], databaseUrl: string) {
  const sql = neon(databaseUrl);
  for (const job of jobs) {
    const { salary_min, salary_max } = extractSalary(
      job.detected_extensions?.salary,
      job.description,
    );
    const industry = inferIndustry(job.description, job.company_name);
    const posted_date = parsePostedAt(job.detected_extensions?.posted_at);
    await sql`
      INSERT INTO job_listing (
        job_id,
        title,
        source_link,
        status,
        company,
        industry,
        salary_min,
        salary_max,
        posted_date
      ) VALUES (
        ${job.job_id ?? null},
        ${job.title ?? null},
        ${job.source_link ?? null},
        'Pending Application',
        ${job.company_name ?? null},
        ${industry},
        ${salary_min},
        ${salary_max},
        ${posted_date}
      )
      ON CONFLICT (job_id) DO NOTHING;
    `;
  }
}
