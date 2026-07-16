import { neon } from "@neondatabase/serverless";

// Shared Neon client factory. Every server-side query/action goes through here
// so the DATABASE_URL guard lives in one place.
export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return neon(process.env.DATABASE_URL);
}
