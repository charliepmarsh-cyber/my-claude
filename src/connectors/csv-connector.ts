import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { readFileSync, writeFileSync } from "fs";
import type { Lead, CsvLeadRow, LeadSource, LeadSegment } from "../types/index.js";
import { generateLeadId } from "../lib/ids.js";
import { log } from "../lib/logger.js";

/**
 * Import leads from a CSV file.
 * Handles flexible column naming and maps to Lead schema.
 */
export function importFromCsv(filePath: string): Lead[] {
  const raw = readFileSync(filePath, "utf-8");
  const records: CsvLeadRow[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  log.info(`Parsed ${records.length} rows from ${filePath}`);

  return records.map((row) => csvRowToLead(row));
}

/**
 * Export leads to CSV.
 */
export function exportToCsv(leads: Lead[], filePath: string): void {
  const rows = leads.map((lead) => ({
    id: lead.id,
    company_name: lead.company.name,
    website: lead.company.website || "",
    platform: lead.company.platform || "",
    industry: lead.company.industry || "",
    niche: lead.company.niche || "",
    size_estimate: lead.company.sizeEstimate || "",
    segment: lead.segment,
    contact_name: lead.contact.fullName || "",
    contact_role: lead.contact.role || "",
    contact_email: lead.contact.email || "",
    linkedin_url: lead.contact.linkedinUrl || "",
    x_url: lead.contact.xUrl || "",
    status: lead.status,
    score: lead.score?.finalScore ?? "",
    tier: lead.score?.tier ?? "",
    pain_point: lead.painPoints[0]?.hypothesis || "",
    automation_angle: lead.painPoints[0]?.automationAngle || "",
    personalization_notes: lead.personalizationNotes || "",
    next_action: lead.nextAction || "",
    linkedin_draft: lead.outreachDrafts.find((d) => d.messageType === "linkedin_first_message")?.body || "",
    email_subject: lead.outreachDrafts.find((d) => d.messageType === "email_first_touch")?.subject || "",
    email_draft: lead.outreachDrafts.find((d) => d.messageType === "email_first_touch")?.body || "",
    x_draft: lead.outreachDrafts.find((d) => d.messageType === "x_dm")?.body || "",
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
  }));

  const csv = stringify(rows, { header: true });
  writeFileSync(filePath, csv, "utf-8");
  log.success(`Exported ${leads.length} leads to ${filePath}`);
}

function csvRowToLead(row: CsvLeadRow): Lead {
  const now = new Date().toISOString();
  const nameParts = (row.contact_name || "").split(" ");

  return {
    id: generateLeadId(),
    source: (row.source as LeadSource) || "csv_import",
    segment: inferSegment(row),
    status: "new",
    company: {
      name: row.company_name,
      website: row.website || undefined,
      platform: row.platform || undefined,
      platformIndicators: row.platform ? [row.platform] : [],
      industry: row.industry || undefined,
      niche: row.niche || undefined,
      sizeEstimate: row.size_estimate || undefined,
      products: [],
      techStack: [],
    },
    contact: {
      fullName: row.contact_name || undefined,
      firstName: nameParts[0] || undefined,
      lastName: nameParts.slice(1).join(" ") || undefined,
      role: row.contact_role || undefined,
      email: row.contact_email || undefined,
      linkedinUrl: row.linkedin_url || undefined,
      xUrl: row.x_url || (row.x_handle ? `https://x.com/${row.x_handle.replace(/^@/, "")}` : undefined),
    },
    signals: {
      hiringSignals: [],
      recentAnnouncements: [],
      customerExperienceClues: [],
      operationalComplexityClues: [],
      multiChannelPresence: [],
      teamStructureClues: [],
      fragmentedTooling: [],
      growthIndicators: [],
      painPointClues: [],
      rawNotes: [row.notes, row.manual_notes].filter(Boolean).join("\n") || undefined,
    },
    personalizationNotes: row.manual_notes || undefined,
    painPoints: [],
    outreachDrafts: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

function inferSegment(row: CsvLeadRow): LeadSegment {
  if (row.segment) {
    const s = row.segment.toLowerCase();
    if (s === "shopify" || s === "ecommerce" || s === "enterprise") return s;
  }
  if (row.platform?.toLowerCase().includes("shopify")) return "shopify";
  const size = row.size_estimate || "";
  if (/200|500|1000|\+/.test(size)) return "enterprise";
  return "ecommerce";
}
