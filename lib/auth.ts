import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "playnite_edit_session";
const SESSION_SECONDS = 60 * 60 * 12;

function secret() {
  const value = process.env.EDIT_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("EDIT_SESSION_SECRET must be configured and at least 32 characters long.");
  }
  return value;
}

export function verifyMasterPassword(password: string) {
  const expectedPassword = process.env.MASTER_PASSWORD;
  if (!expectedPassword) throw new Error("MASTER_PASSWORD is not configured.");

  // Keep configuration simple: store the master password only as a server-side
  // environment variable. Compare SHA-256 digests so timingSafeEqual always
  // receives buffers of the same length.
  const expected = createHmac("sha256", "micro-playnite-password-check").update(expectedPassword).digest();
  const actual = createHmac("sha256", "micro-playnite-password-check").update(password).digest();
  return timingSafeEqual(actual, expected);
}

function sign(expiry: number) {
  return createHmac("sha256", secret()).update(String(expiry)).digest("base64url");
}

export async function createEditSession() {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const value = `${expiry}.${sign(expiry)}`;
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearEditSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export async function hasEditSession() {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return false;
  const [expiryText, signature] = raw.split(".");
  const expiry = Number(expiryText);
  if (!Number.isFinite(expiry) || expiry <= Math.floor(Date.now() / 1000) || !signature) return false;
  const expected = Buffer.from(sign(expiry));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
