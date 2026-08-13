import { hasEditSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await hasEditSession())) {
      return Response.json({ error: "Edit access is locked." }, { status: 401 });
    }

    const { id } = await context.params;
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id)) {
      return Response.json({ error: "Invalid game id." }, { status: 400 });
    }

    const body = await request.json();
    const score = Number(body?.userScore);
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      return Response.json({ error: "Rating must be a whole number from 0 to 100." }, { status: 400 });
    }

    const sql = db();
    const rows = await sql`
      UPDATE playnite_games
      SET user_score = ${score},
          rating_source = 'web',
          rating_updated_at = now(),
          rating_synced_to_playnite_at = NULL,
          updated_at = now()
      WHERE playnite_game_id = ${id}::uuid
      RETURNING playnite_game_id::text, user_score
    `;

    if (rows.length === 0) return Response.json({ error: "Game not found." }, { status: 404 });
    return Response.json({ ok: true, game: rows[0] });
  } catch (error) {
    console.error("PATCH rating failed", error);
    return Response.json({ error: "Unable to update rating." }, { status: 500 });
  }
}
