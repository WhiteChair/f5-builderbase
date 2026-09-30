// Demo session: which persona the visitor is "logged in" as, plus their consent dial, in a signed cookie.
// The persona is never taken from the URL or the request body on data routes, so one visitor can't read
// another persona's moments by changing an id (the IDOR class Aikido checks for).

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { ConsentLevel, Group } from "./engine/types";

export const SESSION_COOKIE = "ka_session";
const MAX_AGE = 60 * 60 * 8;

export interface Session {
  persona: string;
  consent: ConsentLevel;
  groups?: Group[]; // explicit per-group choice; absent = the level's preset
  iat: number;
}

function secret(): string {
  const s = process.env.SESSION_SECRET || process.env.EDIT_PASSWORD;
  if (s) return s;
  if (process.env.NODE_ENV !== "production") return "dev-only-secret";
  throw new Error("SESSION_SECRET (or EDIT_PASSWORD) must be set in production");
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function encodeSession(s: Session): string {
  const payload = b64(JSON.stringify(s));
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (typeof s.persona !== "string" || ![0, 1, 2, 3].includes(s.consent) || Date.now() / 1000 - s.iat > MAX_AGE) return null;
    if (s.groups !== undefined && (!Array.isArray(s.groups) || s.groups.some((g) => typeof g !== "string" || g.length !== 1))) return null;
    return s;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<Session | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

export async function writeSession(s: Session): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(s), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
