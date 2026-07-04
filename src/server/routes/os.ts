import { Hono } from "hono";
import { z } from "zod";
import { getAllLeads, getLeadById, saveLead, logAudit, getAuditLog } from "../../storage/database.js";
import { applyReview, queueForReview, type ReviewAction } from "../../review/index.js";
import { enrichLead } from "../../enrichment/index.js";
import { scoreLead } from "../../scoring/index.js";
import { draftOutreach } from "../../outreach/index.js";
import { runDiscovery } from "../../pipelines/discovery-pipeline.js";
import { hasRunningJob, runAsync, listJobs } from "../jobs.js";
import { getActiveCampaign } from "../../os/campaign.js";
import { computeFinanceSummary, saveFinanceSettings } from "../../os/finance.js";
import {
  indexCampaignAssets,
  generateMarketingContent,
  MARKETING_KINDS,
  type MarketingKind,
} from "../../os/marketing.js";
import { listMarketingContent, deleteMarketingContent } from "../../os/os-store.js";
import { setCrmStage, setTemperature, getTemperature, markSent, CRM_STAGES } from "../../os/crm.js";
import { nlSearch } from "../../os/search.js";
import importRoutes from "./import.js";
import type { Lead, LeadStatus, LeadTemperature } from "../../types/index.js";

const app = new Hono();

// ── Import (Excel/CSV upload) ───────────────────────────────────

app.route("/import", importRoutes);

// ── Overview (hub) ──────────────────────────────────────────────

app.get("/overview", (c) => {
  const leads = getAllLeads();

  const byStatus: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  for (const lead of leads) {
    byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
    if (lead.score?.tier) byTier[lead.score.tier] = (byTier[lead.score.tier] || 0) + 1;
  }

  const finance = computeFinanceSummary(leads);
  const assets = indexCampaignAssets();
  const content = listMarketingContent();

  // Score distribution (10-point buckets) for the hub chart
  const scoreDistribution = Array.from({ length: 10 }, (_, i) => ({
    bucket: `${i * 10}-${i * 10 + 9}`,
    count: leads.filter((l) => {
      const s = l.score?.finalScore;
      return s !== undefined && s !== null && s >= i * 10 && (i === 9 ? s <= 100 : s < (i + 1) * 10);
    }).length,
  }));

  // Top opportunities: best actionable leads by likelihood + score
  const topOpportunities = leads
    .filter((l) => !["won", "lost", "not_a_fit", "rejected", "closed"].includes(l.status))
    .sort(
      (a, b) =>
        (b.aiAnalysis?.likelihoodToBuy ?? 0) * 2 + (b.score?.finalScore ?? 0) -
        ((a.aiAnalysis?.likelihoodToBuy ?? 0) * 2 + (a.score?.finalScore ?? 0)),
    )
    .slice(0, 5)
    .map(summarizeLead);

  // Follow-up queue: everything waiting on a human touch
  const followUpQueue = leads
    .filter((l) => ["follow_up_due", "approved", "contacted", "proposal", "snoozed"].includes(l.status))
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .slice(0, 10)
    .map((l) => ({ ...summarizeLead(l), nextAction: l.nextAction }));

  return c.json({
    ok: true,
    campaign: getActiveCampaign(),
    sales: {
      totalLeads: leads.length,
      byStatus,
      byTier,
      reviewPending: byStatus["review_pending"] || 0,
      approved: byStatus["approved"] || 0,
      scoreDistribution,
      topOpportunities,
      followUpQueue,
      crmStages: CRM_STAGES.map((stage) => ({ stage, count: byStatus[stage] || 0 })),
    },
    marketing: {
      assetCount: assets.assets.length,
      assetsAvailable: assets.available,
      contentCount: content.length,
    },
    finance: {
      projectedTrials: finance.pipeline.projectedTrials,
      projectedMrrGbp: finance.pipeline.projectedMrrGbp,
      monthlyCostsGbp: finance.costs.monthlyTotalGbp,
      trialsVsTarget30d: finance.progress.trialsVsTarget30d,
    },
    jobs: listJobs(5),
  });
});

// ── Sales: leads + review ───────────────────────────────────────

