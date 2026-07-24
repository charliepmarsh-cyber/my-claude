/**
 * Post-import categorisation pass: `npx tsx scripts/categorize.ts`
 *
 * Rules-based and idempotent — only fills fields that are currently
 * unknown/uncategorised (never overwrites your choices):
 *   - icpCategory from job title + notes keywords
 *   - seniority / isFounder / decisionAuthority from the title where obvious
 * Then recomputes completeness + all scores for every live lead.
 */
import path from "node:path";
import { eq, isNull } from "drizzle-orm";
import { createDb } from "../src/db";
import { buyingSignals, companies, discoveries, leads, painHypotheses, researchItems, scores } from "../src/db/schema";
import { DEFAULT_SETTINGS, type IcpCategory } from "../src/lib/constants";
import { computeCompleteness, computeScoreSet } from "../src/lib/scoring";
import { mapApolloSeniority } from "../src/lib/enrichment/apollo-mapping";
import { newId } from "../src/lib/ids";

const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "lead-os.db");
const { db, sqlite } = createDb(file);

type Rule = { test: RegExp; icp: IcpCategory; useNotes?: boolean };
/** Ordered — first match wins. Title is primary; notes only where flagged. */
const RULES: Rule[] = [
  { test: /agentic ai|ai automation|ai engineer|ai consultant|crm \/ ai/, icp: "ai_automation_specialist" },
  { test: /meta ads/, icp: "meta_ads_specialist" },
  { test: /\bcro\b/, icp: "cro_specialist" },
  { test: /email market|email design/, icp: "email_marketer" },
  { test: /ecommerce bookkeeper/, icp: "ecommerce_bookkeeper" },
  { test: /head of ecommerce/, icp: "head_of_ecommerce" },
  { test: /ecommerce founder/, icp: "ecommerce_founder" },
  { test: /shopify plus partner/, icp: "shopify_agency" },
  { test: /shopify/, icp: "shopify_expert" },
  { test: /paid social|performance marketing|growth marketing|creator marketing/, icp: "performance_marketer" },
  { test: /creator marketing/, icp: "creator_marketer" },
  { test: /dtc growth|head of growth|ecommerce growth|ecommerce strategy|ecommerce manager|product & merchandising|ex meta/, icp: "dtc_growth" },
  { test: /operations (manager|director)|cs \/ pm/, icp: "operations_director" },
  { test: /agency owner|growth agency|agency growth|webflow agency|website designer/, icp: "website_agency" },
  { test: /restaurant owner/, icp: "restaurant_owner" },
  { test: /roofing|plumb|electrician|builder|contractor/, icp: "local_trade" },
  { test: /cleaning company/, icp: "cleaning_business" },
  { test: /hiring marketplace|recruit/, icp: "recruitment_founder", useNotes: true },
  { test: /fulfilment|fulfillment/, icp: "fulfilment_founder", useNotes: true },
  { test: /lead generation|marketing$|fractional cco/, icp: "performance_marketer" },
  { test: /^ecommerce$/, icp: "dtc_growth" },
  { test: /founder|co-founder|ceo\b|owner|managing director|entrepreneur|startup/, icp: "general_owner", useNotes: true },
];

const FOUNDER_TITLE = /founder|owner|\bceo\b|managing director|entrepreneur/i;

function categorise(title: string | null, notes: string | null): IcpCategory | null {
  const t = (title ?? "").toLowerCase().trim();
  const n = (notes ?? "").toLowerCase();
  for (const r of RULES) {
    if (r.test.test(t)) return r.icp;
    if (r.useNotes && r.test.test(n)) return r.icp;
  }
  return null;
}

function recompute(leadId: string): void {
  const lead = db.select().from(leads).where(eq(leads.id, leadId)).get();
  if (!lead) return;
  const company = lead.companyId ? (db.select().from(companies).where(eq(companies.id, lead.companyId)).get() ?? null) : null;
  const research = db.select().from(researchItems).where(eq(researchItems.leadId, leadId)).all();
  const signals = db.select().from(buyingSignals).where(eq(buyingSignals.leadId, leadId)).all();
  const pains = db.select().from(painHypotheses).where(eq(painHypotheses.leadId, leadId)).all();
  const discovery = db.select().from(discoveries).where(eq(discoveries.leadId, leadId)).get() ?? null;
  const completeness = computeCompleteness(lead, company);
  const set = computeScoreSet({ lead: { ...lead, completeness }, company, research, signals, pains, discovery }, DEFAULT_SETTINGS.scoreWeights);
  for (const [dim, r] of Object.entries(set)) {
    const existing = db.select().from(scores).all().find((s) => s.leadId === leadId && s.dimension === dim);
    if (existing?.calculatedBy === "manual") continue;
    db.insert(scores)
      .values({ id: newId("scr"), leadId, dimension: dim as never, value: r.value, breakdown: r.breakdown, calculatedBy: "rules" })
      .onConflictDoUpdate({
        target: [scores.leadId, scores.dimension],
        set: { value: r.value, breakdown: r.breakdown, calculatedBy: "rules", computedAt: new Date() },
      })
      .run();
  }
  db.update(leads).set({ completeness, overallScore: set.overall.value }).where(eq(leads.id, leadId)).run();
}

const live = db.select().from(leads).where(isNull(leads.deletedAt)).all();
let categorised = 0;
let founderFlags = 0;

for (const lead of live) {
  const updates: Partial<typeof lead> = {};
  if (!lead.icpCategory || lead.icpCategory === "other") {
    const icp = categorise(lead.jobTitle, lead.notes);
    if (icp) {
      updates.icpCategory = icp;
      categorised++;
    }
  }
  if (lead.seniority === "unknown" || !lead.seniority) {
    const sen = mapApolloSeniority(undefined, lead.jobTitle ?? undefined);
    if (sen) updates.seniority = sen;
  }
  if (!lead.isFounder && lead.jobTitle && FOUNDER_TITLE.test(lead.jobTitle)) {
    updates.isFounder = true;
    if (lead.decisionAuthority === "unknown") updates.decisionAuthority = "decision_maker";
    founderFlags++;
  }
  if (Object.keys(updates).length > 0) {
    db.update(leads).set(updates).where(eq(leads.id, lead.id)).run();
  }
}

for (const lead of live) recompute(lead.id);

console.log(`Live leads: ${live.length} | newly categorised: ${categorised} | founder flags set: ${founderFlags} | all scores recomputed`);
sqlite.close();
