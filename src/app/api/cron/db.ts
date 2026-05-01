import { neon } from "@neondatabase/serverless";

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

  return "Technology";
}

export function parsePostedAt(postedAt?: string): string | null {
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

export async function insertJobsToDb(
  jobs: any[],
  databaseUrl: string,
): Promise<number> {
  const sql = neon(databaseUrl);
  let inserted = 0;
  for (const job of jobs) {
    const industry = inferIndustry(job.description, job.company_name);
    const posted_date = parsePostedAt(job.detected_extensions?.posted_at);
    const result = await sql`
      INSERT INTO job_listing (
        job_id,
        title,
        source_link,
        status,
        company,
        industry,
        posted_date
      ) VALUES (
        ${job.job_id ?? null},
        ${job.title ?? null},
        ${job.source_link ?? null},
        'Pending Application',
        ${job.company_name ?? null},
        ${industry},
        ${posted_date}
      )
      ON CONFLICT DO NOTHING
      RETURNING job_id;
    `;
    inserted += result.length;
  }
  return inserted;
}
