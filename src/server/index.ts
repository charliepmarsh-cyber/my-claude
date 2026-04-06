import { Hono } from "hono";
import { ZodError } from "zod";
import { authMiddleware } from "./middleware/auth.js";
import { requestLogger } from "./middleware/request-logger.js";
import discoverRoutes from "./routes/discover.js";
import ingestRoutes from "./routes/ingest.js";
import redraftRoutes from "./routes/redraft.js";
import statusRoutes from "./routes/status.js";
import leadsRoutes from "./routes/leads.js";
import exportRoutes from "./routes/export.js";

/**
 * Create and configure the Hono app.
 * Separated from listen() to enable testing with app.request().
 */
export function createApp(): Hono {
  const app = new Hono();

  // Global middleware
  app.use("*", requestLogger);
  app.use("/webhook/*", authMiddleware);

  // Routes
  app.route("/webhook/discover", discoverRoutes);
  app.route("/webhook/ingest", ingestRoutes);
  app.route("/webhook/redraft", redraftRoutes);
  app.route("/webhook/status", statusRoutes);
  app.route("/webhook/leads", leadsRoutes);
  app.route("/webhook/export", exportRoutes);

  // Health check
  app.get("/health", (c) => c.json({ ok: true, service: "outreach-agent" }));

  // Global error handler
  app.onError((err, c) => {
    if (err instanceof ZodError) {
      return c.json({ ok: false, error: err.flatten() }, 400);
    }
    return c.json({ ok: false, error: (err as Error).message }, 500);
  });

  // 404
  app.notFound((c) => c.json({ ok: false, error: "Not found" }, 404));

  return app;
}
