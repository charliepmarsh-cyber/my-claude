import { Hono } from "hono";
import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "xlsx";
import type { RawLead } from "../../connectors/discovery-types.js";
import type { LeadSegment } from "../../types/index.js";
import { ingestRawLeads } from "../ingest-core.js";
import { log } from "../../lib/logger.js";

const app = new Hono();

/**
 * Header aliases → canonical field. Lets people upload spreadsheets with
 * human headers ("Company Name", "Email") as well as the machine format.
 */
const HEADER_ALIASES: Record<string, string> = {
  company: "company_name",
  company_name: "company_name",
  business: "company_name",
  brand: "company_name",
  store: "company_name",
  website: "website",
  url: "website",
  site: "website",
  domain: "website",
  platform: "platform",
  industry: "industry",
  niche: "niche",
  category: "niche",
  size: "size_estimate",
  size_estimate: "size_estimate",
  employees: "size_estimate",
  employee_count: "size_estimate",
  team_size: "size_estimate",
  contact: "contact_name",
  contact_name: "contact_name",
  name: "contact_name",
  full_name: "contact_name",
  founder: "contact_name",
  owner: "contact_name",
  role: "contact_role",
  title: "contact_role",
  contact_role: "contact_role",
  position: "contact_role",
  email: "contact_email",
  contact_email: "contact_email",
  email_address: "contact_email",
  linkedin: "linkedin_url",
  linkedin_url: "linkedin_url",
  twitter: "x_url",
  x: "x_url",
  x_url: "x_url",
  segment: "segment",
  notes: "notes",
  note: "notes",
  comments: "notes",
};

function normalizeHeader(header: string): string {
  const key = header.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return HEADER_ALIASES[key] || key;
}

function normalizeRow(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = normalizeHeader(k);
    const val = v === null || v === undefined ? "" : String(v).trim();
    if (val && !out[key]) out[key] = val;
  }
  return out;
}

function rowToRawLead(row: Record<string, string>, defaultSegment: LeadSegment): RawLead | null {
  if (!row.company_name) return null;

  let segment = defaultSegment;
  const s = (row.segment || "").toLowerCase();
  if (s === "shopify" || s === "ecommerce" || s === "enterprise") segment = s;
  else if ((row.platform || "").toLowerCase().includes("shopify")) segment = "shopify";

  return {
    companyName: row.company_name,
    website: row.website || undefined,
    platform: row.platform || undefined,
    industry: row.industry || undefined,
    niche: row.niche || undefined,
    sizeEstimate: row.size_estimate || undefined,
    contactName: row.contact_name || undefined,
    contactRole: row.contact_role || undefined,
    contactEmail: row.contact_email || undefined,
    linkedinUrl: row.linkedin_url || undefined,
    xUrl: row.x_url || undefined,
    segment,
    source: "csv_import",
    notes: row.notes || undefined,
  };
}

function parseSpreadsheet(filename: string, buffer: Buffer): Record<string, unknown>[] {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".xlsm")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("Workbook has no sheets");
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
      defval: "",
      raw: false,
    });
  }

  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    return parseCsv(buffer.toString("utf-8"), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,
    });
  }

  throw new Error(`Unsupported file type: ${filename}. Upload .xlsx, .xls, or .csv`);
}

/**
 * POST /api/os/import — multipart upload of an Excel or CSV lead list.
 * Fields: file (required), segment (optional default), runPipeline ("true"/"false").
 */
app.post("/", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    return c.json({ ok: false, error: "No file uploaded — send multipart/form-data with a 'file' field" }, 400);
  }
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ ok: false, error: "File too large (max 10 MB)" }, 400);
  }

  const segmentField = typeof body["segment"] === "string" ? (body["segment"] as string) : "";
  const defaultSegment: LeadSegment = segmentField === "ecommerce" || segmentField === "enterprise" ? segmentField : "shopify";
  const runPipelineAfter = body["runPipeline"] === "true";

  let rows: Record<string, unknown>[];
  try {
    rows = parseSpreadsheet(file.name, Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    return c.json({ ok: false, error: (err as Error).message }, 400);
  }

  const rawLeads: RawLead[] = [];
  let skipped = 0;
  for (const row of rows) {
    const raw = rowToRawLead(normalizeRow(row), defaultSegment);
    if (raw) rawLeads.push(raw);
    else skipped++;
  }

  if (rawLeads.length === 0) {
    return c.json(
      {
        ok: false,
        error:
          rows.length === 0
            ? "The file has no data rows"
            : `Found ${rows.length} rows but none had a recognisable company name column. Expected a header like "Company", "Company Name", "Brand", or "Store".`,
      },
      400,
    );
  }

  log.info(`Importing ${rawLeads.length} leads from ${file.name} (${skipped} rows skipped)`);
  const outcome = ingestRawLeads(rawLeads, { runPipelineAfter });

  return c.json({
    ok: true,
    file: file.name,
    rows: rows.length,
    imported: outcome.imported,
    duplicates: outcome.duplicates,
    skipped,
    jobId: outcome.job?.id,
    message: outcome.job
      ? `${outcome.imported} leads imported — pipeline running (enrich → score → draft)`
      : `${outcome.imported} leads imported (${outcome.duplicates} duplicates skipped)`,
  });
});

/** GET /api/os/import/template — downloadable CSV template that Excel opens directly. */
app.get("/template", (c) => {
  const header = "company_name,website,platform,niche,contact_name,contact_role,contact_email,linkedin_url,notes";
  const example = 'Glow Skincare Co,glowskincare.com,Shopify,beauty & skincare,Sarah Chen,Founder,sarah@glowskincare.com,https://linkedin.com/in/sarahchen,"Running Meta ads, ~£40k/mo, uses Klaviyo"';
  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", 'attachment; filename="cortexcart-leads-template.csv"');
  return c.body(`${header}\n${example}\n`);
});

export default app;
