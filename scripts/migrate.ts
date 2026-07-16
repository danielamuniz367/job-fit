import * as dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

type DatabaseTarget = "dev" | "prod";

const resolveDatabaseTarget = (value?: string): DatabaseTarget => {
  if (!value) {
    return "dev";
  }

  if (value === "dev" || value === "prod") {
    return value;
  }

  throw new Error(`Invalid database target "${value}". Use one of: dev, prod`);
};

const databaseTarget = resolveDatabaseTarget(process.argv[2]);

const ENV_FILES: Record<DatabaseTarget, string> = {
  dev: ".env.development.local",
  prod: ".env",
};

dotenv.config({ path: ENV_FILES[databaseTarget] });

const hasProdConfirmation = process.argv.includes("--confirm-prod");

if (databaseTarget === "prod" && !hasProdConfirmation) {
  throw new Error(
    "Refusing to run against production without --confirm-prod. Example: npx tsx scripts/migrate.ts prod --confirm-prod",
  );
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error(`DATABASE_URL is not set in ${ENV_FILES[databaseTarget]}`);

async function migrate(url: string) {
  const sql = neon(url);

  // ── job_listing: fit scoring + daily-pick lifecycle (all additive) ──────────
  await sql`ALTER TABLE job_listing ADD COLUMN IF NOT EXISTS fit_score int`;
  await sql`ALTER TABLE job_listing ADD COLUMN IF NOT EXISTS fit_strength text`;
  await sql`ALTER TABLE job_listing ADD COLUMN IF NOT EXISTS fit_summary text`;
  await sql`ALTER TABLE job_listing ADD COLUMN IF NOT EXISTS location_type text`;
  await sql`ALTER TABLE job_listing ADD COLUMN IF NOT EXISTS surfaced_on date`;
  await sql`ALTER TABLE job_listing ADD COLUMN IF NOT EXISTS decision text`;
  await sql`ALTER TABLE job_listing ADD COLUMN IF NOT EXISTS decided_at timestamptz`;
  console.log("✓ job_listing columns ensured");

  // ── profile: single-row "about me" (code owns preferences for now) ──────────
  await sql`
    CREATE TABLE IF NOT EXISTS profile (
      id int PRIMARY KEY DEFAULT 1,
      base_resume text,
      preferences jsonb,
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT profile_single_row CHECK (id = 1)
    )
  `;
  await sql`INSERT INTO profile (id) VALUES (1) ON CONFLICT DO NOTHING`;
  console.log("✓ profile table ensured (row id=1 seeded)");

  // ── tailored_resume: one cached tailored draft per job listing ──────────────
  await sql`
    CREATE TABLE IF NOT EXISTS tailored_resume (
      listing_id int PRIMARY KEY REFERENCES job_listing(id) ON DELETE CASCADE,
      draft_md text,
      questions jsonb,
      context_answers jsonb,
      updated_at timestamptz DEFAULT now()
    )
  `;
  console.log("✓ tailored_resume table ensured");

  console.log(`\nMigration complete against ${databaseTarget}.`);
}

migrate(databaseUrl);
