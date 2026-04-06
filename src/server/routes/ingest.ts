import { Hono } from "hono";
import { IngestRequest } from "../schemas.js";
import { runAsync } from "../jobs.js";
import { rawLeadToLead, extractDomain } from "../../connectors/lead-mapper.js";
import { saveLeads, getAllLeads } from "../../storage/database.js";
import { runPipeline } from "../../pipelines/main-pipeline.js";
import { fireReviewQueueUpdated } from "../outbound.js";
import { getLeadsByStatus } from "../../storage/database.js";
import type { RawLead } from "../../connectors/discovery-types.js";

const app = new Hono();

app.post("/", async (c) => {
  const parsed = IngestRequest.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.flatten() }, 400);
  }

  const { leads: ingestLeads, segment: defaultSegment, runPipeline: shouldRunPipeline } = parsed.data;

  // Convert to RawLead, then to Lead
  const rawLeads: RawLead[] = ingestLeads.map((il) => ({
    companyName: il.companyName,
    website: il.website,
    platform: il.platform,
    industry: il.industry,
    niche: il.niche,
    sizeEstimate: il.sizeEstimate,
    contactName: il.contactName,
    contactRole: il.contactRole,
    contactEmail: il.contactEmail,
    linkedinUrl: il.linkedinUrl,
    xUrl: il.xUrl,
    segment: il.segment || defaultSegment || "ecommerce",
    source: "n8n_webhook",
    notes: il.notes,
    tags: il.tags,
  }));

  // Deduplicate against existing storage
  const existingDomains = new Set<string>();
  for (const lead of getAllLeads()) {
    const d = extractDomain(lead.company.website);
    if (d) existingDomains.add(d);
  }

  const newRawLeads = rawLeads.filter((r) => {
    const d = extractDomain(r.website);
    return !d || !existingDomains.has(d);
  });

  const dupeCount = rawLeads.length - newRawLeads.length;
  const newLeads = newRawLeads.map(rawLeadToLead);

  if (newLeads.length > 0) {
    saveLeads(newLeads);
  }

  // Optionally run pipeline
  if (shouldRunPipeline && newLeads.length > 0) {
    const queueBefore = getLeadsByStatus("review_pending").length;

    const job = runAsync("pipeline", async () => {
      const result = await runPipeline(newLeads);
      const queueAfter = getLeadsByStatus("review_pending").length;
      if (queueAfter > queueBefore) {
        await fireReviewQueueUpdated(queueAfter, queueAfter - queueBefore);
      }
      return result;
    });

    return c.json({
      ok: true,
      jobId: job.id,
      imported: newLeads.length,
      duplicates: dupeCount,
      message: `${newLeads.length} leads imported, pipeline running`,
    }, 202);
  }

  return c.json({
    ok: true,
    imported: newLeads.length,
    duplicates: dupeCount,
    message: `${newLeads.length} leads imported`,
  }, 200);
});

export default app;
