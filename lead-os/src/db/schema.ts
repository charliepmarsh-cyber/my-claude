import { sqliteTable, text, integer, real, index, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";
import type {
  Channel,
  ConversationStage,
  DataSource,
  DeliveryStage,
  EntryType,
  IcpCategory,
  LeadStage,
  MessageType,
  NodeKind,
  OpportunityCategory,
  OpportunityStage,
  PainCategory,
  PriorityLabel,
  ReplyClassification,
  ScoreDimension,
  Seniority,
  SignalType,
  TaskKind,
  Warmth,
} from "@/lib/constants";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const id = () => text("id").primaryKey();
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());
const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

/* ------------------------------------------------------------------ */
/* Users & settings                                                    */
/* ------------------------------------------------------------------ */

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("founder"),
  createdAt: createdAt(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: updatedAt(),
});

/* ------------------------------------------------------------------ */
/* Companies & leads                                                   */
/* ------------------------------------------------------------------ */

export const companies = sqliteTable(
  "companies",
  {
    id: id(),
    name: text("name").notNull(),
    website: text("website"),
    linkedinUrl: text("linkedin_url"),
    description: text("description"),
    industry: text("industry"),
    subIndustry: text("sub_industry"),
    employeeRange: text("employee_range"),
    revenueRange: text("revenue_range"),
    ecommercePlatform: text("ecommerce_platform"),
    shopifyStatus: text("shopify_status").$type<"none" | "shopify" | "shopify_plus" | "unknown">().default("unknown"),
    otherTechnologies: text("other_technologies", { mode: "json" }).$type<string[]>(),
    businessModel: text("business_model").$type<"b2b" | "b2c" | "dtc" | "mixed" | "unknown">().default("unknown"),
    salesChannels: text("sales_channels", { mode: "json" }).$type<string[]>(),
    markets: text("markets", { mode: "json" }).$type<string[]>(),
    dataSource: text("data_source").$type<DataSource>().notNull().default("manual"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("companies_name_idx").on(t.name)],
);

export const leads = sqliteTable(
  "leads",
  {
    id: id(),
    /* identity */
    fullName: text("full_name").notNull(),
    preferredName: text("preferred_name"),
    pronouns: text("pronouns"),
    linkedinUrl: text("linkedin_url"),
    avatarUrl: text("avatar_url"),
    workEmail: text("work_email"),
    personalEmail: text("personal_email"),
    phone: text("phone"),
    location: text("location"),
    timezone: text("timezone"),
    /* role */
    jobTitle: text("job_title"),
    seniority: text("seniority").$type<Seniority>().default("unknown"),
    department: text("department"),
    decisionAuthority: text("decision_authority").$type<"decision_maker" | "influencer" | "user" | "unknown">().default("unknown"),
    isFounder: integer("is_founder", { mode: "boolean" }).notNull().default(false),
    yearsInRole: real("years_in_role"),
    previousRoles: text("previous_roles"),
    /* company */
    companyId: text("company_id").references(() => companies.id, { onDelete: "set null" }),
    /* relationship */
    source: text("source"),
    warmth: text("warmth").$type<Warmth>().notNull().default("cold"),
    connectionDegree: text("connection_degree").$type<"1st" | "2nd" | "3rd" | "none" | "unknown">().default("unknown"),
    howKnown: text("how_known"),
    relationshipStrength: integer("relationship_strength"), // 1–5
    referrer: text("referrer"),
    sharedConnections: text("shared_connections"),
    sharedGroups: text("shared_groups"),
    trustIndicators: text("trust_indicators"),
    lastInteractionAt: integer("last_interaction_at", { mode: "timestamp_ms" }),
    interactionCount: integer("interaction_count").notNull().default(0),
    /* intelligence */
    icpCategory: text("icp_category").$type<IcpCategory>().default("other"),
    recommendedAngle: text("recommended_angle"),
    aiSummary: text("ai_summary"),
    notes: text("notes"),
    likelyObjections: text("likely_objections", { mode: "json" }).$type<string[]>(),
    currentTools: text("current_tools", { mode: "json" }).$type<string[]>(),
    /* outreach */
    status: text("status").$type<LeadStage>().notNull().default("imported"),
    priorityLabel: text("priority_label").$type<PriorityLabel>(),
    channel: text("channel").$type<Channel>().default("linkedin"),
    lastContactedAt: integer("last_contacted_at", { mode: "timestamp_ms" }),
    nextAction: text("next_action"),
    nextActionDue: integer("next_action_due", { mode: "timestamp_ms" }),
    followUpCount: integer("follow_up_count").notNull().default(0),
    replySentiment: text("reply_sentiment").$type<ReplyClassification>(),
    conversationStage: text("conversation_stage").$type<ConversationStage>(),
    meetingStatus: text("meeting_status").$type<"none" | "proposed" | "booked" | "held" | "cancelled">().default("none"),
    /* commercial */
    opportunityValue: real("opportunity_value"),
    probability: real("probability"),
    proposedService: text("proposed_service"),
    caseStudySuitability: integer("case_study_suitability"), // 1–5
    paidSuitability: integer("paid_suitability"), // 1–5
    retainerSuitability: integer("retainer_suitability"), // 1–5
    referralPotential: integer("referral_potential"), // 1–5
    strategicValue: text("strategic_value"),
    /* system */
    dataSource: text("data_source").$type<DataSource>().notNull().default("manual"),
    doNotContact: integer("do_not_contact", { mode: "boolean" }).notNull().default(false),
    suppressionReason: text("suppression_reason"),
    completeness: integer("completeness").notNull().default(0), // 0–100 cached
    overallScore: integer("overall_score"), // cached weighted priority score
    duplicateOfId: text("duplicate_of_id"),
    closedReason: text("closed_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("leads_status_idx").on(t.status),
    index("leads_priority_idx").on(t.priorityLabel),
    index("leads_company_idx").on(t.companyId),
    index("leads_next_action_due_idx").on(t.nextActionDue),
    index("leads_overall_score_idx").on(t.overallScore),
    index("leads_full_name_idx").on(t.fullName),
    index("leads_dnc_idx").on(t.doNotContact),
  ],
);

/* ------------------------------------------------------------------ */
/* Research & intelligence                                             */
/* ------------------------------------------------------------------ */

export const researchItems = sqliteTable(
  "research_items",
  {
    id: id(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    kind: text("kind")
      .$type<"note" | "company_snapshot" | "website" | "linkedin" | "news" | "tech_stack" | "trigger_event">()
      .notNull()
      .default("note"),
    title: text("title").notNull(),
    content: text("content").notNull(),
    sourceUrl: text("source_url"),
    confidence: text("confidence").$type<"low" | "medium" | "high">().notNull().default("medium"),
    createdAt: createdAt(),
  },
  (t) => [index("research_lead_idx").on(t.leadId)],
);

export const buyingSignals = sqliteTable(
  "buying_signals",
  {
    id: id(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    signalType: text("signal_type").$type<SignalType>().notNull(),
    description: text("description").notNull(),
    evidenceUrl: text("evidence_url"),
    strength: text("strength").$type<"weak" | "moderate" | "strong">().notNull().default("moderate"),
    observedAt: integer("observed_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [index("signals_lead_idx").on(t.leadId)],
);

export const painHypotheses = sqliteTable(
  "pain_hypotheses",
  {
    id: id(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    category: text("category").$type<PainCategory>().notNull(),
    hypothesis: text("hypothesis").notNull(),
    evidence: text("evidence"),
    evidenceUrl: text("evidence_url"),
    confidence: text("confidence").$type<"low" | "medium" | "high">().notNull().default("low"),
    impact: text("impact").$type<"low" | "medium" | "high">().notNull().default("medium"),
    discoveryQuestion: text("discovery_question"),
    automationDirection: text("automation_direction"),
    humanJudgementNote: text("human_judgement_note"),
    status: text("status").$type<"proposed" | "confirmed" | "rejected">().notNull().default("proposed"),
    source: text("source").$type<"rules" | "ai" | "human">().notNull().default("human"),
    createdAt: createdAt(),
  },
  (t) => [index("pain_lead_idx").on(t.leadId)],
);

export type ScoreBreakdownLine = {
  factor: string;
  points: number;
  max: number;
  evidence?: string;
  missing?: string;
};

export const scores = sqliteTable(
  "scores",
  {
    id: id(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    dimension: text("dimension").$type<ScoreDimension | "overall">().notNull(),
    value: integer("value").notNull(),
    calculatedBy: text("calculated_by").$type<"rules" | "ai" | "hybrid" | "manual">().notNull().default("rules"),
    breakdown: text("breakdown", { mode: "json" }).$type<ScoreBreakdownLine[]>(),
    manualReason: text("manual_reason"),
    computedAt: integer("computed_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("scores_lead_dimension_idx").on(t.leadId, t.dimension)],
);

/* ------------------------------------------------------------------ */
/* Messaging & conversations                                           */
/* ------------------------------------------------------------------ */

export const messages = sqliteTable(
  "messages",
  {
    id: id(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    msgType: text("msg_type").$type<MessageType>().notNull(),
    channel: text("channel").$type<Channel>().notNull().default("linkedin"),
    subject: text("subject"),
    body: text("body").notNull(),
    evidenceUsed: text("evidence_used", { mode: "json" }).$type<string[]>(),
    generationSource: text("generation_source").$type<"rules" | "ai" | "human">().notNull().default("rules"),
    generationControls: text("generation_controls", { mode: "json" }).$type<Record<string, string>>(),
    promptVersion: text("prompt_version"),
    status: text("status").$type<"draft" | "approved" | "sent" | "discarded">().notNull().default("draft"),
    versionNum: integer("version_num").notNull().default(1),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("messages_lead_idx").on(t.leadId), index("messages_status_idx").on(t.status)],
);

export const conversations = sqliteTable(
  "conversations",
  {
    id: id(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    channel: text("channel").$type<Channel>().notNull().default("linkedin"),
    stage: text("stage").$type<ConversationStage>(),
    isPeerConversation: integer("is_peer_conversation", { mode: "boolean" }).notNull().default(false),
    startedAt: integer("started_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    lastEntryAt: integer("last_entry_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("conversations_lead_idx").on(t.leadId)],
);

export const conversationEntries = sqliteTable(
  "conversation_entries",
  {
    id: id(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    direction: text("direction").$type<"outbound" | "inbound" | "internal">().notNull(),
    entryType: text("entry_type").$type<EntryType>().notNull(),
    content: text("content").notNull(),
    attachmentName: text("attachment_name"),
    messageId: text("message_id").references(() => messages.id, { onDelete: "set null" }),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    createdAt: createdAt(),
  },
  (t) => [index("entries_conversation_idx").on(t.conversationId), index("entries_lead_idx").on(t.leadId)],
);

export const replyAnalyses = sqliteTable(
  "reply_analyses",
  {
    id: id(),
    entryId: text("entry_id")
      .notNull()
      .references(() => conversationEntries.id, { onDelete: "cascade" }),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    classification: text("classification").$type<ReplyClassification>().notNull(),
    confidence: text("confidence").$type<"low" | "medium" | "high">().notNull().default("low"),
    explicitProblem: text("explicit_problem"),
    impliedPain: text("implied_pain"),
    currentProcess: text("current_process"),
    frequency: text("frequency"),
    consequence: text("consequence"),
    toolsMentioned: text("tools_mentioned", { mode: "json" }).$type<string[]>(),
    authoritySignal: text("authority_signal"),
    interestLevel: text("interest_level").$type<"none" | "low" | "medium" | "high" | "unclear">().notNull().default("unclear"),
    techSophistication: text("tech_sophistication"),
    humanJudgementAreas: text("human_judgement_areas"),
    possibleObjections: text("possible_objections", { mode: "json" }).$type<string[]>(),
    recommendedNextQuestion: text("recommended_next_question"),
    nextQuestionReason: text("next_question_reason"),
    recommendation: text("recommendation")
      .$type<"continue_discovery" | "propose_action" | "nurture" | "close_politely" | "treat_as_peer" | "await_reply">()
      .notNull()
      .default("continue_discovery"),
    analysisSource: text("analysis_source").$type<"rules" | "ai" | "hybrid">().notNull().default("rules"),
    rationale: text("rationale"),
    createdAt: createdAt(),
  },
  (t) => [index("reply_analyses_lead_idx").on(t.leadId)],
);

/* ------------------------------------------------------------------ */
/* Tasks & follow-ups                                                  */
/* ------------------------------------------------------------------ */

export const tasks = sqliteTable(
  "tasks",
  {
    id: id(),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    kind: text("kind").$type<TaskKind>().notNull().default("custom"),
    title: text("title").notNull(),
    detail: text("detail"),
    dueAt: integer("due_at", { mode: "timestamp_ms" }),
    snoozedUntil: integer("snoozed_until", { mode: "timestamp_ms" }),
    status: text("status").$type<"open" | "done" | "cancelled">().notNull().default("open"),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [index("tasks_due_idx").on(t.dueAt), index("tasks_status_idx").on(t.status), index("tasks_lead_idx").on(t.leadId)],
);

/* ------------------------------------------------------------------ */
/* Discovery & automation opportunities                                */
/* ------------------------------------------------------------------ */

export const discoveries = sqliteTable(
  "discoveries",
  {
    id: id(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    problemStatement: text("problem_statement"),
    currentWorkflow: text("current_workflow"),
    trigger: text("trigger"),
    inputs: text("inputs"),
    steps: text("steps"),
    tools: text("tools"),
    peopleInvolved: text("people_involved"),
    processOwner: text("process_owner"),
    decisionPoints: text("decision_points"),
    exceptions: text("exceptions"),
    outputs: text("outputs"),
    volume: text("volume"),
    frequency: text("frequency"),
    timeConsumed: text("time_consumed"),
    errorRate: text("error_rate"),
    costEstimate: text("cost_estimate"),
    revenueImpact: text("revenue_impact"),
    customerImpact: text("customer_impact"),
    complianceRisk: text("compliance_risk"),
    humanJudgement: text("human_judgement"),
    desiredOutcome: text("desired_outcome"),
    constraints: text("constraints"),
    accessRequired: text("access_required"),
    dataSensitivity: text("data_sensitivity"),
    successMetrics: text("success_metrics"),
    completeness: integer("completeness").notNull().default(0),
    status: text("status").$type<"open" | "sufficient" | "complete" | "abandoned">().notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("discoveries_lead_idx").on(t.leadId)],
);

export const automationOpportunities = sqliteTable(
  "automation_opportunities",
  {
    id: id(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    discoveryId: text("discovery_id").references(() => discoveries.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    category: text("category").$type<OpportunityCategory>().notNull().default("other"),
    businessProblem: text("business_problem"),
    currentState: text("current_state"),
    futureState: text("future_state"),
    deterministicSteps: text("deterministic_steps", { mode: "json" }).$type<string[]>(),
    aiSteps: text("ai_steps", { mode: "json" }).$type<string[]>(),
    humanSteps: text("human_steps", { mode: "json" }).$type<string[]>(),
    integrations: text("integrations", { mode: "json" }).$type<string[]>(),
    credentialsNeeded: text("credentials_needed", { mode: "json" }).$type<string[]>(),
    dataModel: text("data_model"),
    exceptionHandling: text("exception_handling"),
    securityConsiderations: text("security_considerations"),
    risks: text("risks"),
    complexity: text("complexity").$type<"S" | "M" | "L" | "XL">().notNull().default("M"),
    timeSavedHoursMonth: real("time_saved_hours_month"),
    revenueImpact: text("revenue_impact"),
    errorReduction: text("error_reduction"),
    measurementPlan: text("measurement_plan"),
    mvpScope: text("mvp_scope"),
    phase2Scope: text("phase2_scope"),
    recommendedStack: text("recommended_stack", { mode: "json" }).$type<string[]>(),
    deliverableNow: integer("deliverable_now", { mode: "boolean" }).notNull().default(true),
    missingSkills: text("missing_skills"),
    caseStudySuitable: integer("case_study_suitable", { mode: "boolean" }).notNull().default(false),
    commercialModel: text("commercial_model").$type<"free_case_study" | "paid_project" | "retainer" | "paid_discovery" | "undecided">().notNull().default("undecided"),
    status: text("status").$type<"draft" | "proposed" | "accepted" | "declined" | "delivered">().notNull().default("draft"),
    generationSource: text("generation_source").$type<"rules" | "ai" | "human">().notNull().default("human"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("auto_opps_lead_idx").on(t.leadId)],
);

export const workflowNodes = sqliteTable(
  "workflow_nodes",
  {
    id: id(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => automationOpportunities.id, { onDelete: "cascade" }),
    nodeKey: text("node_key").notNull(),
    label: text("label").notNull(),
    kind: text("kind").$type<NodeKind>().notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("wf_nodes_opp_idx").on(t.opportunityId),
    uniqueIndex("wf_nodes_opp_key_idx").on(t.opportunityId, t.nodeKey),
  ],
);

export const workflowEdges = sqliteTable(
  "workflow_edges",
  {
    id: id(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => automationOpportunities.id, { onDelete: "cascade" }),
    fromKey: text("from_key").notNull(),
    toKey: text("to_key").notNull(),
    label: text("label"),
    kind: text("kind").$type<"normal" | "failure" | "retry" | "fallback">().notNull().default("normal"),
  },
  (t) => [index("wf_edges_opp_idx").on(t.opportunityId)],
);

/* ------------------------------------------------------------------ */
/* Commercial: opportunities, case studies                             */
/* ------------------------------------------------------------------ */

export const opportunities = sqliteTable(
  "opportunities",
  {
    id: id(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    automationOpportunityId: text("automation_opportunity_id").references(() => automationOpportunities.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    stage: text("stage").$type<OpportunityStage>().notNull().default("qualified"),
    deliveryStage: text("delivery_stage").$type<DeliveryStage>(),
    value: real("value"),
    probability: real("probability"),
    proposedService: text("proposed_service"),
    notes: text("notes"),
    wonAt: integer("won_at", { mode: "timestamp_ms" }),
    lostAt: integer("lost_at", { mode: "timestamp_ms" }),
    lostReason: text("lost_reason"),
    onHoldReason: text("on_hold_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("opps_lead_idx").on(t.leadId), index("opps_stage_idx").on(t.stage)],
);

export const caseStudies = sqliteTable(
  "case_studies",
  {
    id: id(),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
    opportunityId: text("opportunity_id").references(() => opportunities.id, { onDelete: "set null" }),
    automationOpportunityId: text("automation_opportunity_id").references(() => automationOpportunities.id, {
      onDelete: "set null",
    }),
    companyName: text("company_name").notNull(),
    problem: text("problem"),
    baseline: text("baseline"),
    proposedBuild: text("proposed_build"),
    successMetric: text("success_metric"),
    dataRequired: text("data_required"),
    approvalStatus: text("approval_status").$type<"not_asked" | "asked" | "approved" | "declined">().notNull().default("not_asked"),
    buildStatus: text("build_status").$type<"not_started" | "scoping" | "building" | "testing" | "live" | "measuring" | "complete">().notNull().default("not_started"),
    beforeEvidence: text("before_evidence"),
    afterEvidence: text("after_evidence"),
    timeSaved: text("time_saved"),
    revenueInfluenced: text("revenue_influenced"),
    errorReduction: text("error_reduction"),
    qualitativeFeedback: text("qualitative_feedback"),
    testimonialStatus: text("testimonial_status").$type<"not_asked" | "asked" | "received" | "declined">().notNull().default("not_asked"),
    permissionToPublish: integer("permission_to_publish", { mode: "boolean" }).notNull().default(false),
    redactionRequirements: text("redaction_requirements"),
    referralRequested: integer("referral_requested", { mode: "boolean" }).notNull().default(false),
    paidFollowOn: text("paid_follow_on"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("case_studies_lead_idx").on(t.leadId)],
);

/* ------------------------------------------------------------------ */
/* History, audit, imports, AI, suppression                            */
/* ------------------------------------------------------------------ */

export const stageHistory = sqliteTable(
  "stage_history",
  {
    id: id(),
    entity: text("entity").$type<"lead" | "conversation" | "opportunity" | "delivery">().notNull(),
    entityId: text("entity_id").notNull(),
    leadId: text("lead_id"),
    fromStage: text("from_stage"),
    toStage: text("to_stage").notNull(),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [index("stage_history_entity_idx").on(t.entity, t.entityId)],
);

export const activities = sqliteTable(
  "activities",
  {
    id: id(),
    leadId: text("lead_id"),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    action: text("action").notNull(),
    detail: text("detail"),
    actor: text("actor").$type<"user" | "system" | "ai">().notNull().default("user"),
    createdAt: createdAt(),
  },
  (t) => [index("activities_lead_idx").on(t.leadId), index("activities_created_idx").on(t.createdAt)],
);

export const imports = sqliteTable("imports", {
  id: id(),
  filename: text("filename").notNull(),
  rowCount: integer("row_count").notNull().default(0),
  createdCount: integer("created_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  skippedCount: integer("skipped_count").notNull().default(0),
  duplicateCount: integer("duplicate_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  mapping: text("mapping", { mode: "json" }).$type<Record<string, string>>(),
  status: text("status").$type<"complete" | "undone">().notNull().default("complete"),
  undoneAt: integer("undone_at", { mode: "timestamp_ms" }),
  createdAt: createdAt(),
});

export const importRows = sqliteTable(
  "import_rows",
  {
    id: id(),
    importId: text("import_id")
      .notNull()
      .references(() => imports.id, { onDelete: "cascade" }),
    rowNum: integer("row_num").notNull(),
    raw: text("raw", { mode: "json" }).$type<Record<string, string>>(),
    outcome: text("outcome").$type<"created" | "updated" | "skipped" | "duplicate" | "error">().notNull(),
    leadId: text("lead_id"),
    message: text("message"),
    priorSnapshot: text("prior_snapshot", { mode: "json" }).$type<Record<string, unknown> | null>(),
    createdAt: createdAt(),
  },
  (t) => [index("import_rows_import_idx").on(t.importId)],
);

export const aiRuns = sqliteTable(
  "ai_runs",
  {
    id: id(),
    purpose: text("purpose").notNull(),
    provider: text("provider").notNull(),
    model: text("model"),
    promptVersion: text("prompt_version"),
    leadId: text("lead_id"),
    inputSummary: text("input_summary"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costEstimateUsd: real("cost_estimate_usd"),
    durationMs: integer("duration_ms"),
    status: text("status").$type<"ok" | "error" | "mock">().notNull(),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("ai_runs_created_idx").on(t.createdAt)],
);

export const suppressionRecords = sqliteTable(
  "suppression_records",
  {
    id: id(),
    kind: text("kind").$type<"email" | "linkedin" | "name" | "domain">().notNull(),
    value: text("value").notNull(),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("suppression_kind_value_idx").on(t.kind, t.value)],
);

export const savedFilters = sqliteTable("saved_filters", {
  id: id(),
  name: text("name").notNull(),
  params: text("params", { mode: "json" }).$type<Record<string, string>>().notNull(),
  createdAt: createdAt(),
});

export const tags = sqliteTable("tags", {
  id: id(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("blue"),
  createdAt: createdAt(),
});

export const leadTags = sqliteTable(
  "lead_tags",
  {
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.leadId, t.tagId] })],
);

/* ------------------------------------------------------------------ */
/* Inferred types                                                      */
/* ------------------------------------------------------------------ */

export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type ResearchItem = typeof researchItems.$inferSelect;
export type BuyingSignal = typeof buyingSignals.$inferSelect;
export type PainHypothesis = typeof painHypotheses.$inferSelect;
export type Score = typeof scores.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type ConversationEntry = typeof conversationEntries.$inferSelect;
export type ReplyAnalysis = typeof replyAnalyses.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Discovery = typeof discoveries.$inferSelect;
export type AutomationOpportunity = typeof automationOpportunities.$inferSelect;
export type WorkflowNode = typeof workflowNodes.$inferSelect;
export type WorkflowEdge = typeof workflowEdges.$inferSelect;
export type Opportunity = typeof opportunities.$inferSelect;
export type CaseStudy = typeof caseStudies.$inferSelect;
export type ImportRecord = typeof imports.$inferSelect;
export type ImportRow = typeof importRows.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type AiRun = typeof aiRuns.$inferSelect;
export type SuppressionRecord = typeof suppressionRecords.$inferSelect;
