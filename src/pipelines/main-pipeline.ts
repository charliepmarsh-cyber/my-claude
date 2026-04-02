import type { Lead, PipelineConfig, OutreachChannel } from "../types/index.js";
import { enrichLead } from "../enrichment/enricher.js";
import { scoreLead } from "../scoring/scorer.js";
import { draftOutreach } from "../outreach/drafter.js";
import { validateLead, validateDraft } from "../quality/validator.js";
import { queueForReview } from "../review/reviewer.js";
import { deduplicateLeads } from "../lib/dedup.js";
import { saveLead, logAudit } from "../storage/database.js";
import { log } from "../lib/logger.js";

const DEFAULT_CONFIG: PipelineConfig = {
  llmRateLimit: 20,
  enrichmentEnabled: true,
  scoringEnabled: true,
  draftingEnabled: true,
  channels: ["linkedin", "x", "email"],
  minScoreForDrafting: 30,
  excludeTierD: true,
  dryRun: false,
};

export interface PipelineResult {
  total: number;
  deduplicated: number;
  enriched: number;
  scored: number;
  drafted: number;
  queued: number;
  excluded: number;
  errors: number;
  leads: Lead[];
}

/**
 * Run the full pipeline: deduplicate -> enrich -> score -> draft -> queue for review.
 */
export async function runPipeline(
  leads: Lead[],
  config: Partial<PipelineConfig> = {}
): Promise<PipelineResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const result: PipelineResult = {
    total: leads.length,
    deduplicated: 0,
    enriched: 0,
    scored: 0,
    drafted: 0,
    queued: 0,
    excluded: 0,
    errors: 0,
    leads: [],
  };

  // Step 1: Deduplicate
  log.info(`Pipeline: deduplicating ${leads.length} leads...`);
  const [unique, dupeCount] = deduplicateLeads(leads);
  result.deduplicated = dupeCount;
  if (dupeCount > 0) log.info(`Removed ${dupeCount} duplicates`);

  // Step 2: Validate inputs
  const valid: Lead[] = [];
  for (const lead of unique) {
    const validation = validateLead(lead);
    if (validation.valid) {
      valid.push(lead);
    } else {
      const errors = validation.issues.filter((i) => i.severity === "error");
      log.warn(`Skipping ${lead.company.name}: ${errors.map((e) => e.message).join(", ")}`);
      result.errors++;
    }
  }

  // Process each lead through the pipeline
  for (const lead of valid) {
    try {
      let processed = lead;

      // Step 3: Enrich
      if (cfg.enrichmentEnabled) {
        processed = await enrichLead(processed);
        result.enriched++;
        logAuditSafe(processed.id, "enriched");
      }

      // Step 4: Score
      if (cfg.scoringEnabled) {
        const score = scoreLead(processed);
        processed = {
          ...processed,
          score,
          status: "scored",
          scoredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        result.scored++;
        logAuditSafe(processed.id, "scored", `Score: ${score.finalScore} (${score.tier})`);

        // Check exclusion
        if (score.excluded) {
          processed = { ...processed, status: "not_a_fit" };
          result.excluded++;
          logAuditSafe(processed.id, "excluded", score.exclusionReason);
          if (!cfg.dryRun) saveLead(processed);
          result.leads.push(processed);
          continue;
        }

        // Skip low-score leads
        if (cfg.excludeTierD && score.tier === "D") {
          log.info(`Skipping ${processed.company.name} (Tier D, score ${score.finalScore})`);
          result.excluded++;
          if (!cfg.dryRun) saveLead(processed);
          result.leads.push(processed);
          continue;
        }

        if (score.finalScore < cfg.minScoreForDrafting) {
          log.info(`Skipping drafting for ${processed.company.name} (score ${score.finalScore} < ${cfg.minScoreForDrafting})`);
          if (!cfg.dryRun) saveLead(processed);
          result.leads.push(processed);
          continue;
        }
      }

      // Step 5: Draft outreach
      if (cfg.draftingEnabled) {
        processed = await draftOutreach(processed, cfg.channels as OutreachChannel[]);
        result.drafted++;
        logAuditSafe(processed.id, "drafted", `${processed.outreachDrafts.length} drafts`);

        // Validate drafts
        for (const draft of processed.outreachDrafts) {
          const draftValidation = validateDraft(draft);
          draft.qualityScore = draftValidation.overallScore;
          draft.qualityIssues = draftValidation.issues
            .filter((i) => i.severity !== "info")
            .map((i) => `[${i.severity}] ${i.message}`);
        }
      }

      // Step 6: Queue for review
      processed = queueForReview(processed);
      result.queued++;
      logAuditSafe(processed.id, "queued_for_review");

      // Save
      if (!cfg.dryRun) saveLead(processed);
      result.leads.push(processed);
    } catch (err) {
      log.error(`Pipeline error for ${lead.company.name}: ${(err as Error).message}`);
      result.errors++;
      result.leads.push(lead);
    }
  }

  log.success(
    `Pipeline complete: ${result.total} total, ${result.enriched} enriched, ${result.scored} scored, ${result.drafted} drafted, ${result.queued} queued, ${result.excluded} excluded, ${result.errors} errors`
  );

  return result;
}

function logAuditSafe(leadId: string, action: string, details?: string): void {
  try {
    logAudit(leadId, action, details);
  } catch {
    // Audit logging is non-critical
  }
}
