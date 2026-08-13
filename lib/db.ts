import { neon } from "@neondatabase/serverless";

let cached: ReturnType<typeof neon> | null = null;

export function db() {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  cached = neon(url);
  return cached;
}
