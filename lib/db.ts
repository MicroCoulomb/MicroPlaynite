import { neon } from "@neondatabase/serverless";
import type { NeonQueryFunction } from "@neondatabase/serverless";

// Micro Playnite uses Neon's default HTTP query mode:
// - object rows (arrayMode: false)
// - rows only, not full query metadata (fullResults: false)
// Keeping this type explicit prevents TypeScript from widening the generic
// neon() return type into a union that also includes FullQueryResults.
type DatabaseQuery = NeonQueryFunction<false, false>;

let cached: DatabaseQuery | null = null;

export function db(): DatabaseQuery {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");

  cached = neon(url, {
    arrayMode: false,
    fullResults: false,
  });

  return cached;
}
