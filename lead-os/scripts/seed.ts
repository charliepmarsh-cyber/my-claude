/**
 * CLI seed: `npm run db:seed`
 * Loads the clearly-labelled demo dataset into the local database.
 * Idempotent — skips if demo data already exists (remove it from Settings first).
 */
import path from "node:path";
import { createDb } from "../src/db";
import { loadDemoData, hasDemoData } from "../src/server/demo-data";

const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "lead-os.db");
const { db, sqlite } = createDb(file);

if (hasDemoData(db)) {
  console.log("Demo data already present — delete it from Settings (or remove the DB file) before reseeding.");
} else {
  const { created } = loadDemoData(db);
  console.log(`Seeded ${created} demo leads (marked DEMO throughout; delete in one action from Settings).`);
}
sqlite.close();
