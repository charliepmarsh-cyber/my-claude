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

  // Marketing department content generation (CortexCart OS)
  if (system.includes("marketing department")) {
    return JSON.stringify(mockMarketingContent(prompt));
  }

  // CortexCart fit analysis
  if (prompt.includes("CortexCart fit analysis")) {
    return JSON.stringify(mockFitAnalysis(ctx, prompt));
  }

  // Natural-language lead search → structured filter
  if (system.includes("lead search query translator")) {
    return JSON.stringify(mockSearchFilter(prompt));
  }

  // Enrichment prompt
  if (prompt.includes("Extract the following as JSON") && prompt.includes("companyDescription")) {
    return JSON.stringify(mockEnrichment(ctx));
  }

  // Pain point prompt
  if (prompt.includes("painPoints") && prompt.includes("pain point hypotheses")) {
    return JSON.stringify(mockPainPoints(ctx));
  }

  // CortexCart dual-variant cold email
  if (prompt.includes("Write TWO cold email variants")) {
    const single = mockColdEmail(ctx);
    return JSON.stringify({
      variantA: { subject: "tracking your store numbers?", body: `Hey ${ctx.contactName !== "unknown" ? ctx.contactName.split(" ")[0] : "there"} — most ${ctx.industry || "DTC"} stores I talk to check three dashboards before breakfast. We built a free one that pulls it all together and explains why sales moved. Early access while we're in beta: tracker.cortexcart.com\n\nCharlie`, personalizationSnippet: "niche-level observation", signalUsed: "platform + niche" },
      variantB: { subject: "quick question", body: `Hey — curious how you're tracking conversions at ${ctx.companyName}? Asking because we built a free dashboard for Shopify stores and I'm trying to understand what setups people actually run.\n\nCharlie`, personalizationSnippet: single.personalizationSnippet, signalUsed: single.signalUsed },
    });
  }

  // CortexCart LinkedIn DM (post-accept)
  if (prompt.includes("LinkedIn DM to send AFTER they accept")) {
    return JSON.stringify({ body: `Thanks for connecting! Curious — how do you track ${ctx.companyName}'s store performance day to day? We built a free dashboard for exactly that and I'm always keen to hear what setups people run.`, personalizationSnippet: "post-accept opener", signalUsed: "connection accepted" });
  }

  // CortexCart X engagement ideas
  if (prompt.includes("ways to engage with this person's X content")) {
    return JSON.stringify(mockXEngagement(ctx));
  }

  // CortexCart X DM
  if (prompt.includes("Write an X DM. UNDER 50 WORDS")) {
    return JSON.stringify({ body: `loved what you're doing with ${ctx.companyName} — how are you tracking which channel actually drives sales? we built a free dashboard for that`, personalizationSnippet: "their content", signalUsed: "social presence" });
  }

  // LinkedIn connection note (generic + CortexCart variants)
  if (prompt.includes("LinkedIn connection request note") || prompt.includes("LinkedIn connection request")) {
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

// ── CortexCart fit analysis ─────────────────────────────────────

function mockFitAnalysis(ctx: MockContext, prompt: string) {
  const stackMatch = prompt.match(/TECH STACK:\s*(.+?)(?:\n|$)/);
  const stack = (stackMatch?.[1] || "").toLowerCase();
  const hasEmailTool = /klaviyo|omnisend|mailchimp/.test(stack);
  const hasAds = /pixel|google ads|tiktok/.test(stack);
  const hasAttribution = /triple whale|northbeam|lifetimely|polar/.test(stack);

  const likelihood = hasAds && !hasAttribution ? 74 : hasEmailTool ? 55 : 35;

  return {
    likelihoodToBuy: likelihood,
    growthStage: hasEmailTool && hasAds ? "scaling" : "early",
    marketingSophistication: hasAds ? "medium" : "low",
    estimatedPainPoints: [
      hasAds && !hasAttribution
        ? "Spending on ads without attribution — can't tell which channel drives profit"
        : "Store performance data scattered across multiple tools",
      "Daily reporting requires manually checking several dashboards",
    ],
    bestSalesAngle:
      hasAds && !hasAttribution
        ? `${ctx.companyName} is paying for traffic but flying blind on why sales move — lead with the attribution why-gap`
        : `Ask how ${ctx.companyName} currently pulls their daily numbers together — lead with the tab-dance pain`,
    likelyObjections: [
      "Already checking numbers in Shopify admin — why add a tool?",
      "Another dashboard to learn / set up time",
      hasAttribution ? "Already paying for an attribution tool" : "Is a free beta product reliable?",
    ],
    recommendedOffer: "Free beta access + free AI homepage audit as the icebreaker",
    reasoning: `Mock analysis: ${hasAds ? "ad pixels detected without attribution tooling — strong why-gap fit" : "limited ad-spend signals, so mid/low likelihood"}. Set ANTHROPIC_API_KEY for a real analysis.`,
  };
}

// ── NL search filter ────────────────────────────────────────────

function mockSearchFilter(prompt: string) {
  // Deterministic keyword fallback so search works without an API key
  const qMatch = prompt.match(/QUERY:\s*([\s\S]+?)(?:\n\nJSON|$)/);
  const q = (qMatch?.[1] || prompt).toLowerCase();

  const filter: Record<string, unknown> = {};
  if (/tier a|a-tier|best|top/.test(q)) filter.tier = "A";
  else if (/tier b/.test(q)) filter.tier = "B";
  if (/meta ads|facebook ads|running ads|paid (ads|traffic)|ad spend/.test(q)) filter.techIncludes = ["pixel", "google ads", "tiktok"];
  if (/klaviyo/.test(q)) filter.techIncludes = [...((filter.techIncludes as string[]) || []), "klaviyo"];
  if (/no attribution|attribution gap|poor attribution|why gap/.test(q)) filter.techExcludes = ["triple whale", "northbeam", "lifetimely", "polar"];
  if (/hiring/.test(q)) filter.hiring = true;
  if (/review|pending/.test(q)) filter.status = "review_pending";
  if (/approved/.test(q)) filter.status = "approved";
  if (/won/.test(q)) filter.status = "won";
  if (/hot/.test(q)) filter.temperature = "hot";
  const scoreMatch = q.match(/score (?:over|above|>) ?(\d+)/);
  if (scoreMatch) filter.minScore = parseInt(scoreMatch[1], 10);
  const keywords = q.match(/"([^"]+)"/g)?.map((k) => k.replace(/"/g, ""));
  if (keywords?.length) filter.keywords = keywords;

  return { filter, interpretation: `Keyword-matched filter (mock mode): ${JSON.stringify(filter)}` };
}

