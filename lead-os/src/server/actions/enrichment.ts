"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, leads, researchItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { newId } from "@/lib/ids";
import { apolloConfigured, apolloMatchPerson, domainFromWebsite } from "@/lib/enrichment/apollo";
import { buildEnrichmentProposal, type EnrichmentProposal } from "@/lib/enrichment/apollo-mapping";
import { recomputeLead } from "@/server/lead-service";

/* ------------------------------------------------------------------ */
/* Fetch (consumes one Apollo credit) — stores nothing yet             */
/* ------------------------------------------------------------------ */

export type ApolloPreviewResult =
  | { ok: true; proposal: EnrichmentProposal }
  | { ok: false; error: string };

export async function previewApolloEnrichmentAction(input: { leadId: string }): Promise<ApolloPreviewResult> {
  await requireUser();
  if (!apolloConfigured()) {
    return { ok: false, error: "Apollo isn't configured — add APOLLO_API_KEY to lead-os/.env.local and restart the app." };
  }
  const db = getDb();
  const lead = db.select().from(leads).where(eq(leads.id, input.leadId)).get();
  if (!lead) return { ok: false, error: "Lead not found." };
  if (lead.doNotContact) {
    return { ok: false, error: "This lead is do-not-contact — enriching their personal data has no lawful purpose here." };
  }
  const company = lead.companyId ? (db.select().from(companies).where(eq(companies.id, lead.companyId)).get() ?? null) : null;

  const result = await apolloMatchPerson({
    fullName: lead.fullName,
    companyName: company?.name ?? null,
    companyDomain: domainFromWebsite(company?.website),
    linkedinUrl: lead.linkedinUrl,
    email: lead.workEmail,
  });

  if (!result.ok) return { ok: false, error: result.error };

  logActivity({
    leadId: lead.id,
    entity: "enrichment",
    entityId: lead.id,
    action: "research_added",
    detail: result.person
      ? "Apollo lookup run (1 credit) — match found, awaiting review"
      : "Apollo lookup run (1 credit) — no match found",
    actor: "system",
  });

  const proposal = buildEnrichmentProposal(lead, company, result.person);
  return { ok: true, proposal };
}

/* ------------------------------------------------------------------ */
/* Apply — writes ONLY what the user ticked                            */
/* ------------------------------------------------------------------ */

const LEAD_FIELDS = ["jobTitle", "seniority", "workEmail", "linkedinUrl", "location"] as const;
const COMPANY_FIELDS = ["website", "linkedinUrl", "industry", "employeeRange", "revenueRange", "description"] as const;

const applySchema = z.object({
  leadId: z.string().min(1),
  research: z
    .array(
      z.object({
        kind: z.enum(["enrichment", "company_snapshot", "tech_stack"]),
        title: z.string().trim().min(1).max(200),
        content: z.string().trim().min(1).max(8000),
        sourceUrl: z.string().trim().max(500).nullable(),
        confidence: z.enum(["low", "medium", "high"]),
      }),
    )
    .max(5),
  fields: z
    .array(
      z.object({
        target: z.enum(["lead", "company"]),
        field: z.string().min(1).max(40),
        proposed: z.string().trim().min(1).max(2000),
      }),
    )
    .max(20),
});

export async function applyApolloEnrichmentAction(
  input: z.infer<typeof applySchema>,
): Promise<{ ok: boolean; error?: string; applied?: number }> {
  await requireUser();
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid enrichment payload." };
  const { leadId, research, fields } = parsed.data;

  const db = getDb();
  const lead = db.select().from(leads).where(eq(leads.id, leadId)).get();
  if (!lead) return { ok: false, error: "Lead not found." };

  let applied = 0;

  for (const r of research) {
    db.insert(researchItems)
      .values({
        id: newId("res"),
        leadId,
        kind: r.kind === "enrichment" ? "linkedin" : r.kind,
        title: r.title,
        content: r.content,
        sourceUrl: r.sourceUrl,
        confidence: r.confidence,
      })
      .run();
    applied++;
  }

  const leadUpdates: Record<string, string> = {};
  const companyUpdates: Record<string, string> = {};
  for (const f of fields) {
    if (f.target === "lead" && (LEAD_FIELDS as readonly string[]).includes(f.field)) {
      leadUpdates[f.field] = f.proposed;
      applied++;
    } else if (f.target === "company" && (COMPANY_FIELDS as readonly string[]).includes(f.field)) {
      companyUpdates[f.field] = f.proposed;
      applied++;
    }
  }

  if (Object.keys(leadUpdates).length > 0) {
    db.update(leads).set(leadUpdates).where(eq(leads.id, leadId)).run();
  }
  if (Object.keys(companyUpdates).length > 0) {
    let companyId = lead.companyId;
    if (!companyId) {
      companyId = newId("com");
      db.insert(companies).values({ id: companyId, name: lead.fullName + "'s company", dataSource: "enrichment" }).run();
      db.update(leads).set({ companyId }).where(eq(leads.id, leadId)).run();
    }
    db.update(companies).set(companyUpdates).where(eq(companies.id, companyId)).run();
  }

  logActivity({
    leadId,
    entity: "enrichment",
    entityId: leadId,
    action: "research_added",
    detail: `Apollo enrichment applied: ${research.length} research item${research.length === 1 ? "" : "s"}, ${fields.length} field${fields.length === 1 ? "" : "s"} (${fields.map((f) => f.field).join(", ") || "none"})`,
  });

  recomputeLead(leadId);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/research");
  return { ok: true, applied };
}
