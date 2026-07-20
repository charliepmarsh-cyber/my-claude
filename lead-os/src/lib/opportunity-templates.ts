/**
 * Deterministic automation-opportunity templates per category.
 *
 * Every generated workflow includes, by design: a human-review checkpoint
 * before anything client-facing, a failure path, a retry path, a manual
 * fallback, and an audit log node. These are non-negotiable in CPM builds.
 */

import type { Discovery } from "@/db/schema";
import type { NodeKind, OpportunityCategory } from "@/lib/constants";

export type TemplateNode = { key: string; label: string; kind: NodeKind; description: string };
export type TemplateEdge = { from: string; to: string; label?: string; kind: "normal" | "failure" | "retry" | "fallback" };

export type OpportunityTemplate = {
  title: string;
  businessProblem: string;
  currentState: string;
  futureState: string;
  deterministicSteps: string[];
  aiSteps: string[];
  humanSteps: string[];
  integrations: string[];
  credentialsNeeded: string[];
  dataModel: string;
  exceptionHandling: string;
  securityConsiderations: string;
  risks: string;
  complexity: "S" | "M" | "L" | "XL";
  measurementPlan: string;
  mvpScope: string;
  phase2Scope: string;
  recommendedStack: string[];
  nodes: TemplateNode[];
  edges: TemplateEdge[];
};

type Core = {
  title: string;
  problem: string;
  gather: string;
  gatherDesc: string;
  process: string;
  processDesc: string;
  aiStep: string | null;
  aiDesc: string;
  reviewDesc: string;
  deliver: string;
  deliverDesc: string;
  deterministicSteps: string[];
  aiSteps: string[];
  humanSteps: string[];
  integrations: string[];
  credentials: string[];
  dataModel: string;
  risks: string;
  complexity: "S" | "M" | "L" | "XL";
  measurement: string;
  mvp: string;
  phase2: string;
};

function build(core: Core): OpportunityTemplate {
  const nodes: TemplateNode[] = [
    { key: "trigger", label: "Trigger", kind: "trigger", description: "Scheduled run or event kick-off (webhook / cron)." },
    { key: "gather", label: core.gather, kind: "deterministic", description: core.gatherDesc },
    { key: "process", label: core.process, kind: "deterministic", description: core.processDesc },
    ...(core.aiStep ? [{ key: "ai", label: core.aiStep, kind: "ai" as NodeKind, description: core.aiDesc }] : []),
    { key: "review", label: "Human review & approval", kind: "human_review", description: core.reviewDesc },
    { key: "deliver", label: core.deliver, kind: "output", description: core.deliverDesc },
    { key: "audit", label: "Audit log", kind: "audit", description: "Every run, input, output and approval recorded with timestamps." },
    { key: "fail", label: "Failure handler", kind: "failure", description: "Catches step errors; captures context for diagnosis." },
    { key: "retry", label: "Retry (max 3)", kind: "retry", description: "Backoff retry for transient failures (API limits, timeouts)." },
    { key: "fallback", label: "Manual fallback", kind: "fallback", description: "After repeated failure, the task lands in a human queue with everything collected so far." },
  ];
  const afterProcess = core.aiStep ? "ai" : "process";
  const edges: TemplateEdge[] = [
    { from: "trigger", to: "gather", kind: "normal" },
    { from: "gather", to: "process", kind: "normal" },
    ...(core.aiStep ? [{ from: "process", to: "ai", kind: "normal" as const }] : []),
    { from: afterProcess, to: "review", kind: "normal", label: "nothing ships unreviewed" },
    { from: "review", to: "deliver", kind: "normal", label: "approved" },
    { from: "deliver", to: "audit", kind: "normal" },
    { from: "gather", to: "fail", kind: "failure", label: "on error" },
    { from: "process", to: "fail", kind: "failure", label: "on error" },
    ...(core.aiStep ? [{ from: "ai", to: "fail", kind: "failure" as const, label: "on error" }] : []),
    { from: "fail", to: "retry", kind: "retry" },
    { from: "retry", to: "gather", kind: "retry", label: "backoff ×3" },
    { from: "fail", to: "fallback", kind: "fallback", label: "after 3 fails" },
    { from: "fallback", to: "review", kind: "fallback", label: "human completes" },
  ];
  return {
    title: core.title,
    businessProblem: core.problem,
    currentState: "",
    futureState: `Automated pipeline: ${core.gather.toLowerCase()} → ${core.process.toLowerCase()}${core.aiStep ? ` → ${core.aiStep.toLowerCase()}` : ""} → human review → ${core.deliver.toLowerCase()}, with retries, manual fallback and a full audit trail.`,
    deterministicSteps: core.deterministicSteps,
    aiSteps: core.aiSteps,
    humanSteps: core.humanSteps,
    integrations: core.integrations,
    credentialsNeeded: core.credentials,
    dataModel: core.dataModel,
    exceptionHandling:
      "Transient failures retry with backoff (max 3). Persistent failures route to a manual-fallback queue with all gathered context. Malformed input is quarantined for human review, never silently dropped.",
    securityConsiderations:
      "Credentials stored server-side only (n8n credentials store / env). Minimum-scope API keys. Personal data minimised and never sent to AI providers without redaction. All access logged.",
    risks: core.risks,
    complexity: core.complexity,
    measurementPlan: core.measurement,
    mvpScope: core.mvp,
    phase2Scope: core.phase2,
    recommendedStack: ["n8n", "Claude API (structured output)", ...core.integrations.slice(0, 3)],
    nodes,
    edges,
  };
}

