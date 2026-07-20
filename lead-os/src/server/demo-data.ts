/**
 * Demo dataset — clearly labelled (dataSource: "demo", DEMO badges in the UI)
 * and removable in one action from Settings.
 *
 * The people and companies are fictional. Two conversations are modelled on
 * real conversation *shapes* from CPM's outreach (a marketer describing tool
 * fragmentation; an AI practitioner discussing orchestration and human
 * supervision) without using anyone's private details.
 *
 * No "server-only" marker here so the CLI seed script can reuse it; it is
 * only ever invoked from authenticated server actions or the CLI.
 */

import { subDays, addBusinessDays } from "date-fns";
import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import {
  activities,
  buyingSignals,
  caseStudies,
  companies,
  conversationEntries,
  conversations,
  discoveries,
  leads,
  messages,
  opportunities,
  painHypotheses,
  replyAnalyses,
  researchItems,
  scores,
  tasks,
  automationOpportunities,
  workflowNodes,
  workflowEdges,
} from "@/db/schema";
import { newId } from "@/lib/ids";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { computeCompleteness, computeScoreSet } from "@/lib/scoring";
import { buildOpportunityTemplate } from "@/lib/opportunity-templates";

export function hasDemoData(db: DB): boolean {
  return !!db.select({ id: leads.id }).from(leads).where(eq(leads.dataSource, "demo")).limit(1).get();
}

