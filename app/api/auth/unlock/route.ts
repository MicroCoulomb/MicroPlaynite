import { createEditSession, verifyMasterPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = typeof body?.password === "string" ? body.password : "";
    if (!password || !verifyMasterPassword(password)) {
      return Response.json({ ok: false, error: "Incorrect master password." }, { status: 401 });
    }
    await createEditSession();
    return Response.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/unlock failed", error);
    return Response.json({ ok: false, error: "Unable to unlock edit access." }, { status: 500 });
  }
}
