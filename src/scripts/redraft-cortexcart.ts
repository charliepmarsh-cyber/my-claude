#!/usr/bin/env node
/**
 * Regenerate all lead drafts with CortexCart v2 messaging.
 * Produces dual variants (A: insight-driven, B: question-driven)
 * for email, plus LinkedIn, X, and follow-ups.
 *
 * Can be run standalone (npx tsx src/scripts/redraft-cortexcart.ts)
 * or imported as a function (for webhook server).
 */
import { getAllLeads, saveLead, logAudit } from "../storage/database.js";
import { callLlmJson } from "../lib/llm.js";
import { validateDraft } from "../quality/validator.js";
import { log } from "../lib/logger.js";
import {
  CORTEXCART_SYSTEM_PROMPT,
  buildCortexCartEmail,
  buildCortexCartLinkedInNote,
  buildCortexCartLinkedInMessage,
  buildCortexCartXEngagement,
  buildCortexCartXDm,
  buildCortexCartFollowUp,
} from "../prompts/cortexcart.js";
import type { OutreachDraft, Lead, LeadStatus } from "../types/index.js";

interface SingleDraft {
  subject?: string;
  body: string;
  personalizationSnippet: string;
  signalUsed: string;
}

interface DualEmailDraft {
  variantA: SingleDraft;
  variantB: SingleDraft;
}

export interface RedraftOptions {
  statuses?: LeadStatus[];
  dryRun?: boolean;
}

export interface RedraftResult {
  count: number;
  leadNames: string[];
}

const DEFAULT_STATUSES: LeadStatus[] = ["new", "review_pending", "scored", "drafted", "enriched", "approved"];

/**
 * Redraft all matching leads with CortexCart v2 messaging.
 * Assumes the database is already initialized.
 */
export async function redraftAllLeads(options?: RedraftOptions): Promise<RedraftResult> {
  const statuses = options?.statuses || DEFAULT_STATUSES;
  const dryRun = options?.dryRun ?? false;

  const allLeads = getAllLeads();
  const leads = allLeads.filter((l) => statuses.includes(l.status));

  if (leads.length === 0) {
    log.info("No leads to draft for.");
    return { count: 0, leadNames: [] };
  }

  log.info(`Regenerating CortexCart v2 drafts for ${leads.length} leads${dryRun ? " (dry run)" : ""}...\n`);

  const leadNames: string[] = [];

  for (const lead of leads) {
    const firstName = lead.contact.firstName || lead.contact.fullName?.split(" ")[0] || "there";
    const role = lead.contact.role || lead.contact.title || "Founder";
    const company = lead.company.name;
    const niche = lead.company.niche || lead.company.industry || inferNiche(lead);
    const observation = buildObservation(lead);
    const painHypothesis = buildPainHypothesis(lead);

    log.info(`━━━ ${company} (${firstName}, ${role}) ━━━`);

    const drafts: OutreachDraft[] = [];
    const now = new Date().toISOString();
    const ctx = { contactFirstName: firstName, contactRole: role, companyName: company, niche, observation, painHypothesis };

    // 1. Cold Email (Variant A + B)
    try {
      const r = await callLlmJson<DualEmailDraft>({
        system: CORTEXCART_SYSTEM_PROMPT,
        prompt: buildCortexCartEmail(ctx),
      });
      drafts.push(makeDraft("email", "email_first_touch", {
        subject: r.variantA.subject,
        body: r.variantA.body,
        personalizationSnippet: `[Variant A - Insight] ${r.variantA.personalizationSnippet}`,
        signalUsed: r.variantA.signalUsed,
      }, now));
      drafts.push(makeDraft("email", "email_first_touch", {
        subject: r.variantB.subject,
        body: r.variantB.body,
        personalizationSnippet: `[Variant B - Question] ${r.variantB.personalizationSnippet}`,
        signalUsed: r.variantB.signalUsed,
      }, now));
    } catch (e) { log.warn(`Email failed: ${(e as Error).message}`); }

    // 2. LinkedIn connection note
    try {
      const r = await callLlmJson<SingleDraft>({
        system: CORTEXCART_SYSTEM_PROMPT,
        prompt: buildCortexCartLinkedInNote({ contactFirstName: firstName, companyName: company, niche, observation }),
      });
      drafts.push(makeDraft("linkedin", "linkedin_connection_note", r, now));
    } catch (e) { log.warn(`LinkedIn note failed: ${(e as Error).message}`); }

    // 3. LinkedIn follow-up DM
    try {
      const r = await callLlmJson<SingleDraft>({
        system: CORTEXCART_SYSTEM_PROMPT,
        prompt: buildCortexCartLinkedInMessage(ctx),
      });
      drafts.push(makeDraft("linkedin", "linkedin_first_message", r, now));
    } catch (e) { log.warn(`LinkedIn DM failed: ${(e as Error).message}`); }

    // 4. X engagement strategy
    try {
      const r = await callLlmJson<SingleDraft>({
        system: CORTEXCART_SYSTEM_PROMPT,
        prompt: buildCortexCartXEngagement({ contactFirstName: firstName, companyName: company, niche, observation }),
      });
      drafts.push(makeDraft("x", "x_engagement_idea", r, now));
    } catch (e) { log.warn(`X engagement failed: ${(e as Error).message}`); }

    // 5. X DM
    try {
      const r = await callLlmJson<SingleDraft>({
        system: CORTEXCART_SYSTEM_PROMPT,
        prompt: buildCortexCartXDm({ contactFirstName: firstName, companyName: company, niche, observation }),
      });
      drafts.push(makeDraft("x", "x_dm", r, now));
    } catch (e) { log.warn(`X DM failed: ${(e as Error).message}`); }

    // 6. Follow-up #1 (Day 3-5)
    try {
      const r = await callLlmJson<SingleDraft>({
        system: CORTEXCART_SYSTEM_PROMPT,
        prompt: buildCortexCartFollowUp({ contactFirstName: firstName, companyName: company, followUpNumber: 1 }),
      });
      drafts.push(makeDraft("email", "email_follow_up_1", r, now));
    } catch (e) { log.warn(`Follow-up 1 failed: ${(e as Error).message}`); }

    // 7. Follow-up #2 (Day 10, final)
    try {
      const r = await callLlmJson<SingleDraft>({
        system: CORTEXCART_SYSTEM_PROMPT,
        prompt: buildCortexCartFollowUp({ contactFirstName: firstName, companyName: company, followUpNumber: 2 }),
      });
      drafts.push(makeDraft("email", "email_follow_up_2", r, now));
    } catch (e) { log.warn(`Follow-up 2 failed: ${(e as Error).message}`); }

    // Validate all drafts
    for (const draft of drafts) {
      const v = validateDraft(draft);
      draft.qualityScore = v.overallScore;
      draft.qualityIssues = v.issues.filter((i) => i.severity !== "info").map((i) => `[${i.severity}] ${i.message}`);
    }

    if (!dryRun) {
      const updated: Lead = {
        ...lead,
        outreachDrafts: drafts,
        status: "approved",
        reviewedAt: now,
        updatedAt: now,
        nextAction: "Ready to send — copy drafts and send manually",
      };
      saveLead(updated);
      logAudit(lead.id, "redrafted_cortexcart_v2", `${drafts.length} drafts (incl. A/B email variants + follow-ups)`);
    }

    leadNames.push(company);
    log.success(`${company}: ${drafts.length} drafts generated ✓\n`);
  }

  return { count: leadNames.length, leadNames };
}

