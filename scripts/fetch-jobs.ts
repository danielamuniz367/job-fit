import { fetchAndInsertJobs } from "../src/app/api/cron/utils";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.development.local" });

(async () => {
  const inserted = await fetchAndInsertJobs(process.env.DATABASE_URL!);
  console.log(`Inserted ${inserted} jobs`);
})();
