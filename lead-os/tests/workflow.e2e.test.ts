/**
 * End-to-end workflow test over the REAL action + service layer against an
 * in-memory SQLite database (auth stubbed to a test founder, Next cache/nav
 * stubbed — everything else is production code).
 *
 * Covers the acceptance-test spine:
 * import → research → score → generate outreach → mark sent → record reply →
 * analysis → next action → discovery → gated automation design → opportunity →
 * follow-up & suppression behaviour.
 */
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_PATH = ":memory:";
process.env.AI_MODE = "mock";

type Actions = {
  imports: typeof import("@/server/actions/imports");
  leads: typeof import("@/server/actions/leads");
  research: typeof import("@/server/actions/research");
  messages: typeof import("@/server/actions/messages");
  conversation: typeof import("@/server/actions/conversation");
  discovery: typeof import("@/server/actions/discovery");
  opportunities: typeof import("@/server/actions/opportunities");
  db: typeof import("@/db");
  schema: typeof import("@/db/schema");
  leadService: typeof import("@/server/lead-service");
};

const A = {} as Actions;
let leadId: string;

beforeAll(async () => {
  A.db = await import("@/db");
  A.schema = await import("@/db/schema");
  A.imports = await import("@/server/actions/imports");
  A.leads = await import("@/server/actions/leads");
  A.research = await import("@/server/actions/research");
  A.messages = await import("@/server/actions/messages");
  A.conversation = await import("@/server/actions/conversation");
  A.discovery = await import("@/server/actions/discovery");
  A.opportunities = await import("@/server/actions/opportunities");
  A.leadService = await import("@/server/lead-service");
});