// ── Helpers ─────────────────────────────────────────────────────

function buildObservation(lead: Lead): string {
  // ONLY include facts we actually know — never invent details
  const facts: string[] = [];
  if (lead.contact.role) facts.push(`Role: ${lead.contact.role}`);
  if (lead.company.name) facts.push(`Company: ${lead.company.name}`);
  if (lead.company.website) facts.push(`Website: ${lead.company.website}`);
  if (lead.company.industry) facts.push(`Industry: ${lead.company.industry}`);
  if (lead.company.sizeEstimate) facts.push(`Team size: ~${lead.company.sizeEstimate}`);
  if (lead.company.platform) facts.push(`Platform: ${lead.company.platform}`);
  // Only include signals that came from real data, not LLM-generated ones
  if (lead.signals.rawNotes && !lead.signals.rawNotes.includes("[ENRICHMENT_FAILED]")) {
    facts.push(`Notes: ${lead.signals.rawNotes.slice(0, 100)}`);
  }
  if (facts.length <= 2) facts.push("(Limited data — keep message general, ask questions instead of making assumptions)");
  return facts.join(". ");
}

function buildPainHypothesis(lead: Lead): string {
  // Don't invent pain points — use a general niche-relevant hypothesis
  if (lead.painPoints.length > 0 && lead.painPoints[0].confidence === "high") {
    return lead.painPoints[0].hypothesis;
  }
  return "Most Shopify store owners are juggling too many tools for analytics, social, and CRM — we don't know this person's specific situation yet";
}

function inferNiche(lead: Lead): string {
  const name = lead.company.name.toLowerCase();
  if (name.includes("health") || name.includes("wellness")) return "health & wellness";
  if (name.includes("kitchen") || name.includes("home")) return "kitchen & home goods";
  if (name.includes("beauty") || name.includes("skin")) return "beauty & skincare";
  if (name.includes("fashion") || name.includes("apparel")) return "fashion & apparel";
  if (name.includes("food") || name.includes("beverage")) return "food & beverage";
  return "ecommerce";
}

function makeDraft(
  channel: OutreachDraft["channel"],
  messageType: OutreachDraft["messageType"],
  result: SingleDraft,
  createdAt: string,
): OutreachDraft {
  return {
    channel,
    messageType,
    subject: result.subject || undefined,
    body: String(result.body || ""),
    personalizationSnippet: String(result.personalizationSnippet || ""),
    signalUsed: String(result.signalUsed || ""),
    qualityIssues: [],
    createdAt,
  };
}

// ── Standalone execution ────────────────────────────────────────

const isMainModule = process.argv[1]?.includes("redraft-cortexcart");
if (isMainModule) {
  const dotenv = await import("dotenv");
  dotenv.config({ override: true });
  const { initDb } = await import("../storage/database.js");
  initDb();
  const result = await redraftAllLeads();
  log.success(`Redrafted ${result.count} leads. Export with:\n  npx tsx src/cli.ts export output/cortexcart-outreach.csv`);
}
