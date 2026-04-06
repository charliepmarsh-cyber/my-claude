import type { Context, Next } from "hono";
import { log } from "../../lib/logger.js";

let warned = false;

/**
 * Bearer token auth middleware.
 * If WEBHOOK_AUTH_TOKEN is set, validates Authorization header.
 * If not set, allows all requests with a startup warning.
 */
export async function authMiddleware(c: Context, next: Next) {
  const token = process.env.WEBHOOK_AUTH_TOKEN?.trim();

  if (!token) {
    if (!warned) {
      log.warn("WEBHOOK_AUTH_TOKEN not set — webhook endpoints are unauthenticated");
      warned = true;
    }
    return next();
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ ok: false, error: "Missing Authorization header" }, 401);
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer" || parts[1] !== token) {
    return c.json({ ok: false, error: "Invalid bearer token" }, 401);
  }

  return next();
}