function summarizeLead(lead: Lead) {
  return {
    id: lead.id,
    company: lead.company.name,
    website: lead.company.website,
    niche: lead.company.niche || lead.company.industry,
    contact: lead.contact.fullName || [lead.contact.firstName, lead.contact.lastName].filter(Boolean).join(" "),
    role: lead.contact.role || lead.contact.title,
    email: lead.contact.email,
    segment: lead.segment,
    status: lead.status,
    score: lead.score?.finalScore ?? null,
    tier: lead.score?.tier ?? null,
    likelihood: lead.aiAnalysis?.likelihoodToBuy ?? null,
    temperature: getTemperature(lead) ?? null,
    draftCount: lead.outreachDrafts.length,
    updatedAt: lead.updatedAt,
  };
}

app.get("/leads", (c) => {
  const status = c.req.query("status");
  const tier = c.req.query("tier");
  const q = c.req.query("q")?.toLowerCase();

  let leads = getAllLeads();
  if (status) leads = leads.filter((l) => l.status === status);
  if (tier) leads = leads.filter((l) => l.score?.tier === tier);
  if (q) {
    leads = leads.filter(
      (l) =>
        l.company.name.toLowerCase().includes(q) ||
        (l.contact.fullName || "").toLowerCase().includes(q) ||
        (l.company.niche || "").toLowerCase().includes(q),
    );
  }

  return c.json({ ok: true, count: leads.length, leads: leads.map(summarizeLead) });
});

app.get("/leads/:id", (c) => {
  const lead = getLeadById(c.req.param("id"));
  if (!lead) return c.json({ ok: false, error: "Lead not found" }, 404);
  return c.json({ ok: true, lead, audit: getAuditLog(lead.id) });
});

const ReviewRequest = z.object({
  action: z.enum(["approve", "edit", "reject", "snooze", "not_a_fit"]),
  notes: z.string().optional(),
  editedDrafts: z.any().optional(),
});

app.post("/leads/:id/review", async (c) => {
  const lead = getLeadById(c.req.param("id"));
  if (!lead) return c.json({ ok: false, error: "Lead not found" }, 404);

  const parsed = ReviewRequest.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);

  // Allow reviewing straight from "drafted" by queueing first
  const target = lead.status === "drafted" ? queueForReview(lead) : lead;
  const reviewed = applyReview(target, parsed.data as ReviewAction);
  saveLead(reviewed);
  logAudit(reviewed.id, `os_review_${parsed.data.action}`, parsed.data.notes);

  return c.json({ ok: true, lead: summarizeLead(reviewed), status: reviewed.status });
});

// ── Sales: CRM stage + temperature ──────────────────────────────

const StageRequest = z.object({
  stage: z.enum(["sent", "contacted", "meeting_booked", "demo", "proposal", "won", "lost"]),
  notes: z.string().optional(),
});

app.post("/leads/:id/stage", async (c) => {
  const lead = getLeadById(c.req.param("id"));
  if (!lead) return c.json({ ok: false, error: "Lead not found" }, 404);

  const parsed = StageRequest.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);

  try {
    let updated =
      parsed.data.stage === "sent"
        ? markSent(lead)
        : setCrmStage(lead, parsed.data.stage as LeadStatus);
    if (parsed.data.notes) {
      updated = { ...updated, reviewNotes: parsed.data.notes };
    }
    saveLead(updated);
    logAudit(updated.id, `os_crm_stage_${parsed.data.stage}`, parsed.data.notes);
    return c.json({ ok: true, lead: summarizeLead(updated), status: updated.status });
  } catch (err) {
    return c.json({ ok: false, error: (err as Error).message }, 400);
  }
});

const TemperatureRequest = z.object({
  temperature: z.enum(["hot", "warm", "cold"]),
});

app.post("/leads/:id/temperature", async (c) => {
  const lead = getLeadById(c.req.param("id"));
  if (!lead) return c.json({ ok: false, error: "Lead not found" }, 404);

  const parsed = TemperatureRequest.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);

  const updated = setTemperature(lead, parsed.data.temperature as LeadTemperature);
  saveLead(updated);
  logAudit(updated.id, `os_temperature_${parsed.data.temperature}`);
  return c.json({ ok: true, lead: summarizeLead(updated) });
});

// ── Sales: natural-language search ──────────────────────────────

