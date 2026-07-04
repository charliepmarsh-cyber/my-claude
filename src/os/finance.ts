import { z } from "zod";
import type { Lead } from "../types/index.js";
import { getKv, setKv } from "./os-store.js";

/**
 * Finance department: targets, tool costs, and a pipeline-value model
 * projected from live lead tiers. CortexCart has zero customers today,
 * so "finance" = burn + targets + what the pipeline should convert to.
 */

export const FinanceSettings = z.object({
  targets: z
    .object({
      trials30d: z.number().default(10),
      trials90d: z.number().default(50),
      paying90d: z.number().default(10),
      mrr90dGbp: z.number().default(290),
    })
    .default({}),
  actuals: z
    .object({
      trials: z.number().default(0),
      paying: z.number().default(0),
      mrrGbp: z.number().default(0),
    })
    .default({}),
  costs: z
    .array(z.object({ name: z.string(), monthlyGbp: z.number() }))
    .default([
      { name: "Apollo.io", monthlyGbp: 39 },
      { name: "Hunter.io", monthlyGbp: 34 },
      { name: "Claude API (est.)", monthlyGbp: 20 },
      { name: "Railway hosting", monthlyGbp: 5 },
      { name: "AWS (CortexCart infra)", monthlyGbp: 30 },
    ]),
  assumptions: z
    .object({
      // Chance an outreached lead of each tier starts a trial
      trialRateByTier: z
        .object({
          A: z.number().default(0.08),
          B: z.number().default(0.04),
          C: z.number().default(0.015),
          D: z.number().default(0),
        })
        .default({}),
      trialToPaidRate: z.number().default(0.25),
      priceGbpPerMonth: z.number().default(29),
    })
    .default({}),
});
export type FinanceSettings = z.infer<typeof FinanceSettings>;

const KV_KEY = "finance.settings";

export function getFinanceSettings(): FinanceSettings {
  const stored = getKv<unknown>(KV_KEY);
  // Parse through the schema so missing fields pick up defaults
  const parsed = FinanceSettings.safeParse(stored ?? {});
  if (parsed.success) return parsed.data;
  return FinanceSettings.parse({});
}

export function saveFinanceSettings(input: unknown): FinanceSettings {
  const settings = FinanceSettings.parse(input);
  setKv(KV_KEY, settings);
  return settings;
}

// Statuses that count as live pipeline (not archived/dead)
const ACTIVE_STATUSES = new Set([
  "new",
  "enriching",
  "enriched",
  "scored",
  "drafting",
  "drafted",
  "review_pending",
  "approved",
  "edited",
  "sent",
  "replied",
  "follow_up_due",
]);

export interface FinanceSummary {
  settings: FinanceSettings;
  pipeline: {
    activeLeads: number;
    tierCounts: Record<"A" | "B" | "C" | "D" | "unscored", number>;
    projectedTrials: number;
    projectedPaying: number;
    projectedMrrGbp: number;
    projectedArrGbp: number;
  };
  costs: {
    monthlyTotalGbp: number;
    items: Array<{ name: string; monthlyGbp: number }>;
  };
  progress: {
    trialsVsTarget30d: { actual: number; target: number };
    mrrVsTarget90d: { actualGbp: number; targetGbp: number };
  };
}

export function computeFinanceSummary(leads: Lead[]): FinanceSummary {
  const settings = getFinanceSettings();
  const active = leads.filter((l) => ACTIVE_STATUSES.has(l.status));

  const tierCounts: FinanceSummary["pipeline"]["tierCounts"] = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    unscored: 0,
  };
  for (const lead of active) {
    const tier = lead.score?.tier;
    if (tier) tierCounts[tier]++;
    else tierCounts.unscored++;
  }

  const rates = settings.assumptions.trialRateByTier;
  const projectedTrials =
    tierCounts.A * rates.A + tierCounts.B * rates.B + tierCounts.C * rates.C + tierCounts.D * rates.D;
  const projectedPaying = projectedTrials * settings.assumptions.trialToPaidRate;
  const projectedMrrGbp = projectedPaying * settings.assumptions.priceGbpPerMonth;

  const monthlyTotalGbp = settings.costs.reduce((sum, c) => sum + c.monthlyGbp, 0);

  return {
    settings,
    pipeline: {
      activeLeads: active.length,
      tierCounts,
      projectedTrials: round2(projectedTrials),
      projectedPaying: round2(projectedPaying),
      projectedMrrGbp: round2(projectedMrrGbp),
      projectedArrGbp: round2(projectedMrrGbp * 12),
    },
    costs: {
      monthlyTotalGbp: round2(monthlyTotalGbp),
      items: settings.costs,
    },
    progress: {
      trialsVsTarget30d: { actual: settings.actuals.trials, target: settings.targets.trials30d },
      mrrVsTarget90d: { actualGbp: settings.actuals.mrrGbp, targetGbp: settings.targets.mrr90dGbp },
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
