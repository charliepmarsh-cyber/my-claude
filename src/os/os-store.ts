import { getDb } from "../storage/database.js";
import { nanoid } from "nanoid";

/**
 * OS-layer persistence: a small KV table for department settings
 * (finance targets/costs) and a table for generated marketing content.
 * Tables are created lazily so existing databases upgrade in place.
 */

let tablesReady = false;

function ensureTables(): void {
  if (tablesReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS os_kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS marketing_content (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      topic TEXT,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_marketing_kind ON marketing_content(kind);
  `);
  tablesReady = true;
}

// ── KV ──────────────────────────────────────────────────────────

export function getKv<T>(key: string): T | undefined {
  ensureTables();
  const row = getDb().prepare("SELECT value FROM os_kv WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  if (!row) return undefined;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return undefined;
  }
}

export function setKv(key: string, value: unknown): void {
  ensureTables();
  getDb()
    .prepare(
      "INSERT INTO os_kv (key, value, updated_at) VALUES (?, ?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )
    .run(key, JSON.stringify(value), new Date().toISOString());
}

// ── Marketing content ───────────────────────────────────────────

export interface MarketingContentRow {
  id: string;
  kind: string;
  topic: string | null;
  content: unknown;
  createdAt: string;
}

export function saveMarketingContent(kind: string, topic: string | undefined, content: unknown): MarketingContentRow {
  ensureTables();
  const row: MarketingContentRow = {
    id: `mkt_${nanoid(10)}`,
    kind,
    topic: topic ?? null,
    content,
    createdAt: new Date().toISOString(),
  };
  getDb()
    .prepare("INSERT INTO marketing_content (id, kind, topic, content, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(row.id, row.kind, row.topic, JSON.stringify(row.content), row.createdAt);
  return row;
}

export function listMarketingContent(kind?: string): MarketingContentRow[] {
  ensureTables();
  const rows = (
    kind
      ? getDb().prepare("SELECT * FROM marketing_content WHERE kind = ? ORDER BY created_at DESC").all(kind)
      : getDb().prepare("SELECT * FROM marketing_content ORDER BY created_at DESC").all()
  ) as Array<{ id: string; kind: string; topic: string | null; content: string; created_at: string }>;

  return rows.map((r) => {
    let content: unknown;
    try {
      content = JSON.parse(r.content);
    } catch {
      content = r.content;
    }
    return { id: r.id, kind: r.kind, topic: r.topic, content, createdAt: r.created_at };
  });
}

export function deleteMarketingContent(id: string): boolean {
  ensureTables();
  const result = getDb().prepare("DELETE FROM marketing_content WHERE id = ?").run(id);
  return result.changes > 0;
}
