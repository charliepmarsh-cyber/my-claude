import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import type { Lead } from "../types/index.js";
import { Lead as LeadSchema } from "../types/index.js";
import { log } from "../lib/logger.js";

let db: Database.Database | null = null;

/**
 * Initialize the SQLite database. Creates tables if they don't exist.
 */
export function initDb(dbPath?: string): Database.Database {
  const path = dbPath || process.env.DATABASE_PATH || "./data/outreach.db";
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  createTables(db);
  log.info(`Database initialized at ${path}`);
  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error("Database not initialized — call initDb() first");
  return db;
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      company_name TEXT NOT NULL,
      segment TEXT NOT NULL,
      status TEXT NOT NULL,
      score INTEGER,
      tier TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      enriched_at TEXT,
      scored_at TEXT,
      drafted_at TEXT,
      reviewed_at TEXT,
      sent_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_segment ON leads(segment);
    CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
    CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_name);

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );

    CREATE INDEX IF NOT EXISTS idx_audit_lead ON audit_log(lead_id);
  `);
}

// ── CRUD operations ─────────────────────────────────────────────

export function saveLead(lead: Lead): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO leads (id, data, company_name, segment, status, score, tier, created_at, updated_at, enriched_at, scored_at, drafted_at, reviewed_at, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    lead.id,
    JSON.stringify(lead),
    lead.company.name,
    lead.segment,
    lead.status,
    lead.score?.finalScore ?? null,
    lead.score?.tier ?? null,
    lead.createdAt,
    lead.updatedAt,
    lead.enrichedAt ?? null,
    lead.scoredAt ?? null,
    lead.draftedAt ?? null,
    lead.reviewedAt ?? null,
    lead.sentAt ?? null,
  );
}

export function saveLeads(leads: Lead[]): void {
  const db = getDb();
  const tx = db.transaction(() => {
    for (const lead of leads) saveLead(lead);
  });
  tx();
}

export function getLeadById(id: string): Lead | undefined {
  const db = getDb();
  const row = db.prepare("SELECT data FROM leads WHERE id = ?").get(id) as { data: string } | undefined;
  if (!row) return undefined;
  return LeadSchema.parse(JSON.parse(row.data));
}

export function getLeadsByStatus(status: string): Lead[] {
  const db = getDb();
  const rows = db.prepare("SELECT data FROM leads WHERE status = ? ORDER BY score DESC").all(status) as { data: string }[];
  return rows.map((r) => LeadSchema.parse(JSON.parse(r.data)));
}

export function getLeadsBySegment(segment: string): Lead[] {
  const db = getDb();
  const rows = db.prepare("SELECT data FROM leads WHERE segment = ? ORDER BY score DESC").all(segment) as { data: string }[];
  return rows.map((r) => LeadSchema.parse(JSON.parse(r.data)));
}

export function getAllLeads(): Lead[] {
  const db = getDb();
  const rows = db.prepare("SELECT data FROM leads ORDER BY score DESC NULLS LAST").all() as { data: string }[];
  return rows.map((r) => LeadSchema.parse(JSON.parse(r.data)));
}

export function getLeadCount(): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM leads").get() as { count: number };
  return row.count;
}

// ── Audit logging ───────────────────────────────────────────────

export function logAudit(leadId: string, action: string, details?: string): void {
  const db = getDb();
  db.prepare("INSERT INTO audit_log (lead_id, action, details, timestamp) VALUES (?, ?, ?, ?)").run(
    leadId,
    action,
    details ?? null,
    new Date().toISOString(),
  );
}

export function getAuditLog(leadId: string): Array<{ action: string; details: string | null; timestamp: string }> {
  const db = getDb();
  return db.prepare("SELECT action, details, timestamp FROM audit_log WHERE lead_id = ? ORDER BY timestamp DESC").all(leadId) as Array<{ action: string; details: string | null; timestamp: string }>;
}
