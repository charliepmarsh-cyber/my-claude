/**
 * Apollo enrichment — pure mapping layer.
 *
 * Turns an Apollo people/match response into:
 *  1. research items (always source-attributed, saved on apply)
 *  2. field-level suggestions the user reviews and ticks — nothing is ever
 *     written to a lead/company without explicit selection, and suggestions
 *     that would overwrite existing data are flagged as conflicts and
 *     un-ticked by default.
 */

import type { Company, Lead } from "@/db/schema";
import type { Seniority } from "@/lib/constants";

/* Subset of Apollo's people/match response we actually use. */
export type ApolloOrganization = {
  name?: string;
  website_url?: string;
  primary_domain?: string;
  linkedin_url?: string;
  industry?: string;
  estimated_num_employees?: number;
  annual_revenue_printed?: string;
  keywords?: string[];
  short_description?: string;
};

export type ApolloPerson = {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  seniority?: string;
  email?: string;
  linkedin_url?: string;
  city?: string;
  state?: string;
  country?: string;
  organization?: ApolloOrganization;
};

export type ResearchDraft = {
  kind: "enrichment" | "company_snapshot" | "tech_stack";
  title: string;
  content: string;
  sourceUrl: string | null;
  confidence: "low" | "medium" | "high";
};

export type FieldSuggestion = {
  target: "lead" | "company";
  field: string;
  label: string;
  current: string | null;
  proposed: string;
  /** True when the record already holds a different value — never pre-selected. */
  conflict: boolean;
};

export type EnrichmentProposal = {
  research: ResearchDraft[];
  suggestions: FieldSuggestion[];
  personFound: boolean;
};

/** Apollo returns placeholder addresses when the email isn't unlocked. */
export function isUsableEmail(email: string | undefined): email is string {
  if (!email) return false;
  const e = email.toLowerCase();
  return e.includes("@") && !e.includes("email_not_unlocked") && !e.endsWith("@domain.com");
}

export function mapApolloSeniority(seniority: string | undefined, title: string | undefined): Seniority | null {
  const s = (seniority ?? "").toLowerCase();
  const t = (title ?? "").toLowerCase();
  if (s === "founder" || /founder|owner/.test(t)) return "founder";
  if (s === "c_suite" || /\bc[eotfm]o\b|chief/.test(t)) return "c_level";
  if (s === "vp" || s === "director" || /director|vp\b|vice president/.test(t)) return "director";
  if (/head of/.test(t)) return "head";
  if (s === "manager" || /manager/.test(t)) return "manager";
  if (s === "senior" || /senior|lead\b/.test(t)) return "senior_ic";
  if (s === "entry" || s === "intern") return "ic";
  return null;
}

export function mapEmployeeRange(count: number | undefined): string | null {
  if (!count || count < 1) return null;
  if (count <= 1) return "1";
  if (count <= 10) return "2-10";
  if (count <= 50) return "11-50";
  if (count <= 200) return "51-200";
  return "200+";
}

function joinLocation(p: ApolloPerson): string | null {
  const parts = [p.city, p.state, p.country].filter(Boolean);
  if (parts.length === 0) return null;
  // Drop the state for non-US style noise when city+country present.
  if (p.city && p.country && p.state && p.country !== "United States") return `${p.city}, ${p.country}`;
  return parts.join(", ");
}

function suggest(
  out: FieldSuggestion[],
  target: "lead" | "company",
  field: string,
  label: string,
  current: string | null | undefined,
  proposed: string | null | undefined,
): void {
  if (!proposed) return;
  const cur = current?.trim() || null;
  if (cur && cur.toLowerCase() === proposed.trim().toLowerCase()) return; // already identical
  out.push({ target, field, label, current: cur, proposed: proposed.trim(), conflict: cur !== null });
}