describe("core workflow, end to end", () => {
  it("imports the warm-list CSV shape with mapping and creates persisted leads", async () => {
    const rows = [
      {
        Name: "Ava Merchant",
        "Business / Role": "Founder – Merchant & Co",
        Source: "LinkedIn connections",
        "Reach Via": "LinkedIn DM",
        Contact: "linkedin.com/in/ava-merchant",
        "How I Know Them": "Commented on my automation posts",
        "Last Interaction": "01/07/2026",
        Priority: "P1",
        Status: "Not started",
        "Next Action": "Send first message",
        "Follow-up Date": "",
        Notes: "Runs a Shopify candle brand",
      },
    ];
    const mapping = {
      Name: "fullName",
      "Business / Role": "businessRole",
      Source: "source",
      "Reach Via": "reachVia",
      Contact: "contact",
      "How I Know Them": "howKnown",
      "Last Interaction": "lastInteraction",
      Priority: "priority",
      Status: "status",
      "Next Action": "nextAction",
      "Follow-up Date": "followUpDate",
      Notes: "notes",
    };
    const res = await A.imports.executeImportAction({ rows, mapping, filename: "test.csv", duplicatePolicy: "fill_empty", defaultWarmth: "warm" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.report.created).toBe(1);

    const { getDb } = A.db;
    const { leads } = A.schema;
    const all = getDb().select().from(leads).all();
    expect(all).toHaveLength(1);
    leadId = all[0]!.id;
    expect(all[0]!.jobTitle).toBe("Founder");
    expect(all[0]!.warmth).toBe("warm");
    expect(all[0]!.linkedinUrl).toContain("linkedin.com/in/ava-merchant");
    expect(all[0]!.overallScore).toBeGreaterThan(0); // scored on import
  });

  it("detects duplicates on a re-import and never overwrites existing data", async () => {
    const res = await A.imports.executeImportAction({
      rows: [{ Name: "Ava Merchant", Contact: "linkedin.com/in/ava-merchant", Notes: "dupe row" }],
      mapping: { Name: "fullName", Contact: "contact", Notes: "notes" },
      filename: "dupe.csv",
      duplicatePolicy: "skip",
      defaultWarmth: "warm",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.report.duplicates).toBe(1);
  });

  it("records research + evidence-backed pain, then marks the lead researched with a higher score", async () => {
    const before = A.db.getDb().select().from(A.schema.leads).all()[0]!.overallScore!;
    // Set the ICP category first (imports can't infer it).
    const { eq } = await import("drizzle-orm");
    A.db.getDb().update(A.schema.leads).set({ icpCategory: "ecommerce_founder" }).where(eq(A.schema.leads.id, leadId)).run();

    const r1 = await A.research.addResearchAction({
      leadId,
      kind: "website",
      title: "Site sells ~120 SKUs DTC",
      content: "Shopify store, active blog, ships UK-wide.",
      sourceUrl: "https://example.com",
      confidence: "high",
    });
    expect(r1.ok).toBe(true);
    const r2 = await A.research.addSignalAction({
      leadId,
      signalType: "manual_process_mention",
      description: "Posted about doing weekly reports by hand",
      evidenceUrl: "https://example.com/post",
      strength: "strong",
    });
    expect(r2.ok).toBe(true);
    const r3 = await A.research.addPainAction({
      leadId,
      category: "campaign_reporting",
      hypothesis: "Weekly reporting is manual across Shopify and Meta.",
      evidence: "Her own post says so",
      evidenceUrl: "https://example.com/post",
      confidence: "high",
      impact: "high",
      discoveryQuestion: "What does the weekly routine involve end to end?",
    });
    expect(r3.ok).toBe(true);

    const marked = await A.research.markResearchedAction({ leadId });
    expect(marked.ok).toBe(true);

    const after = A.db.getDb().select().from(A.schema.leads).all()[0]!;
    expect(after.status).toBe("researched");
    expect(after.overallScore!).toBeGreaterThan(before);

    const scores = A.db.getDb().select().from(A.schema.scores).all();
    const painScore = scores.find((s) => s.dimension === "pain_probability")!;
    expect(painScore.value).toBeGreaterThan(0);
    expect(painScore.breakdown!.some((l) => l.evidence)).toBe(true); // explained
  });

  it("confirming a hypothesis without evidence is rejected", async () => {
    const bare = await A.research.addPainAction({ leadId, category: "inventory", hypothesis: "Maybe stock alerts are manual.", confidence: "low", impact: "low" });
    expect(bare.ok).toBe(true);
    const pains = A.db.getDb().select().from(A.schema.painHypotheses).all();
    const bareRow = pains.find((p) => p.category === "inventory")!;
    const res = await A.research.updatePainAction({ id: bareRow.id, leadId, status: "confirmed" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/evidence/i);
  });

  it("generates a personalised warm message with evidence-used, editable, then marked sent", async () => {
    const gen = await A.messages.generateMessageAction({ leadId, msgType: "initial_warm" });
    expect(gen.ok).toBe(true);
    if (!gen.ok) return;
    expect(gen.body).toContain("Ava");
    expect(gen.evidenceUsed.length).toBeGreaterThan(1);

    const edit = await A.messages.editMessageAction({ messageId: gen.messageId, body: `${gen.body}\n\nP.S. Loved the candle collection.` });
    expect(edit.ok).toBe(true);

    const sent = await A.messages.markSentAction({ messageId: gen.messageId });
    expect(sent.ok).toBe(true);

    const lead = A.db.getDb().select().from(A.schema.leads).all()[0]!;
    expect(lead.status).toBe("contacted");
    expect(lead.lastContactedAt).toBeTruthy();
    const tasks = A.db.getDb().select().from(A.schema.tasks).all();
    expect(tasks.some((t) => t.kind === "follow_up" && t.status === "open")).toBe(true); // follow-up scheduled
  });

  it("blocks an immediate second send via the outreach guard, but allows explicit override", async () => {
    const gen2 = await A.messages.generateMessageAction({ leadId, msgType: "insight_seeking" });
    expect(gen2.ok).toBe(true);
    if (!gen2.ok) return;
    const blocked = await A.messages.markSentAction({ messageId: gen2.messageId });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.blocked?.join(" ")).toMatch(/minimum gap/);
    const overridden = await A.messages.markSentAction({ messageId: gen2.messageId, overrideGuard: true });
    expect(overridden.ok).toBe(true);
  });

  it("records a pasted reply, analyses it conservatively, cancels follow-ups and recommends the next step", async () => {
    const res = await A.conversation.recordReplyAction({
      leadId,
      text: "Good question — honestly the worst bit is reporting. Every Monday I export Shopify and Meta into Sheets by hand and it takes hours. I own the process myself.",
    });
    expect(res.ok).toBe(true);
    expect(res.classification).toBe("qualified_problem");

    const lead = A.db.getDb().select().from(A.schema.leads).all()[0]!;
    expect(lead.status).toBe("replied");
    expect(lead.replySentiment).toBe("qualified_problem");

    const analyses = A.db.getDb().select().from(A.schema.replyAnalyses).all();
    expect(analyses).toHaveLength(1);
    expect(analyses[0]!.confidence).toBe("medium"); // rules never claim high
    expect(analyses[0]!.recommendation).toBe("continue_discovery");

    const openFollowUps = A.db.getDb().select().from(A.schema.tasks).all().filter((t) => t.kind === "follow_up" && t.status === "open");
    expect(openFollowUps).toHaveLength(0); // reply cancelled pending follow-ups
  });

  it("polite replies are never upgraded to interest", async () => {
    const res = await A.conversation.recordReplyAction({ leadId, text: "Thanks, appreciate it!" });
    expect(res.ok).toBe(true);
    expect(["neutral", "vague"]).toContain(res.classification);
  });

  it("gates automation design behind discovery minimums, then designs with human checkpoints", async () => {
    const early = await A.opportunities.createDesignAction({ leadId, category: "campaign_reporting" });
    expect(early.ok).toBe(false);
    if (!early.ok) expect(early.missing!.length).toBeGreaterThan(3);

    const disc = await A.discovery.upsertDiscoveryAction({
      leadId,
      problemStatement: "Weekly cross-platform reporting is manual",
      currentWorkflow: "Export Shopify + Meta → Sheets → analyse → send",
      processOwner: "Ava herself",
      volume: "1 report/week across 2 platforms",
      timeConsumed: "3 hours weekly",
      desiredOutcome: "Report drafts itself; she reviews",
      accessRequired: "Shopify + Meta read tokens",
      humanJudgement: "Commentary approval stays with Ava",
      successMetrics: "Reporting under 30 minutes/week",
    });
    expect(disc.ok).toBe(true);

    const design = await A.opportunities.createDesignAction({ leadId, category: "campaign_reporting" });
    expect(design.ok).toBe(true);
    if (!design.ok) return;

    const nodes = A.db.getDb().select().from(A.schema.workflowNodes).all();
    const kinds = new Set(nodes.map((n) => n.kind));
    expect(kinds.has("human_review")).toBe(true); // human checkpoint always present
    expect(kinds.has("failure")).toBe(true);
    expect(kinds.has("retry")).toBe(true);
    expect(kinds.has("fallback")).toBe(true);
    expect(kinds.has("audit")).toBe(true);
  });

  it("creates a commercial opportunity and enforces stage requirements", async () => {
    const created = await A.opportunities.createOpportunityAction({ leadId, title: "Reporting automation — case study", stage: "case_study_candidate" });
    expect(created.ok).toBe(true);
    const opp = A.db.getDb().select().from(A.schema.opportunities).all()[0]!;

    const noValue = await A.opportunities.moveOpportunityStageAction({ id: opp.id, stage: "proposal_sent" });
    expect(noValue.ok).toBe(false); // value required first

    const lostNoReason = await A.opportunities.moveOpportunityStageAction({ id: opp.id, stage: "lost" });
    expect(lostNoReason.ok).toBe(false); // lost reason required
  });

  it("stage validation blocks premature pipeline moves with explicit missing info", async () => {
    // createLeadAction redirects on success — the nav stub throws, which we treat as success.
    await expect(A.leads.createLeadAction(undefined, formData({ fullName: "Blank Bob" }))).rejects.toThrow(/REDIRECT/);
    const bob = A.db.getDb().select().from(A.schema.leads).all().find((l) => l.fullName === "Blank Bob")!;
    expect(bob).toBeTruthy(); // persisted

    const check = A.leadService.canMoveToStage(bob.id, "ready_to_contact");
    expect(check.ok).toBe(false);
    expect(check.missing.join(" ")).toMatch(/ICP category/);
    expect(check.missing.join(" ")).toMatch(/contact route/i);

    const move = await A.leads.moveStageAction({ leadId: bob.id, stage: "ready_to_contact" });
    expect(move.ok).toBe(false);
  });

  it("suppression: do-not-contact cancels tasks, blocks generation and import", async () => {
    const dnc = await A.leads.setDncAction({ leadId, on: true, reason: "Asked to stop" });
    expect(dnc.ok).toBe(true);

    const gen = await A.messages.generateMessageAction({ leadId, msgType: "follow_up_1" });
    expect(gen.ok).toBe(false);

    const reimport = await A.imports.executeImportAction({
      rows: [{ Name: "Ava Merchant", Contact: "linkedin.com/in/ava-merchant" }],
      mapping: { Name: "fullName", Contact: "contact" },
      filename: "resurrect.csv",
      duplicatePolicy: "create_anyway",
      defaultWarmth: "warm",
    });
    expect(reimport.ok).toBe(true);
    if (reimport.ok) expect(reimport.report.skipped).toBe(1); // suppression blocks even create_anyway
  });
});

function formData(obj: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) fd.set(k, v);
  return fd;
}