const TEMPLATES: Record<OpportunityCategory, () => OpportunityTemplate> = {
  campaign_reporting: () =>
    build({
      title: "Campaign reporting & commentary automation",
      problem: "Hours are spent every week pulling campaign data and preparing client-ready reports by hand.",
      gather: "Pull campaign data",
      gatherDesc: "Scheduled pulls from ad platforms / GA4 / ESP into a normalised store.",
      process: "Merge & compute metrics",
      processDesc: "Join sources, compute period-on-period deltas, detect anomalies against thresholds.",
      aiStep: "Draft commentary",
      aiDesc: "Claude drafts plain-English insight bullets per account from the computed numbers only.",
      reviewDesc: "The specialist reviews numbers and edits commentary — client-facing claims never ship unreviewed.",
      deliver: "Publish report",
      deliverDesc: "Formatted report to Sheets/Slides/email once approved.",
      deterministicSteps: ["Scheduled data pulls", "Metric computation & deltas", "Threshold-based anomaly flags", "Report templating"],
      aiSteps: ["Commentary drafting from computed metrics", "Anomaly explanation suggestions"],
      humanSteps: ["Review and edit commentary", "Approve before sending", "Handle flagged anomalies"],
      integrations: ["Meta Ads API", "Google Ads API", "GA4", "Google Sheets", "Klaviyo"],
      credentials: ["Ad platform API tokens (read-only)", "GA4 service account", "Google Sheets access"],
      dataModel: "accounts, campaigns, daily_metrics, anomalies, reports, commentary_drafts, approvals",
      risks: "Metric definitions must match the client's; AI commentary must be constrained to computed numbers; API quota limits.",
      complexity: "M",
      measurement: "Hours per reporting cycle before vs after; report delivery day; error/correction count per month.",
      mvp: "One account, one weekly report, human approval step, time tracked.",
      phase2: "Multi-account rollout, anomaly alerting mid-week, Slack delivery, client portal.",
    }),
  lead_qualification_routing: () =>
    build({
      title: "Lead qualification & routing automation",
      problem: "Inbound leads are triaged by hand — slow first responses and inconsistent qualification.",
      gather: "Capture & enrich lead",
      gatherDesc: "Form/webhook capture; enrich from provided fields and public company data.",
      process: "Score against rules",
      processDesc: "Deterministic scoring on fit criteria; deduplicate against CRM.",
      aiStep: "Draft qualification summary",
      aiDesc: "Claude summarises the lead and suggests a routing reason from captured data only.",
      reviewDesc: "Edge cases and high-value leads get a human decision; routine ones proceed with approval rules.",
      deliver: "Route to owner + CRM",
      deliverDesc: "Create/assign CRM record, notify the right person with context.",
      deterministicSteps: ["Capture", "Dedupe", "Rules scoring", "CRM write", "Notifications"],
      aiSteps: ["Lead summary drafting", "Routing-reason suggestion"],
      humanSteps: ["Review flagged/high-value leads", "Adjust scoring rules over time"],
      integrations: ["HubSpot", "Webhook/forms", "Slack/email", "Clearout or similar (optional)"],
      credentials: ["CRM API key", "Notification channel token"],
      dataModel: "leads, scores, routing_rules, assignments, notifications, audit",
      risks: "Bad rules misroute quietly — monthly rule review needed; enrichment data quality varies.",
      complexity: "M",
      measurement: "Time-to-first-touch; % leads qualified consistently; missed-lead count.",
      mvp: "One intake channel, rules scoring, CRM record + notification, weekly review report.",
      phase2: "Multi-channel intake, auto-drafted first replies (human approved), analytics.",
    }),
  crm_enrichment: () =>
    build({
      title: "CRM enrichment & hygiene automation",
      problem: "CRM records go stale and inconsistent, making reporting and outreach unreliable.",
      gather: "Scan CRM records",
      gatherDesc: "Scheduled scan for missing fields, stale records, duplicates, format issues.",
      process: "Fix & flag",
      processDesc: "Deterministic normalisation (formats, casing, dedupe candidates); enrichment from approved sources.",
      aiStep: null,
      aiDesc: "",
      reviewDesc: "Merge/delete decisions are proposed, never executed without approval.",
      deliver: "Apply approved changes",
      deliverDesc: "Batch-apply approved fixes; report what changed.",
      deterministicSteps: ["Completeness scan", "Format normalisation", "Duplicate detection", "Change batching"],
      aiSteps: [],
      humanSteps: ["Approve merges and deletions", "Set hygiene rules"],
      integrations: ["HubSpot/Pipedrive", "Google Sheets (review queue)"],
      credentials: ["CRM API key"],
      dataModel: "records, issues, proposed_changes, approvals, change_log",
      risks: "Auto-merging is dangerous — this design never merges without human approval.",
      complexity: "S",
      measurement: "Record completeness %; duplicate count; time spent on manual cleanup.",
      mvp: "Weekly hygiene report + approval queue for one CRM.",
      phase2: "Continuous monitoring, enrichment APIs, ownership rules.",
    }),
  product_data_workflows: () =>
    build({
      title: "Product-data consistency automation",
      problem: "Product information diverges across store, feeds and channels, causing errors and rework.",
      gather: "Pull product data",
      gatherDesc: "Fetch catalogue from the source of truth and each channel.",
      process: "Diff & validate",
      processDesc: "Field-level diffs, rule validation (prices, stock, images, required fields).",
      aiStep: null,
      aiDesc: "",
      reviewDesc: "Proposed corrections reviewed before any channel is written to.",
      deliver: "Sync approved fixes",
      deliverDesc: "Push approved updates; verify post-write.",
      deterministicSteps: ["Catalogue pulls", "Diffing", "Validation rules", "Sync writes", "Post-write verification"],
      aiSteps: [],
      humanSteps: ["Approve corrections", "Resolve conflicting sources"],
      integrations: ["Shopify Admin API", "Marketplace APIs", "Google Merchant feed"],
      credentials: ["Shopify Admin token (scoped)", "Marketplace API keys"],
      dataModel: "products, channel_snapshots, diffs, validation_issues, sync_jobs, verifications",
      risks: "Writing bad data at scale — mitigated by preview/diff + approval + post-write verification.",
      complexity: "L",
      measurement: "Divergence count over time; error incidents; hours on manual catalogue fixes.",
      mvp: "Read-only divergence report for one channel pair.",
      phase2: "Approved-write sync, image/asset checks, scheduled monitoring.",
    }),
  shopify_operations: () =>
    build({
      title: "Shopify operations automation",
      problem: "Routine store operations (orders, tags, alerts, reports) are handled manually.",
      gather: "Watch store events",
      gatherDesc: "Webhooks for orders/inventory events; scheduled catch-up polls.",
      process: "Apply operation rules",
      processDesc: "Deterministic rules: tagging, flagging, thresholds, report building.",
      aiStep: null,
      aiDesc: "",
      reviewDesc: "Rule changes and unusual events reviewed by the operator.",
      deliver: "Execute & notify",
      deliverDesc: "Apply approved actions, send digests/alerts.",
      deterministicSteps: ["Event capture", "Rules engine", "Action execution", "Digest building"],
      aiSteps: [],
      humanSteps: ["Handle flagged unusual events", "Own the rulebook"],
      integrations: ["Shopify Admin API", "Slack/email"],
      credentials: ["Shopify Admin token (scoped)"],
      dataModel: "events, rules, actions, digests, exceptions",
      risks: "Over-automation of edge cases — exceptions must route to a human.",
      complexity: "M",
      measurement: "Manual ops hours; response time to stock/order issues.",
      mvp: "One workflow (e.g. low-stock alerts with sales velocity context).",
      phase2: "Order-exception handling, fulfilment sync, weekly ops digest.",
    }),
  multi_marketplace: () =>
    build({
      title: "Multi-marketplace coordination automation",
      problem: "Listings, stock and orders across marketplaces need constant manual reconciliation.",
      gather: "Pull marketplace state",
      gatherDesc: "Fetch listings/orders/stock from each marketplace and the core store.",
      process: "Reconcile & queue",
      processDesc: "Detect mismatches; queue proposed updates; never auto-write price changes.",
      aiStep: null,
      aiDesc: "",
      reviewDesc: "Price/listing changes approved by the owner; stock sync can run on rules.",
      deliver: "Apply & verify",
      deliverDesc: "Push approved updates; verify; report.",
      deterministicSteps: ["State pulls", "Reconciliation", "Rule-based stock sync", "Verification"],
      aiSteps: [],
      humanSteps: ["Approve price/listing changes", "Resolve conflicts"],
      integrations: ["Amazon SP-API", "eBay API", "Etsy API", "Shopify"],
      credentials: ["Marketplace API keys per channel"],
      dataModel: "channels, listings, stock_snapshots, mismatches, updates, verifications",
      risks: "Marketplace API quirks and rate limits; price errors are costly — human approval on pricing.",
      complexity: "L",
      measurement: "Mismatch count; oversell incidents; reconciliation hours.",
      mvp: "Read-only daily mismatch report across two channels.",
      phase2: "Rule-based stock sync with approvals, order aggregation.",
    }),
  cro_analysis: () =>
    build({
      title: "CRO audit-preparation automation",
      problem: "Each audit starts with hours of manual data gathering before analysis can begin.",
      gather: "Collect audit inputs",
      gatherDesc: "Analytics exports, speed tests, form/funnel data, screenshot capture list.",
      process: "Assemble audit pack",
      processDesc: "Normalise into a standard analyst-ready workbook with baseline metrics.",
      aiStep: "Draft observations",
      aiDesc: "Claude drafts neutral observations (data-grounded) for the analyst to accept/reject.",
      reviewDesc: "The expert's analysis is the product — drafts are raw material only.",
      deliver: "Analyst-ready pack",
      deliverDesc: "Structured pack delivered to the analyst workspace.",
      deterministicSteps: ["Data collection", "Pack assembly", "Baseline metric computation"],
      aiSteps: ["Draft observations from collected data"],
      humanSteps: ["Full analysis and recommendations", "Client presentation"],
      integrations: ["GA4", "PageSpeed API", "Google Sheets"],
      credentials: ["GA4 service account", "Sheets access"],
      dataModel: "audits, sources, metrics, observations, packs",
      risks: "Garbage-in observations — AI is limited to describing collected data.",
      complexity: "S",
      measurement: "Prep hours per audit before vs after.",
      mvp: "One-click audit pack for a single site.",
      phase2: "Test-documentation drafting, results tracking.",
    }),
  creative_performance: () =>
    build({
      title: "Creative-performance analysis automation",
      problem: "Comparing creative performance across accounts is manual screenshot-and-spreadsheet work.",
      gather: "Pull ad-level data",
      gatherDesc: "Ad-level metrics + creative metadata from ad platforms.",
      process: "Tag & roll up",
      processDesc: "Parse naming conventions into attributes; compute per-attribute performance; fatigue flags.",
      aiStep: "Draft creative insights",
      aiDesc: "Claude drafts observations strictly from the rollups (e.g. hook A outperforms B on CTR).",
      reviewDesc: "Specialist validates before anything informs client briefs.",
      deliver: "Insight report",
      deliverDesc: "Weekly rollup with flagged fatigue and drafted notes.",
      deterministicSteps: ["Data pulls", "Attribute parsing", "Rollups & fatigue rules"],
      aiSteps: ["Insight drafting from rollups"],
      humanSteps: ["Validate insights", "Decide next creative briefs"],
      integrations: ["Meta Ads API", "TikTok Ads API", "Google Sheets"],
      credentials: ["Ad platform tokens (read-only)"],
      dataModel: "ads, creatives, attributes, daily_metrics, rollups, flags",
      risks: "Naming-convention drift breaks parsing — validation step + alerts included.",
      complexity: "M",
      measurement: "Analysis hours; time-to-detect fatigue.",
      mvp: "One account, weekly rollup by hook/angle.",
      phase2: "Cross-account benchmarks, test-matrix tracking.",
    }),
  email_segmentation_planning: () =>
    build({
      title: "Email segmentation & planning automation",
      problem: "Segment refreshes and campaign QA consume hours before every send.",
      gather: "Sync audience data",
      gatherDesc: "Pull segments/metrics from the ESP and store data.",
      process: "Refresh segments & QA",
      processDesc: "Rule-based segment refresh; pre-flight QA checklist (links, tokens, suppression).",
      aiStep: null,
      aiDesc: "",
      reviewDesc: "Campaign strategy and creative stay human; QA results reviewed before send.",
      deliver: "QA report + refreshed segments",
      deliverDesc: "Ready-to-send state with a checklist the marketer signs off.",
      deterministicSteps: ["Segment rules", "QA checks", "Suppression verification"],
      aiSteps: [],
      humanSteps: ["Campaign planning", "Final send approval"],
      integrations: ["Klaviyo/Mailchimp API", "Shopify"],
      credentials: ["ESP API key"],
      dataModel: "segments, rules, qa_runs, checklists",
      risks: "Wrong-audience sends are reputationally costly — suppression checks are mandatory.",
      complexity: "S",
      measurement: "Setup hours per campaign; QA-caught errors.",
      mvp: "Automated pre-flight QA for one brand.",
      phase2: "Flow health monitoring, segment suggestions.",
    }),
  client_onboarding: () =>
    build({
      title: "Client onboarding automation",
      problem: "Winning a client kicks off weeks of chasing access, assets and information across threads.",
      gather: "Structured intake",
      gatherDesc: "Client intake forms create a checklist of required items per service.",
      process: "Track & chase",
      processDesc: "Automated polite reminders for missing items; status board updates.",
      aiStep: "Draft chase messages",
      aiDesc: "Claude drafts personalised nudges referencing exactly what's missing.",
      reviewDesc: "Nudges are approved (or auto-approved after N sends per settings); escalation is always human.",
      deliver: "Ready-to-start pack",
      deliverDesc: "Everything collected, team notified, kickoff scheduled.",
      deterministicSteps: ["Checklist creation", "Reminder scheduling", "Status tracking"],
      aiSteps: ["Chase-message drafting"],
      humanSteps: ["Kickoff and scoping", "Escalation calls"],
      integrations: ["Forms (Tally/Typeform)", "Email", "Slack", "Google Drive"],
      credentials: ["Email send access", "Drive access"],
      dataModel: "clients, checklists, items, reminders, escalations",
      risks: "Tone matters with new clients — templates reviewed; escalation is human.",
      complexity: "S",
      measurement: "Days from win to kickoff; chase emails sent by humans.",
      mvp: "One service line's checklist + chasing flow.",
      phase2: "Portal view for clients, multi-service templates.",
    }),
  content_collection: () =>
    build({
      title: "Content collection automation",
      problem: "Projects stall waiting on client content and approvals.",
      gather: "Content checklist",
      gatherDesc: "Per-project required-content list with owners and due dates.",
      process: "Chase & collect",
      processDesc: "Scheduled reminders; intake validation (format, size, completeness).",
      aiStep: null,
      aiDesc: "",
      reviewDesc: "Escalation and anything client-sensitive handled by the PM.",
      deliver: "Readiness dashboard",
      deliverDesc: "Live view of what's in, what's missing, what's blocking launch.",
      deterministicSteps: ["Checklist", "Reminders", "Validation", "Status board"],
      aiSteps: [],
      humanSteps: ["Escalation", "Content review"],
      integrations: ["Email", "Drive/Dropbox", "Project tool (Asana/Trello)"],
      credentials: ["Email access", "Storage access"],
      dataModel: "projects, content_items, reminders, submissions",
      risks: "Over-nudging clients — cadence caps built in.",
      complexity: "S",
      measurement: "Launch delays attributed to content; PM chasing hours.",
      mvp: "Checklist + reminders for one project type.",
      phase2: "Client portal, auto-validation of assets.",
    }),
  project_updates: () =>
    build({
      title: "Project status update automation",
      problem: "Clients chase for status because updates depend on PM memory and time.",
      gather: "Pull project state",
      gatherDesc: "Read tasks/milestones from the project tool.",
      process: "Build update draft",
      processDesc: "Compute progress vs plan; assemble factual status.",
      aiStep: "Draft client narrative",
      aiDesc: "Claude turns the factual status into a friendly plain-English update — no new claims.",
      reviewDesc: "PM edits and approves every update; delays/scope notes are human-written.",
      deliver: "Send weekly update",
      deliverDesc: "Approved update to the client channel.",
      deterministicSteps: ["State pull", "Progress computation"],
      aiSteps: ["Narrative drafting"],
      humanSteps: ["Approve/edit updates", "Handle sensitive topics"],
      integrations: ["Asana/Trello/Monday API", "Email/Slack"],
      credentials: ["Project tool token", "Send access"],
      dataModel: "projects, snapshots, updates, approvals",
      risks: "An unreviewed wrong update damages trust — approval is mandatory.",
      complexity: "S",
      measurement: "Client status-chase messages; PM hours on updates.",
      mvp: "Weekly drafted update for one project.",
      phase2: "Client portal, risk flagging.",
    }),
  finance_document_chasing: () =>
    build({
      title: "Finance document chasing automation",
      problem: "Month-end depends on chasing clients/staff for receipts, statements and invoices.",
      gather: "Detect missing docs",
      gatherDesc: "Compare expected vs received documents per client per period.",
      process: "Schedule chases",
      processDesc: "Polite reminder sequences with escalating cadence, capped.",
      aiStep: "Draft chase messages",
      aiDesc: "Claude drafts reminders naming exactly what's missing, in the firm's tone.",
      reviewDesc: "First-of-sequence and escalations approved by the bookkeeper.",
      deliver: "Docs collected & filed",
      deliverDesc: "Received documents validated and filed; status board updated.",
      deterministicSteps: ["Gap detection", "Sequence scheduling", "Filing"],
      aiSteps: ["Reminder drafting"],
      humanSteps: ["Approve sequences", "Call persistent non-responders"],
      integrations: ["Xero/QuickBooks", "Email", "Dext/Hubdoc"],
      credentials: ["Accounting API (read)", "Email send"],
      dataModel: "clients, expected_docs, received_docs, chases, escalations",
      risks: "Client-relationship tone; financial data sensitivity — minimal data in messages.",
      complexity: "S",
      measurement: "Days to complete month-end; chase emails sent manually.",
      mvp: "Missing-doc report + drafted chases for five clients.",
      phase2: "Portal upload links, auto-filing, reconciliation hand-off.",
    }),
  recruiting_workflow: () =>
    build({
      title: "Recruitment admin automation",
      problem: "CV formatting, scheduling and candidate chasing eat time that should go to placements.",
      gather: "Candidate intake",
      gatherDesc: "Parse incoming CVs/applications into structured records.",
      process: "Format & schedule",
      processDesc: "Standardised profile generation; interview scheduling links; status tracking.",
      aiStep: "Draft candidate summaries",
      aiDesc: "Claude drafts profile summaries strictly from CV content.",
      reviewDesc: "Consultant reviews profiles before they reach clients; assessment is human.",
      deliver: "Client-ready profiles",
      deliverDesc: "Approved profiles delivered; interviews booked.",
      deterministicSteps: ["Parsing", "Formatting", "Scheduling", "Status tracking"],
      aiSteps: ["Summary drafting from CV text"],
      humanSteps: ["Candidate assessment", "Client matching"],
      integrations: ["Email", "Calendly", "ATS/CRM"],
      credentials: ["Email access", "ATS token"],
      dataModel: "candidates, roles, profiles, interviews, statuses",
      risks: "Personal data — retention and consent handling required.",
      complexity: "M",
      measurement: "Admin hours per placement; time-to-shortlist.",
      mvp: "CV → formatted profile + summary (human approved).",
      phase2: "Client portal, automated status chasing.",
    }),
  fulfilment_reporting: () =>
    build({
      title: "Fulfilment reporting automation",
      problem: "Client stock/order reporting is built by hand and arrives late.",
      gather: "Pull WMS data",
      gatherDesc: "Scheduled export from the WMS per client.",
      process: "Build client reports",
      processDesc: "Per-client templates: stock levels, velocity, alerts, SLA stats.",
      aiStep: null,
      aiDesc: "",
      reviewDesc: "Threshold alerts route through an operator before clients see them.",
      deliver: "Send reports & alerts",
      deliverDesc: "Scheduled reports to clients; urgent alerts after human check.",
      deterministicSteps: ["Data pulls", "Report templating", "Threshold alerts"],
      aiSteps: [],
      humanSteps: ["Check urgent alerts", "Handle disputes"],
      integrations: ["WMS API/export", "Email", "Google Sheets"],
      credentials: ["WMS access", "Email send"],
      dataModel: "clients, stock_snapshots, orders, reports, alerts",
      risks: "Wrong stock alerts erode trust — human check on urgent alerts.",
      complexity: "M",
      measurement: "Reporting hours; client stock-question volume.",
      mvp: "Weekly automated report for two clients.",
      phase2: "Client dashboard, SLA analytics.",
    }),
  local_service_enquiries: () =>
    build({
      title: "Enquiry-to-quote automation",
      problem: "Enquiries arrive in several places and quotes go out late or not at all.",
      gather: "Capture enquiries",
      gatherDesc: "Web form/phone-note intake into one queue.",
      process: "Triage & template",
      processDesc: "Categorise job type; prepare quote template with known pricing rules.",
      aiStep: "Draft reply & quote text",
      aiDesc: "Claude drafts a friendly reply using the business's own wording and price rules.",
      reviewDesc: "The owner approves every quote — pricing judgement stays theirs.",
      deliver: "Send quote & book",
      deliverDesc: "Approved quote sent; booking link; reminder if no response.",
      deterministicSteps: ["Intake", "Categorisation", "Quote templating", "Reminders"],
      aiSteps: ["Reply drafting"],
      humanSteps: ["Price approval", "Site-visit decisions"],
      integrations: ["Web form", "Email/SMS", "Google Calendar"],
      credentials: ["Email/SMS send", "Calendar access"],
      dataModel: "enquiries, job_types, quotes, bookings, reminders",
      risks: "Wrong pricing — every quote is human-approved.",
      complexity: "S",
      measurement: "Enquiry-to-quote time; quotes that never went out.",
      mvp: "One intake form + drafted quotes + approval.",
      phase2: "Invoice chasing, review requests, scheduling optimisation.",
    }),
  quote_scheduling: () =>
    build({
      title: "Quote & scheduling automation",
      problem: "Quoting and scheduling are phone-tag and paper — jobs slip through.",
      gather: "Capture request",
      gatherDesc: "Single intake for calls/messages/forms.",
      process: "Prepare quote & slots",
      processDesc: "Price rules + calendar availability produce a proposed quote and times.",
      aiStep: "Draft customer message",
      aiDesc: "Claude drafts the response in the business's voice with quote and time options.",
      reviewDesc: "Owner approves quotes; exceptions (odd jobs) go straight to them.",
      deliver: "Confirm & remind",
      deliverDesc: "Booking confirmed, reminders sent, calendar updated.",
      deterministicSteps: ["Intake", "Pricing rules", "Slot finding", "Reminders"],
      aiSteps: ["Message drafting"],
      humanSteps: ["Quote approval", "Odd-job pricing"],
      integrations: ["Google Calendar", "Email/SMS", "Web form"],
      credentials: ["Calendar access", "Send access"],
      dataModel: "requests, quotes, bookings, reminders",
      risks: "Double-booking — calendar is the single source of truth with locks.",
      complexity: "S",
      measurement: "Response time; no-shows; lost enquiries.",
      mvp: "Intake + drafted quote + booking for one service.",
      phase2: "Deposits, route planning, review collection.",
    }),
  other: () =>
    build({
      title: "Custom automation opportunity",
      problem: "A repetitive process consuming significant time (see discovery).",
      gather: "Collect inputs",
      gatherDesc: "Gather the process inputs from the systems involved.",
      process: "Process by rules",
      processDesc: "Deterministic handling of the standard cases.",
      aiStep: "Draft outputs",
      aiDesc: "AI drafts human-reviewable output where language/judgement-support is needed.",
      reviewDesc: "Human approves anything consequential before it ships.",
      deliver: "Deliver output",
      deliverDesc: "Approved output delivered to its destination.",
      deterministicSteps: ["Input collection", "Rules processing", "Delivery"],
      aiSteps: ["Output drafting (if applicable)"],
      humanSteps: ["Approval", "Exception handling"],
      integrations: ["To be confirmed from discovery"],
      credentials: ["To be confirmed"],
      dataModel: "inputs, runs, outputs, approvals, exceptions",
      risks: "Defined during discovery.",
      complexity: "M",
      measurement: "Time per cycle before vs after; error rate.",
      mvp: "Narrowest end-to-end slice of the process.",
      phase2: "Broader coverage after measured results.",
    }),
};

