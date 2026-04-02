/**
 * Smart mock LLM that produces realistic structured output
 * for demo/development without an API key.
 *
 * Parses the prompt to understand which pipeline stage is calling
 * and returns plausible enrichment, pain point, or outreach data.
 */

interface MockContext {
  companyName: string;
  platform: string;
  segment: string;
  industry: string;
  sizeEstimate: string;
  contactName: string;
  contactRole: string;
  notes: string;
}

function extractContext(prompt: string): MockContext {
  const get = (label: string): string => {
    const match = prompt.match(new RegExp(`[-\\s]${label}:\\s*(.+?)(?:\\n|$)`, "i"));
    return match?.[1]?.trim() || "unknown";
  };

  // Try specific labels first, then fallback
  let companyName = get("Company");
  if (companyName === "unknown") {
    // For enrichment prompts, "Name:" is company name
    const nameMatch = prompt.match(/^- Name:\s*(.+?)$/m);
    companyName = nameMatch?.[1]?.trim() || "unknown";
  }

  // For outreach prompts, contact name is under PROSPECT or Name within PROSPECT block
  let contactName = "unknown";
  const prospectMatch = prompt.match(/PROSPECT.*?Name:\s*(.+?)$/m);
  if (prospectMatch) {
    contactName = prospectMatch[1].trim();
  } else {
    const prosp = prompt.match(/PROSPECT:\s*(.+?)(?:\n|$)/);
    if (prosp) {
      contactName = prosp[1].split(" at ")[0].trim();
    }
  }
  if (contactName === "unknown") {
    const contactMatch = prompt.match(/Contact.*?name:\s*(.+?)$/mi);
    contactName = contactMatch?.[1]?.trim() || "unknown";
  }

  return {
    companyName,
    platform: get("Platform"),
    segment: get("Segment"),
    industry: get("Industry"),
    sizeEstimate: get("Size estimate"),
    contactName,
    contactRole: get("Contact role") || get("Role"),
    notes: get("Additional notes") || get("notes"),
  };
}

export function generateMockResponse(system: string, prompt: string): string {
  const ctx = extractContext(prompt);

  // Enrichment prompt
  if (prompt.includes("Extract the following as JSON") && prompt.includes("companyDescription")) {
    return JSON.stringify(mockEnrichment(ctx));
  }

  // Pain point prompt
  if (prompt.includes("painPoints") && prompt.includes("pain point hypotheses")) {
    return JSON.stringify(mockPainPoints(ctx));
  }

  // LinkedIn connection note
  if (prompt.includes("LinkedIn connection request note")) {
    return JSON.stringify(mockLinkedInConnectionNote(ctx));
  }

  // LinkedIn first message
  if (prompt.includes("LinkedIn first message")) {
    return JSON.stringify(mockLinkedInFirstMessage(ctx));
  }

  // X engagement idea
  if (prompt.includes("X (Twitter) engagement strategy")) {
    return JSON.stringify(mockXEngagement(ctx));
  }

  // X DM
  if (prompt.includes("X (Twitter) DM")) {
    return JSON.stringify(mockXDm(ctx));
  }

  // Cold email
  if (prompt.includes("cold email first touch")) {
    return JSON.stringify(mockColdEmail(ctx));
  }

  // Follow-up email
  if (prompt.includes("follow-up email") || prompt.includes("Follow-up")) {
    return JSON.stringify(mockFollowUp(ctx));
  }

  // Fallback
  return JSON.stringify({ _mock: true, _note: "Unrecognized prompt pattern" });
}

