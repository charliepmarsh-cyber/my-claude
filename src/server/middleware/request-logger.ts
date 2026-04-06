import type { Context, Next } from "hono";
import { log } from "../../lib/logger.js";

/**
 * Logs every request: method, path, status, duration.
 */
export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const status = c.res.status;
  log.info(`${c.req.method} ${c.req.path} ${status} (${ms}ms)`);
}
