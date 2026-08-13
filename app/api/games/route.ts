import { db } from "@/lib/db";
import type { SortDirection, SortField } from "@/lib/types";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;
const allowedSort = new Set<SortField>(["name", "rating", "release_year"]);
const allowedDir = new Set<SortDirection>(["asc", "desc"]);

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const q = (params.get("q") || "").trim().slice(0, 200);
    const statuses = (params.get("status") || "")
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 30)
      .join("\u001f");
    const sortRaw = (params.get("sort") || "rating") as SortField;
    const dirRaw = (params.get("direction") || "desc") as SortDirection;
    const sort = allowedSort.has(sortRaw) ? sortRaw : "rating";
    const direction = allowedDir.has(dirRaw) ? dirRaw : "desc";
    const page = Math.max(1, Math.min(100000, Number.parseInt(params.get("page") || "1", 10) || 1));
    const offset = (page - 1) * PAGE_SIZE;

    const sql = db();
    const countRows = await sql`
      SELECT COUNT(*)::int AS total
      FROM playnite_games
      WHERE (${q} = '' OR game_title ILIKE '%' || ${q} || '%')
        AND (${statuses} = '' OR completion_status = ANY(string_to_array(${statuses}, chr(31))))
    `;

    const rows = await sql`
      SELECT
        playnite_game_id::text,
        game_title,
        user_score,
        release_year,
        completion_status,
        cover_url,
        COALESCE(favorite, false) AS favorite,
        COALESCE(playtime_seconds, 0)::bigint::text AS playtime_seconds
      FROM playnite_games
      WHERE (${q} = '' OR game_title ILIKE '%' || ${q} || '%')
        AND (${statuses} = '' OR completion_status = ANY(string_to_array(${statuses}, chr(31))))
      ORDER BY
        CASE WHEN ${sort} = 'name' AND ${direction} = 'asc' THEN lower(game_title) END ASC,
        CASE WHEN ${sort} = 'name' AND ${direction} = 'desc' THEN lower(game_title) END DESC,
        CASE WHEN ${sort} = 'rating' AND ${direction} = 'asc' THEN user_score END ASC,
        CASE WHEN ${sort} = 'rating' AND ${direction} = 'desc' THEN user_score END DESC,
        CASE WHEN ${sort} = 'release_year' AND ${direction} = 'asc' THEN release_year END ASC NULLS LAST,
        CASE WHEN ${sort} = 'release_year' AND ${direction} = 'desc' THEN release_year END DESC NULLS LAST,
        lower(game_title) ASC,
        playnite_game_id ASC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `;

    const total = Number(countRows[0]?.total || 0);
    const games = rows.map((row) => ({
      ...row,
      user_score: Number(row.user_score || 0),
      release_year: row.release_year == null ? null : Number(row.release_year),
      favorite: Boolean(row.favorite),
      playtime_seconds: Number(row.playtime_seconds || 0),
    }));

    return Response.json({
      games,
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (error) {
    console.error("GET /api/games failed", error);
    return Response.json({ error: "Unable to load games." }, { status: 500 });
  }
}