function mockEnrichment(ctx: MockContext) {
  const isShopify = ctx.platform?.toLowerCase().includes("shopify");
  const isEnterprise = ctx.sizeEstimate?.match(/\d+/) && parseInt(ctx.sizeEstimate.match(/\d+/)![0]) >= 200;

  return {
    companyDescription: `${ctx.companyName} is a ${ctx.industry || "business"} company${isShopify ? " running on Shopify" : ""} with an estimated team of ${ctx.sizeEstimate || "unknown size"}.`,
    estimatedProducts: ctx.industry?.toLowerCase().includes("beauty")
      ? ["skincare serums", "moisturizers", "cleansers"]
      : ctx.industry?.toLowerCase().includes("outdoor")
        ? ["camping gear", "hiking equipment", "outdoor apparel"]
        : ["core products", "service offerings"],
    operationalComplexityClues: [
      ctx.notes?.includes("warehouse") ? "Multi-warehouse fulfillment operations" : "Growing operational needs",
      ctx.notes?.includes("manual") ? "Manual processes identified in operations" : "Potential workflow automation opportunities",
    ].filter(Boolean),
    painPointClues: [
      ctx.notes?.includes("manual") ? "Manual processes consuming team time" : null,
      ctx.notes?.includes("spreadsheet") ? "Spreadsheet-based workflows limiting scalability" : null,
      ctx.notes?.includes("hiring") ? "Hiring signals suggest scaling challenges" : null,
      "Operational bottlenecks likely as business grows",
    ].filter(Boolean),
    hiringSignals: ctx.notes?.includes("hiring")
      ? ["Active hiring for operations and support roles"]
      : [],
    customerExperienceClues: [
      ctx.notes?.includes("support") ? "Customer support scaling needs" : "Standard CX operations",
    ],
    multiChannelPresence: ctx.notes?.includes("Amazon")
      ? ["Direct website", "Amazon"]
      : ctx.notes?.includes("channel")
        ? ["Primary channel", "Secondary channel"]
        : ["Primary website"],
    teamStructureClues: [
      `Estimated ${ctx.sizeEstimate || "small"} team`,
      ctx.contactRole ? `${ctx.contactRole} leads operations` : "Lean team structure",
    ],
    fragmentedTooling: ctx.notes?.includes("app")
      ? ["Multiple disconnected tools in use"]
      : [],
    growthIndicators: [
      ctx.notes?.includes("funding") || ctx.notes?.includes("raised") ? "Recent funding round" : null,
      ctx.notes?.includes("expan") ? "Geographic or product expansion" : null,
      ctx.notes?.includes("launch") ? "Recent product or feature launch" : null,
    ].filter(Boolean),
    storefrontMaturity: isEnterprise ? "enterprise" : isShopify ? "growing" : "growing",
    automationOpportunities: [
      {
        area: ctx.notes?.includes("order") ? "Order management" : "Operational workflows",
        hypothesis: `${ctx.companyName} likely has repetitive workflows that could be automated to save team time`,
        confidence: ctx.notes && ctx.notes.length > 50 ? "medium" : "low",
        roiAngle: "Reduce manual work hours and improve operational consistency",
      },
      {
        area: "Reporting and data",
        hypothesis: ctx.notes?.includes("spreadsheet")
          ? "Spreadsheet-based reporting can be automated with connected data pipelines"
          : "Manual reporting processes likely exist as the team scales",
        confidence: ctx.notes?.includes("spreadsheet") ? "high" : "low",
        roiAngle: "Eliminate hours of manual data compilation weekly",
      },
    ],
  };
}

function mockPainPoints(ctx: MockContext) {
  const hasManual = ctx.notes?.toLowerCase().includes("manual");
  const hasHiring = ctx.notes?.toLowerCase().includes("hiring");
  const hasFunding = ctx.notes?.toLowerCase().includes("funding") || ctx.notes?.toLowerCase().includes("raised");

  return {
    painPoints: [
      {
        hypothesis: hasManual
          ? `Manual processes at ${ctx.companyName} are consuming significant team time and limiting operational scalability`
          : `As ${ctx.companyName} grows, operational workflows are likely becoming bottlenecks`,
        confidence: hasManual ? "high" : "medium",
        supportingSignals: [
          hasManual ? "Manual processes mentioned in company notes" : "Growing team size suggests operational complexity",
          hasHiring ? "Active hiring for operational roles" : "Business growth trajectory",
        ].filter(Boolean),
        automationAngle: "Automate repetitive operational workflows to free up team capacity",
        roiAngle: hasManual ? "Recover 10-20 hours/week currently spent on manual tasks" : "Prevent operational bottlenecks before they impact growth",
        relevantUseCases: ["Workflow automation", "Process standardization", "System integration"],
      },
      {
        hypothesis: `Disconnected tools and data silos are creating inefficiencies across ${ctx.companyName}'s operations`,
        confidence: "medium",
        supportingSignals: ["Multiple tools likely in use without native integrations"],
        automationAngle: "Connect existing tools with automated data flows and triggers",
        roiAngle: "Eliminate manual data transfer and reduce errors",
        relevantUseCases: ["Tool integration", "Data synchronization", "Automated reporting"],
      },
      {
        hypothesis: hasFunding
          ? `Post-funding growth is outpacing ${ctx.companyName}'s operational infrastructure`
          : `${ctx.companyName}'s growing complexity needs operational automation to scale efficiently`,
        confidence: hasFunding ? "high" : "low",
        supportingSignals: [
          hasFunding ? "Recent funding indicates rapid growth phase" : "Business profile suggests scaling trajectory",
        ],
        automationAngle: "Build automated operational backbone before bottlenecks limit growth",
        roiAngle: "Scale operations without proportionally scaling headcount",
        relevantUseCases: ["Scalable workflows", "Automated onboarding", "Operational reporting"],
      },
    ],
  };
}