export function buildOpportunityTemplate(category: OpportunityCategory, discovery: Discovery | null): OpportunityTemplate {
  const t = TEMPLATES[category]();
  if (discovery) {
    t.currentState = [
      discovery.currentWorkflow && `Current workflow: ${discovery.currentWorkflow}`,
      discovery.tools && `Tools: ${discovery.tools}`,
      discovery.volume && `Volume: ${discovery.volume}`,
      discovery.frequency && `Frequency: ${discovery.frequency}`,
      discovery.timeConsumed && `Time consumed: ${discovery.timeConsumed}`,
      discovery.errorRate && `What goes wrong: ${discovery.errorRate}`,
    ]
      .filter(Boolean)
      .join("\n");
    if (discovery.problemStatement) t.businessProblem = discovery.problemStatement;
    if (discovery.humanJudgement) t.humanSteps = [...new Set([...t.humanSteps, `Judgement (from discovery): ${discovery.humanJudgement}`])];
    if (discovery.successMetrics) t.measurementPlan = `${discovery.successMetrics} (agreed in discovery). ${t.measurementPlan}`;
  } else {
    t.currentState = "No discovery on file — complete discovery before proposing this to the lead.";
  }
  return t;
}

/** Map a pain category to the closest opportunity category. */
export function opportunityCategoryForPain(pain: string): OpportunityCategory {
  const map: Record<string, OpportunityCategory> = {
    campaign_reporting: "campaign_reporting",
    lead_qualification: "lead_qualification_routing",
    crm_hygiene: "crm_enrichment",
    product_data: "product_data_workflows",
    marketplace_sync: "multi_marketplace",
    inventory: "shopify_operations",
    creative_analysis: "creative_performance",
    email_segmentation: "email_segmentation_planning",
    lifecycle_reporting: "campaign_reporting",
    client_onboarding: "client_onboarding",
    content_collection: "content_collection",
    asset_management: "content_collection",
    project_handovers: "project_updates",
    finance_reconciliation: "finance_document_chasing",
    document_chasing: "finance_document_chasing",
    recruitment_admin: "recruiting_workflow",
    quote_scheduling: "quote_scheduling",
  };
  return map[pain] ?? "other";
}
