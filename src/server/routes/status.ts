import { Hono } from "hono";
import { getAllLeads } from "../../storage/database.js";
import { reviewQueueStats } from "../../review/reviewer.js";
import { getJob, listJobs } from "../jobs.js";

const app = new Hono();

app.get("/", (c) => {
  const leads = getAllLeads();
  const stats = reviewQueueStats(leads);
  const segments: Record<string, number> = {};
  const tiers: Record<string, number> = {};

  for (const lead of leads) {
    segments[lead.segment] = (segments[lead.segment] || 0) + 1;
    if (lead.score?.tier) tiers[lead.score.tier] = (tiers[lead.score.tier] || 0) + 1;
  }

  const jobId = c.req.query("jobId");
  const specificJob = jobId ? getJob(jobId) : undefined;

  return c.json({
    ok: true,
    stats: {
      totalLeads: leads.length,
      byStatus: stats,
      bySegment: segments,
      byTier: tiers,
      reviewQueueSize: stats["review_pending"] || 0,
    },
    recentJobs: listJobs(5),
    ...(specificJob ? { job: specificJob } : {}),
  });
});

export default app;
