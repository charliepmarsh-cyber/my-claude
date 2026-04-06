import { Hono } from "hono";
import { RedraftRequest } from "../schemas.js";
import { hasRunningJob, runAsync } from "../jobs.js";
import { fireRedraftComplete } from "../outbound.js";
import { redraftAllLeads } from "../../scripts/redraft-cortexcart.js";

const app = new Hono();

app.post("/", async (c) => {
  const parsed = RedraftRequest.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.flatten() }, 400);
  }

  if (hasRunningJob("redraft")) {
    return c.json({ ok: false, error: "A redraft job is already running" }, 409);
  }

  const config = parsed.data;

  const job = runAsync("redraft", async () => {
    const result = await redraftAllLeads({ statuses: config.statuses, dryRun: config.dryRun });
    await fireRedraftComplete(job.id, result.count);
    return result;
  });

  return c.json({ ok: true, jobId: job.id, message: "Redraft started" }, 202);
});

export default app;
