import * as dotenv from "dotenv";
import { enrichJobs } from "../src/app/api/cron/enrich";

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
    "Refusing to run against production without --confirm-prod. Example: npx tsx scripts/enrich-jobs.ts prod --confirm-prod",
  );
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error(`DATABASE_URL is not set in ${ENV_FILES[databaseTarget]}`);

enrichJobs(databaseUrl);
