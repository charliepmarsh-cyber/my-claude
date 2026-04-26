import { serve } from "@hono/node-server";
import { createApp } from "./index.js";
import { initDb } from "../storage/database.js";
import { log } from "../lib/logger.js";

export interface ServerOptions {
  port: number;
  dbPath?: string;
}

export async function startServer(opts: ServerOptions): Promise<void> {
  initDb(opts.dbPath);

  const app = createApp();
  const port = opts.port;

  log.info("Starting outreach webhook server...");

  if (!process.env.WEBHOOK_AUTH_TOKEN?.trim()) {
    log.warn("WEBHOOK_AUTH_TOKEN not set — endpoints are unauthenticated");
  }

  serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
    log.success(`Server running on http://localhost:${port}`);
    console.log("");
    console.log("  Endpoints:");
    console.log(`    POST  http://localhost:${port}/webhook/discover   — trigger discovery`);
    console.log(`    POST  http://localhost:${port}/webhook/ingest     — import leads`);
    console.log(`    POST  http://localhost:${port}/webhook/redraft    — redraft CortexCart messages`);
    console.log(`    GET   http://localhost:${port}/webhook/status     — pipeline stats + job status`);
    console.log(`    GET   http://localhost:${port}/webhook/leads      — query leads`);
    console.log(`    GET   http://localhost:${port}/webhook/export     — export for CRM sync`);
    console.log(`    GET   http://localhost:${port}/health             — health check`);
    console.log("");
    if (process.env.N8N_WEBHOOK_URL) {
      log.info(`Outbound webhooks → ${process.env.N8N_WEBHOOK_URL}`);
    } else {
      log.info("N8N_WEBHOOK_URL not set — outbound webhooks disabled");
    }
  });
}