function mockLinkedInConnectionNote(ctx: MockContext) {
  const name = ctx.contactName !== "unknown" ? ctx.contactName.split(" ")[0] : "Hi";
  return {
    subject: null,
    body: `${name} — noticed ${ctx.companyName}'s growth in ${ctx.industry || "your space"}. I help businesses like yours automate operational workflows. Would love to connect and share ideas.`,
    personalizationSnippet: `${ctx.companyName}'s growth in ${ctx.industry || "their market"}`,
    signalUsed: "company growth and industry fit",
  };
}

function mockLinkedInFirstMessage(ctx: MockContext) {
  const name = ctx.contactName !== "unknown" ? ctx.contactName.split(" ")[0] : "Hi";
  return {
    subject: null,
    body: `${name}, thanks for connecting. I've been looking at how ${ctx.industry || "companies in your space"} handle operational complexity as they grow.\n\nBased on ${ctx.companyName}'s profile, there are likely some repetitive workflows — things like order management, reporting, or customer communication — that could be automated to save your team meaningful time each week.\n\nI specialize in building these kinds of automations using tools like n8n and Claude. Would a quick 15-minute call be worth it to explore if there's a fit?`,
    personalizationSnippet: `${ctx.companyName}'s operational complexity in ${ctx.industry}`,
    signalUsed: "industry and operational signals",
  };
}

function mockXEngagement(ctx: MockContext) {
  return {
    subject: "Warm engagement before outreach",
    body: `1. Engage with ${ctx.companyName}'s posts about ${ctx.industry || "their business"} — add genuine operational insights\n2. Reply to any posts about challenges, tools, or team growth with helpful perspective (not a pitch)\n3. After 2-3 interactions, send a DM referencing a specific conversation`,
    personalizationSnippet: `${ctx.companyName}'s public content and industry presence`,
    signalUsed: "social media presence",
  };
}

function mockXDm(ctx: MockContext) {
  const name = ctx.contactName !== "unknown" ? ctx.contactName.split(" ")[0] : "Hey";
  return {
    subject: null,
    body: `${name} — been following ${ctx.companyName}'s growth. Curious how your team handles ${ctx.industry?.includes("logistics") ? "carrier management" : "operational workflows"} at scale. I automate exactly those kinds of processes.`,
    personalizationSnippet: `${ctx.companyName}'s growth trajectory`,
    signalUsed: "company growth signals",
  };
}

function mockColdEmail(ctx: MockContext) {
  const name = ctx.contactName !== "unknown" ? ctx.contactName.split(" ")[0] : "Hi";
  return {
    subject: `Quick question about ${ctx.companyName}'s ops workflow`,
    body: `${name},\n\nI noticed ${ctx.companyName} is growing fast in ${ctx.industry || "your market"} — that usually means operational workflows are getting more complex behind the scenes.\n\nI help businesses automate the repetitive parts: order routing, reporting, customer communication, and system integrations. The goal is to save your team hours of manual work each week without changing the tools you already use.\n\nWould a 15-minute call make sense to see if there's a quick win worth exploring?\n\nBest,\n[Name]`,
    personalizationSnippet: `${ctx.companyName}'s growth and operational complexity`,
    signalUsed: "growth and industry signals",
  };
}

function mockFollowUp(ctx: MockContext) {
  const name = ctx.contactName !== "unknown" ? ctx.contactName.split(" ")[0] : "Hi";
  return {
    subject: `Re: Quick question about ${ctx.companyName}'s ops workflow`,
    body: `${name},\n\nJust wanted to share a quick example: I recently helped a ${ctx.industry || "similar"} company automate their reporting workflow — cut it from 4 hours/week to fully automated. Happy to walk through how that could apply to ${ctx.companyName}.\n\nNo worries if the timing isn't right — just thought it might be useful.\n\nBest,\n[Name]`,
    personalizationSnippet: "Relevant automation example for their industry",
    signalUsed: "industry relevance",
  };
}
