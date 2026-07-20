/**
 * Rules-based pain-hypothesis suggestions per ICP category.
 *
 * These are *hypotheses to verify*, never asserted facts: each is phrased as
 * "typical for this kind of business", starts at low confidence, and carries
 * the discovery question that would confirm or kill it. The user confirms or
 * rejects — nothing is invented about the specific lead.
 */

import type { IcpCategory, PainCategory } from "@/lib/constants";

export type PainSuggestion = {
  category: PainCategory;
  hypothesis: string;
  discoveryQuestion: string;
  automationDirection: string;
  humanJudgementNote: string;
};

const BANK: Partial<Record<IcpCategory, PainSuggestion[]>> = {
  ecommerce_founder: [
    {
      category: "campaign_reporting",
      hypothesis: "Weekly performance reporting is likely stitched together by hand from ads, GA4 and Shopify.",
      discoveryQuestion: "What part of your weekly reporting still takes the most manual preparation?",
      automationDirection: "Scheduled data pull → merged report → drafted commentary for review.",
      humanJudgementNote: "Interpretation and decisions stay human; only collection and drafting are automated.",
    },
    {
      category: "product_data",
      hypothesis: "Product data (titles, prices, stock, imagery) is probably updated separately in each channel.",
      discoveryQuestion: "When a product changes, how many places do you have to update it?",
      automationDirection: "Single source of truth → synced updates with a review step before publishing.",
      humanJudgementNote: "Pricing and merchandising decisions need approval before sync.",
    },
    {
      category: "lifecycle_reporting",
      hypothesis: "Repeat-purchase and cohort behaviour is likely tracked ad hoc, if at all.",
      discoveryQuestion: "How do you currently see which customers are slipping away before they churn?",
      automationDirection: "Order data → cohort/lapse flags → weekly digest with suggested actions.",
      humanJudgementNote: "Win-back offers and tone are human decisions.",
    },
    {
      category: "inventory",
      hypothesis: "Stock alerts and reorder points are typically watched manually at this stage.",
      discoveryQuestion: "How do you find out you're about to run out of a best-seller?",
      automationDirection: "Threshold monitoring → alert with sales velocity context → draft PO.",
      humanJudgementNote: "Reorder quantities and supplier choices stay with the founder.",
    },
  ],
  shopify_expert: [
    {
      category: "product_data",
      hypothesis: "Client catalogue work (imports, updates, migrations) likely involves repetitive CSV wrangling.",
      discoveryQuestion: "What part of client catalogue work still takes more manual effort than it should?",
      automationDirection: "Validated transform pipelines with preview/diff before pushing to the store.",
      humanJudgementNote: "Schema mapping choices and final approval remain human.",
    },
    {
      category: "campaign_reporting",
      hypothesis: "Reporting back to clients on store changes and results is probably manual.",
      discoveryQuestion: "How do you show clients the impact of the work each month?",
      automationDirection: "Store metrics → change log → drafted client summary for review.",
      humanJudgementNote: "Client-facing claims must be reviewed before sending.",
    },
  ],
  shopify_agency: [
    {
      category: "client_onboarding",
      hypothesis: "New-client onboarding likely involves chasing access, assets and brand info across email threads.",
      discoveryQuestion: "When you win a client, what's the messiest part of getting started?",
      automationDirection: "Structured intake → automated chasing → checklist visibility for the team.",
      humanJudgementNote: "Scoping and kickoff decisions are human; only collection is automated.",
    },
    {
      category: "content_collection",
      hypothesis: "Collecting product content and approvals from clients probably causes project delays.",
      discoveryQuestion: "How much project delay comes from waiting on client content or approvals?",
      automationDirection: "Request tracker → polite automated nudges → status dashboard.",
      humanJudgementNote: "Escalation to a human happens after N nudges — tone matters with clients.",
    },
    {
      category: "campaign_reporting",
      hypothesis: "Monthly client reporting is likely assembled by hand across accounts.",
      discoveryQuestion: "Across your client base, what does reporting week actually cost the team?",
      automationDirection: "Per-client data pulls → templated report → drafted commentary for PM review.",
      humanJudgementNote: "Strategy commentary must be reviewed by the account lead.",
    },
    {
      category: "project_handovers",
      hypothesis: "Handovers between design/build/launch stages likely lose context in tools and threads.",
      discoveryQuestion: "Where do project handovers most often drop information?",
      automationDirection: "Stage-gate checklists → auto-compiled handover doc from project tools.",
      humanJudgementNote: "Sign-off at each gate stays human.",
    },
  ],
  dtc_growth: [
    {
      category: "campaign_reporting",
      hypothesis: "Cross-channel performance data likely needs manual stitching before decisions can be made.",
      discoveryQuestion: "What has to happen, manually, before you can see performance in one place?",
      automationDirection: "Channel APIs → blended dashboard → anomaly flags with drafted notes.",
      humanJudgementNote: "Spend decisions remain human; the system only surfaces and drafts.",
    },
    {
      category: "creative_analysis",
      hypothesis: "Creative-performance review across ad accounts is probably manual screenshot-and-spreadsheet work.",
      discoveryQuestion: "How do you currently work out which creative angles are actually winning?",
      automationDirection: "Ad-level data → tagged creative attributes → performance rollups for review.",
      humanJudgementNote: "Creative interpretation and next briefs stay with the marketer.",
    },
    {
      category: "lifecycle_reporting",
      hypothesis: "Retention and LTV reporting likely lags behind acquisition reporting.",
      discoveryQuestion: "How quickly can you see whether a cohort is retaining better or worse than the last?",
      automationDirection: "Order data → cohort curves → weekly digest.",
      humanJudgementNote: "Trade-off decisions between acquisition and retention are human.",
    },
  ],
  head_of_ecommerce: [
    {
      category: "campaign_reporting",
      hypothesis: "Board/trading reports are likely compiled manually every week.",
      discoveryQuestion: "What does your weekly trading report take to produce, end to end?",
      automationDirection: "Automated data collection → templated pack → drafted commentary for review.",
      humanJudgementNote: "Narrative to leadership must be human-owned.",
    },
    {
      category: "product_data",
      hypothesis: "Product information likely diverges between site, feeds and marketplaces.",
      discoveryQuestion: "Where does product data most often go out of sync?",
      automationDirection: "Feed validation → divergence alerts → one-click correction with approval.",
      humanJudgementNote: "Merchandising overrides need approval.",
    },
    {
      category: "marketplace_sync",
      hypothesis: "Marketplace listings and orders probably require manual coordination with the main store.",
      discoveryQuestion: "How much manual work goes into keeping marketplaces aligned with the store?",
      automationDirection: "Listing/order sync with exception queue for human review.",
      humanJudgementNote: "Pricing conflicts route to a human.",
    },
  ],
  performance_marketer: [
    {
      category: "campaign_reporting",
      hypothesis: "Client reporting likely consumes hours of pulling numbers and formatting decks.",
      discoveryQuestion: "What part of campaign reporting consumes the most human preparation?",
      automationDirection: "Ad platform data → templated report → drafted insight bullets for review.",
      humanJudgementNote: "Strategic recommendations must stay expert-owned.",
    },
    {
      category: "creative_analysis",
      hypothesis: "Comparing creative performance across accounts is probably manual.",
      discoveryQuestion: "How do you spot a fatiguing creative before the client does?",
      automationDirection: "Automated fatigue/anomaly flags → alert with context.",
      humanJudgementNote: "What to do about it is the specialist's call.",
    },
    {
      category: "lead_qualification",
      hypothesis: "For lead-gen clients, leads likely arrive unscored and are handled manually after generation.",
      discoveryQuestion: "After a lead is generated, what still has to be handled manually?",
      automationDirection: "Lead capture → enrichment → scored routing with human review of edge cases.",
      humanJudgementNote: "Qualification thresholds set and reviewed by humans.",
    },
  ],
  meta_ads_specialist: [
    {
      category: "campaign_reporting",
      hypothesis: "Weekly Meta reporting across clients is likely repetitive export-and-format work.",
      discoveryQuestion: "What does your weekly reporting routine look like across accounts?",
      automationDirection: "Meta API → per-client templates → drafted commentary for review.",
      humanJudgementNote: "Client-facing insight is reviewed before sending.",
    },
    {
      category: "creative_analysis",
      hypothesis: "Creative testing logs and results are probably maintained by hand.",
      discoveryQuestion: "How do you track which hooks/angles have already been tested for each client?",
      automationDirection: "Auto-logged test matrix from ad naming conventions → gap analysis.",
      humanJudgementNote: "Next-test decisions stay with the specialist.",
    },
  ],
  cro_specialist: [
    {
      category: "campaign_reporting",
      hypothesis: "Audit preparation likely involves hours of manual data gathering before analysis starts.",
      discoveryQuestion: "Before you can actually analyse a site, what data gathering has to happen first?",
      automationDirection: "Automated data collection pack (analytics, heatmap exports, speed) → analyst-ready bundle.",
      humanJudgementNote: "The analysis itself is the expert's value — only prep is automated.",
    },
    {
      category: "project_handovers",
      hypothesis: "Test documentation and results write-ups are probably repetitive to produce.",
      discoveryQuestion: "How much time goes into documenting each test versus designing it?",
      automationDirection: "Test metadata → auto-drafted documentation → review and publish.",
      humanJudgementNote: "Conclusions and causal claims must be human-approved.",
    },
  ],
  email_marketer: [
    {
      category: "email_segmentation",
      hypothesis: "Segment building and list hygiene likely eat time before every campaign.",
      discoveryQuestion: "What part of campaign setup takes longest before you can actually write?",
      automationDirection: "Rule-based segment refresh → pre-flight QA checklist automation.",
      humanJudgementNote: "Audience strategy stays human; the system executes defined rules.",
    },
    {
      category: "campaign_reporting",
      hypothesis: "Campaign performance reporting to clients/stakeholders is probably manual.",
      discoveryQuestion: "How do results get from the ESP into something a client can read?",
      automationDirection: "ESP data → templated report → drafted summary for review.",
      humanJudgementNote: "Narrative reviewed before sending.",
    },
    {
      category: "lifecycle_reporting",
      hypothesis: "Flow performance (welcome, abandonment, win-back) is likely reviewed ad hoc.",
      discoveryQuestion: "How often do you get to review flow performance, honestly?",
      automationDirection: "Scheduled flow health-check → flagged degradations with context.",
      humanJudgementNote: "Fixes and copy changes are human work.",
    },
  ],
  creator_marketer: [
    {
      category: "content_collection",
      hypothesis: "Chasing creators for content, usage rights and links is likely constant manual work.",
      discoveryQuestion: "How much of your week goes on chasing creators for deliverables?",
      automationDirection: "Deliverable tracker → automated nudges → asset intake with rights metadata.",
      humanJudgementNote: "Relationship management stays personal — only chasing is systematised.",
    },
    {
      category: "campaign_reporting",
      hypothesis: "Cross-platform campaign results are probably compiled by hand.",
      discoveryQuestion: "How do you pull together results across platforms and creators?",
      automationDirection: "Per-platform pulls → unified campaign report → drafted summary.",
      humanJudgementNote: "Story told to the brand is human-owned.",
    },
  ],
  ecommerce_bookkeeper: [
    {
      category: "finance_reconciliation",
      hypothesis: "Marketplace settlements and payment-provider fees likely take hours to reconcile.",
      discoveryQuestion: "Which reconciliation eats the most time each month — and what goes wrong?",
      automationDirection: "Settlement file ingestion → matched transactions → exception queue for review.",
      humanJudgementNote: "Every exception is human-reviewed; the system only matches the obvious.",
    },
    {
      category: "document_chasing",
      hypothesis: "Chasing clients for receipts and statements is probably a monthly grind.",
      discoveryQuestion: "How do you currently chase missing documents, and how often does it slip?",
      automationDirection: "Missing-document detection → polite scheduled reminders → escalation list.",
      humanJudgementNote: "Tone and escalation to a call stay human.",
    },
    {
      category: "crm_hygiene",
      hypothesis: "Client records and recurring task tracking may live in scattered spreadsheets.",
      discoveryQuestion: "How do you track where every client is in the monthly cycle?",
      automationDirection: "Recurring workflow board auto-populated from calendar + ledger status.",
      humanJudgementNote: "Judgement calls on client status remain human.",
    },
  ],
  operations_director: [
    {
      category: "project_handovers",
      hypothesis: "Recurring processes likely depend on individuals remembering steps rather than a system.",
      discoveryQuestion: "Which recurring process consumes unnecessary team time — and what happens when it fails?",
      automationDirection: "Process runbook → triggered checklists → exception alerts.",
      humanJudgementNote: "Judgement steps are explicitly marked and left manual.",
    },
    {
      category: "crm_hygiene",
      hypothesis: "Operational data probably needs manual re-keying between systems.",
      discoveryQuestion: "Where does the same data get typed twice in your operation?",
      automationDirection: "System-to-system sync with validation and an audit log.",
      humanJudgementNote: "Conflicting records route to a human.",
    },
    {
      category: "document_chasing",
      hypothesis: "Chasing internal updates and documents likely consumes management time.",
      discoveryQuestion: "How much of your week is chasing people for updates?",
      automationDirection: "Automated status collection → digest → escalation on silence.",
      humanJudgementNote: "Performance conversations are human.",
    },
  ],
  website_agency: [
    {
      category: "client_onboarding",
      hypothesis: "Project kickoff likely involves repetitive access/asset collection.",
      discoveryQuestion: "What's the messiest part of starting a new website project?",
      automationDirection: "Structured intake → automated chasing → kickoff checklist.",
      humanJudgementNote: "Scoping stays human.",
    },
    {
      category: "project_handovers",
      hypothesis: "Clients probably chase for status because updates are manual.",
      discoveryQuestion: "How do clients find out where their project is up to?",
      automationDirection: "Project-tool data → weekly client update draft → PM review and send.",
      humanJudgementNote: "Anything nuanced (delays, scope) is human-written.",
    },
    {
      category: "content_collection",
      hypothesis: "Waiting on client content likely delays launches.",
      discoveryQuestion: "How often does 'waiting on content' delay a launch?",
      automationDirection: "Content checklist → automated reminders → readiness dashboard.",
      humanJudgementNote: "Escalation calls are human.",
    },
  ],
  ai_automation_specialist: [],
  recruitment_founder: [
    {
      category: "recruitment_admin",
      hypothesis: "CV formatting, interview scheduling and candidate chasing likely eat billable time.",
      discoveryQuestion: "What repetitive admin sits between you and more placements?",
      automationDirection: "Candidate intake → formatted profiles → scheduling links → status chasing.",
      humanJudgementNote: "Candidate assessment and client matching stay human.",
    },
    {
      category: "crm_hygiene",
      hypothesis: "Candidate/client records likely go stale without manual upkeep.",
      discoveryQuestion: "How current is your CRM, honestly — and what would keep it current?",
      automationDirection: "Activity-based auto-updates → stale-record flags.",
      humanJudgementNote: "Relationship notes are human-entered.",
    },
  ],
  fulfilment_founder: [
    {
      category: "inventory",
      hypothesis: "Client stock reporting and low-stock alerts are likely manual or delayed.",
      discoveryQuestion: "How do your clients find out about stock issues — before or after they bite?",
      automationDirection: "WMS data → client-facing alerts and scheduled reports.",
      humanJudgementNote: "Exceptions and disputes are human-handled.",
    },
    {
      category: "document_chasing",
      hypothesis: "Missing customs/shipping paperwork likely causes repeated chasing.",
      discoveryQuestion: "What paperwork do you chase most often, and what does a miss cost?",
      automationDirection: "Document checklist per shipment → automated chasing → exception queue.",
      humanJudgementNote: "Compliance judgement stays human.",
    },
  ],
  local_trade: [
    {
      category: "quote_scheduling",
      hypothesis: "Quotes and job scheduling are likely handled by phone, memory and paper.",
      discoveryQuestion: "How do enquiries become quotes, and how often does one slip through?",
      automationDirection: "Enquiry capture → templated quote draft → calendar booking → reminders.",
      humanJudgementNote: "Pricing judgement stays with the tradesperson.",
    },
    {
      category: "document_chasing",
      hypothesis: "Invoicing and payment chasing probably happen late in the evening.",
      discoveryQuestion: "When do invoices actually get sent — and chased?",
      automationDirection: "Job completion → invoice draft → polite payment reminders.",
      humanJudgementNote: "Discounts and disputes are human calls.",
    },
  ],
  restaurant_owner: [
    {
      category: "quote_scheduling",
      hypothesis: "Bookings, shift rotas and supplier orders likely involve nightly manual work.",
      discoveryQuestion: "What's the last repetitive thing you do before closing each night?",
      automationDirection: "Standing checklists → supplier order drafts from par levels → rota reminders.",
      humanJudgementNote: "Menu/pricing/people decisions stay human.",
    },
    {
      category: "lead_qualification",
      hypothesis: "Event and group enquiries probably get slow replies during service hours.",
      discoveryQuestion: "How quickly do private-hire enquiries get answered during a busy week?",
      automationDirection: "Enquiry intake → instant structured reply → owner review for pricing.",
      humanJudgementNote: "Final quotes are human-approved.",
    },
  ],
  cleaning_business: [
    {
      category: "quote_scheduling",
      hypothesis: "Quoting, scheduling and rescheduling are likely constant phone-tag.",
      discoveryQuestion: "How much of your day is scheduling and rescheduling rather than delivering?",
      automationDirection: "Enquiry form → quote template → booking calendar → confirmations/reminders.",
      humanJudgementNote: "Site-specific pricing is human.",
    },
    {
      category: "document_chasing",
      hypothesis: "Timesheets and invoicing likely involve chasing staff and clients.",
      discoveryQuestion: "What paperwork do you end up doing on Sunday nights?",
      automationDirection: "Digital timesheets → invoice drafts → payment reminders.",
      humanJudgementNote: "Disputes and adjustments are human.",
    },
  ],
  general_owner: [
    {
      category: "lead_qualification",
      hypothesis: "Enquiries likely arrive in several places and are handled from memory.",
      discoveryQuestion: "What repetitive task would you happily never do again?",
      automationDirection: "Central enquiry intake → structured triage → response drafts.",
      humanJudgementNote: "Prioritisation rules set by the owner; exceptions escalate.",
    },
    {
      category: "document_chasing",
      hypothesis: "Some recurring admin (invoices, documents, updates) likely steals evenings.",
      discoveryQuestion: "Which admin task steals the most evenings?",
      automationDirection: "Identify the loop → automate collection/drafting → keep approval human.",
      humanJudgementNote: "Anything customer-facing is approved before sending.",
    },
  ],
};

export function suggestPains(category: IcpCategory | null): PainSuggestion[] {
  if (!category) return BANK.general_owner ?? [];
  return BANK[category] ?? BANK.general_owner ?? [];
}

export function isPeerCategory(category: IcpCategory | null): boolean {
  return category === "ai_automation_specialist";
}
