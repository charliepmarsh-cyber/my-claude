-- Outreach Agent Database Schema
-- SQLite (MVP) — designed for easy migration to PostgreSQL

CREATE TABLE IF NOT EXISTS leads (
    id              TEXT PRIMARY KEY,          -- e.g., lead_abc123def456
    data            TEXT NOT NULL,             -- Full lead JSON blob
    company_name    TEXT NOT NULL,             -- Indexed for search
    segment         TEXT NOT NULL,             -- shopify | ecommerce | enterprise
    status          TEXT NOT NULL,             -- Lead lifecycle status
    score           INTEGER,                   -- Final composite score (0-100)
    tier            TEXT,                      -- A | B | C | D
    created_at      TEXT NOT NULL,             -- ISO 8601 timestamp
    updated_at      TEXT NOT NULL,
    enriched_at     TEXT,
    scored_at       TEXT,
    drafted_at      TEXT,
    reviewed_at     TEXT,
    sent_at         TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_segment  ON leads(segment);
CREATE INDEX IF NOT EXISTS idx_leads_score    ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_company  ON leads(company_name);

-- Audit log: tracks every status change for compliance
CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id     TEXT NOT NULL,                -- FK to leads.id
    action      TEXT NOT NULL,                -- e.g., enriched, scored, drafted, approved
    details     TEXT,                         -- Optional context
    timestamp   TEXT NOT NULL,                -- ISO 8601 timestamp
    FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_lead ON audit_log(lead_id);

-- ─── Notes ──────────────────────────────────────────────────────
--
-- The `data` column stores the full Lead JSON object. This allows
-- the schema to evolve without migrations — new fields are added
-- to the JSON, and indexed columns are added as needed.
--
-- For PostgreSQL migration:
--   - Change TEXT to JSONB for the `data` column
--   - Add GIN index on data column for JSON queries
--   - Change INTEGER PRIMARY KEY AUTOINCREMENT to SERIAL
--   - Add proper timestamp types instead of TEXT
