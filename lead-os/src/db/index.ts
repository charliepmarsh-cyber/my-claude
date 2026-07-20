import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

export type DB = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __leadOsDb?: DB; __leadOsSqlite?: Database.Database };

function migrationsFolder(): string {
  // Works from the app root in dev, build and start.
  return path.join(process.cwd(), "drizzle");
}

export function createDb(filePath: string): { db: DB; sqlite: Database.Database } {
  if (filePath !== ":memory:") {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: migrationsFolder() });
  return { db, sqlite };
}

export function getDb(): DB {
  if (!globalForDb.__leadOsDb) {
    const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "lead-os.db");
    const { db, sqlite } = createDb(file);
    globalForDb.__leadOsDb = db;
    globalForDb.__leadOsSqlite = sqlite;
  }
  return globalForDb.__leadOsDb;
}

export { schema };
