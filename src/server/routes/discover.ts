import { Hono } from "hono";
import { DiscoverRequest } from "../schemas.js";
import { hasRunningJob, runAsync } from "../jobs.js";
import { fireDiscoveryComplete, fireReviewQueueUpdated } from "../outbound.js";
import { runDiscovery } from "../../pipelines/discovery-pipeline.js";
import { getLeadsByStatus } from "../../storage/database.js";

const app = new Hono();

app.post("/", async (c) => {
  const parsed = DiscoverRequest.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.flatten() }, 400);
  }

  if (hasRunningJob("discover")) {
    return c.json({ ok: false, error: "A discovery job is already running" }, 409);
  }

  const config = parsed.data;
  const queueBefore = getLeadsByStatus("review_pending").length;

  const job = runAsync("discover", async () => {
    const result = await runDiscovery({
      segment: config.segment,
      maxLeads: config.maxLeads,
      sources: config.sources,
      filters: config.filters,
      dryRun: config.dryRun,
      runPipelineAfter: config.runPipeline,
    });

    // Fire outbound webhooks
    await fireDiscoveryComplete(job.id, {
      totalFound: result.totalFound,
      totalNew: result.totalNew,
      segment: config.segment,
    });

    const queueAfter = getLeadsByStatus("review_pending").length;
    if (queueAfter > queueBefore) {
      await fireReviewQueueUpdated(queueAfter, queueAfter - queueBefore);
    }

    return result;
  });

  return c.json({ ok: true, jobId: job.id, message: "Discovery started" }, 202);
});

export default app;
