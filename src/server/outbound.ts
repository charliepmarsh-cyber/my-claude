import { log } from "../lib/logger.js";

interface WebhookEvent {
  event: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Fire an outbound webhook to N8N_WEBHOOK_URL.
 * Fire-and-forget: logs but never throws.
 * Retries once on network failure with 2s delay.
 */
export async function fireWebhook(payload: WebhookEvent): Promise<void> {
  const url = process.env.N8N_WEBHOOK_URL?.trim();
  if (!url) return; // silently skip if not configured

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        log.debug(`Outbound webhook fired: ${payload.event}`);
        return;
      }
      log.warn(`Outbound webhook ${payload.event} returned ${res.status}`);
      return; // non-network error, don't retry
    } catch (err) {
      if (attempt === 0) {
        log.debug(`Outbound webhook failed, retrying in 2s...`);
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        log.warn(`Outbound webhook ${payload.event} failed after retry: ${(err as Error).message}`);
      }
    }
  }
}

// ── Convenience event helpers ───────────────────────────────────

export function fireDiscoveryComplete(jobId: string, summary: { totalFound: number; totalNew: number; segment: string }) {
  return fireWebhook({ event: "discovery_complete", timestamp: new Date().toISOString(), jobId, summary });
}

export function firePipelineComplete(jobId: string, summary: { total: number; enriched: number; scored: number; drafted: number; queued: number; errors: number }) {
  return fireWebhook({ event: "pipeline_complete", timestamp: new Date().toISOString(), jobId, summary });
}

export function fireReviewQueueUpdated(queueSize: number, newItems: number) {
  return fireWebhook({ event: "review_queue_updated", timestamp: new Date().toISOString(), queueSize, newItems });
}

export function fireRedraftComplete(jobId: string, leadsRedrafted: number) {
  return fireWebhook({ event: "redraft_complete", timestamp: new Date().toISOString(), jobId, leadsRedrafted });
}
