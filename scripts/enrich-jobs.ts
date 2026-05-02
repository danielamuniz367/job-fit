import * as dotenv from "dotenv";
import { enrichJobs } from "../src/app/api/cron/enrich";

dotenv.config({ path: ".env.development.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

enrichJobs(databaseUrl);