function recompute(db: DB, leadId: string): void {
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

export function loadDemoData(db: DB): { created: number } {
  if (hasDemoData(db)) return { created: 0 };
  const now = new Date();
  let created = 0;

  const mkCompany = (v: Partial<typeof companies.$inferInsert> & { name: string }): string => {
    const id = newId("com");
    db.insert(companies).values({ id, dataSource: "demo", ...v }).run();
    return id;
  };

  const mkLead = (v: Partial<typeof leads.$inferInsert> & { fullName: string }): string => {
    const id = newId("led");
    db.insert(leads).values({ id, dataSource: "demo", ...v } as typeof leads.$inferInsert).run();
    created++;
    return id;
  };

  const log = (leadId: string, action: string, detail: string, daysAgo = 0) =>
    db.insert(activities).values({ id: newId("act"), leadId, entity: "lead", entityId: leadId, action, detail, actor: "system", createdAt: subDays(now, daysAgo) }).run();

  /* ------------------------------------------------------------ */
  /* 1. Sophie Hartley — DTC founder, researched, high fit         */
  /* ------------------------------------------------------------ */
  const willowId = mkCompany({
    name: "Willow & Wren",
    website: "willowandwren-home.co.uk",
    description: "DTC homeware brand selling sustainable kitchen and living products to UK households",
    industry: "Ecommerce — homeware",
    employeeRange: "2-10",
    revenueRange: "£500k-£1m",
    shopifyStatus: "shopify",
    businessModel: "dtc",
    salesChannels: ["Own site", "Etsy", "Not On The High Street"],
    markets: ["UK"],
  });
  const sophie = mkLead({
    fullName: "Sophie Hartley",
    jobTitle: "Founder",
    companyId: willowId,
    seniority: "founder",
    isFounder: true,
    decisionAuthority: "decision_maker",
    linkedinUrl: "linkedin.com/in/sophie-hartley-demo",
    location: "Bristol, UK",
    warmth: "warm",
    connectionDegree: "1st",
    source: "LinkedIn connections",
    howKnown: "She commented on my post about reporting automation for DTC brands",
    relationshipStrength: 3,
    icpCategory: "ecommerce_founder",
    status: "researched",
    channel: "linkedin",
    currentTools: ["Shopify", "Klaviyo", "Google Sheets", "Meta Ads"],
    caseStudySuitability: 4,
    paidSuitability: 3,
    referralPotential: 3,
    lastInteractionAt: subDays(now, 12),
    interactionCount: 2,
    recommendedAngle: "Ask about weekly reporting prep across Shopify + Klaviyo + Meta — she runs it solo",
  });
  db.insert(researchItems).values([
    {
      id: newId("res"),
      leadId: sophie,
      kind: "website",
      title: "Site: ~340 SKUs across 3 channels",
      content: "Catalogue spans own site, Etsy and NOTHS. Product copy differs between channels — likely manual duplication. Blog active, seasonal launches quarterly.",
      sourceUrl: "https://willowandwren-home.co.uk",
      confidence: "high",
      createdAt: subDays(now, 6),
    },
    {
      id: newId("res"),
      leadId: sophie,
      kind: "linkedin",
      title: "LinkedIn: solo founder, no marketing hire",
      content: "Profile and posts suggest she runs marketing herself. Recent post: 'Sunday evenings are for spreadsheets apparently' with a screenshot of a campaign report.",
      sourceUrl: "https://linkedin.com/in/sophie-hartley-demo",
      confidence: "medium",
      createdAt: subDays(now, 6),
    },
  ]).run();
  db.insert(buyingSignals).values([
    {
      id: newId("sig"),
      leadId: sophie,
      signalType: "manual_process_mention",
      description: "Posted about spending Sunday evenings building campaign reports in spreadsheets",
      evidenceUrl: "https://linkedin.com/in/sophie-hartley-demo",
      strength: "strong",
      observedAt: subDays(now, 9),
    },
    {
      id: newId("sig"),
      leadId: sophie,
      signalType: "multi_marketplace",
      description: "Sells on own site, Etsy and Not On The High Street — three catalogues to keep aligned",
      strength: "moderate",
      observedAt: subDays(now, 6),
    },
  ]).run();
  db.insert(painHypotheses).values([
    {
      id: newId("pn"),
      leadId: sophie,
      category: "campaign_reporting",
      hypothesis: "Weekly performance reporting is stitched together by hand from Shopify, Klaviyo and Meta.",
      evidence: "Her own post about Sunday-evening spreadsheet reporting, with screenshot",
      evidenceUrl: "https://linkedin.com/in/sophie-hartley-demo",
      confidence: "high",
      impact: "high",
      discoveryQuestion: "What does your weekly reporting routine actually involve, start to finish?",
      automationDirection: "Scheduled pulls → merged report → drafted commentary for her review",
      humanJudgementNote: "Trading decisions from the numbers stay hers",
      status: "confirmed",
      source: "human",
      createdAt: subDays(now, 5),
    },
    {
      id: newId("pn"),
      leadId: sophie,
      category: "product_data",
      hypothesis: "Product data is likely updated separately on each of the three channels.",
      evidence: "Copy differs visibly between site and Etsy for the same SKUs",
      confidence: "medium",
      impact: "medium",
      discoveryQuestion: "When a product changes, how many places do you update it?",
      automationDirection: "Single source of truth with per-channel sync and preview",
      humanJudgementNote: "Pricing and channel-specific copy need approval",
      status: "proposed",
      source: "human",
      createdAt: subDays(now, 5),
    },
  ]).run();
  log(sophie, "created", "Demo lead created", 14);
  log(sophie, "research_added", "Website + LinkedIn research recorded", 6);

  /* ------------------------------------------------------------ */
  /* 2. Daniel Okafor — Shopify agency owner, contacted            */
  /* ------------------------------------------------------------ */
  const brightpathId = mkCompany({
    name: "Brightpath Digital",
    website: "brightpathdigital.co.uk",
    description: "Shopify design and build agency for consumer brands (8-person team)",
    industry: "Ecommerce agency",
    employeeRange: "2-10",
    shopifyStatus: "shopify",
    businessModel: "b2b",
    markets: ["UK", "EU"],
  });
  const daniel = mkLead({
    fullName: "Daniel Okafor",
    jobTitle: "Founder & Creative Director",
    companyId: brightpathId,
    seniority: "founder",
    isFounder: true,
    decisionAuthority: "decision_maker",
    linkedinUrl: "linkedin.com/in/daniel-okafor-demo",
    location: "Manchester, UK",
    warmth: "warm",
    connectionDegree: "1st",
    source: "Ecommerce meetup",
    howKnown: "Met at the Manchester ecommerce meetup in May; talked about client onboarding chaos",
    relationshipStrength: 4,
    icpCategory: "shopify_agency",
    status: "contacted",
    channel: "linkedin",
    currentTools: ["Shopify", "Asana", "Slack", "Google Drive"],
    caseStudySuitability: 4,
    paidSuitability: 4,
    retainerSuitability: 4,
    referralPotential: 5,
    lastContactedAt: subDays(now, 2),
    lastInteractionAt: subDays(now, 2),
    interactionCount: 3,
    nextAction: "Follow-up 1 if no reply",
    nextActionDue: addBusinessDays(subDays(now, 2), 4),
    followUpCount: 0,
  });
  db.insert(painHypotheses).values([
    {
      id: newId("pn"),
      leadId: daniel,
      category: "client_onboarding",
      hypothesis: "New-client onboarding involves chasing access, assets and brand info across email threads.",
      evidence: "He described exactly this at the meetup — 'two weeks of chasing before we can start'",
      confidence: "high",
      impact: "high",
      discoveryQuestion: "When you win a client, what's the messiest part of getting started?",
      automationDirection: "Structured intake → automated chasing → status board",
      humanJudgementNote: "Kickoff and scoping stay with the team",
      status: "confirmed",
      source: "human",
      createdAt: subDays(now, 10),
    },
  ]).run();
  const danielMsgId = newId("msg");
  db.insert(messages).values({
    id: danielMsgId,
    leadId: daniel,
    msgType: "initial_warm",
    channel: "linkedin",
    body: `Hi Daniel,

Good to be connected — met at the Manchester ecommerce meetup in May; talked about client onboarding chaos.

Saw you're a Founder & Creative Director at Brightpath Digital.

I spend my time removing repetitive operational work for ecommerce businesses, and I'm trying to understand where it genuinely piles up — from the people living it.

Out of genuine curiosity — when you win a client, what's the messiest part of getting started?

Cheers,
Charlie`,
    evidenceUsed: [
      "How known: Met at the Manchester ecommerce meetup in May (lead record)",
      "Job title: Founder & Creative Director (lead record)",
      "Company: Brightpath Digital (lead record)",
      "Confirmed pain hypothesis: client onboarding chasing — its discovery question was used",
    ],
    generationSource: "rules",
    promptVersion: "rules-v1",
    status: "sent",
    versionNum: 1,
    sentAt: subDays(now, 2),
    createdAt: subDays(now, 2),
  }).run();
  const danielConv = newId("cnv");
  db.insert(conversations).values({ id: danielConv, leadId: daniel, channel: "linkedin", startedAt: subDays(now, 2), lastEntryAt: subDays(now, 2) }).run();
  db.insert(conversationEntries).values({
    id: newId("ent"),
    conversationId: danielConv,
    leadId: daniel,
    direction: "outbound",
    entryType: "message_sent",
    content: "Initial warm message (see Outreach tab)",
    messageId: danielMsgId,
    occurredAt: subDays(now, 2),
  }).run();
  db.insert(tasks).values({
    id: newId("tsk"),
    leadId: daniel,
    kind: "follow_up",
    title: "Follow-up 1: Daniel Okafor",
    detail: 'No-reply follow-up after "Initial warm message". Cancelled automatically if he replies.',
    dueAt: addBusinessDays(subDays(now, 2), 4),
  }).run();
  log(daniel, "message_sent", "Initial warm message marked as sent (linkedin)", 2);

  /* ------------------------------------------------------------ */
  /* 3. Priya Nair — performance marketer, qualified problem       */
  /*    (conversation modelled on tool-fragmentation shape)        */
  /* ------------------------------------------------------------ */
  const priya = mkLead({
    fullName: "Priya Nair",
    jobTitle: "Freelance Performance Marketing Consultant",
    seniority: "senior_ic",
    decisionAuthority: "decision_maker",
    isFounder: true,
    linkedinUrl: "linkedin.com/in/priya-nair-demo",
    location: "London, UK",
    warmth: "warm",
    connectionDegree: "1st",
    source: "LinkedIn connections",
    howKnown: "Mutual connections in the DTC space; she engaged with a case-study post",
    relationshipStrength: 3,
    icpCategory: "performance_marketer",
    status: "replied",
    channel: "linkedin",
    currentTools: ["Meta Ads", "Google Ads", "GA4", "Google Sheets", "Looker"],
    caseStudySuitability: 5,
    paidSuitability: 4,
    referralPotential: 4,
    lastContactedAt: subDays(now, 5),
    lastInteractionAt: subDays(now, 1),
    interactionCount: 4,
    replySentiment: "qualified_problem",
    conversationStage: "problem_identified",
    nextAction: "Respond to her reply",
    nextActionDue: now,
  });
  const priyaOut = newId("msg");
  db.insert(messages).values({
    id: priyaOut,
    leadId: priya,
    msgType: "initial_warm",
    channel: "linkedin",
    body: `Hi Priya,

Good to be connected — we share a few DTC connections and you'd engaged with the case-study write-up I posted.

Saw you're a freelance performance marketing consultant.

I spend my time removing repetitive operational work for ecommerce businesses, and I'm trying to understand where it genuinely piles up — from the people living it.

Out of genuine curiosity — what part of campaign reporting consumes the most human preparation?

Cheers,
Charlie`,
    evidenceUsed: ["How known: mutual DTC connections + engaged with case-study post (lead record)", "Job title (lead record)", "Question from the performance marketer bank"],
    generationSource: "rules",
    promptVersion: "rules-v1",
    status: "sent",
    versionNum: 1,
    sentAt: subDays(now, 5),
    createdAt: subDays(now, 5),
  }).run();
  const priyaConv = newId("cnv");
  db.insert(conversations).values({ id: priyaConv, leadId: priya, channel: "linkedin", stage: "problem_identified", startedAt: subDays(now, 5), lastEntryAt: subDays(now, 1) }).run();
  db.insert(conversationEntries).values([
    {
      id: newId("ent"),
      conversationId: priyaConv,
      leadId: priya,
      direction: "outbound",
      entryType: "message_sent",
      content: "Initial warm message asking about campaign reporting prep (see Outreach tab)",
      messageId: priyaOut,
      occurredAt: subDays(now, 5),
    },
  ]).run();
  const priyaReplyEntry = newId("ent");
  const priyaReplyText = `Honestly, it's not one repetitive task — it's that nothing talks to each other. Meta, Google, GA4 and the client's Shopify all tell slightly different stories, so before I can say anything useful I'm exporting four CSVs and stitching them together in Sheets.

The bigger time sink is turning that into something each client can actually act on. Every client wants the insight framed differently — one wants headline numbers, another wants creative-level detail. I've tried AI tools for the commentary but the output always needs reworking per client, and I'd never send anything without checking it myself anyway.

So yeah — the stitching is mechanical and I'd love it gone. The judgement bit I want to keep.`;
  db.insert(conversationEntries).values({
    id: priyaReplyEntry,
    conversationId: priyaConv,
    leadId: priya,
    direction: "inbound",
    entryType: "reply_received",
    content: priyaReplyText,
    occurredAt: subDays(now, 1),
  }).run();
  db.insert(replyAnalyses).values({
    id: newId("ran"),
    entryId: priyaReplyEntry,
    leadId: priya,
    classification: "qualified_problem",
    confidence: "medium",
    explicitProblem: "Cross-platform campaign data must be manually exported and stitched in Sheets before any analysis; per-client insight adaptation is slow.",
    impliedPain: "Hours of mechanical prep before billable thinking starts; AI commentary tools need per-client rework.",
    currentProcess: "Exports four CSVs (Meta, Google, GA4, Shopify) and combines them in Google Sheets per reporting cycle.",
    frequency: "Per client reporting cycle (implied weekly/monthly)",
    consequence: null,
    toolsMentioned: ["meta", "google ads", "ga4", "shopify", "google sheets"],
    authoritySignal: "Freelancer — decides her own tooling",
    interestLevel: "medium",
    techSophistication: "Names 5 tools — hands-on with her stack",
    humanJudgementAreas: "Client-specific framing and final review must stay human — she said so explicitly.",
    possibleObjections: ["Has tried AI tools and found output needed rework"],
    recommendedNextQuestion: "How are you currently handling the stitching step — and roughly how much time does it take per client, per cycle?",
    nextQuestionReason: "Problem is stated; quantifying time-per-cycle sizes the value before proposing anything.",
    recommendation: "continue_discovery",
    analysisSource: "rules",
    rationale: "She describes a specific mechanical problem (data stitching) in her own words, distinguishes it from judgement work she wants to keep, and mentions concrete tools. Classified qualified_problem at medium confidence — verify by reading.",
    createdAt: subDays(now, 1),
  }).run();
  db.insert(painHypotheses).values({
    id: newId("pn"),
    leadId: priya,
    category: "campaign_reporting",
    hypothesis: "Cross-platform data stitching consumes hours before client insight work can start; commentary must adapt per client with human review retained.",
    evidence: "Her reply: exports four CSVs and stitches them in Sheets; AI commentary needs per-client rework; judgement stays human",
    confidence: "high",
    impact: "high",
    discoveryQuestion: "How much time does the stitching take per client, per cycle?",
    automationDirection: "Campaign data → structured analysis → anomaly/opportunity identification → client-specific commentary draft → her review",
    humanJudgementNote: "Client framing and final sign-off remain hers — explicitly stated",
    status: "confirmed",
    source: "human",
    createdAt: subDays(now, 1),
  }).run();
  db.insert(discoveries).values({
    id: newId("dsc"),
    leadId: priya,
    problemStatement: "Campaign data from Meta, Google, GA4 and Shopify has to be manually exported and stitched before analysis; adapting insight per client is slow.",
    currentWorkflow: "Export CSVs from each platform → combine in Google Sheets → analyse → write client-specific commentary → send.",
    tools: "Meta Ads, Google Ads, GA4, Shopify, Google Sheets, Looker",
    humanJudgement: "Insight framing per client and final review — explicitly kept human.",
    processOwner: "Priya herself (freelancer)",
    completeness: 24,
    status: "open",
    createdAt: subDays(now, 1),
    updatedAt: subDays(now, 1),
  }).run();
  log(priya, "reply_recorded", "Reply recorded and classified qualified_problem (medium confidence)", 1);

  /* ------------------------------------------------------------ */
  /* 4. Marcus Chen — AI automation peer                           */
  /* ------------------------------------------------------------ */
  const marcus = mkLead({
    fullName: "Marcus Chen",
    jobTitle: "AI Automation Consultant",
    seniority: "senior_ic",
    isFounder: true,
    decisionAuthority: "decision_maker",
    linkedinUrl: "linkedin.com/in/marcus-chen-demo",
    location: "Leeds, UK",
    warmth: "warm",
    connectionDegree: "1st",
    source: "LinkedIn — commented on each other's posts",
    howKnown: "We've exchanged comments on agent-workflow posts for months",
    relationshipStrength: 3,
    icpCategory: "ai_automation_specialist",
    status: "replied",
    channel: "linkedin",
    priorityLabel: "peer_collaborator",
    replySentiment: "peer_discussion",
    lastContactedAt: subDays(now, 4),
    lastInteractionAt: subDays(now, 3),
    interactionCount: 2,
    nextAction: "Respond as a peer — no pitching",
    nextActionDue: now,
    strategicValue: "Strong referral partner potential — he turns away smaller ecommerce builds",
  });
  const marcusConv = newId("cnv");
  db.insert(conversations).values({ id: marcusConv, leadId: marcus, channel: "linkedin", isPeerConversation: true, startedAt: subDays(now, 4), lastEntryAt: subDays(now, 3) }).run();
  db.insert(conversationEntries).values([
    {
      id: newId("ent"),
      conversationId: marcusConv,
      leadId: marcus,
      direction: "outbound",
      entryType: "message_sent",
      content:
        "Hi Marcus, we keep crossing paths in the comments — I build automation systems for ecommerce brands, sounds like we're working similar problems from different angles. I'd genuinely enjoy comparing notes: what you're seeing clients struggle with, where human supervision has to sit in agent workflows, lessons from real implementations. Open to swapping war stories sometime?",
      occurredAt: subDays(now, 4),
    },
  ]).run();
  const marcusReplyEntry = newId("ent");
  db.insert(conversationEntries).values({
    id: marcusReplyEntry,
    conversationId: marcusConv,
    leadId: marcus,
    direction: "inbound",
    entryType: "reply_received",
    content: `Always up for that. My honest take after a year of client work: the tech moves faster than anyone can absorb — half my job is deciding what NOT to update. Agent orchestration is genuinely powerful now, but every deployment I've done that works has a human checkpoint before anything touches a customer or spends money. The ones that skipped it got rolled back within a month. What are you seeing on the ecommerce side?`,
    occurredAt: subDays(now, 3),
  }).run();
  db.insert(replyAnalyses).values({
    id: newId("ran"),
    entryId: marcusReplyEntry,
    leadId: marcus,
    classification: "peer_discussion",
    confidence: "medium",
    explicitProblem: null,
    impliedPain: null,
    currentProcess: null,
    frequency: null,
    consequence: null,
    toolsMentioned: [],
    authoritySignal: "Runs his own consultancy",
    interestLevel: "medium",
    techSophistication: "Deep practitioner — discusses orchestration and deployment rollbacks first-hand",
    humanJudgementAreas: "Advocates human checkpoints before customer-facing or spend actions",
    possibleObjections: [],
    recommendedNextQuestion: "Which client problem shapes keep recurring for you — and which do you turn away?",
    nextQuestionReason: "Peer exchange: learning his referral boundaries reveals collaboration space without pitching.",
    recommendation: "treat_as_peer",
    analysisSource: "rules",
    rationale: "Lead is categorised as an AI specialist and the reply is practitioner-to-practitioner knowledge exchange (orchestration, human supervision, implementation lessons). This is a peer/collaboration conversation, not a sales lead.",
    createdAt: subDays(now, 3),
  }).run();
  log(marcus, "reply_analysed", "Classified peer_discussion — treated as peer, not prospect", 3);

  /* ------------------------------------------------------------ */
  /* 5. Emma Whitfield — ops director, needs research              */
  /* ------------------------------------------------------------ */
  const fernwayId = mkCompany({
    name: "Fernway Living",
    website: "fernwayliving.com",
    industry: "Ecommerce — furniture",
    employeeRange: "51-200",
    shopifyStatus: "shopify_plus",
    businessModel: "dtc",
  });
  const emma = mkLead({
    fullName: "Emma Whitfield",
    jobTitle: "Operations Director",
    companyId: fernwayId,
    seniority: "director",
    decisionAuthority: "influencer",
    linkedinUrl: "linkedin.com/in/emma-whitfield-demo",
    location: "Sheffield, UK",
    warmth: "cold",
    connectionDegree: "2nd",
    source: "Sales Navigator search",
    icpCategory: "operations_director",
    status: "needs_research",
    channel: "linkedin",
    sharedConnections: "3 mutual connections including Daniel Okafor",
  });
  log(emma, "created", "Demo lead created — awaiting research", 3);

  /* ------------------------------------------------------------ */
  /* 6. James McAllister — fulfilment founder, case-study cand.    */
  /* ------------------------------------------------------------ */
  const kestrelId = mkCompany({
    name: "Kestrel Fulfilment",
    website: "kestrelfulfilment.co.uk",
    description: "Third-party fulfilment for ~40 UK DTC brands; two warehouses",
    industry: "Ecommerce fulfilment",
    employeeRange: "11-50",
    revenueRange: "£1m-£5m",
    businessModel: "b2b",
    markets: ["UK"],
  });
  const james = mkLead({
    fullName: "James McAllister",
    jobTitle: "Founder & MD",
    companyId: kestrelId,
    seniority: "founder",
    isFounder: true,
    decisionAuthority: "decision_maker",
    linkedinUrl: "linkedin.com/in/james-mcallister-demo",
    workEmail: "james@kestrelfulfilment-demo.co.uk",
    location: "Doncaster, UK",
    warmth: "warm",
    connectionDegree: "1st",
    source: "Referral",
    referrer: "A shared warehouse-industry contact",
    howKnown: "Introduced by a mutual contact after he mentioned drowning in client reporting",
    relationshipStrength: 4,
    icpCategory: "fulfilment_founder",
    status: "replied",
    channel: "email",
    currentTools: ["Mintsoft", "Xero", "Google Sheets", "Outlook"],
    caseStudySuitability: 5,
    paidSuitability: 4,
    retainerSuitability: 4,
    lastContactedAt: subDays(now, 8),
    lastInteractionAt: subDays(now, 6),
    interactionCount: 5,
    replySentiment: "qualified_problem",
    conversationStage: "problem_quantified",
    meetingStatus: "held",
    nextAction: "Send scope agreement for case-study build",
    nextActionDue: addBusinessDays(now, 1),
  });
  db.insert(painHypotheses).values({
    id: newId("pn"),
    leadId: james,
    category: "document_chasing",
    hypothesis: "Weekly client stock reports are built by hand for ~40 brands and regularly go out late.",
    evidence: "Mapping call: 6–8 hours every Friday across two staff; three clients complained about late reports last month",
    confidence: "high",
    impact: "high",
    discoveryQuestion: "What would an ideal Friday look like if the reports built themselves?",
    automationDirection: "WMS export → per-client report templates → threshold alerts → human check → scheduled send",
    humanJudgementNote: "Unusual stock movements and client disputes reviewed by a human before sending",
    status: "confirmed",
    source: "human",
    createdAt: subDays(now, 6),
  }).run();
  const jamesDiscovery = newId("dsc");
  db.insert(discoveries).values({
    id: jamesDiscovery,
    leadId: james,
    problemStatement: "Weekly stock/order reports for ~40 client brands are compiled manually from Mintsoft exports every Friday.",
    currentWorkflow: "Export WMS data per client → paste into per-client Sheets templates → sense-check → email each client.",
    trigger: "Friday morning, every week",
    inputs: "Mintsoft stock/order exports, client SLA settings",
    steps: "Export → clean → paste per client → check anomalies → email",
    tools: "Mintsoft, Google Sheets, Outlook",
    peopleInvolved: "Two ops admins",
    processOwner: "Sarah (ops admin lead)",
    decisionPoints: "Whether an anomaly needs a call before the report goes out",
    exceptions: "Clients with custom SLA formats (about 6 of 40)",
    outputs: "40 client-facing weekly reports",
    volume: "~40 reports weekly",
    frequency: "Weekly",
    timeConsumed: "6–8 staff-hours every Friday",
    errorRate: "2–3 late or wrong reports in a typical month",
    costEstimate: "Roughly £700/month in admin time",
    revenueImpact: "Late reports cited in one client's churn review",
    customerImpact: "Clients chase stock answers when reports slip",
    complianceRisk: "Low — operational data only",
    humanJudgement: "Anomaly review and anything client-sensitive before sending",
    desiredOutcome: "Reports built automatically Friday 7am; team only reviews flagged anomalies",
    constraints: "Must keep Mintsoft; no per-client software changes",
    accessRequired: "Mintsoft API access; email sending via their domain",
    dataSensitivity: "Client commercial data — NDA in place",
    successMetrics: "Friday reporting time under 1 hour; zero late reports in the measurement month",
    completeness: 100,
    status: "complete",
    createdAt: subDays(now, 6),
    updatedAt: subDays(now, 6),
  }).run();
  // Automation design from the real template builder
  const jamesTemplate = buildOpportunityTemplate("fulfilment_reporting", db.select().from(discoveries).where(eq(discoveries.id, jamesDiscovery)).get() ?? null);
  const jamesDesign = newId("aop");
  db.insert(automationOpportunities).values({
    id: jamesDesign,
    leadId: james,
    discoveryId: jamesDiscovery,
    title: jamesTemplate.title,
    category: "fulfilment_reporting",
    businessProblem: jamesTemplate.businessProblem,
    currentState: jamesTemplate.currentState,
    futureState: jamesTemplate.futureState,
    deterministicSteps: jamesTemplate.deterministicSteps,
    aiSteps: jamesTemplate.aiSteps,
    humanSteps: jamesTemplate.humanSteps,
    integrations: ["Mintsoft API", "Google Sheets", "Email (their domain)"],
    credentialsNeeded: jamesTemplate.credentialsNeeded,
    dataModel: jamesTemplate.dataModel,
    exceptionHandling: jamesTemplate.exceptionHandling,
    securityConsiderations: jamesTemplate.securityConsiderations,
    risks: jamesTemplate.risks,
    complexity: "M",
    timeSavedHoursMonth: 26,
    measurementPlan: jamesTemplate.measurementPlan,
    mvpScope: "Five representative clients automated end-to-end with human check, run in parallel with the manual process for two weeks.",
    phase2Scope: jamesTemplate.phase2Scope,
    recommendedStack: jamesTemplate.recommendedStack,
    deliverableNow: true,
    caseStudySuitable: true,
    commercialModel: "free_case_study",
    status: "proposed",
    generationSource: "rules",
    createdAt: subDays(now, 5),
  }).run();
  jamesTemplate.nodes.forEach((n, i) =>
    db.insert(workflowNodes).values({ id: newId("wfn"), opportunityId: jamesDesign, nodeKey: n.key, label: n.label, kind: n.kind, description: n.description, sortOrder: i }).run(),
  );
  jamesTemplate.edges.forEach((e) =>
    db.insert(workflowEdges).values({ id: newId("wfe"), opportunityId: jamesDesign, fromKey: e.from, toKey: e.to, label: e.label ?? null, kind: e.kind }).run(),
  );
  const jamesOpp = newId("opp");
  db.insert(opportunities).values({
    id: jamesOpp,
    leadId: james,
    automationOpportunityId: jamesDesign,
    title: "Kestrel — client reporting automation (case-study build)",
    stage: "case_study_candidate",
    value: 0,
    probability: 0.7,
    proposedService: "Fulfilment reporting automation",
    notes: "Free build for a documented case study; clear paid phase-two potential (alerts, client portal).",
    createdAt: subDays(now, 5),
  }).run();
  db.insert(caseStudies).values({
    id: newId("cst"),
    leadId: james,
    opportunityId: jamesOpp,
    automationOpportunityId: jamesDesign,
    companyName: "Kestrel Fulfilment",
    problem: "Weekly client stock reports for ~40 brands compiled by hand every Friday (6–8 staff-hours), with 2–3 late or wrong reports monthly.",
    baseline: "6–8 staff-hours every Friday; 2–3 late/wrong reports per month (from their own tracking).",
    proposedBuild: "Automated Mintsoft-to-report pipeline with anomaly flags, human review of exceptions, and scheduled sends.",
    successMetric: "Friday reporting time under 1 hour and zero late reports in the measurement month.",
    dataRequired: "Mintsoft API access, report templates, three months of send-time logs for the baseline.",
    approvalStatus: "asked",
    buildStatus: "not_started",
    beforeEvidence: "Send-time log export and staff time tracking, on file from the mapping call.",
    createdAt: subDays(now, 4),
  }).run();
  log(james, "opportunity_created", "Fulfilment reporting automation designed (rules template + discovery)", 5);

  /* ------------------------------------------------------------ */
  /* 7. Lucy Barnes — ecommerce bookkeeper, ready to contact       */
  /* ------------------------------------------------------------ */
  const ledgerId = mkCompany({
    name: "Ledger & Latte Bookkeeping",
    website: "ledgerandlatte.co.uk",
    description: "Bookkeeping for ecommerce sellers (Shopify + Amazon specialists)",
    industry: "Accounting — ecommerce",
    employeeRange: "2-10",
    businessModel: "b2b",
  });
  const lucy = mkLead({
    fullName: "Lucy Barnes",
    jobTitle: "Owner",
    companyId: ledgerId,
    seniority: "founder",
    isFounder: true,
    decisionAuthority: "decision_maker",
    linkedinUrl: "linkedin.com/in/lucy-barnes-demo",
    location: "Nottingham, UK",
    warmth: "warm",
    connectionDegree: "1st",
    source: "LinkedIn connections",
    howKnown: "She's commented on two of my posts about finance admin automation",
    relationshipStrength: 3,
    icpCategory: "ecommerce_bookkeeper",
    status: "ready_to_contact",
    priorityLabel: "p1_contact_now",
    channel: "linkedin",
    currentTools: ["Xero", "Dext", "Amazon Seller Central", "Shopify"],
    caseStudySuitability: 4,
    paidSuitability: 3,
    referralPotential: 5,
    lastInteractionAt: subDays(now, 20),
    interactionCount: 2,
    recommendedAngle: "Ask which reconciliation eats the most time — Amazon settlements are the classic",
  });
  db.insert(buyingSignals).values({
    id: newId("sig"),
    leadId: lucy,
    signalType: "manual_process_mention",
    description: "Commented that month-end 'always overruns because of marketplace settlement matching'",
    evidenceUrl: "https://linkedin.com/in/lucy-barnes-demo",
    strength: "strong",
    observedAt: subDays(now, 15),
  }).run();
  db.insert(painHypotheses).values({
    id: newId("pn"),
    leadId: lucy,
    category: "finance_reconciliation",
    hypothesis: "Amazon/Shopify settlement reconciliation likely consumes days of each month-end.",
    evidence: "Her comment: month-end overruns because of marketplace settlement matching",
    evidenceUrl: "https://linkedin.com/in/lucy-barnes-demo",
    confidence: "high",
    impact: "high",
    discoveryQuestion: "Which reconciliation eats the most time each month — and what goes wrong?",
    automationDirection: "Settlement ingestion → matched transactions → exception queue for her review",
    humanJudgementNote: "Every exception human-reviewed; the system only matches the obvious",
    status: "confirmed",
    source: "human",
    createdAt: subDays(now, 14),
  }).run();
  log(lucy, "priority_set", "p1_contact_now: warm, high fit, evidenced pain, reachable", 14);

  /* ------------------------------------------------------------ */
  /* 8. Tom Radcliffe — local trade, imported                      */
  /* ------------------------------------------------------------ */
  const radcliffeId = mkCompany({
    name: "Radcliffe Plumbing & Heating",
    industry: "Local trade — plumbing",
    employeeRange: "2-10",
    businessModel: "b2c",
  });
  const tom = mkLead({
    fullName: "Tom Radcliffe",
    jobTitle: "Owner",
    companyId: radcliffeId,
    seniority: "founder",
    isFounder: true,
    decisionAuthority: "decision_maker",
    phone: "07700 900000",
    location: "Derby, UK",
    warmth: "warm",
    connectionDegree: "none",
    source: "Family friend",
    howKnown: "Family friend — fitted our boiler; complains about evening paperwork every time",
    relationshipStrength: 4,
    icpCategory: "local_trade",
    status: "imported",
    channel: "phone",
  });
  log(tom, "created", "Demo lead created from warm-list import shape", 2);

  /* Score everything */
  for (const id of [sophie, daniel, priya, marcus, emma, james, lucy, tom]) recompute(db, id);

  // Keep the manually-set peer priority for Marcus (recompute doesn't touch priorityLabel).
  return { created };
}