// ── Marketing content (CortexCart OS) ───────────────────────────

function mockMarketingContent(prompt: string): { items: Array<Record<string, string>> } {
  const countMatch = prompt.match(/Write (\d+)/);
  const count = Math.min(parseInt(countMatch?.[1] || "3", 10) || 3, 10);

  let template: Array<Record<string, string>>;

  if (prompt.includes("Higgsfield")) {
    template = [
      {
        title: "The Guess — drowning in tabs",
        body: "Cinematic close-up of an ecommerce founder at a desk at night, face lit by cold blue monitor glow, dozens of floating translucent spreadsheet windows and red declining charts swirling around them, deep navy palette with electric cyan accents, anamorphic lens, shallow depth of field, slow push-in, volumetric light through window blinds, 8s",
        notes: "Beat 1 (The Guess) — 16:9 hero, also crops to 9:16",
      },
      {
        title: "The Turn — data convergence",
        body: "Streams of glowing data particles from every direction converging into a single floating dashboard screen, chaos resolving into order, electric cyan and growth-green light trails against deep navy void, camera orbits the dashboard as a green revenue curve rises, premium SaaS brand film aesthetic, volumetric glow, 6s",
        notes: "Beat 2 (The Turn) — 16:9 hero + 6s bumper",
      },
      {
        title: "The Growth — calm control",
        body: "Same founder in warm morning light, relaxed posture, one clean glowing dashboard on screen with a climbing green curve, soft depth of field, slow dolly out revealing a calm workspace, deep navy and growth-green palette, anamorphic bokeh, confident and quiet mood, 8s",
        notes: "Beat 3 (The Growth) — 16:9 hero + 9:16 reel closer",
      },
    ];
  } else if (prompt.includes("opening angles")) {
    template = [
      {
        title: "The why-gap question",
        body: "Quick one — when sales dip on a paid-traffic week, how long does it take you to find out *why*? For most Shopify stores it's an evening of spreadsheets.",
        notes: "Works because it names the exact pain (attribution confusion) without inventing facts about the store. Use for stores running Meta/Google ads.",
      },
      {
        title: "The tool-stack tally",
        body: "Curious — how many tabs does it take to see how your store actually did yesterday? GA4, Meta, Shopify admin... we got tired of the tab-dance and built one dashboard for it.",
        notes: "Works because every operator recognises the tab-dance. Safe for any niche; no personalisation needed beyond platform.",
      },
      {
        title: "The Triple Whale price wedge",
        body: "Most analytics tools that answer 'why did sales move' cost £200+/mo. We built one for stores doing £10k-£200k/mo — free while in beta.",
        notes: "Works on price-conscious operators. Use when tech-stack signals show no existing analytics tool.",
      },
    ];
  } else {
    template = [
      {
        title: "The 2am spreadsheet post",
        platform: "linkedin",
        body: "Every store owner knows the 2am spreadsheet session.\n\nTraffic's up. Sales are down. And the answer is buried somewhere across GA4, Meta Ads Manager, and six Shopify reports.\n\nThat gap — between what happened and why — is where most ad budgets quietly die.\n\nWe built CortexCart to close it. Every channel in one dashboard, and AI that explains the why in plain English.\n\nFree while we're in beta. Link in comments.",
        notes: "Post morning UK time; put the beta link in the first comment.",
      },
      {
        title: "The tab-dance",
        platform: "x",
        body: "your store's daily report shouldn't require 9 tabs and a prayer.\n\none dashboard. every channel. AI that tells you WHY sales moved.\n\nfree during beta → tracker.cortexcart.com",
        notes: "Pin this during launch week.",
      },
      {
        title: "Stop guessing",
        platform: "linkedin",
        body: "\"Sales dropped 20% last week. I don't know why.\"\n\nI've heard a version of this from almost every store owner I've spoken to this year.\n\nNot because they're bad operators — because their data lives in five places and none of them talk to each other.\n\nStop guessing. Start growing. That's the whole pitch.",
        notes: "Story-led; works as a founder post from Jonathan.",
      },
    ];
  }

  return { items: template.slice(0, Math.max(1, count)) };
}
