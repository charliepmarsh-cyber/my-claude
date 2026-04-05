import type { Lead, OutreachDraft } from "../types/index.js";

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  overallScore: number;
}

export interface ValidationIssue {
  field: string;
  severity: "error" | "warning" | "info";
  message: string;
  rule: string;
}

// ── Spam / low-quality patterns ─────────────────────────────────

const SPAM_PHRASES = [
  /10x/i,
  /game.?changer/i,
  /revolutionary/i,
  /guaranteed/i,
  /act now/i,
  /limited time/i,
  /you won't believe/i,
  /exclusive offer/i,
  /don't miss out/i,
  /this is not spam/i,
  /scale your business/i,
  /crush it/i,
  /rocket ship/i,
  /skyrocket/i,
  /explode your/i,
  /unlock .* potential/i,
  /secret to/i,
  /millions of/i,
  /massive growth/i,
];

const GENERIC_PHRASES = [
  /I hope this (?:email |message )?finds you well/i,
  /I wanted to reach out/i,
  /I came across your (?:company|profile)/i,
  /we help (?:businesses|companies) (?:like yours |)(?:grow|scale|succeed)/i,
  /I'd love to connect/i,
  /I noticed you(?:'re| are) (?:a |the )/i,
  /just checking in/i,
  /circling back/i,
  /touching base/i,
  /following up on my previous/i,
];

const UNVERIFIABLE_CLAIMS = [
  /I(?:'ve| have) (?:used|tried|bought|purchased) your/i,
  /I(?:'m| am) a (?:huge |big )?fan of/i,
  /I love (?:what you|your)/i,
  /I(?:'ve| have) been following/i,
  /our clients (?:typically |usually |)see \d+%/i,
  /we(?:'ve| have) helped \d+ (?:companies|businesses)/i,
];

// ── Lead validation ─────────────────────────────────────────────

export function validateLead(lead: Lead): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Required fields
  if (!lead.company.name) {
    issues.push({ field: "company.name", severity: "error", message: "Missing company name", rule: "required_field" });
  }
  if (!lead.contact.email && !lead.contact.linkedinUrl) {
    issues.push({ field: "contact", severity: "warning", message: "No contact method (email or LinkedIn) — outreach drafting will be skipped", rule: "required_contact" });
  }
  if (!lead.contact.fullName && !lead.contact.firstName) {
    issues.push({ field: "contact.name", severity: "warning", message: "No contact name — outreach will be less personal", rule: "recommended_field" });
  }
  if (!lead.company.website) {
    issues.push({ field: "company.website", severity: "warning", message: "No website — limits enrichment quality", rule: "recommended_field" });
  }
  if (!lead.contact.role && !lead.contact.title) {
    issues.push({ field: "contact.role", severity: "warning", message: "No role/title — limits message targeting", rule: "recommended_field" });
  }

  // Data quality
  if (lead.contact.email && !isValidEmail(lead.contact.email)) {
    issues.push({ field: "contact.email", severity: "error", message: "Invalid email format", rule: "format_check" });
  }
  if (lead.contact.linkedinUrl && !lead.contact.linkedinUrl.includes("linkedin.com")) {
    issues.push({ field: "contact.linkedinUrl", severity: "warning", message: "LinkedIn URL doesn't look valid", rule: "format_check" });
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const overallScore = Math.max(0, 100 - errorCount * 25 - warningCount * 10);

  return {
    valid: errorCount === 0,
    issues,
    overallScore,
  };
}

// ── Message validation ──────────────────────────────────────────

export function validateDraft(draft: OutreachDraft): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!draft.body || draft.body.trim().length === 0) {
    issues.push({ field: "body", severity: "error", message: "Empty message body", rule: "required_field" });
  }

  // Check for spam phrases
  for (const pattern of SPAM_PHRASES) {
    if (pattern.test(draft.body)) {
      issues.push({
        field: "body",
        severity: "error",
        message: `Contains spammy language: "${draft.body.match(pattern)?.[0]}"`,
        rule: "spam_check",
      });
    }
  }

  // Check for generic phrases
  for (const pattern of GENERIC_PHRASES) {
    if (pattern.test(draft.body)) {
      issues.push({
        field: "body",
        severity: "warning",
        message: `Contains generic phrase: "${draft.body.match(pattern)?.[0]}"`,
        rule: "generic_check",
      });
    }
  }

  // Check for unverifiable claims
  for (const pattern of UNVERIFIABLE_CLAIMS) {
    if (pattern.test(draft.body)) {
      issues.push({
        field: "body",
        severity: "error",
        message: `Contains unverifiable claim: "${draft.body.match(pattern)?.[0]}"`,
        rule: "claim_check",
      });
    }
  }

  // Length checks per channel
  if (draft.messageType === "linkedin_connection_note" && draft.body.length > 300) {
    issues.push({ field: "body", severity: "error", message: `Connection note too long (${draft.body.length}/300 chars)`, rule: "length_check" });
  }
  if (draft.messageType === "x_dm" && draft.body.length > 300) {
    issues.push({ field: "body", severity: "error", message: `X DM too long (${draft.body.length}/300 chars)`, rule: "length_check" });
  }
  if (draft.messageType === "email_first_touch") {
    const wordCount = draft.body.split(/\s+/).length;
    if (wordCount > 200) {
      issues.push({ field: "body", severity: "warning", message: `Email too long (${wordCount} words, target <150)`, rule: "length_check" });
    }
    if (!draft.subject) {
      issues.push({ field: "subject", severity: "error", message: "Email missing subject line", rule: "required_field" });
    }
    if (draft.subject && draft.subject.length > 70) {
      issues.push({ field: "subject", severity: "warning", message: `Subject line too long (${draft.subject.length}/60 chars)`, rule: "length_check" });
    }
  }

  // Personalization quality
  if (!draft.personalizationSnippet || draft.personalizationSnippet.length < 10) {
    issues.push({ field: "personalizationSnippet", severity: "warning", message: "Weak or missing personalization", rule: "personalization_check" });
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const overallScore = Math.max(0, 100 - errorCount * 20 - warningCount * 8);

  return {
    valid: errorCount === 0,
    issues,
    overallScore,
  };
}

// ── Duplicate detection ─────────────────────────────────────────

export function detectDuplicateMessages(drafts: OutreachDraft[], threshold = 0.8): string[] {
  const issues: string[] = [];
  for (let i = 0; i < drafts.length; i++) {
    for (let j = i + 1; j < drafts.length; j++) {
      if (drafts[i].messageType === drafts[j].messageType) {
        const sim = jaccardSimilarity(drafts[i].body, drafts[j].body);
        if (sim > threshold) {
          issues.push(`Drafts ${i} and ${j} (${drafts[i].messageType}) are ${Math.round(sim * 100)}% similar`);
        }
      }
    }
  }
  return issues;
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
