import type { RawLead } from "../connectors/discovery-types.js";
import { rawLeadToLead, extractDomain } from "../connectors/lead-mapper.js";
import { saveLeads, getAllLeads, getLeadsByStatus } from "../storage/database.js";
import { runPipeline } from "../pipelines/main-pipeline.js";
import { fireReviewQueueUpdated } from "./outbound.js";
import { runAsync, type Job } from "./jobs.js";

export interface IngestOutcome {
  imported: number;
  duplicates: number;
  job?: Job;
}

/**
 * Shared ingest flow: dedupe raw leads against storage (by domain),
 * save the new ones, and optionally run the pipeline over them as a
 * background job. Used by /webhook/ingest and /api/os/import.
 */
export function ingestRawLeads(rawLeads: RawLead[], opts: { runPipelineAfter?: boolean } = {}): IngestOutcome {
  const existingDomains = new Set<string>();
  for (const lead of getAllLeads()) {
    const d = extractDomain(lead.company.website);
    if (d) existingDomains.add(d);
  }

  // Also dedupe within the batch itself
  const seenDomains = new Set<string>();
  const newRawLeads = rawLeads.filter((r) => {
    const d = extractDomain(r.website);
    if (!d) return true;
    if (existingDomains.has(d) || seenDomains.has(d)) return false;
    seenDomains.add(d);
    return true;
  });

  const duplicates = rawLeads.length - newRawLeads.length;
  const newLeads = newRawLeads.map(rawLeadToLead);

  if (newLeads.length > 0) {
    saveLeads(newLeads);
  }

  let job: Job | undefined;
  if (opts.runPipelineAfter && newLeads.length > 0) {
    const queueBefore = getLeadsByStatus("review_pending").length;
    job = runAsync("pipeline", async () => {
      const result = await runPipeline(newLeads);
      const queueAfter = getLeadsByStatus("review_pending").length;
      if (queueAfter > queueBefore) {
        await fireReviewQueueUpdated(queueAfter, queueAfter - queueBefore);
      }
      return result;
    });
  }

  return { imported: newLeads.length, duplicates, job };
}
