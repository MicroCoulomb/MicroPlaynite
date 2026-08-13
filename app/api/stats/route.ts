import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = db();
    const summary = await sql`
      SELECT
        COUNT(*)::int AS total_games,
        COUNT(*) FILTER (WHERE user_score > 0)::int AS rated_games,
        COALESCE(ROUND(AVG(NULLIF(user_score, 0))::numeric, 1), 0) AS average_rating
      FROM playnite_games
    `;
    const statuses = await sql`
      SELECT completion_status AS status, COUNT(*)::int AS count
      FROM playnite_games
      GROUP BY completion_status
      ORDER BY lower(completion_status)
    `;
    const row = summary[0] || {};
    return Response.json({
      totalGames: Number(row.total_games || 0),
      ratedGames: Number(row.rated_games || 0),
      averageRating: Number(row.average_rating || 0),
      completionCounts: statuses.map((item) => ({ status: String(item.status), count: Number(item.count || 0) })),
    });
  } catch (error) {
    console.error("GET /api/stats failed", error);
    return Response.json({ error: "Unable to load statistics." }, { status: 500 });
  }
}
