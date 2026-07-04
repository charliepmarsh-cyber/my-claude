import { Hono } from "hono";
import { IngestRequest } from "../schemas.js";
import { ingestRawLeads } from "../ingest-core.js";
import type { RawLead } from "../../connectors/discovery-types.js";

const app = new Hono();

app.post("/", async (c) => {
  const parsed = IngestRequest.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.flatten() }, 400);
  }

  const { leads: ingestLeads, segment: defaultSegment, runPipeline: shouldRunPipeline } = parsed.data;

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

  const outcome = ingestRawLeads(rawLeads, { runPipelineAfter: shouldRunPipeline });

  if (outcome.job) {
    return c.json({
      ok: true,
      jobId: outcome.job.id,
      imported: outcome.imported,
      duplicates: outcome.duplicates,
      message: `${outcome.imported} leads imported, pipeline running`,
    }, 202);
  }

  return c.json({
    ok: true,
    imported: outcome.imported,
    duplicates: outcome.duplicates,
    message: `${outcome.imported} leads imported`,
  }, 200);
});

export default app;
