import { clearEditSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  await clearEditSession();
  return Response.json({ ok: true });
}