export function buildEnrichmentProposal(
  lead: Lead,
  company: Company | null,
  person: ApolloPerson | null,
): EnrichmentProposal {
  if (!person) return { research: [], suggestions: [], personFound: false };

  const org = person.organization;
  const research: ResearchDraft[] = [];
  const suggestions: FieldSuggestion[] = [];

  /* ---------------- research items (always offered) ---------------- */

  const personLines = [
    person.title && `Title: ${person.title}`,
    person.seniority && `Seniority (Apollo): ${person.seniority}`,
    joinLocation(person) && `Location: ${joinLocation(person)}`,
    isUsableEmail(person.email) && `Work email: ${person.email}`,
    person.linkedin_url && `LinkedIn: ${person.linkedin_url}`,
  ].filter(Boolean) as string[];
  if (personLines.length > 0) {
    research.push({
      kind: "enrichment",
      title: `Apollo person profile: ${person.name ?? lead.fullName}`,
      content: `${personLines.join("\n")}\n\nSource: Apollo.io people/match (third-party data — verify before relying on it).`,
      sourceUrl: person.linkedin_url ?? null,
      confidence: "medium",
    });
  }

  if (org?.name) {
    const orgLines = [
      org.industry && `Industry: ${org.industry}`,
      org.estimated_num_employees && `Estimated employees: ${org.estimated_num_employees}`,
      org.annual_revenue_printed && `Estimated annual revenue: ${org.annual_revenue_printed}`,
      (org.website_url || org.primary_domain) && `Website: ${org.website_url ?? org.primary_domain}`,
      org.short_description && `About: ${org.short_description}`,
    ].filter(Boolean) as string[];
    if (orgLines.length > 0) {
      research.push({
        kind: "company_snapshot",
        title: `Apollo company profile: ${org.name}`,
        content: `${orgLines.join("\n")}\n\nSource: Apollo.io (third-party estimates — employee and revenue figures are approximate).`,
        sourceUrl: org.website_url ?? org.linkedin_url ?? null,
        confidence: "medium",
      });
    }
    if (org.keywords && org.keywords.length > 0) {
      research.push({
        kind: "tech_stack",
        title: `Apollo keywords: ${org.name}`,
        content: `Keywords Apollo associates with the company (mixture of market and technology tags):\n${org.keywords.slice(0, 15).join(", ")}`,
        sourceUrl: null,
        confidence: "low",
      });
    }
  }

  /* ---------------- field suggestions (ticked only when empty) ------ */

  suggest(suggestions, "lead", "jobTitle", "Job title", lead.jobTitle, person.title);
  const sen = mapApolloSeniority(person.seniority, person.title);
  suggest(
    suggestions,
    "lead",
    "seniority",
    "Seniority",
    lead.seniority === "unknown" ? null : lead.seniority,
    sen ?? undefined,
  );
  if (isUsableEmail(person.email)) suggest(suggestions, "lead", "workEmail", "Work email", lead.workEmail, person.email);
  suggest(suggestions, "lead", "linkedinUrl", "LinkedIn URL", lead.linkedinUrl, person.linkedin_url);
  suggest(suggestions, "lead", "location", "Location", lead.location, joinLocation(person) ?? undefined);

  if (org) {
    suggest(suggestions, "company", "website", "Company website", company?.website, org.website_url ?? org.primary_domain);
    suggest(suggestions, "company", "linkedinUrl", "Company LinkedIn", company?.linkedinUrl, org.linkedin_url);
    suggest(suggestions, "company", "industry", "Industry", company?.industry, org.industry);
    suggest(
      suggestions,
      "company",
      "employeeRange",
      "Employee range",
      company?.employeeRange,
      mapEmployeeRange(org.estimated_num_employees) ?? undefined,
    );
    suggest(
      suggestions,
      "company",
      "revenueRange",
      "Estimated revenue",
      company?.revenueRange,
      org.annual_revenue_printed ? `≈ ${org.annual_revenue_printed} (Apollo estimate)` : undefined,
    );
    suggest(suggestions, "company", "description", "Company description", company?.description, org.short_description);
  }

  return { research, suggestions, personFound: true };
}