const SearchRequest = z.object({
  query: z.string().min(2).max(500),
});

app.post("/search", async (c) => {
  const parsed = SearchRequest.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);

  const result = await nlSearch(parsed.data.query, getAllLeads());
  return c.json({
    ok: true,
    interpretation: result.interpretation,
    filter: result.filter,
    count: result.leads.length,
    leads: result.leads.map(summarizeLead),
  });
});

// ── Sales: run controls ─────────────────────────────────────────

const DiscoverRequest = z.object({
  segment: z.enum(["shopify", "ecommerce", "enterprise"]).default("shopify"),
  maxLeads: z.number().min(1).max(100).default(25),
});

app.post("/run/discover", async (c) => {
  if (hasRunningJob("discover")) {
    return c.json({ ok: false, error: "A discovery job is already running" }, 409);
  }
  const body = await c.req.json().catch(() => ({}));
  const parsed = DiscoverRequest.safeParse(body);
  if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);

  const { segment, maxLeads } = parsed.data;
  const job = runAsync("discover", () =>
    runDiscovery({ segment, maxLeads, dryRun: false, runPipelineAfter: true }),
  );
  return c.json({ ok: true, jobId: job.id, message: "Discovery started" }, 202);
});

/**
 * Process everything that's waiting: enrich new leads, score enriched,
 * draft scored (above threshold), queue drafted for review.
 */
app.post("/run/process", (c) => {
  if (hasRunningJob("pipeline")) {
    return c.json({ ok: false, error: "A pipeline job is already running" }, 409);
  }

  const job = runAsync("pipeline", async () => {
    const counts = { enriched: 0, scored: 0, drafted: 0, queued: 0 };

    for (const lead of getAllLeads().filter((l) => l.status === "new")) {
      saveLead(await enrichLead(lead));
      counts.enriched++;
    }

    for (const lead of getAllLeads().filter((l) => l.status === "enriched")) {
      const now = new Date().toISOString();
      saveLead({ ...lead, score: scoreLead(lead), status: "scored", scoredAt: now, updatedAt: now });
      counts.scored++;
    }

    const minScore = 30;
    for (const lead of getAllLeads().filter(
      (l) => l.status === "scored" && (l.score?.finalScore ?? 0) >= minScore,
    )) {
      saveLead(await draftOutreach(lead));
      counts.drafted++;
    }

    for (const lead of getAllLeads().filter((l) => l.status === "drafted")) {
      saveLead(queueForReview(lead));
      counts.queued++;
    }

    return counts;
  });

  return c.json({ ok: true, jobId: job.id, message: "Pipeline processing started" }, 202);
});

app.get("/jobs", (c) => c.json({ ok: true, jobs: listJobs(20) }));

// ── Marketing ───────────────────────────────────────────────────

app.get("/marketing", (c) => {
  const assets = indexCampaignAssets();
  return c.json({
    ok: true,
    assets,
    content: listMarketingContent(),
    kinds: MARKETING_KINDS,
  });
});

const GenerateRequest = z.object({
  kind: z.enum(["social_post", "outreach_angle", "higgsfield_prompts"]),
  topic: z.string().optional(),
  count: z.number().min(1).max(10).default(3),
});

app.post("/marketing/generate", async (c) => {
  const parsed = GenerateRequest.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ ok: false, error: parsed.error.flatten() }, 400);

  const { kind, topic, count } = parsed.data;
  const row = await generateMarketingContent(kind as MarketingKind, topic, count);
  return c.json({ ok: true, content: row });
});

app.delete("/marketing/content/:id", (c) => {
  const deleted = deleteMarketingContent(c.req.param("id"));
  if (!deleted) return c.json({ ok: false, error: "Content not found" }, 404);
  return c.json({ ok: true });
});

// ── Finance ─────────────────────────────────────────────────────

app.get("/finance", (c) => {
  return c.json({ ok: true, finance: computeFinanceSummary(getAllLeads()) });
});

app.put("/finance", async (c) => {
  const body = await c.req.json();
  try {
    const settings = saveFinanceSettings(body);
    return c.json({ ok: true, finance: computeFinanceSummary(getAllLeads()), settings });
  } catch (err) {
    return c.json({ ok: false, error: (err as Error).message }, 400);
  }
});

export default app;
