import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users, type User } from "@/db/schema";

const SESSION_COOKIE = "cpm_session";
const SESSION_DAYS = 7;

/* ------------------------------------------------------------------ */
/* Secrets                                                             */
/* ------------------------------------------------------------------ */

let cachedSecret: Uint8Array | null = null;

/**
 * Session secret: from SESSION_SECRET env in production, otherwise a
 * generated secret persisted next to the database (never committed).
 */
function sessionSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    cachedSecret = new TextEncoder().encode(fromEnv);
    return cachedSecret;
  }
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_GENERATED_SECRET !== "1") {
    throw new Error("SESSION_SECRET (min 32 chars) must be set in production. See .env.example.");
  }
  const dir = path.dirname(process.env.DATABASE_PATH || path.join(process.cwd(), "data", "lead-os.db"));
  const secretFile = path.join(dir, ".session-secret");
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(secretFile)) {
    fs.writeFileSync(secretFile, randomBytes(48).toString("hex"), { mode: 0o600 });
  }
  cachedSecret = new TextEncoder().encode(fs.readFileSync(secretFile, "utf8").trim());
  return cachedSecret;
}

/* ------------------------------------------------------------------ */
/* Password hashing (scrypt, node:crypto — no native deps)             */
/* ------------------------------------------------------------------ */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  return `scrypt:16384:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const [, nStr, salt, hash] = parts;
  const candidate = scryptSync(password, salt, 64, { N: Number(nStr), r: 8, p: 1 });
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/* ------------------------------------------------------------------ */
/* Login rate limiting (in-memory sliding window)                      */
/* ------------------------------------------------------------------ */

const attempts = new Map<string, number[]>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

export function loginRateLimited(key: string): boolean {
  const now = Date.now();
  const list = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  attempts.set(key, list);
  return list.length >= MAX_ATTEMPTS;
}

export function recordLoginAttempt(key: string): void {
  const list = attempts.get(key) ?? [];
  list.push(Date.now());
  attempts.set(key, list);
}

export function clearLoginAttempts(key: string): void {
  attempts.delete(key);
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

export async function createSessionCookie(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(sessionSecret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (!payload.sub) return null;
    const db = getDb();
    const user = db.select().from(users).where(eq(users.id, payload.sub)).get();
    return user ?? null;
  } catch {
    return null;
  }
}

/** Redirects to /login (or /setup when no account exists yet). */
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (user) return user;
  const db = getDb();
  const any = db.select({ id: users.id }).from(users).limit(1).get();
  redirect(any ? "/login" : "/setup");
}

export function hasAnyUser(): boolean {
  const db = getDb();
  return !!db.select({ id: users.id }).from(users).limit(1).get();
}
